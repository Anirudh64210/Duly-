import subprocess

from tools.copy_lint.lint import lint

LONG_DASH = chr(0x2014)
SHORT_DASH = chr(0x2013)
FACE = chr(0x1F600)


def write(root, rel, text):
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def rules(root):
    return {(f.path, f.rule) for f in lint(root)}


def test_clean_tree_is_clean(tmp_path):
    write(tmp_path, "web/src/App.tsx", "export const title = 'No open items';\n")
    assert lint(tmp_path) == []


def test_long_dashes_fail_anywhere(tmp_path):
    write(tmp_path, "api/notes.md", f"one {LONG_DASH} two\nthree {SHORT_DASH} four\n")
    assert [f.rule for f in lint(tmp_path)] == ["dash", "dash"]


def test_emoji_fails_anywhere(tmp_path):
    write(tmp_path, "engine/x.py", f"# {FACE}\n")
    assert rules(tmp_path) == {("engine/x.py", "emoji")}


def test_forbidden_words_fail_in_product_copy(tmp_path):
    write(tmp_path, "web/src/Home.tsx", "<p>You are eligible. Don't worry.</p>\n")
    assert rules(tmp_path) == {
        ("web/src/Home.tsx", "phrase:eligible"),
        ("web/src/Home.tsx", "phrase:worry"),
    }


def test_forbidden_words_are_fine_outside_product_copy(tmp_path):
    write(tmp_path, "assistant/boundary.py", "BANNED = ['eligible', 'guaranteed']\n")
    assert lint(tmp_path) == []


def test_words_inside_other_words_do_not_match(tmp_path):
    write(tmp_path, "web/src/a.ts", "const unsealedEnvelope = 1; // hypercritically\n")
    assert lint(tmp_path) == []


def test_emails_and_ops_are_product_copy(tmp_path):
    write(tmp_path, "emails/brief.mjml", "<p>Guaranteed.</p>\n")
    write(tmp_path, "ops/src/a.tsx", "<p>sealed</p>\n")
    assert rules(tmp_path) == {
        ("emails/brief.mjml", "phrase:guaranteed"),
        ("ops/src/a.tsx", "phrase:sealed"),
    }


def test_founder_allow_list_lets_one_phrase_through_in_one_file(tmp_path):
    write(tmp_path, "web/src/a.tsx", "<p>cryptographic</p>\n")
    write(tmp_path, "web/src/b.tsx", "<p>cryptographic</p>\n")
    write(tmp_path, "tools/copy_lint/allow.txt", "web/src/a.tsx: cryptographic  # method note\n")
    assert rules(tmp_path) == {("web/src/b.tsx", "phrase:cryptographic")}


def test_research_notes_and_prototype_are_skipped(tmp_path):
    write(tmp_path, "docs/research/notes/a.md", f"quoted {LONG_DASH} source\n")
    write(tmp_path, "workbook-handoff/prototype/p.html", f"<p>{LONG_DASH}</p>\n")
    assert lint(tmp_path) == []


def test_what_git_ignores_is_not_read_so_a_second_run_finds_what_the_first_did(tmp_path):
    subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
    write(tmp_path, "desktop/.gitignore", "coverage\n")
    write(tmp_path, "desktop/coverage/lcov-report/prettify.js", "var sealed = 1;\n")
    write(tmp_path, "desktop/src/a.tsx", f"<p>{LONG_DASH}</p>\n")  # untracked, not ignored
    assert rules(tmp_path) == {("desktop/src/a.tsx", "dash")}


def test_a_folder_inside_a_repository_is_walked_whole(tmp_path):
    subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
    write(tmp_path, ".gitignore", "scratch\n")
    write(tmp_path, "scratch/copy/web/src/a.tsx", f"<p>{LONG_DASH}</p>\n")
    assert rules(tmp_path / "scratch" / "copy") == {("web/src/a.tsx", "dash")}


def test_what_a_sandbox_may_not_read_is_passed_over(tmp_path):
    # A builder's sandbox denies reading the hidden tests; the linter must not fail there.
    subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
    write(tmp_path, "tests/holdout/README.md", f"hidden {LONG_DASH} words\n")
    write(tmp_path, "tests/holdout/deep/test_x.py", "x = 1\n")
    write(tmp_path, "web/src/a.tsx", f"<p>{LONG_DASH}</p>\n")
    (tmp_path / "tests/holdout/README.md").chmod(0)
    (tmp_path / "tests/holdout/deep").chmod(0)
    try:
        assert rules(tmp_path) == {("web/src/a.tsx", "dash")}
    finally:
        (tmp_path / "tests/holdout/deep").chmod(0o755)
        (tmp_path / "tests/holdout/README.md").chmod(0o644)
