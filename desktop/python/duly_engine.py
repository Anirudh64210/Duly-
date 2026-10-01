"""Starts Duly's engine inside the packaged app (SPEC-W1 point 16).

Run as `python3 -I -B duly_engine.py --mode packaged --socket <path>`. With -I the interpreter
puts neither this folder nor PYTHONPATH on sys.path, so the launcher adds the two folders the
engine needs, engine-root (this folder) and the bundled wheels in python/site, and nothing else.
The arguments go to api.desktop_main unchanged.
"""

import runpy
import sys
from pathlib import Path

ENGINE_ROOT = Path(__file__).resolve().parent
SITE = ENGINE_ROOT.parent / "python" / "site"

if __name__ == "__main__":
    sys.path[:0] = [str(ENGINE_ROOT), str(SITE)]
    runpy.run_module("api.desktop_main", run_name="__main__", alter_sys=True)
