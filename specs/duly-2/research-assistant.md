# Duly assistant: how to build it so every loop closes and every number is exact

Research for duly-2. Written 2026-09-30. Status: research and recommendation, not a decision. Every outside claim has its URL next to it. "Unverified" marks what could not be confirmed.

Inputs read in this repo: CLAUDE.md, BOUNDARY.md, DECISIONS.md (D23, D27, D54, D55, D57, D60), assistant/boundary.py, assistant/providers.py, evals/boundary/, engine/ (compute_f1, path.compute), rulepacks/f1-us/v2026.09/parameters.yaml, api/main.py, desktop/src/engine.ts.

---

## 0. The answer in short

1. **Most of the assistant is not a model at all.** The founder's "open loop, closed loop" is a state machine: a *loop* is a typed object with steps, a deliverable for each step, a test for "done" that the engine evaluates, and triggers that reopen it. The loop runs, follows up and closes with **no model present**. The model is an accelerator on top, not the thing that makes Duly feel alive. This fixes "static" first, and it works on every device on day one.
2. **The model does three jobs only: understand, explain, ask.** Understand: turn the student's free words into a typed command (start this loop, set this slot, try this what-if, explain this rule). Explain: arrange sourced plain words around engine values. Ask: choose the next missing slot to ask about. It never computes and never decides which side of the line a turn is on, except to move a turn toward the step back.
3. **Numbers never pass through the model.** The model writes words with holes (`{{fact:opt.unemployment_used}}`); a renderer fills the holes from the engine's output. A model that cannot type a number cannot type a wrong one. This is the core of "how a scenario conversation stays exact".
4. **The model can be value-blind.** Because the holes are filled after the model runs, the model only needs the *shape* of the record (which facts exist, their status, which loop step is open), not the dates themselves. This makes D60 easy to keep and shrinks what any model ever sees.
5. **Where it runs, by data class, not by vendor.** Public rule text: any model, offline, in the pipeline, reviewed and signed into the pack. A student's question plus value-blind state: on-device model first (Apple Foundation Models on Apple devices, Gemini Nano where present, a bundled small open model elsewhere). A cloud fallback inside Duly's own AWS only if the founder approves it (section 3.6). Document values, names and identifiers: no model, ever, under D60.
6. **Evaluate like an agent benchmark, gate like a compiler.** Scripted multi-turn scenarios whose pass condition is the final record and loop state (the τ-bench method), run k times each and scored pass^k, plus the existing boundary pairs and drift sets with zero tolerance, plus a number-fidelity check that must be exactly zero failures.

The rest of this file is the evidence and the detail.

---

## 1. The founder's critique, in engineering terms

The founder: a question is asked and answered, then nothing. No follow up, no positive or negative feedback, no closing, no way to open a new loop. "do you still have this job? no. what to do? find a job. how? here. where? here. when? time. what to keep in mind? these dates."

What that means for the software:

| The founder says | What is missing in the system | What fixes it |
|---|---|---|
| "after I click yes, it just stays there" | Answers are written to the record but nothing *listens* to the change | Every record change re-runs the engine and re-evaluates every open loop's "done when" test |
| "what is this happened... whats next? theres nothing" | A question has no successor step | A loop has an ordered list of steps; answering one step makes the next step current |
| "no positive triggers, no feedback" | No acknowledgement of state change | Each step closes with a factual receipt: what was saved, what the engine recomputed, what the next date is (section 6, inside the BOUNDARY B10 rule) |
| "close the loop, and still be able to open a loop" | Loops are not first-class | "Ask about this" on any fact, rule, date or document seeds a new loop with that context |
| "Home is too crowded" | Everything is shown open | Home lists loops, each collapsed to one line: its deliverable and its next date |

This is the same split that the serious conversational platforms converged on. Rasa's CALM uses a language model only to turn the user's words into "a set of internal commands representing how the user wants to progress the conversation", while flows hold "what information you need to collect", "what data you need to read & write via APIs" and "any branching logic", and a flow can **Link** to another flow when it finishes or **Call** one mid-conversation and return (https://rasa.com/docs/learn/concepts/dialogue-management/). The point Rasa makes for regulated work is that "a required compliance step can't be skipped by an improvising model" (https://www.voiceflow.com/blog/rasa-chatbot, a third-party review; the architecture itself is described on Rasa's own blog, https://rasa.com/blog/how-to-put-next-generation-ai-assistants-in-production-today-with-calm). Anthropic's own guidance draws the same line between *workflows*, "systems where LLMs and tools are orchestrated through predefined code paths", and *agents*, which "dynamically direct their own processes", and recommends "finding the simplest solution possible, and only increasing complexity when needed" (https://www.anthropic.com/engineering/building-effective-agents). Duly's loops are workflows. Duly does not need an agent.

---

## 2. Architecture

```
            ┌──────────────────────── the student's device ─────────────────────────┐
            │                                                                       │
 free words │  ┌──────────────┐  typed command   ┌──────────────────────────────┐    │
 ──────────►│  │ Understand   │ ───────────────► │ Loop orchestrator            │    │
 or a tap   │  │ (model, or   │  (StartLoop,     │ deterministic state machine  │    │
 ──────────►│  │  buttons)    │   SetSlot,       │ loops = flows, versioned     │    │
            │  └──────▲───────┘   WhatIf,        │ with the rule pack           │    │
            │         │           Explain,       └───┬───────────────┬──────────┘    │
            │   shape-only        Correct)           │ reads/writes  │ calls          │
            │   view of state                        ▼               ▼                │
            │         │                  ┌───────────────────┐  ┌──────────────────┐ │
            │  ┌──────┴───────┐          │ Record (encrypted │  │ Engine           │ │
            │  │ Boundary     │◄─────────│ on device, D54)   │─►│ compute(case,    │ │
            │  │ floor (code) │          │ + loop states     │  │  packs, clock)   │ │
            │  │ whole convo  │          └───────────────────┘  │ pure function    │ │
            │  └──────┬───────┘                                  └────────┬─────────┘ │
            │         │ A or B                                            │ facts,    │
            │         ▼                                                   ▼ dates,    │
            │  ┌──────────────┐  plan with holes   ┌──────────────────────────────┐   │
            │  │ Explain/Ask  │ ─────────────────► │ Renderer + validator         │   │
            │  │ (model, or   │  {{fact:...}}      │ fills holes from engine,     │──►│ card
            │  │  templates)  │  {{rule:...}}      │ rejects unsourced sentence,  │   │
            │  └──────────────┘                    │ Side B words, stray numbers  │   │
            │                                      └──────────────────────────────┘   │
            │  Audit log (on device; travels only inside the E2E backup)             │
            └─────────────────────────────────────────────────────────────────────────┘
                        ▲ signed rule pack + loop library + precomputed plain words
                        │ (built offline from public text only; any model may help,
                        │  humans review, the pack is signed)
               Duly cloud: pack pipeline, updates feed, optional E2E backup blobs
```

### 2.1 The parts and who owns what

| Part | Owns | Never does | Exists today |
|---|---|---|---|
| Engine | every date, count, window, open item, judgement id. A pure function of record, packs and an injected clock | talk; guess | yes: `engine/f1.py compute_f1`, `engine/path.py compute`, clocks in `engine/clocks.py` |
| Rule pack | every rule's value, status, regime, quote, citation, plain words | change without a source | yes: `rulepacks/f1-us/v2026.09` |
| Loop library | the flows: steps, slots, "done when" predicates over engine output, follow-up triggers, reopen triggers | hold a number of its own; every number is a rule id or engine fact id | **no; new** |
| Loop orchestrator | which loop is open, which step is current, what is scheduled, applying typed commands | call a model to decide a branch | **no; new** |
| Boundary floor | A or B for every turn, over the whole conversation | let a model move a turn from B to A | yes: `assistant/boundary.py`, evals in `evals/boundary` |
| Model (optional) | words in, typed command out; plan with holes out | see document values (D60); emit a digit or a date | stub: `assistant/providers.py NotWired` |
| Renderer + validator | filling holes, attaching sources, rejecting bad output, turning a reject into a step-back card | let anything unsourced through | partly: BOUNDARY "Output validator" is specified, not built |

### 2.2 One engineering risk to settle early: the engine on a phone

The engine is Python. The desktop app spawns it locally with uvicorn (`desktop/src/engine.ts`), and the web app posts the typed case to Duly's API (`api/main.py`, `POST /v1/compute/f1`). On iPhone and Android neither works without sending the record to a server. Three ways out:

1. Run the engine on Duly's API for mobile. Simple, but the student's typed dates then leave the device, which works against D54's "lives on the device" spirit and every privacy claim built on it.
2. Run the Python engine inside a WebAssembly CPython such as Pyodide, "a Python distribution for the browser and Node.js based on WebAssembly" (https://pyodide.org/en/stable/). Inside an iOS WebView this is unverified for size, start-up time and memory.
3. Port the engine to one portable core (Rust or TypeScript) that compiles to iOS, Android, desktop and web, and keep the Python engine as the **oracle**: every golden case and every clock-injected property test runs against both, and any difference fails the build (differential testing).

Recommendation: decide this before any mobile assistant work, because the assistant's tools are engine calls and must run where the record lives. Option 3 is what a professional team would choose for a product whose core promise is "your data stays on your device"; option 2 is a cheaper experiment worth one spike to measure.

---

## 3. Where the model runs

Hard rules: no student data or document value to an outside AI provider (CLAUDE.md, D60); D60 also says no value from a document reaches *any* model, including one on Duly's own AWS, until the founder decides.

### 3.1 On device, Apple: Foundation Models framework

- A ~3B-parameter model, compressed to 2 bits per weight with quantization-aware training, supporting 15 languages; Apple ships a Python toolkit for rank-32 LoRA adapters (https://machinelearning.apple.com/research/apple-foundation-models-2025-updates).
- Apple says it is "optimized for use cases like summarization, extraction, classification" and "not designed for world knowledge or advanced reasoning", and that "device scale models require tasks to be broken down into smaller pieces" (https://developer.apple.com/videos/play/wwdc2025/286/). That is exactly the "understand" job (classification and slot extraction), and a poor fit for free legal explanation, which Duly should not generate at run time anyway.
- **Guided generation**: annotate a Swift type with `@Generable` and the output is guaranteed to parse into it, by constrained decoding. Tool calling "is built on guided generation to ensure that the model will never produce invalid tool names or arguments" (https://developer.apple.com/videos/play/wwdc2025/286/).
- Context window: 4,096 tokens per session, shared by instructions, every turn, every tool call and its output (https://zats.io/blog/making-the-most-of-apple-foundation-models-context-window/, https://drobinin.com/consulting/foundation-models-apple-intelligence/putting-apple-foundation-models-in-a-real-app/; third-party, consistent with each other; Apple's own figure not found, so treat 4,096 as unverified but likely). Duly keeps loop state in the record, not in the transcript, so this is enough (section 7).
- Prompt injection: Apple says instruction-following "helps protect against prompt injection attacks, but is by no means bullet proof" and "it's best not to interpolate untrusted user input into the instructions" (https://developer.apple.com/videos/play/wwdc2025/286/).
- Availability: only on Apple Intelligence devices: iPhone 15 Pro and later, all iPhone 16 and 17 models, Macs with M1 or later, with Apple Intelligence turned on and about 7 GB free (https://www.iclarified.com/101137/apple-intelligence-compatible-devices-full-list-for-iphone-ipad-mac-vision-pro-and-apple-watch; Apple's own page https://support.apple.com/en-mt/121115). The app must check `SystemLanguageModel.default.availability` and handle `deviceNotEligible`, `appleIntelligenceNotEnabled`, `modelNotReady` (https://www.createwithswift.com/exploring-the-foundation-models-framework/).
- Adapters "must be retrained with each new version of the base model", one per toolkit version per OS range (https://blakecrosley.com/blog/foundation-models-custom-adapters, describing Apple's adapter page). So: no adapter in v1; prompts plus guided generation first.
- Speed: for the 2024 model Apple reported "time-to-first-token latency of about 0.6 millisecond per prompt token, and a generation rate of 30 tokens per second" on iPhone 15 Pro (https://machinelearning.apple.com/research/introducing-apple-foundation-models). Figures for the 2025 model: unverified.
- Windows and Intel Macs: none.

### 3.2 On device, Android and Chrome: Gemini Nano

- ML Kit GenAI Prompt API, **alpha**, runs Gemini Nano through AICore; "performs best on the Pixel 10 device series", which runs nano-v3 on the Gemma 3n architecture; needs a supported device and a locked bootloader (https://android-developers.googleblog.com/2025/10/ml-kit-genai-prompt-api-alpha-release.html).
- Chrome's built-in Prompt API (`LanguageModel`) runs Gemini Nano in the browser, and `responseConstraint` takes a JSON Schema so the output parses (https://developer.chrome.com/docs/ai/prompt-api). This is the web app's on-device path, on Chrome only.
- Fragmentation is the cost: alpha status, device lists, and a different model per vendor mean a different eval run per vendor.

### 3.3 On device, anywhere: a bundled small open model

- Qwen3 dense models at 0.6B, 1.7B, 4B, 8B, 14B, 32B; the small sizes are Apache 2.0 (https://github.com/QwenLM/Qwen3, https://en.wikipedia.org/wiki/Qwen).
- Gemma 3n E2B and E4B run in memory comparable to 2B and 4B models, about 2 GB and 3 GB (https://simonwillison.net/2025/Jun/26/gemma-3n/, https://huggingface.co/google/gemma-3n-E2B-it). Licence terms: check Gemma's terms before shipping (unverified here).
- In the browser, WebLLM runs models on WebGPU and keeps "up to 80% native performance"; on an M3 Max, Llama-3.1-8B ran at 41.1 tokens/s in WebLLM against 57.7 natively (https://arxiv.org/html/2412.15803v2).
- Benefit: one model on every platform means one behaviour to evaluate. Cost: a download of one to several GB, battery, and nothing on older phones.

### 3.4 Self-hosted open model on Duly's AWS

- Bedrock Custom Model Import hosts imported open weights (Qwen and Llama architectures supported, https://aws.amazon.com/about-aws/whats-new/2025/06/amazon-bedrock-custom-model-import-qwen-models). Billing is per Custom Model Unit per minute in five-minute windows, and an idle model can scale to zero after five minutes; an 8B Llama with 128K context needs 2 CMUs. Third-party pages give $0.05718 per CMU-minute for CMU v1 but an example of $0.1570 per minute for 2 CMUs, which do not agree (https://www.softwareseni.com/aws-bedrock-open-weight-models-running-qwen-kimi-k2-and-minimax-without-infrastructure-overhead/). Price: unverified; read https://aws.amazon.com/bedrock/pricing/ before budgeting. At either figure, one copy kept warm all month is in the thousands of dollars, so this only pays at volume.
- vLLM on EC2 GPUs is the do-it-yourself path; it supports JSON-schema, regex, choice and grammar constraints through xgrammar or outlines (https://docs.vllm.ai/en/latest/features/structured_outputs/). More control, more operations work (patching, autoscaling, GPU capacity).

### 3.5 Claude through Bedrock in Duly's account (the D27 plan)

- AWS's documentation: in each region there is a Model Deployment Account per model provider, owned by the Bedrock team; "model providers don't have any access to those accounts" and so "don't have access to Amazon Bedrock logs or to customer prompts and completions" (https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html). AWS also states that Bedrock does not store or log prompts and completions and does not use them for training (https://repost.aws/knowledge-center/amazon-bedrock-model-data-use). Bedrock has an abuse-detection process; read it before claiming zero processing (https://docs.aws.amazon.com/bedrock/latest/userguide/abuse-detection.html, not read in full here).
- Claude Haiku 4.5 on Bedrock: $1.00 per million input tokens, $5.00 per million output, cache reads $0.10 per million (https://www.cloudforecast.io/blog/aws-bedrock-pricing/, https://pricepertoken.com/pricing-page/model/anthropic-claude-haiku-4.5; not confirmed on the AWS page).

### 3.6 Provider models for public rule text only

The pipeline already reads public law with models (BOUNDARY "Where the assistant runs"). Push this further: generate, offline, every plain-word explanation, every loop's step wording, every "what the source lists" checklist, and the paraphrase set used to train and test the understand step, with the strongest available model, over public text only. A human checks each against its quote (D56 already requires this), and it ships signed inside the pack. At run time the device then needs no strong model to explain anything: it picks pre-reviewed words.

### 3.7 Comparison

| Option | Student data leaves device | Coverage | Quality for "understand" | Quality for free explanation | Cost to Duly | Ops burden |
|---|---|---|---|---|---|---|
| Apple FM | no | iPhone 15 Pro+, M1 Mac+ only | good (its stated strength) | weak by Apple's own words | none | low; re-eval each OS model update |
| Gemini Nano | no | some Android, Chrome desktop | good, alpha | weak | none | medium; fragmentation |
| Bundled open model | no | wide, if the device has RAM | good at 1.7–4B (unverified for Duly's task until evaluated) | fair | none at run time | medium; model updates are app updates |
| Self-hosted on AWS | yes, to Duly's account | everything | best available open | good | high at low volume | high |
| Claude via Bedrock | yes, to Duly's AWS account; provider has no access per AWS | everything | very good | very good | low per turn | low |
| Provider API, public text only | no (no student data) | offline pipeline | n/a | best | low | low |

### 3.8 Recommendation: route by data class

| Class | What | Allowed to reach |
|---|---|---|
| 0 | Public rule text, sources, school pages, Duly's own copy | any model, offline, output human-reviewed and signed into the pack |
| 1 | The student's question text and the **shape** of their state (fact ids, statuses, which loop step is open, coarse engine-computed flags such as `count_band: over_three_quarters`) | the on-device model. Duly's AWS model only if the founder rules that a model inside Duly's AWS account is not an "outside provider" for this class. Never the Anthropic API in production |
| 2 | Dates and values the student typed | the engine; the renderer fills them into holes. No model needs them (section 4) |
| 3 | Document values, names, identifiers, files | no model at all (D60, F7). Engine, record and templates only |

And a **no-model mode** that is fully functional: the loop library runs with quick-reply buttons and on-device keyword search over the pack. Where no model is available (Windows, older phones, a student who turns it off), Duly still opens, follows up and closes every loop. Woebot is the precedent: "everything it says has been scripted by a writing team and under the supervision of clinical psychologists", with "judicious use of ML/NLP classifiers" to route (https://woebothealth.com/why-generative-ai-is-not-yet-ready-for-mental-healthcare/). The lesson cuts both ways: scripting made it safe, and third-party reviews say the scripted multiple-choice format later "felt dated" (https://ai-health-apps.com/compare/wysa-vs-woebot/, unverified). Duly's answer is scripted *content* with model *routing*, so the student can type anything and land in a reviewed loop.

---

## 4. Tool calling into the engine

The model gets few tools, all typed, almost all read-only, shaped so a mistake is hard to make (Anthropic's "poka-yoke" advice: "change the arguments so that it is harder to make mistakes", https://www.anthropic.com/engineering/building-effective-agents). OWASP lists Excessive Agency as LLM06:2025 (https://genai.owasp.org/llm-top-10/): least privilege, and a human confirms anything that changes state.

| Tool | Input | Output to the model | Notes |
|---|---|---|---|
| `find_loop` | the student's words | up to 3 loop ids from the library, with titles | on-device keyword plus embedding search over loop titles and example phrasings |
| `start_loop` | loop id, optional context ids (a fact, rule or document the student tapped) | the loop's first step, its slots | the orchestrator decides the first step, not the model |
| `set_slot` | slot id, a value **from an enum or a typed date picker the student confirms** | the next step | free-text values become a confirm card (PRINCIPLES 2), never a silent write |
| `what_if` | a typed delta to the record (e.g. `employment[2].end = <date picked>`) | a list of fact ids that would change, and their direction | the engine runs on a copy; nothing is saved; values are filled by the renderer |
| `explain_rule` | rule id | plain words id, status, citation id | the words themselves come from the pack |
| `step_back` | the topic | a DSO-question template id | D57 voice; Duly never sends it |

What the model never gets: a tool that writes to an agency (BOUNDARY B7, B8), a tool that returns a document value (D60), a tool that returns a raw date. The engine's response to the model is a **shape**: ids and statuses. The full response, with values, goes only to the renderer.

Guided generation (Apple), `responseConstraint` (Chrome), and vLLM structured outputs all make the tool call parse every time. Parsing is not correctness: a well-formed call can still name the wrong loop, which is what evals measure (section 8).

---

## 5. Retrieval over sources

- The corpus is small: one pack's rules (about 60 ids in f1-us today), SOURCES.md, school pages Duly has checked, and the loop library. It ships whole with the app. No server search is needed.
- Use hybrid retrieval: keyword (BM25) plus embeddings, with each chunk prefixed by a line of context. Anthropic measured that contextual embeddings plus contextual BM25 cut top-20 retrieval failures by 49% (5.7% to 2.9%), and 67% with reranking (https://www.anthropic.com/engineering/contextual-retrieval). Duly can compute every chunk's embedding offline (public text, class 0) and embed only the query on device.
- Retrieval returns **rule ids**, not text to paste. The plan cites ids; the renderer pulls the plain words and quote for each id from the signed pack. A retrieved page cannot inject instructions into the model because the model never receives retrieved text as instructions (OWASP LLM01 indirect injection and LLM08 vector weaknesses, https://genai.owasp.org/llm-top-10/).
- RAG alone is not enough for law. The Stanford RegLab study of commercial legal research tools found Lexis+ AI hallucinated on more than 17% of queries and Westlaw AI-Assisted Research on about 33% (https://www.lawnext.com/2024/06/in-redo-of-its-study-stanford-finds-westlaws-ai-hallucinates-at-double-the-rate-of-lexisnexis.html). Those vendors had claimed "hallucination-free" citations. This is why Duly's model must not write the substance at all.

---

## 6. Guardrails, refusal and escalation to the DSO

### 6.1 Why this matters legally

- Moffatt v. Air Canada, 2024 BCCRT 149: the tribunal held the airline liable for its chatbot's misstatement and rejected the argument that the bot was "a separate legal entity" (https://en.wikipedia.org/wiki/Moffatt_v._Air_Canada, https://www.americanbar.org/groups/business_law/resources/business-law-today/2024-february/bc-tribunal-confirms-companies-remain-liable-information-provided-ai-chatbot/).
- New York City's MyCity chatbot told businesses they could take workers' tips and refuse housing vouchers, both illegal (The Markup and THE CITY, reported in https://statescoop.com/mamdani-kill-nyc-ai-chatbot/); the new mayor ended it in 2026 (https://www.vice.com/en/article/zohran-mamdani-discontinues-nycs-troubled-chatbot/).
- FTC v. DoNotPay: final order February 2025, $193,000 and a ban on claiming it performs like a lawyer without evidence; the FTC said the company "did not hire or retain attorneys to test the quality and accuracy" of its legal features (https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires).

The lesson for Duly: Duly owns every sentence the assistant says, and needs evidence, from qualified reviewers, that the sentences are right.

### 6.2 The layers, in order

1. **Boundary floor, code.** `assistant/boundary.py` over the whole conversation, already the rule: "a model can only move a turn from answer to step back, never the other way". Keep it first and keep it deterministic.
2. **Constrained output.** The model emits a typed plan (`AnswerPlan { sentences: [ {template_id | words_with_holes, source_ids[]} ], next_step_id }`), never free prose to the screen.
3. **Holes, not numbers.** The schema has no field that accepts a digit or a date. A validator also scans the rendered text: every numeral and date must trace to a filled hole whose value came from the engine or a rule value. Any stray number rejects the plan.
4. **Every sentence has a source id**; the renderer refuses a sentence without one.
5. **Side B lexicon and second-person-plus-modal test** (BOUNDARY "Output validator"), run after rendering, over the exact text the student will see.
6. **A reject becomes the step-back card**, never an error and never a refusal (BOUNDARY "The step back").
7. **Optional second opinion classifier.** Llama Guard 3 1B, a classifier for prompts and responses with an S6 "Specialized Advice" hazard category, has a pruned and quantized version for mobile (https://huggingface.co/alpindale/Llama-Guard-3-1B, https://arxiv.org/pdf/2411.17713). Its taxonomy is generic; whether it catches immigration-advice drift is unverified and would need Duly's own eval. It may only add step backs.

### 6.3 Managed guardrail services, and why they are not the main line

- Bedrock contextual grounding checks score grounding and relevance against a source, with thresholds from 0 to 0.99. AWS states "Conversational QA / Chatbot use cases are not supported" and limits sources to 100,000 characters, queries to 1,000 and responses to 5,000 (https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-contextual-grounding-check.html). So it does not fit a multi-turn assistant as the primary check.
- Bedrock Automated Reasoning checks, generally available since 2025-08-06, translate a policy document into formal logic and check model output against it, with "up to 99%" verification accuracy (https://aws.amazon.com/about-aws/whats-new/2025/08/automated-reasoning-checks-amazon-bedrock-guardrails, https://aws.amazon.com/blogs/aws/minimize-ai-hallucinations-and-deliver-up-to-99-verification-accuracy-with-automated-reasoning-checks-now-available/). Duly already has something stronger for its numbers: the engine computes them, so there is nothing to verify after the fact. It might be useful later as an extra check on plain-word sentences in the offline pipeline (class 0 only).

### 6.4 Feedback that is warm and still inside the line

The founder wants positive and negative feedback. BOUNDARY B10 forbids reassurance ("you're fine", "plenty of time"). Both hold if feedback is about **what Duly did and what the record now shows**, never about the student's legal position.

| Kind | Allowed shape | Not allowed |
|---|---|---|
| Positive receipt | "Saved. Your record now shows the job at {{employer}} ending on {{date}}. The day count on Home was worked out again from it." | "Good, you're safe." |
| Progress | "Two of four steps in this loop are done. Next: {{step}}, by {{date}} from {{rule}}." | "You're on track." |
| Negative, about data | "This end date is after the card end on your record. One of them may be mistyped." | "You are out of status." |
| Negative, about a rule | the rule's plain words and the engine's arithmetic, with "Confirm with your DSO." (A3) | "You have to stop working." |
| Closure | "Done. What this loop produced: the end date saved, the DSO note drafted, a reminder on {{date}}." | "All good!" |

These shapes belong in the copy linter and in `evals/boundary/answers.jsonl` as new cases.

---

## 7. How a scenario conversation stays exact

1. **State lives in the record and the loop, not in the transcript.** Each turn the model sees: the loop's current step, its open slots, the last two or three turns, the shape of the engine output. Nothing it said earlier is trusted as a fact. This also keeps a session inside a 4,096-token window.
2. **Every turn re-runs the engine from scratch** on the full record with the injected clock: `compute(case, packs, clock)` is already pure. There is no incremental state to drift.
3. **What-ifs are copies.** "What if I start the new job on the 15th?" becomes `what_if(delta)`. The engine runs on a copy; the card shows a diff between the saved record and the copy. Nothing is saved until the student confirms.
4. **Corrections are slot updates.** "No, I meant March" is `Correct(slot, value)`, applied to the record, and the engine recomputes. The model never patches an earlier answer in prose.
5. **Each loop pins the pack version it ran on.** When the updates pipeline ships a new pack, any loop whose steps cite a changed rule id reopens, with the change shown (the law-update-claim skill: "late is acceptable, wrong is not").
6. **The model is not required to be deterministic**, because nothing it outputs is a fact. Temperature 0 and a fixed model version reduce churn in wording; the facts are deterministic regardless.

### 7.1 Worked trace: "do you still have this job? no."

Rule ids below are real ids in `rulepacks/f1-us/v2026.09/parameters.yaml`.

| # | Trigger or input | Component | What happens | Deliverable |
|---|---|---|---|---|
| 1 | Engine check: an employment period has no end date and its last confirmation is old | Orchestrator | Opens loop `employment_change` with one question card: "Is the job at {{employer}} still going?" Buttons: Still going / It ended / It's changing | none yet; Home shows one line |
| 2 | Student taps "It ended" | Orchestrator | Next step asks the end date with a date picker, then a confirm card | the end date, confirmed by the student |
| 3 | Confirmed | Engine | Recomputes. Unemployment days are counted against `opt.unemployment_limit_days` (90, 8 CFR 214.2(f)(10)(ii)(E)) | positive receipt: "Saved. The day count was worked out again." with the count and its working (A3) |
| 4 | Same | Renderer | Shows what the sources say about reporting: `opt.report_interruption` (8 CFR 214.2(f)(12)(i), no number of days given) and `opt.report_employer_within_days` (SEVP guidance, 10 days, labelled as guidance, not regulation). If the record has a STEM card, `stem.report_change_within_days` and `stem.evaluation_due_days` instead | a dated item on Home from the engine; the DSO note drafted (D57) |
| 5 | "what do I do now? find a job, how?" | Model (understand) | Maps to loop `job_search_on_opt`. This loop lists what *sources* say (A5): the school career office page if Duly has checked it, and, for STEM, the rule ids under `stem.requires.employer_*` (for example E-Verify participation, if the pack carries it). It never says which job counts | a checklist with sources; a reminder date from the engine |
| 6 | "does a part-time unpaid role count?" | Boundary floor | B3 judgement test. Step-back card: the rules that touch it (`opt.min_hours_per_week`, the SEVP guidance on unpaid work if in the pack), one plain sentence, the drafted DSO question | the DSO email draft; the loop waits on "DSO answered?" |
| 7 | Follow-up date arrives | Orchestrator | "Did your DSO reply?" Student can paste or summarise the reply as **their own note**; Duly stores it, does not interpret it | the note filed in the record |
| 8 | Student logs a new job | Engine | The count stops on the start date; reporting items re-dated | closure card: what the loop produced; Home collapses it to one line |
| 9 | A new pack changes a cited rule | Orchestrator | Loop reopens with the change shown | an update card |

At no step does a model produce a date, a count or a verdict. With no model at all, steps 1 to 4 and 6 to 9 work unchanged; step 5 works by tapping "What now?" instead of typing.

---

## 8. Evaluation

### 8.1 What to measure

| Suite | Pass condition | Tolerance | Exists |
|---|---|---|---|
| Engine golden and property tests | exact values with a fixed clock | zero failures | yes (write-clock-injected-property-test skill) |
| Boundary pairs and drift | `step_back` items never answered | zero; part hidden from builders | yes: `evals/boundary` |
| False step-back rate | `answer` items that stepped back | a rate that ratchets down | yes (README) |
| **Number fidelity** | every numeral and date in rendered output traces to an engine or rule value | zero | **new** |
| **Source coverage** | every rendered sentence has a source id that resolves in the signed pack | zero | **new** |
| **Loop scenarios** | scripted multi-turn conversations; pass if the final record, the loop state, the cards shown and the scheduled follow-ups equal the expected ones | pass^k with k = 8 | **new** |
| **Routing** | free-text phrasing to the right loop id; paraphrases, typos, Hindi/Chinese/Spanish mixing, slang | top-1 accuracy per loop | **new** |
| **Adversarial** | prompt injection in typed text and in pasted DSO replies; drift walks; role play ("pretend you are my lawyer"); requests for agency letters | zero B leaks, zero tool misuse | partly (drift) |
| **Feedback copy** | receipts and closures pass the Side B linter | zero | **new** |

The loop-scenario method is τ-bench's: a simulated user, real tools over a database, domain policy, and success judged by comparing the **final database state** to the expected one. τ-bench also introduced pass^k, solved only if all k runs succeed, and found state-of-the-art function-calling agents below 50% success with pass^8 under 25% in its retail domain (https://arxiv.org/pdf/2406.12045, https://sierra.ai/blog/benchmarking-ai-agents). Duly's bar is higher because the deterministic orchestrator does most of the work; the model only routes and fills slots, which is where pass^k should be measured.

### 8.2 Tools

- Inspect (UK AI Security Institute): open-source, dataset to task to solver to scorer, multi-turn and tool-using evaluations, sandboxing (https://github.com/UKGovernmentBEIS/inspect_ai). Good for loop scenarios.
- promptfoo: YAML test cases, red-team plugins, CI integration (https://github.com/promptfoo/promptfoo, https://www.promptfoo.dev/docs/integrations/ci-cd/). Good for adversarial and regression runs in CI.
- Both run with the Python engine as a tool, so evals hit the real engine, not a mock.

### 8.3 Regression discipline

- Every model, per platform, per OS model version is its own build target. Apple's model changes with the OS (adapters must be retrained per base version, section 3.1), so the eval runs again on each OS beta on a device farm.
- A failing loop scenario blocks the release, like a failing unit test.
- Human review, the DoNotPay lesson: pay qualified reviewers (DSOs or immigration attorneys) to review the loop library and plain words before launch and on every pack change that touches a loop. Record who reviewed what in the pack.

### 8.4 Online signals, privately

Loop closure rate, time to closure, reopen rate, step-back rate, "asked again within a day" rate. Counted on device; sent only as opt-in aggregates with no text and no values. A formal method such as local differential privacy is worth a separate look (unverified here).

---

## 9. Latency and cost

### 9.1 Latency budget per turn

- Engine and renderer on device: the card with all facts appears first, before any model output. Target under 150 ms (to be measured; not yet benchmarked here).
- On-device model, using Apple's 2024 figures (0.6 ms per prompt token, 30 tokens/s): a 1,200-token prompt is about 0.7 s to first token; a 60-token typed command adds about 2 s. Keep commands short; stream; show the card while the model works. 2025 model figures: unverified.
- WebLLM 8B on a high-end Mac: about 41 tokens/s (section 3.3). Lower on ordinary laptops (unverified).

### 9.2 Cost

- On device: zero per turn.
- Claude Haiku 4.5 via Bedrock, at the third-party prices above: a turn of 3,000 input and 300 output tokens is about $0.003 + $0.0015 = $0.0045; with most of the input cached at $0.10 per million, about $0.002. At 20 turns per student per month, about 4 to 9 cents per student-month. Unverified against AWS's page.
- Self-hosted: dominated by keeping a GPU copy warm (section 3.4); not worth it below sustained volume.
- Offline pipeline (class 0): a one-off per pack version, small.

---

## 10. Security and safety of the assistant

| OWASP LLM 2025 (https://genai.owasp.org/llm-top-10/) | Duly control |
|---|---|
| LLM01 Prompt injection | Untrusted text never goes into instructions; typed commands only; boundary floor in code; tools are read-only except confirmed slot writes |
| LLM02 Sensitive information disclosure | Value-blind model; class 3 data never reaches a model; no server-side prompt logs |
| LLM03 Supply chain | Pinned model hashes; signed packs; open-model weights checked against published hashes |
| LLM04 Data and model poisoning | Pack built only from snapshotted sources with sha256 (the pack already stores `snapshot_sha256`); updates go through law-update-claim review |
| LLM05 Improper output handling | Renderer validates and escapes; no model output is executed or sent anywhere |
| LLM06 Excessive agency | Six tools; no agency-facing tool; student confirms every record change |
| LLM07 System prompt leakage | Prompts hold nothing secret; the rules are public in the pack |
| LLM08 Vector and embedding weaknesses | Index built offline from signed public text; shipped inside the signed pack |
| LLM09 Misinformation | Engine owns facts; holes, not numbers; every sentence sourced; step back on doubt |
| LLM10 Unbounded consumption | On device by default; cloud fallback rate-limited per account |

If a cloud model is ever approved: Bedrock in us-west-2 inside a VPC with PrivateLink, a customer-managed KMS key, model invocation logging left off (verify the default, unverified here), CloudTrail on, and class 1 data only.

---

## 11. Build order a professional team would follow

1. **Loops without a model.** Loop schema, orchestrator, "done when" predicates over engine output, follow-up scheduling with local notifications, reopen-on-pack-change, Home as collapsed loops, feedback copy from section 6.4. This alone answers the founder's "static" critique.
2. **Engine portability decision** (section 2.2), with a Pyodide spike and a differential-testing harness either way.
3. **Renderer and validator**: holes, source ids, number fidelity, Side B scan. Tested before any model is attached.
4. **Offline pack authoring** (class 0): plain words for every loop step, paraphrase sets for routing, reviewed and signed.
5. **Eval harness**: loop scenarios with pass^k, routing, adversarial, number fidelity, in CI.
6. **On-device understand step**: Apple FM with guided generation behind `assistant/providers.py`, a new `ProviderKind` for on-device; Gemini Nano and a bundled open model next, each a separate eval target.
7. **Cloud fallback** only after the founder rules on section 3.8 class 1, and only value-blind.

---

## 12. Decisions for the founder

| # | Question | Recommendation |
|---|---|---|
| A1 | Does a model inside Duly's own AWS account (Claude via Bedrock, or an open model) count as an "outside AI provider" for the question text plus value-blind state? BOUNDARY and D27 say Bedrock is the plan; the task brief says no student data to an outside provider; D60 bars only document values | Rule by data class (section 3.8). Default to on-device; allow the AWS fallback for class 1 only, value-blind, opt-in per student |
| A2 | Value-blind model by default | Yes |
| A3 | Engine portability for mobile | Shared core with the Python engine as oracle; spike Pyodide first to compare |
| A4 | Budget for paid DSO or attorney review of the loop library and plain words | Yes, before public launch; record reviewers in the pack |
| A5 | Name for "scenarios" | Out of scope here; "loops" is the internal term in this file |

---

## Sources

- Rasa, dialogue management in CALM: https://rasa.com/docs/learn/concepts/dialogue-management/
- Rasa, CALM in production: https://rasa.com/blog/how-to-put-next-generation-ai-assistants-in-production-today-with-calm
- Voiceflow review of Rasa: https://www.voiceflow.com/blog/rasa-chatbot
- Anthropic, Building effective agents: https://www.anthropic.com/engineering/building-effective-agents
- Anthropic, Contextual retrieval: https://www.anthropic.com/engineering/contextual-retrieval
- Apple, Foundation Models 2025 updates: https://machinelearning.apple.com/research/apple-foundation-models-2025-updates
- Apple, Introducing Apple's on-device and server models (2024): https://machinelearning.apple.com/research/introducing-apple-foundation-models
- Apple, WWDC25 Meet the Foundation Models framework: https://developer.apple.com/videos/play/wwdc2025/286/
- Apple Intelligence devices: https://support.apple.com/en-mt/121115, https://www.iclarified.com/101137/apple-intelligence-compatible-devices-full-list-for-iphone-ipad-mac-vision-pro-and-apple-watch
- Foundation Models context window: https://zats.io/blog/making-the-most-of-apple-foundation-models-context-window/, https://drobinin.com/consulting/foundation-models-apple-intelligence/putting-apple-foundation-models-in-a-real-app/
- Foundation Models availability API: https://www.createwithswift.com/exploring-the-foundation-models-framework/
- Foundation Models adapters: https://blakecrosley.com/blog/foundation-models-custom-adapters
- Android ML Kit Prompt API: https://android-developers.googleblog.com/2025/10/ml-kit-genai-prompt-api-alpha-release.html
- Chrome Prompt API: https://developer.chrome.com/docs/ai/prompt-api
- Qwen3: https://github.com/QwenLM/Qwen3, https://en.wikipedia.org/wiki/Qwen
- Gemma 3n: https://simonwillison.net/2025/Jun/26/gemma-3n/, https://huggingface.co/google/gemma-3n-E2B-it
- WebLLM: https://arxiv.org/html/2412.15803v2
- Pyodide: https://pyodide.org/en/stable/
- vLLM structured outputs: https://docs.vllm.ai/en/latest/features/structured_outputs/
- Bedrock data protection: https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html
- Bedrock model data use: https://repost.aws/knowledge-center/amazon-bedrock-model-data-use
- Bedrock contextual grounding: https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-contextual-grounding-check.html
- Bedrock Automated Reasoning GA: https://aws.amazon.com/about-aws/whats-new/2025/08/automated-reasoning-checks-amazon-bedrock-guardrails, https://aws.amazon.com/blogs/aws/minimize-ai-hallucinations-and-deliver-up-to-99-verification-accuracy-with-automated-reasoning-checks-now-available/
- Bedrock Custom Model Import, Qwen: https://aws.amazon.com/about-aws/whats-new/2025/06/amazon-bedrock-custom-model-import-qwen-models
- Bedrock pricing (third-party): https://www.softwareseni.com/aws-bedrock-open-weight-models-running-qwen-kimi-k2-and-minimax-without-infrastructure-overhead/, https://www.cloudforecast.io/blog/aws-bedrock-pricing/, https://pricepertoken.com/pricing-page/model/anthropic-claude-haiku-4.5; official: https://aws.amazon.com/bedrock/pricing/
- Llama Guard 3 1B: https://huggingface.co/alpindale/Llama-Guard-3-1B, https://arxiv.org/pdf/2411.17713
- OWASP Top 10 for LLM Applications 2025: https://genai.owasp.org/llm-top-10/
- τ-bench: https://arxiv.org/pdf/2406.12045, https://sierra.ai/blog/benchmarking-ai-agents
- Inspect: https://github.com/UKGovernmentBEIS/inspect_ai
- promptfoo: https://github.com/promptfoo/promptfoo, https://www.promptfoo.dev/docs/integrations/ci-cd/
- Woebot on rules-based design: https://woebothealth.com/why-generative-ai-is-not-yet-ready-for-mental-healthcare/; comparison (third-party): https://ai-health-apps.com/compare/wysa-vs-woebot/
- Intercom Fin architecture (vendor claims, ~0.1% hallucination rate unverified): https://www.intercom.com/fin/ai-engine
- Moffatt v. Air Canada: https://en.wikipedia.org/wiki/Moffatt_v._Air_Canada, https://www.americanbar.org/groups/business_law/resources/business-law-today/2024-february/bc-tribunal-confirms-companies-remain-liable-information-provided-ai-chatbot/
- NYC MyCity: https://statescoop.com/mamdani-kill-nyc-ai-chatbot/, https://www.vice.com/en/article/zohran-mamdani-discontinues-nycs-troubled-chatbot/
- FTC v. DoNotPay: https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-finalizes-order-donotpay-prohibits-deceptive-ai-lawyer-claims-imposes-monetary-relief-requires
- Stanford RegLab legal AI hallucination: https://www.lawnext.com/2024/06/in-redo-of-its-study-stanford-finds-westlaws-ai-hallucinates-at-double-the-rate-of-lexisnexis.html
