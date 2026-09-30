"""The local token the desktop shell gives the api.

specs/desktop-1/SPEC.md, "The api (L-api)": when DULY_LOCAL_TOKEN is set, every request
except /health must carry the same value in X-Duly-Local, compared in constant time.
Without it the answer is 403 in plain words. When the variable is not set, nothing
changes.

specs/desktop-1/SPEC.md, "The engine process": the shell makes the token once for each
launch, before it starts the api, and sends it on every request it passes on. The api may
therefore read the variable when it starts or on each request; each fixture here sets
the environment first and then loads api.main again, so both readings are covered.

Written from the SPEC alone, before the api lane's work exists.
"""

import hmac
import importlib
import json
import secrets
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

import api.main
import api.settings
from tools.copy_lint import lint as copy_lint

TOKEN = "3f" * 32  # 32 bytes written as hex, as the shell may send them
UNREACHABLE = "postgresql+psycopg://duly:duly@127.0.0.1:1/duly"
HEADER = "X-Duly-Local"


def _load_api(monkeypatch: pytest.MonkeyPatch, token: str | None) -> TestClient:
    monkeypatch.setenv("DULY_DATABASE_URL", UNREACHABLE)
    if token is None:
        monkeypatch.delenv("DULY_LOCAL_TOKEN", raising=False)
    else:
        monkeypatch.setenv("DULY_LOCAL_TOKEN", token)
    api.settings.get_settings.cache_clear()
    module = importlib.reload(api.main)
    # 127.0.0.1 is where the shell calls from, and it is inside the default ops list, so
    # the ops guard does not refuse first and hide what the token check does.
    return TestClient(module.app, client=("127.0.0.1", 50000))


def _restore(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.undo()
    api.settings.get_settings.cache_clear()
    importlib.reload(api.main)


@pytest.fixture
def guarded(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    """The api started with DULY_LOCAL_TOKEN set to TOKEN."""
    yield _load_api(monkeypatch, TOKEN)
    _restore(monkeypatch)


@pytest.fixture
def open_api(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    """The api started with DULY_LOCAL_TOKEN not set."""
    yield _load_api(monkeypatch, None)
    _restore(monkeypatch)


def _strings(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        return [s for v in value.values() for s in _strings(v)]
    if isinstance(value, list):
        return [s for v in value for s in _strings(v)]
    return []


def _words(response: Any) -> list[str]:
    """The text a person reads in the answer: the strings of a JSON body, or the body."""
    try:
        return _strings(json.loads(response.text))
    except ValueError:
        return [response.text]


# ---- the variable is set: /health stays open --------------------------------------


def test_health_answers_without_the_header_when_the_token_is_set(guarded):
    # SPEC: "every request except /health". The shell waits on /health before it can
    # send anything, so /health must answer with no header at all.
    # Fails if the check also covers /health.
    response = guarded.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_health_answers_with_a_wrong_header_when_the_token_is_set(guarded):
    # SPEC: /health is outside the check, so a wrong value does not close it either.
    response = guarded.get("/health", headers={HEADER: "wrong"})
    assert response.status_code == 200


# ---- the variable is set: every other request needs the header ---------------------


def test_a_get_without_the_header_is_refused_with_403(guarded):
    # SPEC: "Without it the answer is 403".
    assert guarded.get("/version").status_code == 403


def test_a_post_without_the_header_is_refused_with_403(guarded):
    # SPEC: "every request", so a POST to the compute route is refused before its body is
    # read. Fails if the check is placed on GET routes only.
    response = guarded.post("/v1/compute/f1", json={})
    assert response.status_code == 403


def test_the_ops_route_without_the_header_is_refused_with_403(guarded):
    # SPEC: "every request". Fails if the ops routes are left outside the check.
    # The caller is 127.0.0.1, inside the default ops list, so the ops guard lets it by
    # (see the next test); only the token check can give this 403.
    assert guarded.get("/ops/v1/status").status_code == 403


def test_the_ops_route_with_the_header_is_let_through(guarded):
    # Control for the test above: with the right value the same caller is answered.
    response = guarded.get("/ops/v1/status", headers={HEADER: TOKEN})
    assert response.status_code == 200


def test_an_unknown_path_without_the_header_is_refused_with_403(guarded):
    # SPEC: "every request except /health", so a path with no route is refused too, and
    # the caller learns nothing about which routes exist. Fails if the check is a
    # dependency on each route rather than on every request.
    assert guarded.get("/no/such/path").status_code == 403


def test_a_path_that_only_begins_with_health_is_refused(guarded):
    # SPEC: the one exception is /health. Fails if the exception matches by prefix.
    assert guarded.get("/healthz").status_code == 403
    assert guarded.get("/health/../version").status_code == 403


def test_a_wrong_value_is_refused_with_403(guarded):
    # SPEC: the header must carry "the same value".
    response = guarded.get("/version", headers={HEADER: "not-the-token"})
    assert response.status_code == 403


def test_an_empty_value_is_refused_with_403(guarded):
    # SPEC: "the same value"; an empty header is not the token.
    assert guarded.get("/version", headers={HEADER: ""}).status_code == 403


def test_a_value_that_only_begins_like_the_token_is_refused(guarded):
    # SPEC: "the same value". Fails if the check compares a prefix or a length only.
    # TOKEN is 64 characters; TOKEN[:-1] is 63, TOKEN + "0" is 65, and the last swap keeps
    # 64 characters with the final one changed from "f" to "0".
    for sent in (TOKEN[:-1], TOKEN + "0", TOKEN[:-1] + "0"):
        assert guarded.get("/version", headers={HEADER: sent}).status_code == 403, sent


def test_the_token_in_another_header_is_refused(guarded):
    # SPEC: the value is carried "in X-Duly-Local". Fails if any header, or a query
    # parameter, is accepted instead.
    assert guarded.get("/version", headers={"Authorization": TOKEN}).status_code == 403
    assert guarded.get(f"/version?{HEADER}={TOKEN}").status_code == 403


def test_the_right_value_is_let_through(guarded):
    # SPEC: a request that carries the same value is answered as usual.
    response = guarded.get("/version", headers={HEADER: TOKEN})
    assert response.status_code == 200
    assert set(response.json()) == {"api", "contracts"}


def test_the_right_value_lets_a_post_through(guarded):
    # SPEC: the check passes; what the route says of an empty case is its own business,
    # but it is not the refusal. Fails if the check refuses every POST.
    response = guarded.post("/v1/compute/f1", json={}, headers={HEADER: TOKEN})
    assert response.status_code != 403


def test_the_refusal_is_in_plain_words(guarded):
    # SPEC: "403 in plain words". The answer holds at least one sentence a person can
    # read (words with spaces between them), and CLAUDE.md's copy rules hold for it: no
    # long dash, no emoji, no word from tools/copy_lint/lint.py.
    # Fails if the body is empty, a bare code, or breaks the copy rules.
    response = guarded.get("/version")
    assert response.status_code == 403
    words = _words(response)
    assert any(" " in w and any(c.isalpha() for c in w) for w in words), response.text
    for w in words:
        assert not copy_lint.DASHES.search(w), w
        assert not copy_lint.EMOJI.search(w), w
        assert not copy_lint._WORDS.search(w), w


def test_the_refusal_does_not_repeat_the_token(guarded):
    # SPEC: the token is the one secret between the shell and the api. A refusal to a
    # wrong value must not hand the right one back. Fails if the message names it.
    response = guarded.get("/version", headers={HEADER: "wrong"})
    assert response.status_code == 403
    assert TOKEN not in response.text
    assert all(TOKEN not in v for v in response.headers.values())


# ---- the variable is set: the comparison is in constant time -----------------------


def test_the_value_is_compared_in_constant_time(monkeypatch):
    # SPEC: "compared in constant time". In the standard library that is
    # hmac.compare_digest (secrets.compare_digest is the same function). A spy is put in
    # its place before api.main is loaded, so an import of the name is caught too.
    # Fails if the value is compared with == or in any other way.
    seen: list[tuple[Any, Any]] = []
    real = hmac.compare_digest

    def spy(a: Any, b: Any) -> bool:
        seen.append((a, b))
        return real(a, b)

    monkeypatch.setattr(hmac, "compare_digest", spy)
    monkeypatch.setattr(secrets, "compare_digest", spy)
    client = _load_api(monkeypatch, TOKEN)
    try:
        assert client.get("/version", headers={HEADER: "wrong"}).status_code == 403
    finally:
        _restore(monkeypatch)

    def text(x: Any) -> str:
        return x.decode() if isinstance(x, bytes | bytearray) else str(x)

    assert {"wrong", TOKEN} in [{text(a), text(b)} for a, b in seen], seen


# ---- the variable is not set: nothing changes ---------------------------------------


def test_without_the_variable_a_request_needs_no_header(open_api):
    # SPEC: "When the variable is not set, nothing changes." The web and ops screens of
    # the local stack send no header. Fails if the check runs with no token set.
    response = open_api.get("/version")
    assert response.status_code == 200
    assert set(response.json()) == {"api", "contracts"}


def test_without_the_variable_any_header_value_is_ignored(open_api):
    # SPEC: "nothing changes": a header sent anyway is not checked against anything.
    assert open_api.get("/version", headers={HEADER: "anything"}).status_code == 200


def test_without_the_variable_health_answers(open_api):
    # SPEC: "nothing changes".
    assert open_api.get("/health").json() == {"ok": True}


def test_without_the_variable_an_unknown_path_is_404_not_403(open_api):
    # SPEC: "nothing changes": a path with no route is not found, as before.
    # Fails if an api with no token set refuses requests.
    assert open_api.get("/no/such/path").status_code == 404


def test_without_the_variable_a_post_is_not_refused(open_api):
    # SPEC: "nothing changes" for the compute route either.
    assert open_api.post("/v1/compute/f1", json={}).status_code != 403


def test_the_same_answer_with_the_right_token_as_with_no_token(monkeypatch):
    # SPEC: the token only guards the door; what is behind it is the same. /version with
    # the right header under a set token equals /version with no token set.
    # Fails if the check changes the body of an answer it lets through.
    plain = _load_api(monkeypatch, None).get("/version").json()
    try:
        guarded = _load_api(monkeypatch, TOKEN)
        assert guarded.get("/version", headers={HEADER: TOKEN}).json() == plain
    finally:
        _restore(monkeypatch)
