# Engine samples for round B

Each `<name>.json` is the output of `engine.path.compute` for `<name>.case.json`, with the
rule packs on this branch and a FixedClock at 16:00 UTC:

- path-stem-next: 2026-09-29
- path-window-open: 2026-12-01

They sit outside web/src because the rules they carry quote the regulation word for word,
and the copy lint reads everything under web/src as product copy.
