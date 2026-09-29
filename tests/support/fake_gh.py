#!/usr/bin/env python3
"""A stand-in for the GitHub command line, for testing pull request landing.

pr create records the request. pr checks passes unless FAKE_GH_CI is "fail". pr merge does
what GitHub does: a merge commit of the head branch into the base branch, on the remote.
"""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

args = sys.argv[1:]
state = Path(os.environ["FAKE_GH_STATE"])
data = json.loads(state.read_text()) if state.exists() else {"prs": []}


def flag(name: str) -> str:
    return args[args.index(name) + 1] if name in args else ""


def git(cwd: str, *rest: str) -> str:
    done = subprocess.run(
        ["git", "-c", "user.name=gh", "-c", "user.email=gh@t.invalid", *rest],
        cwd=cwd,
        check=True,
        capture_output=True,
        text=True,
    )
    return done.stdout.strip()


if args[:2] == ["pr", "create"]:
    data["prs"].append(
        {
            "base": flag("--base"),
            "head": flag("--head"),
            "title": flag("--title"),
            "body": flag("--body"),
            "state": "open",
        }
    )
    print("https://github.invalid/pr/1")
elif args[:2] == ["pr", "checks"]:
    if os.environ.get("FAKE_GH_CI") == "fail":
        print("gates  fail")
        sys.exit(1)
    print("gates  pass")
elif args[:2] == ["pr", "merge"]:
    pr = next(p for p in reversed(data["prs"]) if p["head"] == args[2] and p["state"] == "open")
    remote = git(os.getcwd(), "remote", "get-url", "origin")
    with tempfile.TemporaryDirectory() as clone:
        git(".", "clone", "-q", remote, clone)
        git(clone, "checkout", "-q", pr["base"])
        git(
            clone,
            "merge",
            "--no-ff",
            "-q",
            "-m",
            flag("--subject") + "\n\n" + flag("--body"),
            f"origin/{pr['head']}",
        )
        git(clone, "push", "-q", "origin", pr["base"])
    pr["state"] = "merged"
else:
    sys.exit(f"fake gh: unknown command {args}")
state.write_text(json.dumps(data))
