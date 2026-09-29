# Lessons for L-content

Proposed filing, 2026-09-29. Not in force until the founder accepts it.

## 2026-09-28-compare-point-in-time-texts-before-settled

- What went wrong: The SPEC table tagged opt.apply_after_days settled with no regime. The blocked final rule changes it from 60 to 30, in 8 CFR 214.2(f)(11)(i)(B)(2) of the 2026-09-15 text.
- What fixes it: Compare paragraph (f) between the saved text before and after the blocked rule, and give every changed value one row under each regime, tagged litigated.
- Evidence: rulepacks/PROGRESS.md, "Compare the two point-in-time texts before tagging anything settled"; rulepacks/f1-us/v2026.09/sources/ecfr-8cfr214.2-2026-09-15.xml.

## 2026-09-28-courtlistener-limits-and-pdf-text

- What went wrong: The CourtListener search API throttles at 5 requests a minute without a token, the clusters endpoint needs a token, and the opinion page returned 202 with an empty body to curl. Court documents are PDFs, and the quote check reads text.
- What fixes it: Space the calls 13 seconds apart. List docket entries with the search endpoint, q=docket_id:<id> and type=rd. Fetch PDFs from storage.courtlistener.com, save the PDF, and save the extracted text beside it as the snapshot.
- Evidence: rulepacks/PROGRESS.md, "CourtListener limits" and limit 3; "Request was throttled. Rate limit exceeded: 5/min."

## 2026-09-28-federal-register-number-from-memory

- What went wrong: FR Doc. 2016-04629 and 02-31336 were looked up from memory for the 2016 STEM rule and the 2002 SEVIS rule. Both are unrelated notices.
- What fixes it: Search the Federal Register API by title and date, then confirm the citation and the DATES line in the returned record. The right numbers are 2016-04828 and 02-31184.
- Evidence: rulepacks/PROGRESS.md; the API returned "Center for Scientific Review; Notice of Closed Meetings" for 2016-04629.

## 2026-09-28-read-the-order-not-the-first-hit

- What went wrong: The first CourtListener hit for the rule is a D.D.C. opinion of 2026-09-14 that denies relief. The order that blocks the rule is from D. Mass., the same day, and appears only in the docket entries.
- What fixes it: Read the order itself before recording a status. Search dockets (type r) as well as opinions (type o).
- Evidence: rulepacks/f1-us/v2026.09/sources/dcd-1-26-cv-02364-doc14-opinion.txt and mad-1-26-cv-13799-doc51-order.txt.
