date: 2026-09-29
lane: founder (factory), found by the engine builder
commit: see git log for tools/factory/phase.py
failure: With pull requests on, the orchestrator started every agent from the phase branch and not from the working branch where earlier rounds had landed. The engine builder never saw the tests written for it in the round before, could not pass, and escalated. The earlier end to end run passed only because its second round did not depend on its first.
fix: Agents start from the working branch, and the phase branch is protected beside it. The pull request test now makes the second round's done command depend on a file from the first round. The test fails on the old code.
evidence: run l-engine-5304ec47ae, base 20b118f while work/product-1 was at e802414
verification_task: A two round plan whose second round needs a file from the first.
