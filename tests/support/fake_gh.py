#!/usr/bin/env python3
"""A stand-in for the GitHub command line, for testing pull request landing.

pr create records the request; pr create for a pair of branches that already has an open
pull request is refused, as GitHub refuses it. pr list and pr edit find and change the open
one. pr view reports the head commit of the branch on the remote and one check on it, which
passes unless FAKE_GH_CI is "fail". With FAKE_GH_STALE set to n, the first n views still
show an earlier head with a failed check, as GitHub does for a moment after a push. pr merge
does what GitHub does: a merge commit of the head branch into the base branch, on the remote.
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


def open_for(head: str, base: str = "") -> list[dict]:
    return [
        p
        for p in data["prs"]
        if p["head"] == head and p["state"] == "open" and (not base or p["base"] == base)
    ]


if args[:2] == ["pr", "create"]:
    if open_for(flag("--head"), flag("--base")):
        print(
            f'a pull request for branch "{flag("--head")}" into branch "{flag("--base")}" '
            "already exists",
            file=sys.stderr,
        )
        sys.exit(1)
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
elif args[:2] == ["pr", "list"]:
    print(
        json.dumps(
            [{"number": i + 1} for i, _ in enumerate(open_for(flag("--head"), flag("--base")))]
        )
    )
elif args[:2] == ["pr", "edit"]:
    pr = open_for(args[2])[-1]
    pr.update(title=flag("--title"), body=flag("--body"), edits=pr.get("edits", 0) + 1)
elif args[:2] == ["pr", "view"]:
    data["views"] = data.get("views", 0) + 1
    if data["views"] <= int(os.environ.get("FAKE_GH_STALE", "0")):
        head, conclusion = "0" * 40, "FAILURE"
    else:
        line = git(os.getcwd(), "ls-remote", "origin", f"refs/heads/{args[2]}")
        head = line.split()[0]
        conclusion = "FAILURE" if os.environ.get("FAKE_GH_CI") == "fail" else "SUCCESS"
    rollup = [
        {"__typename": "CheckRun", "name": "gates", "status": "COMPLETED", "conclusion": conclusion}
    ]
    print(json.dumps({"headRefOid": head, "statusCheckRollup": rollup}))
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
