# 09 Feedback Loops (wired)

| # | Loop | Source | Store | Consumer | Action |
|---|---|---|---|---|---|
| L1 | User feedback | in-app Feedback, support@ | feedback table | Ops pane 5 | weekly triage to lane issues |
| L2 | Answer quality | thumbs on every AI block | answer_ratings joined to narration_audit | eval lane | bad answers become eval cases; regressions block L-narration merges |
| L3 | Rule currency | ingestion jobs (FR, USCIS, CourtListener) | review_queue | attorney gate in Ops pane 1 | approve publishes update and pack release; impacts recomputed; briefs updated |
| L4 | Correctness | gate failures, reverts, prod errors (OTel, Sentry-compatible) | CI artifacts, LESSONS proposals | curation PR | verified lessons and new golden tests |
| L5 | Usage | first-party events per events.md, no third-party SDKs | events table | Ops pane 6 | verdict views, brief opens, checklist completion steer roadmap |
| L6 | Trust and rights | consent revocations, rights requests | rights_requests | Ops pane 4 SLA timers | executed and reported monthly |
| L7 | Security findings | red-team lane, ZAP, VDP inbox, dep audits | security findings issues | L-security + founder | fix PRs, corpus growth, threat-model updates |
| L8 | Eval drift | nightly eval and holdout trends, mutation canary | evals dashboards | founder weekly | prompt or rule fixes; threshold ratchets from data |
| L9 | Email engagement | SES opens, clicks, bounces, complaints, unsubscribes | email_events | Ops pane 6 | brief content tuning, suppression hygiene, alert-policy checks |
| L10 | Attorney gate quality | review decisions and correction diffs in pane 1 | review_queue history | curator | improves classifier prompts and ingestion filters (gated) |

Rules: every loop names a store and an accountable consumer; loops feed the factory only through reviewed lanes; sensitive content never leaves its zone to power a loop (L5 and L9 carry ids and metadata only).
