# Duly backlog

The one list of open work. Started on 2026-10-03 in the regroup round (D100), because carried
items lived only in chat and memory (audit A50).

- A1 to A73: the confirmed findings of the 2026-10-03 audit, numbered in the audit's order.
- C1 to C9: items the build session carried.
- Each line says what, where, and who carries it. A finding with parts names each part's owner.
  A line with no Who: is carried by the owner its heading names; a plan carries it in its lanes.
- Grouped by owner. Inside a group, newest decision first; lines with no decision come last.
- Nothing here needs an account, a login or a payment (D98). What would is in section 5.
- When an item is done, the founder lane moves it to section 7 with the commit.
- specs/product/BACKLOG.md keeps the founder's product notes of 2026-09-29 (D39). Work lives here.

Order (D100, D98): plan-w2-p4-fix0 ends; this branch merges into step-w; the git cleanup; K7
and the other contract changes, each alone (section 3); plan-w2-r1, the revision build of this
round; a re-audit finds the repo clean; then the next build plan, W2-P5.

The weekly recheck and its checked_on plan (section 2, D98) are part of this regroup round, so
they may run before the re-audit: D100's gate holds W2-P5, not the freshness work. The first is
due 2026-10-08 or 2026-10-09. If the cycle cannot finish by 2026-10-09, builds show Can't tell
yet from 2026-10-10 until it does (late, never wrong), and the founder is told plainly (SPEC-FEED
section 13).

## 1. This regroup branch

Branch regroup in ~/Desktop/Duly/duly-regroup, made from step-w. It merges after
plan-w2-p4-fix0 ends.

- A35, teardown (D100). The TrackMyOPT teardown held the founder's name, account name and OPT
  dates. Where: specs/ui-2/competitor/ (removed from the repo on 2026-10-03, D100; in git history
  at 67bbc33). Who: the founder lane, done in 44f96f2; history stays (D98). The 19 citations of
  ANALYSIS.md in 8 files carry "(removed from the repo on 2026-10-03, D100; in git history at
  67bbc33)" on this branch. Who: docs editor. The rest of the TrackMyOPT research: section 3.
  Memory pointer: section 3.
- A50 (D100). Carried items lived only in chat and memory. Where: this file. Who: the backlog
  editor.
- A16 (D99). The founder was told the next test is at W2-P6; D89 put it after reminders and the
  feed. D99 settles it. Where: SPEC-W2 point 60, SPEC-FEED point 66. Who: the SPEC editors.
- A17 (D97). The specs still built what the founder rejected on 09-30. Where: SPEC-W2 point 10
  (one check per typed date), SPEC-FEED point 38 (no "what to do" in an update), the whole
  verdict turning Can't tell yet. Who: SPEC-W2, SPEC-W2-UNKNOWN and SPEC-FEED editors. The
  SPEC-W2 editor also puts "W2-R1, the revision build" in section 11 before W2-P5, naming N7, N8,
  K7 and the rest plan-w2-r1 carries, and drops them and their test files from W2-P5. Code:
  plan-w2-r1.
- A18 (D97). 09-30 asks with no SPEC point: a job title, Your answers showing each question, a
  DSO email with no CFR cite, Back after Delete everything. Where: SPEC-W2 point 26, G29, points
  2 and 32. Who: SPEC-W2 editor (W2-P5, W2-P6). Update notifications: section 3.
- A19 (D97). Today's web shows copy the founder rejected, and the copy lint passes it. Where:
  web/src/app/Home.tsx:568-570, web/src/lib/status.ts:43, Checklists.tsx:39 and :57,
  labels.ts:948. Who: SPEC-W2 editor adds a W2-P5 check and names labels.ts, status.ts and
  views/ in point 2.
- A9 (D90, D91, D92). Text those decisions overrode, and the file-key promise recorded nowhere.
  Where: SPEC-W2-UNKNOWN.md:850 and :859 (trip.returned_on); SPEC-FEED.md:569, :892-893, point
  75; each SPEC's Status line. Who: SPEC-W2-UNKNOWN and SPEC-FEED editor.
- A8 (D89). Nothing builds "H-1B, O-1 and EB-1A say their rules are coming; their documents can
  still be kept". Where: SPEC-W2 point 8; web/src/app/Home.tsx:515-530; labels.ts:1139. Who:
  SPEC-W2 editor adds a W2-P5 or W2-P6 point.
- A5 (D85, D86). SPEC-W2 lists the D85 and D86 questions as open and plans an own-record Ask
  setting D86 rules out. Where: SPEC-W2.md:21, :25, point 35 ("Point 71"), points 61 to 63,
  Covers. Who: SPEC-W2 editor.
- A6 (D79 to D86). BOUNDARY "Where the assistant runs" predates D79 to D86. Where:
  BOUNDARY.md:81-83. Who: docs editor, with the decisions cited beside the new text.
- A2, A37, A70 (D84). No LICENSE, no license field, and a README about the phase-0 Docker stack
  with no D84 promise. Where: README.md:7-16, :39; package.json, web/package.json,
  desktop/package.json and ops/package.json; pyproject.toml. Who: docs editor. Left: the
  contributor agreement (section 4), the data notice (section 3), the daily-check sentence (FEED
  plans).
- A7, A38, A68, CLAUDE.md part (D68). CLAUDE.md sends agents to `make lane` and says gates 1 to
  6 (the Makefile runs 1 to 7). Where: CLAUDE.md:9, :12. Who: docs editor. The hard rule's "one
  PR" and the retired files: section 3.
- A27. Preflight's baseline skips tools.factory.validate, so a plan that turns gate 7 red can
  start. Where: tools/factory/preflight.py:207. Who: preflight editor, with a test in
  tests/unit/tools/test_preflight.py.
- A45. Ignore rules match two tracked files. reviews/REVIEW.json (.gitignore:25): the
  .gitignore editor adds !reviews/REVIEW.json. desktop/build/python-entitlements.plist: a root
  rule cannot re-include it, since desktop/.gitignore's build/* wins, so the regroup's round-1
  fix adds !build/python-entitlements.plist under !build/entitlements.plist there. Both are on
  this branch; `git ls-files -ci --exclude-standard` printed nothing on 2026-10-04. Who: the
  founder lane runs that check again before the merge.
- A72, compose part. The phase-0 stack published every port on all interfaces with its dev
  passwords. Where: infra/docker-compose.yml. Who: docker-compose editor binds each to
  127.0.0.1. Firewall: section 4.
- plan-w2-r1.yaml and plan-w1-review.yaml are written here. Their items are in section 2. Who:
  the plans editor.

## 2. Named plans

### plan-w2-p4-fix0 (running now in the main checkout)

- A14 (D96). make desktop-python fails: bundle.json names pipeline/published/*.json, which D95
  keeps empty. Where: desktop/python/bundle.json; desktop/scripts/build-python.sh step 3. Who:
  fix0's bridge round (an optional list). Every rebuild waits on it.
- A21. The agent log engine/PROGRESS.md ships inside the app. Where: bundle.json "engine";
  tests/unit/desktop_entry/test_bundle_inputs.py:205. Who: fix0 (the copy leaves out
  PROGRESS.md and REPORT.json). Left: verify-bundle rejecting *.md (W2-P9 or W2-P12 below).
- A23, part (D100). fix0 already checks gates with BASE=origin/main. The rest: section 3.

### The weekly recheck and rebuild (D98)

First due 2026-10-08 or 2026-10-09. Then at least every 7 days until a feed exists. Part of this
regroup round: it may run before the re-audit, since D100's gate holds W2-P5, not this work.

- C7, A3, A15, A59 (D98). The F-1 pack goes stale on 2026-10-10: its oldest checked_on is
  2026-10-02, and the verdict adds rules_stale after 7 days. The DMG on the Desktop too. Where:
  rulepacks/f1-us/v2026.09/parameters.yaml; engine/rulepack.py:37-40; engine/verdict.py:13, :63.
  Who, in order:
  1. Founder lane, outside the jail: `tools.sources.recheck --fetch`, and saves a listing of the
     First Circuit docket for 26-2112 from CourtListener with no token, as the district listing
     is fetched. recheck --fetch does not fetch it, because SOURCES.md lists only the district
     docket. If no listing open without an account has it, the draft keeps saying the First
     Circuit docket was not read (D98).
  2. A freshness plan shaped like plan-feed-pa.yaml: L-content moves checked_on only where a
     saved copy backs it; a reviewer checks.
  3. Founder lane: make desktop-python desktop-package desktop-verify; a new dated DMG, made-up
     data only (D99). Needs A14 first.
- C3. The SITS OPT page fetched on 2026-10-03 differs by bytes from both saved copies. Where:
  rulepacks/f1-us/v2026.09/recheck-2026-10-03.json (the two sits rows, "same": false);
  rulepacks/f1-us/v2026.09/sources/recheck-2026-10-03/. The audit found the visible text equal.
  Who: the reviewer of this pass's freshness plan.
- C6, A49. The appeal draft still says the First Circuit docket was not read. Where:
  pipeline/drafts/2026-10-02-presidents-alliance-appeal.json. Who: L-pipeline rewrites it from
  the saved district and First Circuit (26-2112) listings at this pass, after the district
  schedule due 2026-10-09 (parameters.yaml:22); recheck after 2026-10-15. Approval waits until
  then. L-content adds that listing to SOURCES.md so later passes fetch it.

### plan-w2-r1, the revision build (written on this branch)

Tests first. Missions cite SPEC points or decisions, never what a hidden test found (D100).
Gates with BASE=origin/main.

- A17, code (D97). One confirmation per document, not one per typed date (D97(1), N7); an
  unknown, an unanswered question, a stale rule or a litigated rule holds only the items it
  touches, every other item keeps its date, and nothing that waits is shown as settled (D97(3),
  N8). A typed date whose field names no document (a job's start) is asked once with its record,
  never once per date (D97(1)). Which document a field is typed from is pack data, read from
  contracts/rulepack.schema.json with K7 (section 3, before this plan). N8 takes in A59's long
  term part: a stale rule holds only its own items (D97(3), extending D65). Where:
  engine/path.py:2226-2230 (typed_dates.checked per field); engine/verdict.py:63-66. W2-P5 no
  longer carries them.
- A48, A64 (D32). A filed and approved OPT card with no recommendation date still asks for it
  and blocks the verdict. Where: tests/unit/engine/test_w2_windows.py:241;
  docs/requirements/audits/w2-p1.md:114-121. DECISIONS wins, so r1 follows D32. The SPEC-W2
  point 45 wording: section 3.
- A47, A60. W2-P2 review should-fixes: a rule check blanks a confirmed day; a withheld watch
  row has no waits_on; plus audit gaps 1 and 4. Where: engine/path.py:1806 (_answers_only),
  :2143; reviews/w2-p2.md:64-110; docs/requirements/audits/w2-p2.md:122-139. The waits_on
  contract change lands first (section 3).
- A58. No trip, move, CPT, transfer or change of level dated before 2026-09-14 gets a date
  (rule_copy_not_saved_for_event_day). Where: the 16 rows with effective_from_basis
  earliest_saved_copy in parameters.yaml. Who: the founder lane fetches earlier eCFR copies
  outside the jail; L-content works from them; the audit round adds a register row.
- A61. An OPT card that starts before the program ends still gets an unemployment count and an
  over-limit reason. Where: engine/path.py:1797-1801 (_conflict); register PRIN-011.
- A62, C2. DSO drafts state hours never entered ("0 hours a week", "NaN hours a week"). Where:
  web/src/app/caseStore.tsx:107 (an empty field becomes 0); web/src/lib/drafts.ts:65, :162-163.
  Who: L-tests, L-web. The W2-P5 store: below.
- A63. Different conflicts share one title, and an address conflict is asked as a question
  about dates. Where: web/src/lib/labels.ts:414, :503, :855, :875. The check-label contract
  change lands first (section 3).
- A65. A planned trip gets a conflict built from today while its absence window still shows.
  Where: parameters.yaml:2142 (the span's ends); engine/path.py:1449.
- A66. Mutants survive approved reviews: the count on a conflicting confirmed day, the detached
  engine spawn, update-file date formats. Where: engine/path.py:2143-2146;
  desktop/src/engine.ts:173; tests/unit/pipeline/test_update_files.py:22-25.
- A67. "No, something changed" at a check-in leads nowhere. Where:
  web/src/app/caseStore.tsx:245-255; engine/path.py run_checkins. W2-P7 then carries the
  playbook exit (below).
- A69. The appeal draft keeps the FEED-PA review's three should-fixes (claim 0's source,
  numbers found in no quote, the fetch time against the hearing). Where: the draft above;
  reviews/feed-pa.md:67-82. Who: L-pipeline, best after the weekly fetch (C6).
- C1. plan.prepare_months has no plain name. Where: web/src/lib/labels.ts:121-127
  (SETTING_NAMES); used at parameters.yaml:1859 and :1926; reviews/w2-p1.md:119-123. Who: L-web
  in r1 if it touches labels.ts, else W2-P5.

### plan-w1-review (written on this branch)

- A46, A57 (D99). W1, the desktop shell, shipped without the packaged-app review and audit
  SPEC-W1 asks for, and a DMG went to the founder. Where: SPEC-W1 point 29 steps 5 to 7; no
  reviews/step-w1.md. Who: the founder lane first saves the packaged-binary outputs under
  reviews/w1-packaged/ (desktop-verify, launch time, a socket request with no token, the owner
  and mode by stat of the socket folder and the socket, which must deny group and other,
  ELECTRON_RUN_AS_NODE=1, --inspect); then L-review and L-audit. No second macOS account is
  made (D98). Before W2-P6. Builds hold made-up data only until it passes (D99).

### W2-P5 to W2-P12

- A19 (W2-P5, D97). web/src/app/* goes. Acceptance tests fail on ids, "Asked because", Can't
  tell yet as a heading, a CFR cite in a draft or at first glance, more than two "Duly" a page.
- A18 (W2-P5, W2-P6, D97). The points the SPEC-W2 editor adds, built and tested here.
- A8 (W2-P5 or W2-P6, D89). A non-F-1 Home says the rules are coming and keeps Documents
  reachable; a web test for h1b, o1 and eb1a.
- C2 (W2-P5). The new case store keeps an empty figure unknown, never 0. SPEC-W2 as revised on
  2026-10-03 has no point for it (section 3).
- A67 (W2-P7). The check-in playbook's "something changed" exit opens that record's edit; the
  question closes on save.
- A13, part (W2-P6, W2-P8). School steps from a dropped PDF or pasted text (SPEC-W2 point 64)
  and pdf.js (point 62(b)) wait on the founder (section 4).
- A15, A21, parts (W2-P9 or W2-P12). verify-bundle checks that every engine-root file equals
  the repository's copy at build time and rejects *.md there. Where:
  desktop/scripts/verify-bundle.mjs:90-122. Its SPEC point: section 3.

### FEED plans

SPEC-FEED marks which wait for an account and which run on this Mac (D98, this branch).

- A59, long term (D88, D90). The daily check keeps reviewed rules current once a feed exists;
  its hosting waits (section 5). Per-rule staleness is N8 in plan-w2-r1 (above).
- A52 (FEED-P0a, or before W2-P5). Contract K5 (article, affects) sits between W2-P0 and
  FEED-P0a, each deferring to the other; the bridge contract already names "affects". Where:
  contracts/update.schema.json; contracts/desktop_engine_bridge.schema.json:82. Who: the
  founder lane lands K5 alone (section 3).
- A18, part (FEED-P7). Update notifications: on 09-30 the founder asked that a confirmed change
  reach each affected student unprompted. No SPEC-FEED point yet (section 3).
- A2, part. The README states the daily check once the feed ships (SPEC-FEED point 77).

### Before the first dated H-1B rule

- C4. Harden two tests. Where: tests/unit/desktop_entry/test_desktop_main.py:634 (the socket
  route on the real clock against the FixedClock); tests/unit/tools/test_factory_core.py:403
  (the jail's `ls ~/.ssh` check). Who: an L-tests round in the plan that adds the H-1B pack; the
  factory test may go with the founder lane's factory fixes.

## 3. Founder lane, after the factory run

Only when `pgrep -f tools.factory.phase` is empty. While a plan runs, founder-lane edits go on
their own branch and merge after it (D100).

- D68 retirement (regroup, 2026-10-04): 24 register rows still cite the deleted parts as
  evidence, 9 of them marked met (PLAN08-024, PLAN08-058, PLAN11-037, PLAN11-069, PLAN11-070,
  RBACK-078, RBACK-111, RBACK-116, RBACK-119). Who: the re-audit (D100), which moves the rows D68
  drops to superseded and DEC-D68-001 to met, so the share met is not overstated.

### Git and GitHub (D100)

- A33, A39, A56. About 47 idle lane worktrees (4.0 GB at the audit) and duly-build (1.4 GB; its
  DMG equals the one on the Desktop). Who: `make factory-clean`; `git worktree remove` duly-build
  and the ci-af27b4f scratch worktree; optional: ignored .scratch folders.
- A34, A40. 33 idle lane and 6 archive branches hold work in neither step-w nor
  refs/factory/kept. Who: keep each tip under refs/factory/kept, then delete the branch; delete
  the local branches step-w contains; `make doctor` shows no LOST.
- A12, A23. Finished plans name local work/product-2 as BASE, and preflight never looks at a
  round check's BASE. Who: delete work/product-2 last, once no plan that may run names it; a
  preflight check that each BASE=<ref> resolves (beyond this branch's preflight change).
- A26, A42, A11 part. Draft PR 2 (factory-v2 into main) is superseded; nine merged branches stay
  on origin; local main is one commit ahead of origin/main, so local make ci uses another base
  than CI. Who: close PR 2; delete desktop-1, factory-e2e, factory-v2, product-1, product-2 and
  work/{desktop-1,factory-e2e,product-1,product-2} on origin; `git branch -f main origin/main`.
- A25. Local step-w is ahead of GitHub (f981dff is pushed and green). Who: after fix0, push the
  head through a ci-check/ branch; never make af27b4f a pushed head; delete ci-check/w2-p3.
- A24, A41, C8. The founder branch was 285 commits behind step-w (more as step-w moves); its 16
  own commits are older copies of step-w work. Who: after the founder's OK (section 4), move it
  to step-w and push it.
- A54, part (D46). No dated tag was ever pushed on main. Who: a dated tag on origin/main,
  between runs.

### D68's retired parts (D100)

- A7, A38, A68. Still tracked: .claude/LESSONS/, proposals/, .claude/agents/skill-curator.md,
  factory/agents/skill-curator.yaml, .claude/lanes/L-factory.yaml, .claude/hooks/lane_test.py,
  the Stop hook (.claude/settings.json:19), `make lane` (Makefile:185), the globs at
  tools/factory/phase.py:70-71. Tests and dashboard code name them (test_factory_core.py,
  test_phase.py, test_control.py, test_dashboard_data.py, test_agent_run.py, test_factory.py,
  dashboard/factory_data.py). Who: one commit with the tests; then tools.factory.validate,
  make doctor, make factory-test, make ci; register DEC-D68-001.

### Contract changes, each alone and first

- A17, K7 (D97(1)). An optional "document" on a record field, naming the document kind the field
  is typed from, conditional on the record where the kind depends on it. Where:
  contracts/rulepack.schema.json. Who: a founder contract commit, first and alone, before
  plan-w2-r1 runs. Plans name it "contracts/rulepack.schema.json with K7", with no commit id.
- A47, A60. An optional waits_on on watch and check-in items. Where:
  contracts/engine_output.schema.json. Before plan-w2-r1.
- A63. An optional label and question on a check. Where: contracts/rulepack.schema.json
  $defs/check. Before plan-w2-r1.
- A52. K5: optional article paragraphs with claim ids and an affects selector, every existing
  field unchanged. Where: contracts/update.schema.json. Before W2-P5 or FEED-P0a. Then fix the
  cross-references: SPEC-W2.md:431-433, SPEC-FEED.md:734-735.

### Factory fixes

- A71 (D100). The hidden tests are readable by builders: a plan gave L-engine its failing cases,
  and git objects, other checkouts and .factory logs hold them. D100 settles the rule. Left:
  preflight refuses a builder mission naming .factory/runs/result-*L-tests*.json or
  tests/holdout; deny reads of the main checkout's .factory and every checkout's tests/holdout
  (tools/factory/sandbox.py:126-128); a read probe in the builder health check
  (factory/agents/builder.yaml:29); hidden tests kept out of the shared object store; an
  L-tests round rotates the hidden W2 tests builders saw; tests/holdout/README.md, RBACK-084
  and PLAN02-020 set to partial.
- A28 (D100). Only memory keeps founder-lane commits off a branch a plan runs from; the tamper
  guard tripped 4 times. Who: a guard that refuses `git commit` in a worktree an orchestrator
  holds. Where: .claude/hooks/guard_bash.py:15 exits early for the founder lane.
- A29. Plan faults are not checked by preflight. Who: refuse a done command that runs gate 6
  with no coverage run before it, or a full mutation run with no FILES; one line in
  .claude/agents/test-author.md.
- A30. A failed round check writes no alert, so the dashboard never shows it; `make handled`
  lists 114 rows where the dashboard shows 0. Where: tools/factory/phase.py run_checks;
  tools/factory/control.py:176-189.
- A31. Three failure-memory rows with no task key reach every L-tests, L-web and L-factory
  prompt. Where: .factory/failures.jsonl; tools/factory/memory.py:67, :112. Who: archive them;
  skip rows with no task.
- A53. Four alerts never recorded as handled: f47fbfaf, d7c97556, ed685b3a, 853cc5c6. Who:
  `make handled` with cause and note.
- A73. Nothing stops an agent's leftover processes when its run ends. The servers the audit
  named were gone on 2026-10-03 evening. Who: at run end, stop every process whose folder is
  inside the lane's worktree, and log it.
- A32. CI's gates job grew from 14 to 26 of its 45 minutes; local Node 26, CI Node 22. Where:
  .github/workflows/ci.yml:17, :29. Who: pin one Node major (.nvmrc and engines); split gate 5
  into parallel jobs before W2-P5, with tests/unit/tools/test_ci_mirror.py and make ci.

### Other repo files

- A35, rest (D100; on 2026-10-03 the founder asked for the TrackMyOPT research to go too).
  44f96f2 left 19 lines in 8 files citing the removed specs/ui-2/competitor/ANALYSIS.md
  (removed from the repo on 2026-10-03, D100; in git history at 67bbc33): specs/ui-2/VALUE.md:5;
  specs/duly-2/BLUEPRINT.md, PRICING.md, research-loops.md, research-ui.md, business/costs.md,
  business/market.md, business/channels.md. This branch puts the parenthetical beside each
  (section 1). TrackMyOPT is still named in specs/ui-2/VALUE.md (built from the teardown) and
  VALUE-2.md, specs/duly-2/PRICING.md and six files in specs/duly-2/business/,
  docs/research/notes/privacy_competitors.md, docs/research/law-liability-design-2026-09.md,
  workbook-handoff/docs/06-duly-integration.md and docs/research/founder/. Who: in one commit,
  remove or reword the TrackMyOPT research; a citation that stays keeps its parenthetical.
  docs/research/founder/ is kept verbatim (D52): section 4.
- A7, hard rule. CLAUDE.md:45 says one PR per lane ("One agent, one lane, one worktree, one
  PR."), while step-w plans merge locally; the regroup kept the hard rules word for word. Who:
  reword it to match how lanes land, as its own commit.
- A4 (D85, D87). Both builds are ad hoc, while the register marks DEC-D85-001 met. Where:
  desktop/scripts/sign-adhoc.sh:32; the desktop-package target; SPEC-W1 point 31. Who: pass
  DULY_SIGN_IDENTITY from a make variable; desktop-verify fails on an ad hoc founder build when
  an identity exists; DEC-D85-001 to partial; SPEC-W1 point 31 cites D85 and D87. Needs the
  certificate (section 4).
- A1, A36, recheck part. recheck.py writes the absolute pack path into each record. Where:
  tools/sources/recheck.py:143, :235; line 2 of recheck-2026-10-02.json and
  recheck-2026-10-03.json. Who: record the path relative to the repo, with a test in
  tests/unit/tools/test_recheck.py. Before the weekly fetch.
- A48, wording. SPEC-W2 point 45 cites a "founder decision 2026-10-01" that was the founder
  lane's own call. Reword it.
- A18, rest. A SPEC-FEED point for update notifications (FEED-P7); the revision of 2026-10-03
  has none.
- C2. A SPEC-W2 point for W2-P5: an empty figure stays unknown in the case store, never 0, and a
  draft never states it.
- A15, A21, SPEC point. A SPEC-W2 point for W2-P9 or W2-P12: verify-bundle checks that every
  engine-root file equals the repository's copy at build time and rejects *.md there
  (desktop/scripts/verify-bundle.mjs:90-122).
- A10, part. register.py prints a fixed "Audited 2026-09-29". Where:
  tools/requirements/register.py:108. Optional.

### At D84's repo readiness (later, before anything is published)

- A1, A36. A publish check for personal data and machine paths (`make publish-check`, not a
  gate); about 20 tracked files hold /Users/ paths (desktop/src/*.test.ts fixtures,
  specs/step-w/maps/boundary.md:101, docs/factory/research/2026-09-30/); */PROGRESS.md and
  .factory stay out of a public tree. Commit emails and history stay as they are (D98).
- A37, part (D90). Rule packs and summaries are CC BY 4.0 (SPEC-FEED point 76); the AGPL
  LICENSE covers the code. Add the data notice.
- A2, part. CONTRIBUTING.md naming the contributor agreement, once the founder picks its form.

### Memory (the assistant's own notes)

Partly rewritten on 2026-10-03 (build status, legal regime, no sign-ups). Check each line.

- A10. duly-founder-decisions.md: the DECISIONS path in its description; stances older than
  D78, D79, D80 and D84 to D100. duly-product-scope.md: D89's F-1-first order.
  duly-factory-feedback.md:8 and :39: retired lessons and the "Until then, archive" clause.
  duly-plan-package.md: the missing-docs line and the dead link. duly-check-against-register.md:
  today's share.
- A11, A20, A44, A51. duly-build-status.md and duly-founder-testing.md: the Step W state, the
  DMG path, the ci-check routine, D99's test point.
- A35, part. duly-product-positioning.md still points at specs/ui-2/competitor/ANALYSIS.md
  (removed from the repo on 2026-10-03, D100; in git history at 67bbc33). Put that beside it.
- A9, part. The file-key promise: the feed's signing starts on a passphrase file key; the
  hardware key waits (section 5).
- A43, part. duly-plan-package.md points only at the repo copies.
- A49, part. The stale date now reads 2026-10-10 in duly-legal-regime-2026-09.md. Move to
  section 7.

### This Mac

- A22. Stale Oct 1 build output and a stray read/write DMG mount. Where:
  ~/Desktop/Duly/duly/desktop/out; /Volumes/Duly. Both were gone on 2026-10-03 evening. Move
  to section 7 after a check.
- A72, stack part. The phase-0 containers were not running on 2026-10-03 evening. `make up`
  binds to 127.0.0.1 once this branch merges.
- A3, part. Delete stale build output after each new package, so an old app is not opened by
  mistake.

## 4. The founder

Only what truly needs the founder. None needs an account, a login or a payment (D98).

- C9, A72. Turn on the macOS firewall: System Settings, Network, Firewall. It was off on
  2026-10-03.
- C8, A24, A41. Say OK to moving the founder branch to step-w. Its 16 own commits hold nothing
  step-w lacks; the move rewrites the pushed branch.
- A4 (D85). Make a self-signed code-signing certificate in the login keychain: Keychain Access,
  Certificate Assistant, Create a Certificate, type Code Signing. It asks for the Mac password.
- A13. Three calls: pdf.js for viewing PDFs (before W2-P8); school steps read from a dropped PDF
  or pasted text (before W2-P6); which law-update drafts to approve, after the weekly pass
  rewrites the appeal draft (hold its current wording, A49).
- C5, A52. A date counted from a planning base and capped to a rule item stays marked planning:
  should the cap decide? No F-1 item hits it today. Where: reviews/w2-p3.md:107-111;
  docs/requirements/audits/w2-p3.md:174. With it: who writes article paragraphs, and how an
  approval is recorded until feed-sign exists.
- A2, A37. The contributor agreement's form: a CLA with a relicensing grant, or a DCO plus a
  separate grant (D84 asks for relicensing). This branch writes AGPL-3.0-only.
- A54, part (D70). Resume factory-2 at B4 (with the template) after W2-P6, or park it here.
- A43. ~/Desktop/Duly/inputs/ was the only loose copy left on 2026-10-03 evening (the audit
  matched its research to docs/research/founder). OK to move it to the Trash.
- A35, research. Four files of docs/research/founder/ name TrackMyOPT, and D52 keeps that folder
  verbatim. Say whether those notes leave too, as the rest of the TrackMyOPT research does.
- A48, A64, optional. D32 holds and plan-w2-r1 follows it. Amend D32 only if the recommendation
  date should still be asked after filing.

## 5. Waiting under D98

Each needs an account or a payment, so it waits until the founder chooses otherwise. Parts
that run on this Mac go ahead.

- The feed's hosting: the duly-feed repository, feed.tryduly.co, the key ceremony, a
  CourtListener token (FEED-P0b, FEED-P5). Meanwhile: the weekly recheck (section 2).
- The hardware key for the feed's signing (SPEC-FEED point 83, open under D90). Meanwhile: a
  passphrase file key (A9).
- An Apple developer account. Meanwhile: the self-made certificate (A4, D85).
- A55, feed part. The feed setup and its walkthrough.

## 6. Closed by a decision

No work left beyond what the lines above carry.

- A1, A36, history part (D98). Commit emails, author names and git history stay as they are.
- A71 (D100). Builders are never told what the hidden tests found. Enforcement: section 3.
- A55 (D99). No Oct 7 check: builds hold made-up data, and the next test is at W2-P6.
- A16 (D99). The test point is decided. SPEC alignment: section 1.
- A17 (D97). The three calls are decided, and so is a typed date whose field names no document:
  it is asked once with its record (D97(1)). SPECs: section 1. K7: section 3. Code: plan-w2-r1.

## 7. Done in the regroup

For the founder lane to fill: the ID, what was done, the commit, the date.

| ID | Done | Commit | Date |
|---|---|---|---|

## Index

Where each finding sits, by section.

- 1: A2, A5, A6, A7, A8, A9, A16, A17, A18, A19, A27, A35, A37, A38, A45, A50, A68, A70, A72.
- 2: A2, A3, A8, A13, A14, A15, A17, A18, A19, A21, A23, A46, A47, A48, A49, A52, A57, A58,
  A59, A60, A61, A62, A63, A64, A65, A66, A67, A69; C1, C2, C3, C4, C6, C7.
- 3: A1, A2, A3, A4, A7, A9, A10, A11, A12, A15, A17, A18, A20, A21, A22, A23, A24, A25, A26,
  A28, A29, A30, A31, A32, A33, A34, A35, A36, A37, A38, A39, A40, A41, A42, A43, A44, A47,
  A48, A49, A51, A52, A53, A54, A56, A60, A63, A68, A71, A72, A73; C2, C8.
- 4: A2, A4, A13, A24, A35, A37, A41, A43, A48, A49, A52, A54, A64, A72; C5, C8, C9.
- 5: A4, A9, A55.
- 6: A1, A16, A17, A36, A55, A71.
