"""A TestClient that refuses to post a placeholder answer, and the step the screen takes
before it posts a case.

specs/product-1/SPEC-resolutions.md, points 2, 3 and 7: an answer is dated on or before
the day of the case, a yes to no_employment_to_record covers the days through its day,
and an answer is taken only with the about of the question it answers. The markers of
tests/support/f1_pack.py (ON_THE_DAY_IT_RUNS, about_asked) stand for those until the day
and the question are known; they must never reach the api.
"""

import json
from typing import Any

from fastapi.testclient import TestClient

from tests.support.f1_pack import dated_on_the_day, refuse_placeholders, with_the_about_asked


def _body(json_body: Any, content: Any) -> Any:
    if json_body is not None:
        return json_body
    if isinstance(content, str | bytes):
        try:
            return json.loads(content)
        except ValueError:
            return None
    return None


class CheckedClient(TestClient):
    """TestClient whose post raises PlaceholderAnswerError when the body holds a
    placeholder answer, before anything is sent."""

    def post(self, url: Any, *args: Any, **kwargs: Any) -> Any:  # type: ignore[override]
        refuse_placeholders(_body(kwargs.get("json"), kwargs.get("content")))
        return super().post(url, *args, **kwargs)


def as_the_screen_sends(
    client: TestClient, url: str, case: dict[str, Any], clock: Any
) -> dict[str, Any]:
    """The case with each placeholder answer made real, as the screen makes it: dated on
    the person's own day at the clock the api is given, and carrying the about of the
    question the api asked. A case with no placeholder is returned as it is."""

    def compute(sent: dict[str, Any]) -> dict[str, Any]:
        response = client.post(url, json=sent)
        assert response.status_code == 200, response.text
        out: dict[str, Any] = response.json()
        return out

    return with_the_about_asked(dated_on_the_day(case, clock), compute)
