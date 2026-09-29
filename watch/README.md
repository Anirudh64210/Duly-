# Source watcher

Role: notice that a source changed, and tell the founder. It never writes an update, never edits a rule, never publishes.

Runner: Hermes Agent on a schedule. Not installed in Phase 0. `sources.yaml` is the list it will read, in our own format, so the runner can be swapped.

A change it detects becomes the first stage of pipeline/graph.py.
