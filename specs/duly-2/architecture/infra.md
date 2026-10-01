# Duly architecture: cloud hosting, deployment, caching, rate limits, scaling, recovery and cost

Status: research and proposal, 2026-10-01. Not a decision until the founder rules on section 14. Where this file and DECISIONS.md disagree, DECISIONS.md wins.

Reads with: BLUEPRINT.md sections 4 to 8, research-system.md sections 2, 8 to 12 and 15, research-security.md section 7, architecture/identity.md (sessions, Ask tokens, rate limits on sign-in), DECISIONS.md D16, D54, D55, D60, D73, D75 to D79.

Marking: **[verified]** means read in an official source in this pass (URL in section 16). **[price list]** means read from the AWS Price List API for US West (Oregon) on 2026-10-01 (`https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/<service>/current/us-west-2/index.json`). **[unverified]** means not confirmed in this pass and must be checked before it is built on. **Proposal** means a number or choice this file suggests; the founder sets it.

---

## 0. Summary

1. **The cloud is small on purpose.** Everything that knows the student runs on the device (BLUEPRINT 6). The server is a relay (accounts, device list, ciphertext log segments and blobs), a public library (signed rule bundles), a push and email sender, and, since D79, a relay to Claude on Amazon Bedrock for Ask. No server code computes a date. That keeps the bill dominated by a fixed platform block until Ask volume grows, and keeps a breach to ciphertext.
2. **Compute: ECS on Fargate (Graviton) for the API and workers; Lambda for the Ask relay, scheduled jobs and the pipeline watchers; not App Runner.** App Runner "is no longer open to new customers" and AWS points new users to ECS Express Mode [verified, apprunner-change]. The existing API is FastAPI in a container (infra/docker-compose.yml), so Fargate runs it unchanged.
3. **Edge: one CloudFront distribution for the app and API, one for the public library, AWS WAF on both, the load balancer private.** CloudFront VPC origins let the Application Load Balancer sit in a private subnet with CloudFront as "the single point of entry" [verified, cf-vpc-origins]. CloudFront flat-rate plans include WAF, DDoS protection and DNS with "no overage charges" [verified, cf-flat-rate]; the Pro plan ($15 a month) fits at launch.
4. **No API Gateway, no Redis at launch.** API Gateway throttles are "applied on a best-effort basis and should be thought of as targets rather than guaranteed request ceilings" [verified, apigw-throttling], and its per-client limits key on API keys. Duly's real limits are per account and must be enforced in the service anyway. A cache server buys little when nearly every response is private ciphertext; add ElastiCache Serverless (Valkey) when precise shared counters are needed (section 5.4).
5. **Rate limits in four layers:** WAF per IP at the edge (generous, because many students share one campus IP), per-account token buckets in the service, per-account Ask budgets in the assistant account, and an organisation-wide Ask spend breaker. Bedrock's own quotas are tokens per minute per model, and `max_tokens` is reserved up front [verified, bedrock-burndown], so the relay sets it tightly.
6. **Database: RDS for PostgreSQL, Multi-AZ, at launch; not Aurora Serverless v2 yet.** At Duly's size a db.t4g.small Multi-AZ costs about $47 a month against about $88 for the smallest always-on Multi-AZ Aurora Serverless v2 pair [price list]. Aurora's scale-to-zero suits non-production but "won't automatically pause" behind RDS Proxy and takes about 15 seconds to resume [verified, aurora-autopause].
7. **Accounts: eight, most near free.** management, security, prod-core, prod-assistant (now required by D79), prod-library, pipeline, staging, and an optional dev. Region us-west-2 (D16); backups to us-east-2 (pending founder decision C1).
8. **Infrastructure as code: Terraform, one repository, plan reviewed by a human before every apply, CI deploys through GitHub OIDC with no stored AWS keys.** CDK is an equally sound choice; the rule that matters is one tool and every account in code (research-system 12).
9. **Recovery: backup and restore across Regions, not a warm second Region.** AWS's own guidance says backup and restore suits loss of a data centre and that a Region-level plan needs more [verified, aws-dr]. Proposed targets: account database RPO 5 minutes in Region (RDS ships transaction logs "every five minutes" [verified, rds-pitr]) and 24 hours across Regions; library RTO in minutes through CloudFront origin failover; full prod rebuild in us-east-2 within 24 hours. The student's devices hold the primary copy, so a server outage delays sync and backup but loses no record.
10. **Cost (section 12): about $580 to $740 a month at 1k students, $1,190 to $1,460 at 10k, $5,300 to $7,700 at 100k.** Ask on Bedrock is the largest variable line at scale (about $2,000 to $4,000 a month at 100k students with prompt caching, about $8,000 without). Without Ask the 100k bill is about $3,300 to $3,700.

---

## 1. What the cloud does for Duly, and what it never does

| Zone | Does | Never |
|---|---|---|
| prod-core | Accounts, passkeys, sessions (identity.md), device list, ciphertext log segments and blob index, presigned S3 URLs, content-free push, update emails | Read a document, a fact, a date or a question; compute anything about a case. `/v1/compute*` is not in the production build (BLUEPRINT 6 gate) |
| prod-assistant | Ask relay: verify an Ask token (identity.md 6.6), enforce Ask budgets, call Claude on Bedrock with retention mode `none`, stream text back | Store question text; see an account id or email; receive any document value (D60) |
| prod-library | Serve the public signed bundle (TUF metadata, rule packs, Playbooks, templates) and the web app's static files | Authenticate readers; log request paths (BLUEPRINT 5.5) |
| pipeline | Watch primary sources through an allowlisted egress proxy, snapshot to S3 Object Lock, draft from public text, Ops app, publish to prod-library after founder approval | Touch any student system |

Constraints that shape every choice below:

- **Student data never goes to an outside AI provider.** Bedrock in Duly's own account, retention mode `none` enforced by SCP, a US geographic inference profile, a VPC endpoint (section 3.4).
- **The server stores ciphertext only.** Object Lock and replication protect availability, not secrecy; secrecy is the device's keys (BLUEPRINT 5).
- **Hold almost nothing** (BLUEPRINT 5.5). Short log retention, no path logs on the library, IP addresses only in WAF logs for 7 days.
- **Small team, cost matters.** Prefer managed services with no idle cluster to run; prefer one more cheap account to one more shared permission.

---

## 2. Accounts and environments

### 2.1 The accounts

AWS recommends multiple accounts as isolation boundaries from the start (research-system 10.1, citing AWS's "Organizing your AWS environment"). The CDK guide gives the same shape: development accounts, then "a CI/CD account to testing, integration, and production environments (each isolated in its own AWS Region or account)" [verified, cdk-best-practices].

| Account | Holds | Fixed cost driver | Proposal |
|---|---|---|---|
| management | Organizations, SCPs, IAM Identity Center, billing, budgets | None | Day one |
| security | Organization CloudTrail, Config, GuardDuty and Security Hub delegated admin, log archive with Object Lock | Security services per event | Day one; split into log-archive and audit when a second engineer joins |
| prod-core | API, workers, Postgres, ciphertext buckets, push, email | VPC, NAT, endpoints, load balancer, database | Day one |
| prod-assistant | Ask relay (Lambda), Ask budget table (DynamoDB), Bedrock | One VPC endpoint; tokens | Day one, because D79 puts Ask in v1 (BLUEPRINT 6 "no assistant account until a cloud model is approved" is superseded) |
| prod-library | Library bucket, web app bucket, CloudFront | Near zero (no VPC) | Day one |
| pipeline | Watchers, egress proxy, snapshots, Ops app, signing helpers | NAT, proxy task | Day one |
| staging | Same shapes as prod at minimum size, synthetic data only | Small copy of prod | Day one |
| dev | Optional cloud sandbox; the local stack (`make up`) covers most work | Scaled to zero | Later |

BLUEPRINT 6 proposed five accounts. The difference is prod-assistant (D79) and splitting prod-library out of prod (it has no VPC, so it costs almost nothing and keeps the only public bucket away from ciphertext), plus staging separate from dev so staging can carry production-shaped guardrails.

### 2.2 Guardrails (SCPs) that matter for Duly

| SCP | Why | Note |
|---|---|---|
| Deny any Region other than us-west-2, us-east-2 (backups), us-east-1 for global-service actions, and the destination Regions of the US Bedrock inference profile | D16; data residency | CloudFront certificates must be in us-east-1 ("request (or import) the certificate in the US East (N. Virginia) Region") [verified, cf-cert-region], and CloudFront log delivery is configured through the CloudWatch API in us-east-1 [verified, cf-standard-logging]. Geographic cross-Region inference needs the SCP to "allow all destination Regions in profile" [verified, bedrock-cris]. The AWS example region-deny SCP exempts global services such as IAM, CloudFront, Route 53 and STS through NotAction [unverified in this pass: the page did not render; take the exact list from the AWS page] |
| Deny Bedrock data retention modes other than `none` | D79 plus the hard rule | AWS publishes this exact SCP for both `bedrock-mantle:PutAccountDataRetention` (and project create and update) and `bedrock:PutAccountDataRetention` [verified, bedrock-retention] |
| Deny `kms:ScheduleKeyDeletion` and `kms:DisableKey` except a break-glass role | Object Lock "does not protect against losing access to the encryption keys or encryption keys being deleted" [verified, s3-objectlock] | Applies to the SSE-KMS keys on ciphertext buckets and backups |
| Deny `s3:BypassGovernanceRetention` except one deletion role | Governance-mode Object Lock is bypassable only with this permission [verified, s3-objectlock] | Matches research-security 7 ("delete my backup" finishes after the window) |
| Deny disabling CloudTrail, GuardDuty, Config; deny leaving the organisation | Standard | |
| Deny public S3 except prod-library | Only public content is public | prod-library serves through CloudFront origin access control, so even it can block public access |
| Deny creating IAM users and access keys | No long-lived keys; people use Identity Center, CI uses OIDC | research-system 10.6 |

### 2.3 Environments

| Environment | Where | Data | Shape | Cost control |
|---|---|---|---|---|
| local | Developer machine, `make up` (Postgres, MinIO, Mailpit already in infra/docker-compose.yml) | Synthetic | Same containers | Free |
| dev (optional) | dev account | Synthetic | One task per service, single-AZ database | Scheduled scale to zero; database stopped |
| staging | staging account | Synthetic only; a canary check plants synthetic SEVIS-like ids and fails the deploy if any appear in logs or outbound traffic (BLUEPRINT 6 recorded-bytes test) | Prod shape at minimum size: same Terraform modules, same SCPs, same CloudFront and WAF rules, single-AZ database | Off-hours scale down |
| prod | prod-core, prod-assistant, prod-library | Real ciphertext | Multi-AZ | Autoscaling |

Client builds (Mac, Windows, iPhone, Android, web) carry the environment's endpoints at build time; staging builds go out through TestFlight internal testing and Play internal testing only (research-system 12).

---

## 3. Compute and networking

### 3.1 Compute choice per workload

| Option | Fits Duly when | Against | Verdict |
|---|---|---|---|
| ECS on Fargate | Long-running HTTP service with a connection pool to Postgres; streaming responses; the existing FastAPI container | Pays for at least two tasks around the clock; needs a load balancer | **API and workers** |
| Lambda | Spiky, short, stateless work; scale to zero; per-request billing | 15-minute limit, 6 MB synchronous payloads (200 MB streamed), 1,000 concurrent executions by default [verified, lambda-quotas]; connection storms against Postgres without a proxy | **Ask relay, scheduled jobs, pipeline watchers, S3 event handlers** |
| App Runner | Was the simple option | "No longer open to new customers ... we do not plan to introduce new features" [verified, apprunner-change] | No |
| ECS Express Mode | One API call provisions an ECS service on Fargate, a load balancer, scaling and networking, with "no additional charge" and support for CloudFormation and Terraform [verified, ecs-express] | Its defaults (its own load balancer and public URL) differ from Duly's private-origin layout; less explicit than plain resources in Terraform | Acceptable shortcut for staging experiments; prod uses explicit ECS resources |
| EC2 or EKS | Large fleets, special hardware | Patching and cluster operations for a team of one | No |

Sizes (proposal): API task 0.5 vCPU and 1 GB at launch, 1 vCPU and 2 GB from 10k students; minimum two tasks in two Availability Zones; ARM64 (Graviton) images built multi-arch in CI. Fargate in Oregon: $0.03238 per vCPU-hour and $0.00356 per GB-hour on ARM, against $0.04048 and $0.004445 on x86 [price list], so ARM saves about 20 percent.

### 3.2 The Ask relay on Lambda

Ask (D79) is the one path where Duly handles student text in the cloud. It gets its own account and the narrowest path:

```
device ── HTTPS ──► CloudFront (app distribution, WAF) ── path /v1/ask/* ──► Lambda function URL in prod-assistant
                                                                              │  verify Ask token (JWKS from prod-core; identity.md 6.6)
                                                                              │  check and debit budget (DynamoDB, keyed by pseudonym)
                                                                              └─► Bedrock runtime via VPC interface endpoint
                                                                                   US geographic inference profile, retention mode none
```

- Lambda response streaming gives the student text as it arrives; streamed responses can be up to 200 MB [verified, lambda-quotas], far above any answer.
- The Lambda sits in a VPC with no NAT and one interface endpoint (bedrock-runtime), so it can reach Bedrock and nothing else; DynamoDB through a gateway endpoint (free).
- Question text is never logged. The relay logs a fixed schema: route, status, latency, model id, input and output token counts, budget decision, pseudonym hash with a rotating salt.
- The core API never sees question text, and the assistant account never sees an account id. CloudFront can sign requests to a Lambda function URL with origin access control [unverified in this pass: confirm OAC for function URLs together with response streaming through CloudFront in a spike before committing; fallback is an ALB in prod-assistant, which adds about $22 a month].

### 3.3 Network layout (prod-core)

```
                     Internet
                        │
                 CloudFront + WAF  (TLS ends here; certificate in us-east-1)
                        │  VPC origin (CloudFront-managed ENI, no public IP on the origin)
┌───────────────────────┼──────────────────────── VPC 10.20.0.0/16, us-west-2, two AZs ─────────┐
│  private-app subnets  ▼                                                                      │
│     internal ALB ──► ECS Fargate: api (2+ tasks)   worker (1+ task, SQS-driven)             │
│                          │                │                                                  │
│  private-data subnets    ▼                │                                                  │
│     RDS PostgreSQL Multi-AZ (no route out)                                                   │
│                                           │ push and email only                              │
│  egress subnet: egress proxy task (allowlist: APNs, FCM) ──► NAT gateway ──► internet        │
│                                                                                              │
│  VPC endpoints: S3 and DynamoDB (gateway, free); ECR api, ECR dkr, CloudWatch Logs,          │
│  Secrets Manager, KMS, SQS (interface); SES SMTP (interface) [unverified endpoint name]       │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Why a VPC origin.** CloudFront reaches an ALB, NLB or EC2 instance in a private subnet over a private connection; "you can move your origins to private subnets with no public access" [verified, cf-vpc-origins]. The VPC still needs an internet gateway attached for this to work, though it is "not used for routing traffic to origins" [verified, cf-vpc-origins]. VPC origins do not support Lambda@Edge origin triggers or gRPC [verified, cf-vpc-origins]; Duly needs neither.
- **App subnets have no route to the NAT gateway.** Only the egress proxy's subnet does, and the proxy allows only APNs and FCM hostnames (BLUEPRINT 6 "no general internet egress"). AWS service traffic goes through endpoints. A DNS Firewall allowlist ($0.60 per million queries [price list, Route 53]) is a cheap second layer.
- **Not AWS Network Firewall at launch.** $0.395 per endpoint-hour [price list], about $288 a month per AZ, which is a third of the whole launch bill. Reconsider at 100k or if an auditor requires it.
- **One NAT gateway at launch, two from 10k.** $0.045 an hour plus $0.045 per GB processed [verified, vpc-pricing; the page showed US East (Ohio), Oregon assumed equal, unverified]. Losing one AZ delays content-free wake-ups only; reminders are scheduled on the device (D73), so the risk is small.
- **Interface endpoints cost real money at this size:** $0.01 per hour per AZ each [price list], so six endpoints in two AZs are about $88 a month, more than the NAT gateway. The alternative (all AWS calls through the NAT and proxy) saves that but weakens the "no general egress" promise. Proposal: keep endpoints in prod, use one AZ of endpoints in staging.
- **Later:** IPv6 with an egress-only internet gateway (no NAT hourly charge) once APNs and FCM IPv6 reachability is confirmed [unverified]; public IPv4 addresses cost $0.005 an hour each [price list], another reason to keep the origin private.

### 3.4 Bedrock settings

| Setting | Value | Source |
|---|---|---|
| Retention mode | `none`, set by API per Region and enforced by SCP | "If your account ... is configured for zero data retention ... and you invoke a model that requires retention, Amazon Bedrock will block the request" [verified, bedrock-retention] |
| Models | Only models whose `allowed_modes` include `none`. Claude Fable 5 and 5.1 require `aws_review` (retained "for up to 30 days and may be reviewed by AWS") and are excluded. Claude Opus 4.8 is AWS's example of a model that permits `none` [verified, bedrock-retention]. Check Claude Sonnet 5.5 and Haiku 4.5 with `GET /v1/models/{id}` before choosing [unverified] | |
| Inference profile | US geographic, never global. Geographic keeps processing "within geographic boundaries"; global costs about 10 percent less but routes worldwide [verified, bedrock-cris] | The price list shows the US price 10 percent above global, for example Sonnet 5.5 at $2.20 against $2.00 per million input tokens [price list] |
| Network | VPC interface endpoint for bedrock-runtime | research-system 9.3 |
| Audit | CloudTrail records the Region that served each request (`additionalEventData.inferenceRegion`) [verified, bedrock-cris] | |
| Endpoint | `bedrock-runtime`; its quotas are separate from `bedrock-mantle` [verified, bedrock-quotas] | Pick one and request quota there |

---

## 4. CDN and HTTP caching

### 4.1 Distributions

| Distribution | Origins | Plan (proposal) | Logging |
|---|---|---|---|
| `library` (public bundle, also the web app's static files) | S3 bucket in prod-library through origin access control; a replica bucket in us-east-2 as failover origin | Flat-rate Free at 1k (1 million requests, 100 GB), Pro from 10k | **Off.** Blueprint 5.5: no path logs on the public bundle. WAF logs only blocked requests, with the URI path redacted |
| `app` (web app shell, API, Ask) | Internal ALB in prod-core through a VPC origin; Lambda function URL in prod-assistant for `/v1/ask/*` | Flat-rate Pro ($15) at launch; Business ($200) or pay-as-you-go from 100k | Standard logging v2 with chosen fields only: no `c-ip`, no `cs-uri-query`, no cookies, no user agent; IPs live only in WAF logs for 7 days |

Flat-rate facts that matter [verified, cf-flat-rate]: plans include CloudFront, WAF, DDoS protection, Route 53 DNS and CloudWatch Logs ingestion for CloudFront and WAF logs; "you will not incur overage charges"; blocked requests "never count against your usage allowance"; allowances per month are Free 1 M requests and 100 GB, Pro 10 M and 50 TB, Business 125 M and 50 TB, Premium 500 M and 50 TB; sustained excess "might" mean traffic is "served from fewer or more distant edge locations"; a plan requires a WAF web ACL; real-time logs and continuous deployment (staging distributions) are not available on plans. Data transfer from S3 or an ALB to CloudFront is free [verified, cf-flat-rate].

Pay-as-you-go comparison [price list, AmazonCloudFront]: $0.085 per GB for the first 10 TB in the United States and $0.01 per 10,000 HTTPS requests; AWS WAF regional pricing is $5 per web ACL, $1 per rule and $0.60 per million requests [price list, awswaf]. The always-free CloudFront tier (1 TB and 10 million requests a month) is commonly quoted [unverified in this pass].

### 4.2 Cache rules by path

| Path | Cache-Control from origin | CloudFront cache policy | Why |
|---|---|---|---|
| `library/timestamp.json` (TUF) | `public, max-age=60, stale-if-error=86400` | TTLs honour origin; min TTL 0 | TUF requires timestamp metadata at a fixed name, re-signed often [verified, tuf-spec]. Clients check its expiry inside the signed file, so serving a stale copy during an origin outage is safe: the device sees an old expiry and says "Can't tell yet" when it passes |
| `library/<version>.root.json`, `<version>.snapshot.json`, `<version>.targets.json`, `targets/<hash>.<name>` | `public, max-age=31536000, immutable` | Long TTLs | TUF consistent snapshots prefix files with version or hash so a repository can update "without disrupting clients reading older ones", which suits CDNs [verified, tuf-spec]. Content-addressed names mean no invalidations |
| Web app `index.html` | `no-cache` (revalidate each time) | min TTL 0 | Lets a new release reach browsers at once; the release hash page (BLUEPRINT 5.5, Code Verify) stays consistent |
| Web app hashed assets | `public, max-age=31536000, immutable` | Long TTLs | Standard |
| `/v1/*` (API) | `no-store` | AWS managed `CachingDisabled`; origin request policy forwards `Authorization` and `DPoP` | **Pitfall:** if a cache policy's minimum TTL is above 0, CloudFront caches the object for that TTL "even if the `Cache-Control: no-cache`, `no-store`, and/or `private` directives are present" [verified, cf-expiration]. The API behaviour must use min TTL 0 or caching disabled, tested in CI against the Terraform plan |
| `/v1/ask/*` | `no-store` | `CachingDisabled` | Never cached, never logged |
| Ciphertext blobs | Not through CloudFront at launch: presigned S3 URLs, random object keys | n/a | Each object is fetched by one student's devices; a CDN adds nothing but logs. Revisit at 100k for egress cost (section 12.4) |

CloudFront supports `stale-while-revalidate` and `stale-if-error` [verified, cf-expiration]. Invalidations: first 1,000 paths a month free, then $0.005 each [price list]; with content-addressed names Duly should need almost none.

### 4.3 What is cached on the device (the cache that matters most)

The device is Duly's main cache: the whole record, the last verified bundle and the engine run offline. Sync uses a cursor (`GET /v1/log?since=<seq>`), so a device downloads only new segments; an unchanged cursor returns 304 with an ETag. This, not a server cache, is what keeps request volume low.

### 4.4 Server-side caches

| Need | Launch answer | When to change |
|---|---|---|
| Rate-limit counters | In-process token buckets per task for burst control (approximate across tasks), plus Postgres for daily and hourly counts on costly actions (sign-up, pairing, backup writes); DynamoDB in prod-assistant for Ask budgets (atomic conditional updates) | When the API runs more than about four tasks, or approximate per-task limits let abuse through: ElastiCache Serverless for Valkey, $0.084 per GB-hour with a 100 MB minimum (about $6 a month) and $0.0023 per million ECPUs [verified, elasticache-pricing; ECPU price confirmed in price list for Oregon, storage price shown without Region] |
| JWKS, device-list signatures, bundle manifest | In-process memory with short TTL | Never needs a shared cache |
| Session lookups | Postgres with an index; 10-minute access tokens are verified by signature without a lookup (identity.md 6.1) | Valkey if p95 latency demands it |

Stripe's guidance applies when a shared limiter arrives: token buckets in Redis, "fail open" so a limiter outage does not block requests, and dark-launch limits before enforcing them [verified, stripe-rate-limiters].

---

## 5. Rate limiting and abuse protection

### 5.1 Layers

| Layer | Mechanism | Limits (proposal; dark-launch first, tune with data) | On failure of the limiter |
|---|---|---|---|
| 1. Edge | WAF rate-based rules on CloudFront, keyed by IP, scope-down by path | Sign-in and sign-up ceremonies: 100 per 5 minutes per IP; all `/v1/*`: 3,000 per 5 minutes per IP; `/v1/ask/*`: 300 per 5 minutes per IP. AWS managed common rule set and IP reputation list | WAF is in the request path; no separate failure mode |
| 2. Service, per account | Token bucket per account and route class | Sync reads 10 per second, burst 50; sync writes 5 per second, burst 20; blob upload URLs 60 per hour; storage quota per account (proposal 2 GB); identity limits in identity.md 4 and 5.3 | Fail open for sync reads and writes (a limiter bug must not stop backups); fail closed for sign-up and pairing |
| 3. Ask, per pseudonym | DynamoDB budget per pseudonym: questions and tokens | 30 questions an hour, 200 a day (identity.md 6.6); 1 in flight at a time; proposal 300,000 tokens a day | Fail closed: Ask shows "Ask is busy, try again" and the on-device guides still work |
| 4. Ask, organisation | Spend breaker: a counter of tokens per hour across all students; a signed config flag turns Ask to on-device guides only | Proposal: alert at 150 percent of the 7-day hourly median; auto-trip at 300 percent | Fail closed |
| 5. Bedrock quotas | Per-model tokens per minute and, for some models, requests per minute; tokens per day per account [verified, bedrock-runtime-quotas] | Request increases before launch and before each 10x | Bedrock returns throttling; relay retries once with jitter, then the step-back |

Why WAF limits are generous: university networks put thousands of students behind a few addresses, and a student on a campus network must not be locked out because a classmate is busy. WAF rate rules can aggregate by IP, by a forwarded IP header or by custom keys; windows are 60, 120, 300 or 600 seconds; the lowest limit is 10; and WAF "does not guarantee an exact limit match" [verified, waf-rate-based]. Per-account limits are the precise tool.

Why not API Gateway usage plans: per-client throttles in API Gateway apply "to clients that use API keys associated with your usage plan", all throttles are best effort, and the account default is 10,000 requests per second with a 5,000 burst bucket [verified, apigw-throttling, apigw-quotas]. Duly's clients authenticate with DPoP-bound tokens, not API keys, so the limit has to live where the token is checked.

### 5.2 Bedrock specifics that change the design

- **`max_tokens` is reserved at the start.** Bedrock deducts "Total input tokens + max_tokens" when a request starts and settles later; the AWS example shows a 32,000 `max_tokens` request reserving 36,000 tokens to produce 1,000 [verified, bedrock-burndown]. The relay sets `max_tokens` per template family (proposal 800), not a large default.
- **Output tokens burn quota faster than they bill.** Output burndown is 15x for Claude 4.8 models, 10x for Opus 5.5, Sonnet 5, Opus 5 and Fable 5.1, 5x for 4.7 and below; billing counts real tokens only [verified, bedrock-burndown]. Sonnet 5.5 is not listed [unverified]. Capacity planning uses the burndown figure.
- **Prompt caching** cuts cost and quota: cache reads "are not counted toward your quota" [verified, bedrock-burndown] and are billed at a tenth of input (Sonnet 5.5 US: $0.22 against $2.20 per million) [price list]. The system prompt and guide catalogue go first and stay byte-identical across students so the cache hits.
- **Quota increases are not automatic.** "Priority will be given to customers who generate traffic that consumes their existing quota allocation" [verified, bedrock-runtime-quotas]. Request the US cross-Region tokens-per-minute increase with a load-test record a month before launch.

### 5.3 Other abuse paths

| Path | Control |
|---|---|
| Storage abuse (free backup used as a file host) | Per-account quota; uploads only through presigned requests that fix size and checksum; Object Lock uploads need `Content-MD5` or an SDK checksum header [verified, s3-objectlock]; the API refuses blobs without the envelope header (research-security 7) |
| Sign-up farms | WAF limits on ceremonies; App Attest and Play Integrity as risk signals, never a hard gate (identity.md 4) |
| Ask used as a free general chatbot | Templates and the boundary validator (BLUEPRINT 4.3); per-pseudonym budgets; the spend breaker |
| Scraping the library | It is public by design; CloudFront absorbs it; flat-rate plans do not bill overages |
| DDoS | CloudFront and WAF in front of everything; nothing public in the VPC except through CloudFront |

---

## 6. Scaling

### 6.1 What scales and how

| Component | Mechanism | Signal | First change expected |
|---|---|---|---|
| API tasks | ECS target tracking; "scales out proportionally to the metric as fast as it can, but scales in more gradually"; multiple policies allowed, scale-in only when all agree [verified, ecs-target-tracking] | CPU 60 percent and ALB requests per target | More tasks; then 1 vCPU tasks around 10k students |
| Workers | Target tracking on SQS queue depth per task | Backlog per task | Second task for push fan-out after a library publish |
| Ask relay | Lambda concurrency, default 1,000 per Region and 1,000 new environments every 10 seconds per function [verified, lambda-quotas] | Throttles, Bedrock throttling | Reserved concurrency to cap spend; quota increase at Bedrock, not Lambda |
| Postgres | Vertical (instance class), then storage | CPU over 60 percent sustained, connections over half of max, write latency | db.t4g.small to db.t4g.medium near 10k; db.m7g.large near 100k (burstable instances run out of CPU credits under steady load [unverified wording]) |
| Ciphertext storage | S3 (no capacity planning) | Cost | Storage class for the replica (section 12.4) |
| Library | CloudFront | Requests | Plan tier |

Load: at 100k students, about 2,000 API requests per active student a month gives about 100 million requests a month, roughly 40 per second on average and a few hundred per second at peak (proposal, to measure). This is small for Fargate and Postgres; the design does not need sharding, queues for reads, or multi-Region writes.

### 6.2 Connection pooling

- SQLAlchemy pool per task: proposal `pool_size=5`, `max_overflow=5`, `pool_pre_ping=True`, statement timeout 5 seconds. Ten tasks at most open 100 connections, far under Postgres defaults (Aurora Serverless v2 PostgreSQL defaults range from 189 connections at 1 ACU to 5,000, and are capped at 2,000 when the minimum is 0 or 0.5 ACU [verified, aurora-capacity]; RDS instance defaults also scale with memory [unverified figures]).
- **No RDS Proxy at launch.** It is useful when many Lambda functions open connections; Duly's database clients are a handful of Fargate tasks. Proxy costs $0.015 per vCPU-hour of the database [price list] and, on Aurora, keeps instances from auto-pausing [verified, aurora-autopause]. Add it if Lambda functions ever talk to Postgres.

### 6.3 Read replicas

Not needed in the foreseeable range: the server's reads are a student's own small rows. Two cautions for later: a Multi-AZ standby "can't" serve reads [verified, rds-multiaz]; and RDS-managed master passwords in Secrets Manager do not support creating read replicas or Blue/Green deployments [verified, rds-secrets]. Use a separate application database user with its own secret from the start, so neither limitation blocks a later change.

### 6.4 Database choice

| Option | Monthly at launch (Oregon) | For | Against |
|---|---|---|---|
| **RDS for PostgreSQL, Multi-AZ, db.t4g.small, 20 GB gp3** | $47.45 instance + $4.60 storage [price list] | Cheapest Multi-AZ Postgres; PITR within 5 minutes; same engine as local (Postgres 16) | Failover takes a minute or two [unverified figure]; storage provisioned |
| Aurora PostgreSQL Serverless v2, writer + reader at 0.5 ACU minimum | $87.60 + $0.10 per GB-month + $0.20 per million I/Os [price list] | Fast failover; storage grows itself; scales with load | Higher floor; scale to zero only without Proxy and with about 15 seconds to resume, longer after a day paused [verified, aurora-autopause] |
| Aurora Serverless v2 with auto-pause | Near zero when idle | Good for staging and dev | Not for prod: a student's first sync after a quiet spell would wait |

Proposal: RDS for PostgreSQL Multi-AZ in prod; a single-AZ db.t4g.micro ($11.68 a month [price list]) in staging, stopped off hours. Revisit Aurora at 100k students or if failover time becomes a measured problem.

---

## 7. Secrets and keys

| Secret or key | Where | Rotation | Notes |
|---|---|---|---|
| Postgres master password | Secrets Manager, managed by RDS ("rotates the secret every seven days by default") [verified, rds-secrets] | Automatic | Used only by migrations and break-glass |
| Postgres application user | Secrets Manager, injected into the ECS task at start | Rotation function, proposal 30 days | Least privilege: no DDL |
| Token signing key (access tokens, Ask tokens) | KMS asymmetric key (ES256), sign only, never exported (identity.md 6.1) | New key yearly, JWKS publishes both during overlap | $1 a month per key; asymmetric requests $0.15 per 10,000 [price list] |
| Email encryption and lookup HMAC | KMS (identity.md 2) | Key rotation on | |
| SSE-KMS on ciphertext buckets | KMS key per bucket; a separate key in us-east-2 for the replica | Annual rotation on | Second layer only; never described as end-to-end (research-security 7) |
| APNs key, FCM credentials, SES SMTP credentials | Secrets Manager | On staff change and yearly | |
| TUF root and threshold keys | **Offline**, hardware keys held by the named signers (BLUEPRINT 5.5) | Per TUF ceremony | Never in AWS |
| TUF timestamp and snapshot online keys | KMS asymmetric keys in pipeline | Per TUF policy | Online by design: the timestamp role "requires an online key" with limited authority [verified, tuf-spec] |
| Terraform state | S3 bucket in management or security account, SSE-KMS, versioning, S3-native locking (`use_lockfile`; DynamoDB locking "is deprecated") [verified, tf-s3-backend] | n/a | Terraform state is "a plaintext file, which includes any secret values"; use ephemeral values and write-only arguments so secrets never enter state [verified, tf-sensitive-state] |
| CI credentials | None stored. GitHub Actions assumes roles through OIDC, trust pinned to repository and environment (research-system 10.6) | Per job | |

Secrets Manager: $0.40 per secret a month and $0.05 per 10,000 API calls [verified, sm-pricing; same in price list]. About 10 secrets per account is $4 a month.

---

## 8. Backups and disaster recovery

### 8.1 What is lost if each piece is lost

| Data | Primary copy | Server copy | If the server copy is lost |
|---|---|---|---|
| Student record and documents | The student's devices (D54) | Ciphertext log segments and blobs (optional backup) | Nothing until the student also loses every device; then the backup matters. Treat backup as must-not-lose |
| Accounts, passkeys, device list, sessions, blob index | Postgres | Snapshots and logs | Students cannot sign in or sync until restored; their data is safe on devices |
| Public library | Signed releases in git and the release pipeline | S3 in prod-library plus the us-east-2 replica | Devices keep the last verified bundle and show "Can't tell yet" when its timestamp expires |
| Pipeline snapshots of law sources | S3 Object Lock (compliance mode) | Replica | Audit trail of why a rule changed; reproducible from public sources in most cases |
| Ask | Stateless | None | Ask falls back to on-device guides |

### 8.2 Targets (proposal)

| Scenario | RPO | RTO | How |
|---|---|---|---|
| Bad deploy | 0 | 15 minutes | ECS deployment circuit breaker and alarm rollback; expand-then-contract database migrations so the previous version still runs |
| Accidental deletion or corruption in Postgres | 5 minutes | 2 hours | PITR: "RDS uploads transaction logs ... every five minutes"; restore creates a new instance [verified, rds-pitr]; retention proposal 35 days |
| Ciphertext deleted by mistake or by an attacker | 0 | Hours | Versioning plus Object Lock governance mode (research-security 7); replica in us-east-2 keeps objects when the source gets a delete marker, by default [verified, aws-dr] |
| Account takeover of prod-core (attacker deletes backups) | 24 hours for Postgres | 24 hours | AWS Backup copies of the database into a logically air-gapped vault (compliance-mode lock, restorable from another account) [verified, aws-backup-lag]; Aurora clusters must be encrypted for this [verified]; SCPs deny key deletion and Object Lock bypass |
| Loss of an Availability Zone | 0 (synchronous standby) | Minutes | Multi-AZ RDS; tasks in two AZs |
| Loss of us-west-2 | Postgres 24 hours (daily cross-Region snapshot copy; hourly costs little more); ciphertext minutes (S3 replication; Replication Time Control for a stated SLA) | Library: minutes. Sync and sign-in: 24 hours | CloudFront origin failover to the us-east-2 library replica, per request [verified, aws-dr]; rebuild prod-core in us-east-2 from Terraform, restore the snapshot copy. Backup and restore, not pilot light: AWS notes that without IaC a restore in another Region "may ... exceed your RTO" [verified, aws-dr] |

The AWS whitepaper's own guidance: backup and restore covers a data-centre loss; "if your definition of a disaster goes beyond ... to that of a Region ... you should consider Pilot Light, Warm Standby, or Multi-Site Active/Active", and failover should rely on data-plane operations [verified, aws-dr]. For Duly a 24-hour Region outage is a delay, not data loss, because the record lives on the device. Pilot light (a standing scaled-down copy in us-east-2) costs roughly another $150 a month at launch and is a founder decision.

### 8.3 Drills

- **Restore drill on every release** (research-security 7, BLUEPRINT 6 "daily canary restore"): restore last night's snapshot into staging, open a synthetic account's backup with its recovery kit, compare hashes. AWS: "Your backup strategy must include testing your backups" [verified, aws-dr].
- **Yearly Region game day:** rebuild prod-core in us-east-2 from Terraform with synthetic data; time it against the RTO.

---

## 9. Infrastructure as code

### 9.1 Terraform against CDK

| Factor | Terraform (or OpenTofu) | AWS CDK (TypeScript) |
|---|---|---|
| Review before change | `terraform plan` is a readable diff of every resource, which a human reads before apply | `cdk diff` gives the same over CloudFormation changes |
| State | You run it: an S3 bucket with encryption, versioning and native locking [verified, tf-s3-backend]; state can hold secrets in plaintext unless ephemeral values are used [verified, tf-sensitive-state] | Managed by CloudFormation; failed deploys roll back |
| Multi-account, multi-Region (us-east-1 certificates, us-east-2 backups) | Provider aliases; one module set for all accounts | Needs bootstrapping per account and Region; cross-Region references for CloudFront certificates |
| Guardrail checks | Policy as code on the plan (OPA conftest, Checkov) [unverified tool choice] | cdk-nag, CloudFormation Guard; AWS warns "constructs aren't enough for compliance" and recommends SCPs and permission boundaries as the enforcement [verified, cdk-best-practices] |
| Licence | BSL 1.1 since August 2023; using it to manage your own infrastructure needs no commercial licence [verified, hashicorp-license-faq]. OpenTofu is the MPL-2.0 fork under the Linux Foundation, working with the same providers [verified, opentofu-faq] | Apache 2.0 [unverified] |
| Who writes it | Lanes and agents write HCL fluently; plans are the review artefact | TypeScript, same as web |

**Proposal: Terraform**, pinned version, with OpenTofu as the licence escape hatch. The deciding reasons are the reviewable plan as the one artefact a human approves before any apply, and a single tool across eight accounts and three Regions. CDK remains a fine choice if the founder prefers TypeScript everywhere; do not mix the two.

### 9.2 Rules for infrastructure code

- One repository directory `infra/terraform/` with modules (`network`, `ecs-service`, `rds`, `ciphertext-bucket`, `cloudfront-app`, `cloudfront-library`, `assistant`, `pipeline`) and one root per account and environment.
- Implementation lanes may change modules; apply happens only from CI after a human approves the plan for staging and again for prod (research-system 12). Agents hold no cloud credentials (BLUEPRINT 5.5).
- Plan checks in CI that fail the build: any cache behaviour on `/v1/*` with min TTL above 0; any bucket without Block Public Access outside prod-library; any security group open to 0.0.0.0/0 except through CloudFront; any log group without a retention period; any IAM policy with `*` on `kms:Decrypt`.
- Stateful resources (database, buckets, KMS keys) in separate roots with deletion protection and `prevent_destroy`, the Terraform analogue of CDK's advice to keep stateful resources in a separate stack with termination protection [verified, cdk-best-practices].

---

## 10. Deployment

| Step | What happens | Gate |
|---|---|---|
| Pull request | Gates 1 to 6, unit and property tests, `terraform plan` for touched roots, container scan, SBOM | Required checks |
| Merge to main | Dated tag (D46); build images once (ARM64), sign them, push to ECR in a shared tooling location [unverified: ECR cross-account pull setup] | |
| Deploy to staging | Database migration task (expand only), ECS rolling deploy with circuit breaker, smoke tests, recorded-bytes canary (BLUEPRINT 6), restore drill | All pass |
| Deploy to prod | Manual approval in the GitHub environment; same image digest; migration then rolling deploy; CloudWatch alarms watched for 15 minutes with automatic rollback | Founder or second signer approves |
| Contract migration (drop old columns) | Separate release after every client version that used them has aged out | |
| Library publish | Separate pipeline: TUF signing, staged rollout 1 percent, 10 percent, 100 percent (BLUEPRINT 5.5) | Two approvals for date rules |

---

## 11. Observability hooks this layer provides

Kept short; the observability section owns the detail. Infrastructure supplies: CloudWatch Logs with a retention on every group (proposal 30 days for app logs, 7 days for WAF logs) and data protection policies as the second layer ($0.12 per GB scanned [price list]); log ingestion at $0.50 per GB and storage at $0.03 per GB-month [price list]; alarms at $0.10 each [price list]; GuardDuty on CloudTrail events ($4 per million) and Fargate runtime ($1.50 per vCPU-month for the first 500) [price list]; AWS Budgets and Cost Anomaly Detection alerts per account [unverified pricing; free at low volume].

---

## 12. Cost at 1k, 10k and 100k students

### 12.1 Unit prices used (US West Oregon unless noted, 2026-10-01)

| Item | Price | Source |
|---|---|---|
| Fargate ARM | $0.03238 per vCPU-hour, $0.00356 per GB-hour | price list |
| Application Load Balancer | $0.0225 per hour, $0.008 per LCU-hour | price list |
| NAT gateway | $0.045 per hour, $0.045 per GB | vpc-pricing (Ohio shown; Oregon assumed equal) |
| Interface VPC endpoint | $0.01 per hour per AZ, $0.01 per GB | price list, privatelink-pricing |
| RDS PostgreSQL Multi-AZ | db.t4g.small $0.065, db.t4g.medium $0.129, db.m7g.large $0.337 per hour; gp3 Multi-AZ $0.23 per GB-month | price list |
| RDS PostgreSQL single-AZ | db.t4g.micro $0.016 per hour | price list |
| Aurora Serverless v2 | $0.12 per ACU-hour; storage $0.10 per GB-month; I/O $0.20 per million | price list |
| S3 Standard | **$0.023 per GB-month** (first 50 TB) | price list. Corrects research-system 15.1, which used $0.0265 |
| S3 requests | $0.005 per 1,000 PUT; $0.0004 per 1,000 GET | price list |
| Data transfer out to internet | $0.09 per GB first 10 TB | price list |
| Cross-Region transfer Oregon to Ohio | $0.02 per GB | price list |
| CloudFront flat rate | Free $0, Pro $15, Business $200, Premium $1,000 a month | cf-flat-rate |
| CloudFront pay as you go | $0.085 per GB, $0.01 per 10,000 HTTPS requests | price list |
| Lambda ARM | $0.0000133334 per GB-second, $0.20 per million requests | price list |
| Secrets Manager | $0.40 per secret-month | price list |
| KMS | $1 per key-month (research-system 15.1); $0.03 per 10,000 symmetric requests | price list |
| CloudWatch Logs | $0.50 per GB ingested, $0.03 per GB-month stored | price list |
| Bedrock, US geographic profile | Claude Haiku 4.5: $1.10 input, $5.50 output, $0.11 cache read per million. Claude Sonnet 5.5: $2.20, $11.00, $0.22. Claude Opus 4.8: $5.50, $27.50, $0.55 | price list (AmazonBedrockFoundationModels) |
| SES | $0.10 per 1,000 emails | research-system 15.1 (third-party; unverified here) |

### 12.2 Assumptions (proposal, to replace with measurements)

- 60 percent of students turn on backup; 300 MB each plus 20 percent versions (research-system 15.2). Stored: 216 GB, 2.16 TB, 21.6 TB.
- A full copy in us-east-2 (founder decision C1) in the same storage class.
- Half of students active in a month. 600 API requests per active student a month through CloudFront (sync is cursor-based); 200 blob PUTs and 1,000 GETs per backing-up student.
- Data out: 50 MB a month of sync downloads per backing-up student plus 5 percent of stored data restored a month; the first 100 GB a month free [unverified].
- Ask: 8 questions per active student a month; 6,000 input tokens (5,000 of them a cached system prompt and guide catalogue) and 600 output tokens per question. Cost per question: Haiku 4.5 about $0.005; Sonnet 5.5 about $0.010 with caching, $0.020 without.
- 6 update emails per student a month.
- Staging runs at minimum size; the cloud dev account is not used (local stack instead).

### 12.3 Monthly estimate

| Line | 1k | 10k | 100k |
|---|---|---|---|
| Fargate (API and workers) | $36 | $100 | $200 |
| Load balancer | $22 | $34 | $75 |
| Postgres (Multi-AZ, storage, backups) | $52 | $106 | $290 |
| NAT gateway and egress proxy | $40 | $75 | $85 |
| Interface endpoints (prod-core) | $88 | $90 | $110 |
| CloudFront and WAF (app and library) | $15 | $30 | $215 to $400 |
| S3 ciphertext, replica, requests, replication transfer | $12 | $115 | $1,180 |
| Data transfer out (blobs) | $0 | $30 | $360 |
| CloudWatch, alarms, data protection | $20 | $40 | $175 |
| Secrets, KMS, SES, Route 53 | $15 | $25 | $85 |
| **prod-core and prod-library subtotal** | **$300** | **$645** | **$2,775 to $2,960** |
| prod-assistant fixed (endpoint, Lambda, DynamoDB) | $16 | $20 | $60 |
| Bedrock tokens (Haiku 4.5 to Sonnet 5.5, cached) | $20 to $40 | $200 to $400 | $1,980 to $3,960 |
| Staging | $100 to $145 | $120 | $150 |
| Pipeline (watchers, proxy, NAT, Ops app, drafting on public text) | $100 to $135 | $120 | $150 |
| Security and management (CloudTrail, GuardDuty, Config, Security Hub) | $40 to $100 | $80 to $150 | $200 to $400 [unverified for Config and Security Hub] |
| **Total, expected** | **about $580 to $740** | **about $1,190 to $1,460** | **about $5,300 to $7,700** |
| Per student per month | $0.58 to $0.74 | $0.12 to $0.15 | $0.05 to $0.08 |
| Ask pessimistic (Sonnet 5.5 without caching, 4x questions) | +$280 | +$2,800 | +$28,000 |
| Without Ask | about $540 to $680 | about $970 to $1,040 | about $3,300 to $3,700 |

### 12.4 Readings and levers

1. **At 1k the bill is the platform**, and a third of prod-core is networking (endpoints and NAT) that buys the "no general egress" promise. Dropping endpoints for NAT-only saves about $88 a month at the cost of that promise; this is a founder trade, not an engineering one.
2. **At 100k the two big lines are Ask and storage.** Ask: prompt caching halves cost; Haiku-class routing for most questions halves it again; per-pseudonym budgets bound the worst case; the on-device router (BLUEPRINT 4.2) answering common questions without a model is the largest lever. Storage: the us-east-2 replica in an infrequent-access class roughly halves the replica line [unverified Ohio prices]; padding steps and version retention (research-system 15.3) matter.
3. **Blob egress at 100k (about $360)** can move inside a CloudFront Business plan's 50 TB allowance by serving blob downloads through CloudFront with caching disabled; check that the request count stays within the allowance.
4. **Not included:** Apple and Google developer fees, Windows code-signing certificate, domain, counsel, penetration test, outside crypto audit, SOC 2, people, AWS Support plan (Business support is a percentage of spend with a minimum [unverified]).

---

## 13. Corrections and updates to earlier documents

| Earlier text | Update | Source |
|---|---|---|
| research-system 15.1: S3 Standard $0.0265 per GB in Oregon | $0.023 for the first 50 TB | price list |
| research-system 10.3: Aurora Serverless v2 for the database | RDS for PostgreSQL Multi-AZ at launch; Aurora later if needed (section 6.4) | price list, aurora-autopause |
| BLUEPRINT 6 "No assistant account until a cloud model is approved" | D79 approved Ask on Bedrock; prod-assistant is needed now | DECISIONS D79 |
| research-system 9.3: "some newer Claude models require aws_review (Fable 5 and 5.1)" | Still true; the SCP and the per-model `allowed_modes` check are now documented by AWS, and Opus 4.8 is AWS's example of a model that allows `none` | bedrock-retention |
| research-system 15.1: Bedrock prices from a third party | Price list now gives Oregon prices, and the US geographic profile is 10 percent above global | price list, bedrock-cris |
| Option "App Runner" in any plan | Closed to new customers | apprunner-change |

---

## 14. Decisions for the founder

1. **Accounts:** eight accounts as in 2.1 (prod-assistant and prod-library separate), or the five in BLUEPRINT 6 plus prod-assistant.
2. **Database:** RDS for PostgreSQL Multi-AZ at launch (recommended) or Aurora Serverless v2.
3. **Network posture:** VPC endpoints plus allowlisted egress (recommended, about $88 a month more at launch) or NAT-only.
4. **IaC tool:** Terraform (recommended) or CDK. One, not both.
5. **Disaster recovery level:** backup and restore with a 24-hour Region RTO (recommended) or pilot light in us-east-2 (about $150 a month more).
6. **Second Region for backups:** us-east-2 (research-system C1), and whether the replica uses a cheaper storage class.
7. **Ask model and budgets:** which Claude model (after checking it allows retention `none`), the per-student daily budget, and the spend breaker thresholds.
8. **CloudFront plan:** flat-rate Pro at launch (recommended) or pay-as-you-go.
9. **Rate-limit numbers in 5.1:** accept as starting values to dark-launch.
10. **Who approves prod applies and deploys** besides the founder (BLUEPRINT 9 item 16, second signer).

---

## 15. Unverified in this pass (check before building on)

- Lambda function URL behind CloudFront with origin access control and response streaming together (3.2).
- Interface endpoint name and availability for SES SMTP in us-west-2; APNs and FCM over IPv6.
- NAT gateway price in Oregon (Ohio figure used).
- Allowed retention modes for Claude Sonnet 5.5 and Haiku 4.5; output burndown rate for Sonnet 5.5.
- The exact NotAction list in AWS's region-deny SCP example.
- CloudFront always-free tier figures; AWS's 100 GB monthly free data transfer out.
- RDS Multi-AZ failover duration and RDS default `max_connections` by class; t4g CPU credit behaviour under steady load.
- Config and Security Hub costs; AWS Support plan pricing; SES price.
- ElastiCache Serverless Valkey storage price in Oregon.
- App Attest platform coverage (Apple pages did not render; identity.md notes the same).
- Ohio storage prices for infrequent-access classes.

---

## 16. Sources

- [apprunner-change] AWS App Runner availability change: https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html
- [ecs-express] Amazon ECS Express Mode: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-overview.html
- [ecs-target-tracking] ECS target tracking scaling: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-autoscaling-targettracking.html
- [lambda-quotas] Lambda quotas: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- [apigw-throttling] API Gateway request throttling: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html
- [apigw-quotas] API Gateway quotas: https://docs.aws.amazon.com/apigateway/latest/developerguide/limits.html
- [waf-rate-based] AWS WAF rate-based rule settings: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-high-level-settings.html
- [waf-logging] AWS WAF log redaction and filtering: https://docs.aws.amazon.com/waf/latest/developerguide/logging-management.html
- [cf-flat-rate] CloudFront flat-rate pricing plans: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html and https://aws.amazon.com/cloudfront/pricing/
- [cf-vpc-origins] CloudFront VPC origins: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-vpc-origins.html
- [cf-expiration] CloudFront cache expiration and stale directives: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html
- [cf-standard-logging] CloudFront standard logging v2: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logging.html
- [cf-cert-region] CloudFront certificate requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- [vpc-pricing] Amazon VPC pricing: https://aws.amazon.com/vpc/pricing/
- [privatelink-pricing] AWS PrivateLink pricing: https://aws.amazon.com/privatelink/pricing/
- [elasticache-pricing] ElastiCache pricing: https://aws.amazon.com/elasticache/pricing/
- [aurora-pricing] Aurora pricing: https://aws.amazon.com/rds/aurora/pricing/
- [aurora-autopause] Aurora Serverless v2 auto-pause: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2-auto-pause.html
- [aurora-capacity] Aurora Serverless v2 capacity and max_connections: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.setting-capacity.html
- [rds-proxy-pricing] RDS Proxy pricing: https://aws.amazon.com/rds/proxy/pricing/
- [rds-multiaz] RDS Multi-AZ DB instance deployments: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html
- [rds-pitr] RDS point-in-time restore: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html
- [rds-secrets] RDS and Secrets Manager: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html
- [sm-pricing] Secrets Manager pricing: https://aws.amazon.com/secrets-manager/pricing/
- [s3-objectlock] S3 Object Lock considerations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-managing.html
- [aws-backup-lag] AWS Backup logically air-gapped vault: https://docs.aws.amazon.com/aws-backup/latest/devguide/logicallyairgappedvault.html
- [aws-dr] Disaster recovery of workloads on AWS, options in the cloud: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html
- [bedrock-retention] Bedrock data retention: https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html
- [bedrock-quotas] Bedrock quotas: https://docs.aws.amazon.com/bedrock/latest/userguide/quotas.html
- [bedrock-runtime-quotas] Bedrock runtime quotas: https://docs.aws.amazon.com/bedrock/latest/userguide/quotas-runtime.html
- [bedrock-burndown] How tokens are counted in Bedrock: https://docs.aws.amazon.com/bedrock/latest/userguide/quotas-token-burndown.html
- [bedrock-cris] Bedrock cross-Region inference: https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html
- [tuf-spec] The Update Framework specification: https://theupdateframework.github.io/specification/latest/
- [cdk-best-practices] AWS CDK best practices: https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html
- [hashicorp-license-faq] HashiCorp licensing FAQ: https://www.hashicorp.com/en/license-faq
- [opentofu-faq] OpenTofu FAQ: https://opentofu.org/faq/
- [tf-sensitive-state] Terraform sensitive data in state: https://developer.hashicorp.com/terraform/language/state/sensitive-data
- [tf-s3-backend] Terraform S3 backend: https://developer.hashicorp.com/terraform/language/backend/s3
- [stripe-rate-limiters] Stripe, Scaling your API with rate limiters: https://stripe.com/blog/rate-limiters
- [price list] AWS Price List API, offers for AmazonECS, AWSELB, AmazonVPC, awswaf, AmazonRDS, AmazonS3, AWSDataTransfer, AmazonCloudFront, AWSLambda, AmazonElastiCache, AmazonBedrockFoundationModels, AWSSecretsManager, awskms, AmazonCloudWatch, AWSNetworkFirewall, AmazonGuardDuty, AmazonRoute53: https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/index.json
