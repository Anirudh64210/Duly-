# Duly

Your F-1 record, kept on your own Mac.

Duly is a free, open-source (AGPL) desktop app that keeps an F-1 student's immigration record: the dates from their I-20, EAD card and other papers, the documents themselves, and the rules those dates come from, each with its citation and its legal status today. It is local-first. There is no Duly server and no account, and nothing about a student leaves the Mac (D84).

Duly states what a rule says, where it is written, its legal status today, and what the arithmetic gives for the dates you entered. It does not give legal advice. Where a question turns on your own situation, it shows the rule and drafts the question for your DSO (BOUNDARY.md).

F-1 comes first: the first useful version is meant to cover every F-1 case (OPT, STEM OPT, CPT, cap-gap, travel, documents). H-1B, O-1 and EB-1A rules follow, each as its own pack (D89).

Duly is in development and has no public release yet. Until the packaged app's review and audit pass, builds hold made-up data only (D99).

## Run it

Needs: macOS (the packaged app is built for Apple silicon), uv, Node 22 or later.

```
npm ci
make desktop
```

`make desktop` builds the screen and opens Duly in its own window, with the engine running from this checkout.

To build the app itself:

```
make desktop-python    # the Python carried inside the app; downloads its runtime once
make desktop-package   # Duly.app, with a DMG and a ZIP, under desktop/out
make desktop-verify    # checks the bundle, the fuses, the signature and a first start
```

Test builds are signed on the Mac that made them; there is no notarized build yet (D85, D98).

Other targets: `make desktop-smoke` (a headless start), `make samples` (the engine's output for the made-up sample records the screen uses), `make prototype-app` (the design prototype in its own window).

## Check it

```
make ci            # the same steps as CI, in its order: gates 1 to 5 and 7, the held-out tests, then gate 6
make test-offline  # the gates that need no network
make prove-gates   # plants a fault in a scratch copy and checks each gate catches its own
```

Run `make ci` before every push. It needs gitleaks, and its dependency audits need the network.

## The old server stack

infra/ still holds the phase-0 Docker stack (api, worker, web, ops, Postgres, MinIO, Mailpit), started with `make up` and stopped with `make down`. Duly does not run on it: the app keeps everything on the Mac (D84).

## License

Duly is free software under the GNU Affero General Public License, version 3 only (AGPL-3.0-only). The full text is in LICENSE. The core stays free; paid services may come later, such as encrypted sync and backup or a hosted Ask, never a charge for the core (D84). When the rules feed is published, its rule pack data and update summaries carry CC BY 4.0 (D90, SPEC-FEED point 76). Outside contributions open once the contributor agreement D84 calls for is in place.

## Where things are

| Path | What |
|---|---|
| DECISIONS.md | Founder decisions. Overrides everything else |
| BOUNDARY.md | Where Duly helps and where it stops |
| PRINCIPLES.md | Where Duly's knowledge comes from |
| CLAUDE.md | The rules every agent working here follows |
| desktop/ | The desktop app (Electron): window, documents store, reminders |
| web/ | The screen the app shows |
| engine/ | Pure functions: clocks, dates, the path model, unknowns, the verdict |
| api/ | The engine's local routes, which the app reaches over a private socket, and the phase-0 server |
| rulepacks/ | The rules as data, one pack per visa category, with saved sources |
| contracts/ | The shapes everything else agrees on |
| assistant/ | The boundary classifier and answer validator |
| pipeline/, watch/ | The law updates pipeline and the list of sources to watch |
| specs/ | One SPEC per phase, with its plans |
| evals/, tests/, security/ | What grades the code. Implementation lanes cannot edit these |
| tools/, factory/, dashboard/ | Copy linter, diff policy, gates, and the agent factory with its window |
| docs/ | The requirements register, the factory runbook and the research |
| infra/, ops/ | The phase-0 server stack and admin app |
| duly-plan/, workbook-handoff/ | The original plan and the WorkBook design |
