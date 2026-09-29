date: 2026-09-28
lane: L-content
commit: a167ed7
failure: The CourtListener search API throttles at 5 requests a minute without a token, the clusters endpoint needs a token, and the opinion page returned 202 with an empty body to curl. Court documents are PDFs, and the quote check reads text.
fix: Space the calls 13 seconds apart. List docket entries with the search endpoint, q=docket_id:<id> and type=rd. Fetch PDFs from storage.courtlistener.com, save the PDF, and save the extracted text beside it as the snapshot.
evidence: rulepacks/PROGRESS.md, "CourtListener limits" and limit 3; "Request was throttled. Rate limit exceeded: 5/min."
verification_task: Save a court order and make tools.sources.verify find a quote in it.
seen: 1
curation: stays a lesson.
