date: 2026-09-28
lane: L-factory
commit: this curation branch
failure: In a scratch copy, uv run with UV_PROJECT_ENVIRONMENT pointed at the worktree's .venv and the no-sync flag made a new empty environment there. pytest still ran, because it was found on PATH in the main checkout's environment, but python could not import yaml. Several replay agents lost rounds to this.
fix: In a worktree or scratch copy, check which interpreter runs (python -c "import sys; print(sys.executable)") before the first replay. Here the working one was the main checkout's .venv/bin/python, called as python -m pytest, python -m mypy, and so on.
evidence: .claude/LESSONS/PROGRESS.md, iteration 1; ModuleNotFoundError: No module named 'yaml'.
verification_task: Make a scratch copy of the repo and run tools.sources.verify in it on the first try.
seen: 1
curation: proposed by the curator, so the curator cannot approve it.
