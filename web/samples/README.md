# Engine samples

Each `<name>.json` is the output of `engine.path.compute` for `<name>.case.json`, with the
rule packs on this branch and a FixedClock at 16:00 UTC on the day `make.py` names:

- path-stem-next: 2026-09-29
- path-window-open: 2026-12-01

Do not edit a sample by hand. `make samples` remakes them with `make.py`, and `make design-shots`
runs it first, so the samples never drift from the engine. `src/lib/samples.test.ts` runs
`make.py --check` and fails when a sample differs from the engine's output.

They sit outside web/src because the rules they carry quote the regulation word for word,
and the copy lint reads everything under web/src as product copy.
