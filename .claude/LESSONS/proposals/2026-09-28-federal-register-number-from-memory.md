date: 2026-09-28
lane: L-content
commit: a167ed7
failure: FR Doc. 2016-04629 and 02-31336 were looked up from memory for the 2016 STEM rule and the 2002 SEVIS rule. Both are unrelated notices.
fix: Search the Federal Register API by title and date, then confirm the citation and the DATES line in the returned record. The right numbers are 2016-04828 and 02-31184.
evidence: rulepacks/PROGRESS.md; the API returned "Center for Scientific Review; Notice of Closed Meetings" for 2016-04629.
verification_task: Find and save the Federal Register document for the 2016 STEM OPT rule, given only its name.
seen: 1
curation: stays a lesson.
