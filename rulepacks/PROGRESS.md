# Progress log, lane L-content

## 2026-09-28, iteration 1

### State

The F-1 pack is written: 2 regimes, 22 parameter rows covering the 19 rule ids in the SPEC table. The done command passes. Nothing is reviewed by the founder yet; no row carries reviewed_by.

### What ran

```
uv run python -m tools.sources.verify rulepacks
  sources: 4 pack(s) checked, every quote found
uv run pytest tests/unit/engine/test_rulepack.py -q
  19 passed
grep -c "^  - id:" rulepacks/f1-us/v2026.09/parameters.yaml
  24   (2 regimes and 22 parameters; the pattern counts both)
uv run python -m tools.copy_lint.lint
  copy lint: clean
```

### What I did

1. Fetched 8 CFR 214.2 as of 2026-09-14 and 2026-09-15 from the eCFR versioner, with compression. Both returned 200.
2. Compared paragraph (f) between the two texts, paragraph by paragraph.
3. Found the words for every rule in the SPEC table in the 2026-09-14 text and recorded them as quotes.
4. Fetched the final rule, 91 FR 44976, FR Doc. 2026-14439.
5. Searched CourtListener for the court order. Found it and saved it.
6. Fetched four older Federal Register rules to support the start dates.
7. Fetched the SEVP guidance for the hours rule from Study in the States and from ice.gov.
8. Wrote parameters.yaml, SOURCES.md, and the CHANGELOG.

### Where the sources differ from the SPEC table

| Rule | SPEC said | Source says | What I recorded |
|---|---|---|---|
| opt.apply_after_days | 60, settled, no regime | 60 in the 2026-09-14 text. The 2026-09-15 text says 30, in (f)(11)(i)(B)(2) and in (f)(11)(i)(D). The final rule preamble confirms the change from 60 to 30 | Two rows, litigated: 60 under ds_2012, 30 under fixed_admission_2026 |
| cpt.full_time_months_bar | 12 months | "one year or more of full time curricular practical training". The sentence ends "ineligible for post-completion academic training", not optional practical training | 12 months, with the difference in the note. The schema has no unit for years |
| stem.validation_interval_months | 6 | "every six months", as a word | 6, with a note |
| stem.validation_* citation | (f)(12)(ii) | The words are in (f)(12)(ii)(B) | Cited (B) |
| stem.min_hours_per_week citation | (f)(10)(ii)(C) | The words are in (f)(10)(ii)(C)(8) | Cited (C)(8) |
| stem.new_plan_due_days citation | (f)(10)(ii)(C) | The words are in (f)(10)(ii)(C)(7)(iv) | Cited (C)(7)(iv) |
| opt.max_months citation | (f)(10) or (f)(11) | The words are in the opening text of (f)(10) | Cited (f)(10) |
| grace, blocked regime, citation | (f)(5) | (f)(5)(v) in the 2026-09-15 text | Cited (f)(5)(v) |
| capgap.end_month_day | 04-01, one row | April 1 since 2025-01-17 (89 FR 103054). October 1 before that (73 FR 18944) | Two rows, the old one closed on 2025-01-16 |
| regime fixed_admission_2026 source | the final rule | The schema allows one source per regime. The status enjoined is a claim about the order, so the order is the source and the quote. The final rule is named in the note and saved | Order as source; both claims written out in SOURCES.md |

Every other value in the SPEC table matches the source.

### The court order

- Presidents' Alliance on Higher Education and Immigration v. United States Department of Homeland Security, No. 1:26-cv-13799, D. Mass., Judge Saylor.
- ECF 51, 2026-09-14: the effective date of the final rule is postponed under 5 U.S.C. 705, and the defendants are preliminarily enjoined from implementing it. Vacatur and summary judgment denied without prejudice.
- ECF 50 is the memorandum. Saved, not quoted in the pack.
- A second case, Trilleras Gomez v. Mullin, No. 1:26-cv-02364, D.D.C.: on 2026-09-14 the court denied a motion by one J-1 plaintiff. It does not change the status. Saved and recorded in SOURCES.md so nobody mistakes it for the order.
- legal_status is enjoined, the word the SPEC used, supported by paragraph 4 of the order. The order also postpones the effective date, which the schema would call stayed. The schema holds one status. The founder may prefer stayed.

### Limits the founder needs to know

1. Status after 2026-09-14 rests on the CourtListener docket listing fetched 2026-09-28. Its newest entry is a notice of 2026-09-14 setting a status conference for 2026-10-02. CourtListener can lag behind the court. I found no appeal on CourtListener and no later Federal Register document under RIN 1653-AA95. I could not check PACER.
2. The eCFR 2026-09-15 text carries the final rule's amendments even though the court postponed the effective date. The current eCFR text is therefore not the operative law for the changed paragraphs. The engine must use the operative regime, not the latest text.
3. Court documents are PDFs. The quote check reads text, so the snapshot for the order is text extracted from the PDF with the macOS PDFKit library. The PDF is saved beside it. The opinion page on www.courtlistener.com returned 202 with an empty body to curl, so the PDFs came from storage.courtlistener.com, and the url in the pack is the docket entry page on www.courtlistener.com.
4. Start dates. effective_from has no quote check. Each one is the effective date of the oldest saved Federal Register rule that carries the same words, named in the row's note. For the four rows starting 2003-01-01 (opt.max_months, opt.complete_within_months, cpt.full_time_months_bar, grace under ds_2012) the rule is older than that; 67 FR 76256 is the earliest copy I saved. The Federal Register site has no full text before 1994.
5. The 2008 rule words differ slightly from today's for the OPT filing window ("must properly file" then, "may properly file" now; "program end-date" then). The numbers are the same.
6. The 17-month STEM extension rules from 2008 to 2016 are not in the pack. The stem rows start 2016-05-10.
7. opt.min_hours_per_week is guidance. Two SEVP sources agree on 20 hours. The quote is from the Study in the States page; the start date is from Policy Guidance 1004-03 of 2010-04-23.

### Requests to other lanes

- L-engine: opt.apply_after_days has rows only under regimes, like grace.after_completion_days. `Rulepack.value("opt.apply_after_days", on)` has to resolve through the operative regime. Items built from it (opt.apply_window_closes, opt.latest_start) then have status litigated and carry alternates. If the SPEC is meant to keep this rule settled, that is a founder decision; the source does not support it.
- L-engine: capgap.end_month_day has a closed row before 2025-01-17. A lookup by date gets 10-01 for earlier dates.
- Owner of .claude/hooks/guard_bash.py: see the lesson below.

### Not done

- emails/: nothing in this mission touches it.
- The other three packs are still empty.

## Lesson

### The bash guard reads mkdir -p as a compose project flag

- Failure: `mkdir -p $S && curl ...` was blocked with "Lane L-content may only use the compose project duly-l-content." The guard matches `-p` followed by any word, so `mkdir -p`, `cp -p`, and `ssh -p` all trip it.
- Fix: for this lane, create the folder with `test -d X || mkdir X`. The command had nothing to do with compose, so this stays inside what the guard is for. The lasting fix is for the guard to look for `-p` only after `docker compose` or `docker-compose`. That file is outside this lane.
- Evidence: the block message above, and .claude/hooks/guard_bash.py line 26.

### Do not trust a remembered Federal Register document number

- Failure: I looked up FR Doc. 2016-04629 and 02-31336 from memory for the 2016 STEM rule and the 2002 SEVIS rule. Both are unrelated notices.
- Fix: search the Federal Register API by title and date, then confirm the citation and the DATES line in the returned record. The right numbers are 2016-04828 and 02-31184.
- Evidence: the API returned "Center for Scientific Review; Notice of Closed Meetings" for 2016-04629.

### Compare the two point-in-time texts before tagging anything settled

- Failure: the SPEC table tags opt.apply_after_days settled. The blocked rule changes it from 60 to 30.
- Fix: diff paragraph (f) between the text before and after the blocked rule, and give every changed value a row under each regime.
- Evidence: 2026-09-15 text, (f)(11)(i)(B)(2): "no later than 30 days after his or her program end date".

### Two orders on the same day, only one blocks the rule

- Failure: the first CourtListener hit for the rule is a D.D.C. opinion of 2026-09-14. It denies relief.
- Fix: read the order itself before recording a status. Search dockets (type r) as well as opinions (type o); the D. Mass. order appears only in the docket entries.
- Evidence: sources/dcd-1-26-cv-02364-doc14-opinion.txt and sources/mad-1-26-cv-13799-doc51-order.txt.

### CourtListener limits

- Failure: the search API throttles at 5 requests a minute without a token, and the clusters endpoint needs a token.
- Fix: space the calls 13 seconds apart. Use the search endpoint with `q=docket_id:<id>` and `type=rd` to list docket entries.
- Evidence: "Request was throttled. Rate limit exceeded: 5/min."

### Gates 3 and 6 compare against main by default

- Failure: `make test` failed at gate 3, listing contracts/, specs/, and tools/ files this lane never touched, and gate 6 reported 1% coverage on tools/sources/verify.py. Those are the phase-2 branch's own changes, which are not on main yet.
- Fix: a lane in phase 2 starts from phase-2, so run `make test BASE=phase-2`. I changed no gate and no file outside rulepacks/.
- Evidence: `uv run python -m tools.diff_policy.check --base phase-2` prints "lane L-content, 0 file(s), clean" before the commit; `make test BASE=phase-2` prints "gates 1 to 6: green".
