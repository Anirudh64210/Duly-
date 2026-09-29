# 06 Email System

## Identities (ExpandRange Google Workspace domain)
Create a product subdomain, for example duly.expandrange.com (or the future duly domain; addresses are config, not code):
- support@ : human inbox. Receiving stays in Google Workspace as an alias or group so the founder replies from Gmail; the app files inbound support mail into the feedback inbox via a forwarding webhook later (v0: manual).
- updates@ : the weekly brief and update alerts. Sending identity only; replies route to support@ via Reply-To.
- no-reply@ : transactional (signup, rights confirmations, export links). Auto-replies suppressed.

## Sending
- SES in the same AWS account; domain and each identity verified; DKIM (SES tokens), SPF include, DMARC p=quarantine moving to reject after warmup; custom MAIL FROM subdomain for alignment.
- Google Workspace keeps receiving; SES only sends. No app credentials for Gmail; no Gmail API scopes (restricted-scope trap stays avoided).
- Local and CI: mailpit catches everything; the e2e suite asserts rendered briefs.
- Warmup plan: low volume from updates@ for two weeks; bounce and complaint handling via SES notifications into a jobs handler; suppression list respected before every send.

## The weekly brief (the retention spine)
Template in emails/, rendered per user by the worker:
1. Verdict line mirroring Home: Everything is in order, or the one thing that needs you.
2. Numbers: unemployment clock, week hours (if WorkBook on), EAD days left.
3. Updates since last brief, each with the impact score block: three dots, MODERATE or NONE label, Worry? and Prepare? verdicts, one-line meaning for this case, source link. Scores come from the published update_impacts computed deterministically from case attributes; the LLM never scores in the send path.
4. One next move with its deep link.
Footer: the disclaimer sentence, physical address, one-click List-Unsubscribe (RFC 8058) plus an unsubscribe page, preference link (weekly, only-affects-me, off).

## Alerts policy (calm by contract)
Immediate email only when an approved update has impact score at least MODERATE for that user, or a deadline enters its 14-day window. Everything else waits for the weekly brief. No streak mails, no re-engagement nags.

## Compliance
CAN-SPAM: accurate headers, identification, unsubscribe honored within 10 days (implemented instantly); marketing consent captured separately from account email at signup; transactional never mixed with marketing content. All sends logged (message id, template version, user) minus body PII.
