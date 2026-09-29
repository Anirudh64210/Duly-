# WorkBook handoff

WorkBook is a record-keeping feature for Duly, the visa-status app for international students. This package gives a Claude session everything it needs to build WorkBook inside Duly without re-deriving the design.

Status: design approved for premature testing on 2026-09-28. Visual engineering (final UI polish) is done by the founder separately. The interaction design, information architecture, copy, and rules in this package are settled.

## Read in this order

1. `docs/01-context-prompt.md` : paste this into the other session first. It is the complete description of what WorkBook is.
2. `docs/02-design-principles.md` : the rules every screen follows, with the reasoning.
3. `docs/03-screens-and-flows.md` : screen by screen, state by state.
4. `docs/04-data-and-pipeline.md` : sources, event model, block building, sealing, storage, AI.
5. `docs/05-compliance-and-legal.md` : the immigration and legal facts the design is built around, with sources.
6. `docs/06-duly-integration.md` : how WorkBook fits Duly, the API boundary, and the parent product positioning research.
7. `docs/07-decisions-and-open-questions.md` : what was decided, what was rejected and why, what is still open.
8. `docs/08-prompts.md` : system prompts for the AI pieces (entry drafter, duty mapper, method note) and the constraints they must obey.

## Prototype

`prototype/workbook-v7.dc.html` is the approved interactive prototype. It is a single self-contained component (HTML plus a small state machine in the script tag at the bottom). Every screen, every state, and all the copy are in it. Treat the copy as final unless the founder changes it.

`prototype/setup-onboarding.dc.html` is the five-step setup flow.

`prototype/pipeline-explainer.html` is an animated explainer of the data pipeline (connect, collect, build blocks, map duties, approve, seal). Open it in a browser.

The `.dc.html` files were built for a design canvas runtime and reference `./support.js`, which is not included. Read them as source; the markup and the `renderVals()` function in the script describe every behavior.

## Naming

The product was called Evidence Ledger during design. It is now WorkBook. The parent product is Duly. Some early docs and the explainer page still say Evidence Ledger; treat the name as WorkBook everywhere.
