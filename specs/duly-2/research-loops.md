# Closed loops: how assistant products carry a question to done, and what Duly should build

Research note, 2026-09-30. Input to the duly-2 redesign. Every outside claim has its URL next to it.
"Unverified" means the claim came only from a search summary, a third-party review or my own
reading, and I could not open a primary page that confirms it. The web search budget for this
session ran out partway through, so a few points below (marked) rest on fewer sources than I
wanted. Nothing here changes a rule, a date or a decision; where a pattern needs a rule that is not
yet in the F-1 pack, it says so.

## 0. Summary for the founder

1. **The critique is right, and the cause is structural, not cosmetic.** In the prototype, a
   question is a screen and an answer is a field. There is no object that represents "this thing
   I am dealing with" and knows what state it is in, what it is waiting for, and when to come back.
   The check-in's "Yes, same" (specs/ui-2/prototype/data.js line 997) writes a fact and then
   nothing happens; "This happened" (data.js line 1011) saves a change and then nothing follows.
   Both are dead ends because nothing downstream owns the next step.
2. **The products that feel smart all have that object.** TurboTax's engine always knows "what is
   missing, what is wrong" for the return so far and asks only the question that moves it forward
   ([Yu et al., Intuit, KDD 2020](https://arxiv.org/abs/2009.06103)). Temporal, the workflow engine
   many companies use for this, calls it an entity or business-process workflow that "blocks on a
   Signal or Update, sets a durable Timer for the reminder or the deadline"
   ([Temporal docs](https://docs.temporal.io/evaluate/use-cases-design-patterns)). Lawfully pairs
   every status change with "what to expect in the next step"
   ([Lawfully](https://www.lawfully.com/resources/what-is-uscis-case-tracker)).
3. **Proposal: one primitive, the Loop.** Every question, life event, check-in, filing and trip is
   a Loop with seven states: opened, clarifying, answered, acting, waiting, confirming, done (plus
   handed off and reopened). Home shows open Loops collapsed to one line each; the record keeps
   closed Loops as the student's history. The engine still owns every date; the Loop only owns
   "what happens next".
4. **A Loop never ends on an answer. It ends on a confirmed outcome**, with a short receipt of what
   changed ("Saved. Your count stays at 41 days as of Sep 30. Next check Oct 30.") and then it
   collapses. That receipt is the positive feedback; it is factual, not a cheer.
5. **"Ask anything" is a router, not a chatbot.** Free text is matched, on the device, to a Loop
   template (job ended, trip, STEM filing, moved, lost a paper, ...). If nothing matches, Duly says
   so and offers the DSO draft. No outside model sees the text (D60).
6. **Wiring:** the record is an append-only event log; Loops are statecharts over that log; timers
   live on the device (iOS allows only 64 pending local notifications per app, so Duly schedules
   the nearest ones and refreshes on open) with an opt-in server timer for email; every rule
   change reopens the Loops that read that rule.
7. **Psychology:** fear of the unknown is the core of anxiety (Carleton 2016); showing the work
   raises trust (Buell and Norton 2011); a plan with "when, where, how" roughly doubles follow-
   through in the literature (Gollwitzer and Sheeran 2006, d = 0.65). The famous "unfinished tasks
   nag you" (Zeigarnik) effect did not hold up in a 2025 meta-analysis, so Duly should not keep
   loops open to create tension; it should make resuming easy (the Ovsiankina effect, which did
   hold up).
8. **Do not copy:** Duolingo's guilt notifications, Lawfully's approval-probability odds (a
   prediction about the person), Babylon's accuracy claims, Credit Karma's offer ranking.
9. **Ten patterns** are in section 5; **five worked loops** (job loss, travel, STEM filing, address
   change, lost document) are in section 6; Home as collapsed loops is section 7.
10. **Open decisions** for you are in section 10.

## 1. What a closed loop is

The founder's own example is the clearest spec:

> do you still have this job? no. what to do? find a job. how? here. where? here. when? time.
> what to keep in mind? these dates.

Broken into stages, every product that does this well runs the same sequence:

| Stage | Question it answers for the student | What must exist in the system |
|---|---|---|
| 1. Open | "Something happened / I want to know something" | An entry point anywhere (a card, a check-in, a typed question, a document upload, a rule change) |
| 2. Clarify | "What do you need from me?" | Knowledge of which facts are missing and which of them change the answer |
| 3. Answer | "Where do I stand?" | Engine output with sources and as-of date |
| 4. Act | "What do I do, how, where, by when?" | Steps, each with an owner, a place and a date from the engine |
| 5. Wait / follow up | "Will you remind me? What happens next?" | A durable timer and a known next check |
| 6. Confirm | "Did it happen?" | A question back to the student, or an outside signal (receipt number, status) |
| 7. Done | "Am I sorted?" | A receipt of what changed, the Loop collapses, history keeps it |
| Reopen | "Something changed again" | Events that wake a closed Loop: a rule change, a new paper, a date passing, a status change |

**Where Duly is today against this table** (from specs/ui-2/VALUE-2.md and the prototype):
stage 3 is strong (engine, sources, as-of dates). Stage 2 exists only as the check-in. Stage 4
exists as "Reports you owe" and "File-by date", but not attached to the question that produced it.
Stages 5 to 7 are missing: no object waits, no object asks "did you do it?", no receipt, no
collapse. Reopen exists only as News "For you". That is exactly the "static" feeling.

## 2. How ten products run the loop

Read each row as: what loop they run, how it closes, what Duly takes, what Duly refuses.

### TurboTax (Intuit)
- **Loop:** an interview that asks only what the return still needs, then explains the result.
- **How it works:** tax logic is a knowledge graph with two parts. A "Calc Graph" of calculation
  nodes, and a "Completeness Graph ... backed by a truth table" for eligibility. "We can rely on
  back chaining (from COMPLETE nodes) to determine what information is missing", which "can
  constantly prune down the alternative paths and remove unnecessary questions". The engine
  informs the app "whether the return is complete, and any errors found", and when more input
  arrives it recalculates only "which subset of the knowledge graphs need to be updated"
  ([Yu, McCluskey, Mukherjee, KDD 2020 workshop, arXiv 2009.06103](https://arxiv.org/abs/2009.06103)).
- **Feedback:** "Explain Why" walks the graph backwards from a number to its inputs. In its first
  limited year it cut support calls on the W-2 topic by 46% and had a "77% helpful rating ... from
  16M customers" (same paper).
- **After filing:** two emails, transmitted and accepted or rejected. After acceptance "TurboTax
  receives no further information" and points the user to the IRS tracker
  ([TurboTax support](https://ttlc.intuit.com/community/after-you-file-7/why-am-i-not-able-to-track-my-refund-658867)).
- **Duly takes:** (a) Duly's engine is already a rule graph; add a completeness pass that returns
  "the facts that would change this item", so Duly asks only those. (b) "Explain why" is Duly's ⓘ;
  make it a backward walk from the date to the paper field and the rule quote. (c) Be honest
  where Duly's visibility ends and hand off to the official tracker, as TurboTax does with IRS.
- **Refuses:** nothing structural. TurboTax's newer LLM layer (Graph RAG) is out for Duly under D60.

### Credit Karma (Intuit)
- **Loop:** event (your credit report changed) to summary to next step.
- **How it works:** a machine-learning recommendations engine ranks content and offers; the
  assistant "helps contextualize to the member as to why we suggest a certain insight", with a
  "See Why", and automatic summaries when a credit report changes: what changed, how it affects
  the score, next steps ([Tearsheet](https://tearsheet.co/artificial-intelligence/how-credit-karma-is-blending-traditional-ai-with-embedded-genai-to-create-more-impactful-user-experiences/)).
  The assistant "will communicate with members through notifications and app-based insights,
  recommending actions" ([Credit Karma press release](https://www.creditkarma.com/about/releases/introducing-intuit-assist-for-credit-karma)).
- **Duly takes:** the shape "what changed, what it means for your dates, what to do", fired by an
  event (a rule update, a new I-20, a status change), not by the student opening the app.
- **Refuses:** offer ranking, approval odds, anything optimised for conversion.

### Ada Health
- **Loop:** symptom to adaptive questions to an assessment with a next-step level (self-care, see a
  doctor, emergency) to a later check-in.
- **Evidence:** the App Store listing says the app "does follow-up questions when you enter the
  app again" and "checks up on past symptom assessments to see if you're doing okay", and lets you
  export historical reports for your doctor ([App Store](https://apps.apple.com/us/app/ada-your-health-portal/id1099986434)).
  Adaptive questioning narrows with each answer ([Ada help](https://ada.com/help/how-do-i-start-a-symptom-assessment/)).
- **Duly takes:** the follow-up on the next open ("Last time you said the job ends Oct 31. Did it?"),
  and the exportable report for a professional, which is Duly's Share summary.
- **Refuses:** likelihood lists. Ada ranks possible conditions; Duly never ranks outcomes for a
  person.

### Babylon Health and K Health
- **Babylon:** its symptom chatbot drew wide attention for accuracy claims; the company went into
  administration in 2023 and its UK operations were sold
  ([Wikipedia](https://en.wikipedia.org/wiki/Babylon_Health)). Several analyses tie the fall to
  unproven clinical performance claims (reported by
  [Clinical Maturity Lens](https://www.clinicalmaturitylens.com/writing/babylon-symptom-checker);
  that framing is unverified by a primary source here).
- **K Health:** the AI asks the intake questions, then "offers a list of potential diagnoses, which
  the doctors can review while chatting with the user"; the app "connects users with doctors"
  rather than diagnosing ([Wikipedia](https://en.wikipedia.org/wiki/K_Health)). A 2022 study cited
  there found it made suggestions for 74.5% of vignettes, with lower accuracy than GPs.
- **Duly takes:** K Health's handoff. The machine does intake and assembles the summary; the
  professional decides. For Duly the professional is the DSO (or an attorney), and the handoff
  Loop must come back: "Did your DSO reply? Add what they said."
- **Refuses:** Babylon's posture. Any accuracy or "better than a professional" claim.

### Boundless
- **Loop:** questionnaire to forms to document collection to expert review to filing to tracking.
- **Evidence:** "From eligibility screening to document review and filing"; "tracks your progress,
  and keeps your documents organized"; unlimited live support
  ([Boundless individuals](https://www.boundless.com/services/individuals)). For employers, "every
  status change, document request, and deadline is tracked in the platform and visible to HR,
  legal, and the employee in real time" ([Boundless case lifecycle](https://www.boundless.com/services/business/case-lifecycle-management),
  from a search summary, unverified on the page itself).
- **Duly takes:** the document request as a Loop step ("Upload your new EAD when it arrives")
  that closes when the paper is in the vault and its fields are confirmed.
- **Refuses:** preparing filings. Duly is a record, not a filer.

### Lawfully
- **Loop:** case number to automatic status checks to push on change to "what to expect next".
- **Evidence:** "the app will automatically give you a push notification when your USCIS case
  status is updated", and it "supplements the meaning of the message and what to expect in the
  next step"; it also "predicts the expected decision date" and "generates the probability of the
  approval and RFE rate" ([Lawfully](https://www.lawfully.com/resources/what-is-uscis-case-tracker)).
  It adds community, mock interviews and paid attorney consultations ([Lawfully](https://www.lawfully.com/)).
- **Duly takes:** a status change is never shown alone; it always carries the meaning and the next
  thing, and for Duly, which of the student's own dates move.
- **Refuses:** approval probability and RFE odds. These are predictions about the person from
  other people's cases. Processing times only as a figure quoted from USCIS with its date (already
  an open decision in competitor/ANALYSIS.md, removed from the repo on 2026-10-03, D100; in git
  history at 67bbc33).
- **Note on wiring:** USCIS runs a Case Status API on its Torch developer portal; production
  access requires a demo and approval ([USCIS developer portal](https://developer.uscis.gov/)).
  This is the legitimate path for Duly's B8, rather than scraping.

### SimpleCitizen
- **Loop:** eligibility quiz to guided questionnaire ("until the checklist is finished") to
  uploads to attorney review ([Y Combinator](https://www.ycombinator.com/blog/simplecitizen/)).
  Its site says that while USCIS processes the case it will "track the progress and alert you of
  important milestones" (from a search summary of [simplecitizen.com](https://www.simplecitizen.com/how-it-works/), unverified).
- **Duly takes:** the visible checklist that finishes. A Loop shows its steps and ticks them.

### Duolingo
- **Loop:** a daily habit loop; the interesting part is the notification engine.
- **Evidence:** reminder text is picked from "pools of hand-written templates", each with
  "eligibility criteria to prevent the template from being sent to an inappropriate user".
  "Fresh" templates work better, so the algorithm applies a recency penalty, otherwise it
  "will converge to using the same template ... which will get repetitive, desensitize users".
  Result: +0.5% daily active users and +2% new-user retention
  ([Yancey and Settles, KDD 2020](https://research.duolingo.com/papers/yancey.kdd20.pdf)).
  The well-known "These reminders don't seem to be working. We'll stop sending them for now" is
  reported as one of its most successful notifications
  ([Sherwood News](https://sherwood.news/tech/duolingo-q2-earnings-monthly-active-users-milestone/), unverified quote attribution).
- **Duly takes:** templates with eligibility rules (a "job ended" nudge only for a student whose
  job ended), and variety in wording for non-deadline nudges so they do not go numb. And the
  back-off: if three check-ins go unanswered, Duly stops asking and leaves one quiet line on Home.
- **Refuses:** optimising for daily use, streaks, guilt. A student who opens Duly twice a month and
  is never surprised by a date is the success case.

### Monzo
- **Loop:** event-driven: something happens to your money, the app tells you in seconds and offers
  the next action.
- **Evidence:** about 2,000 microservices talking over RPC and queues (Kafka, NSQ), with event data
  streamed to an append-only store ([Monzo data stack](https://monzo.com/blog/2021/10/14/an-introduction-to-monzos-data-stack);
  service counts from a search summary of [Monzo security](https://monzo.com/blog/2022/03/31/how-we-secure-monzos-banking-platform)).
  Design for anxiety: "When our system notices that your income has halted, we could send a
  notification", "Without accusation or interrogation, a simple prompt may begin the conversation",
  and choice in how people want to be contacted ([Monzo design blog](https://monzo.com/blog/2017/01/27/designing-product-mental-health-mind)).
  "Positive friction", steps added on purpose to protect people
  ([Econsultancy](https://econsultancy.com/prudent-ux-for-banking-monzo-designs-positive-friction/)).
  "Magic moments" are used sparingly: "we need to carefully pick those moments where we arrest a
  user's attention" ([Monzo](https://monzo.com/blog/2022/11/04/how-we-design-magic-moments-at-monzo)).
- **Duly takes:** detect the stall (a job with no confirmation past its staleness date is Monzo's
  "income has halted"), ask without accusing, let the student choose channel and time, and keep
  the one delight for real milestones (EAD approved, STEM filed).
- **Refuses:** nothing here; Monzo is the closest tone model.

### Chime
- **Loop:** a small, closed, automatic loop. SpotMe covers a purchase, "You'll receive a
  notification in the Chime app confirming that SpotMe covered the transaction", and "when your
  next deposit arrives ... it's automatically applied to your negative balance"
  ([Chime](https://www.chime.com/blog/how-to-use-spotme/)).
- **Duly takes:** the loop that closes itself when an outside fact arrives. Example: the STEM
  "file by" Loop closes itself the moment a receipt number is added, and says so.

## 3. The wiring behind it

This is how a professional team would build the Loop, layer by layer. Section 8 lists what to
measure.

### 3.1 The record is an event log
- Store every fact the student gives as an event ("job ended Oct 31, entered Sep 30, confirmed"),
  never as an overwrite. Current state is a replay. Fowler's event sourcing gives three things Duly
  needs: complete rebuild, "temporal query" (state "at any point in time") and replay to correct a
  past mistake ([Fowler](https://martinfowler.com/eaaDev/EventSourcing.html)).
- What this buys Duly: Undo is free; "as of" is exact; the "digital immigrant footprint" the
  founder asked for is literally the log, rendered as a timeline of papers, jobs, trips, reports
  and closed Loops; a rule change can replay the record to show what moved.
- Fowler's warning applies: replay must not resend notifications or emails. Side effects go
  through a gateway that knows whether it is a replay (same page).
- Fits the existing stack: SQLCipher on the device holds the log; the encrypted backup (D54) ships
  log segments, not screens.

### 3.2 The engine stays the only source of dates; add a completeness pass
- Today the engine answers "what are the dates". Add, per item: the facts it read, which are
  missing or stale, and which missing facts would change the result. That is TurboTax's
  completeness graph ([arXiv 2009.06103](https://arxiv.org/abs/2009.06103)) and it is what makes
  questions feel smart: Duly never asks something whose answer would not change anything.
- Missing or stale facts still yield cannot_tell (CLAUDE.md); the completeness pass only turns
  that into the one best question.

### 3.3 Each Loop is a statechart
- A Loop instance is a small state machine with hierarchy: the "acting" state has child steps;
  "waiting" has a timer; "handed off" is a parallel region that can run while other steps wait.
  Statecharts add "hierarchy, concurrency and communication" over flat state machines and prevent
  impossible states ([Stately docs](https://stately.ai/docs/state-machines-and-statecharts)).
- Loop templates are data, not code: id, the trigger events, the clarifying facts (from the
  completeness pass), the engine items it shows, the steps, the confirm question, the receipt
  text, the reopen events, and the rules it depends on (with their pack ids, so a rule change can
  find every Loop that read it). Templates are reviewed like rule rows: each step that states an
  obligation must point to a sourced rule.
- States: `opened, clarifying, answered, acting, waiting(until), confirming, done, handed_off,
  reopened, dismissed`. `dismissed` is allowed ("Not now"), never silently.

### 3.4 Timers that survive
- Server pattern: a workflow "blocks on a Signal or Update, sets a durable Timer for the reminder
  or the deadline" and escalates if nothing happens
  ([Temporal](https://docs.temporal.io/evaluate/use-cases-design-patterns),
  [Temporal blog](https://temporal.io/blog/human-in-the-loop-approvals)).
- Duly's constraint: dates are computed on the device (VALUE-2 decision 3 recommends the device).
  iOS caps pending local notifications at 64 per app
  ([Apple forums](https://developer.apple.com/forums/thread/811171); limit widely reported, the
  thread is the closest primary source I could reach). So: the device schedules the nearest
  timers across all Loops, collapses same-day items into one morning message (already promised),
  and reschedules every time the app opens or the record changes.
- Opt-in server timers only for email (the existing open decision on email reminders). The
  server then holds a date and an opaque id, not the reason.

### 3.5 An inbox with real "Done"
- GitHub's notification inbox is a good model of finishing: "Done" removes an item and keeps it
  for 3 months; "Unsubscribe" silences a thread "until you are @mentioned"
  ([GitHub docs](https://docs.github.com/en/subscriptions-and-notifications/how-tos/viewing-and-triaging-notifications/managing-notifications-from-your-inbox)).
- Duly: Done moves a Loop to the record, never deletes it. A later event that touches the same
  rule or paper reopens it with a line saying why.

### 3.6 Notifications by urgency
- iOS has four levels: passive (into the list, no sound), active, time-sensitive ("breaks
  through system notification controls") and critical
  ([Apple docs](https://developer.apple.com/documentation/usernotifications/unnotificationinterruptionlevel)).
- Duly mapping: passive for receipts and "nothing changed"; active for the morning digest;
  time-sensitive only when a filing or report window ends within a few days and the Loop is not
  confirmed. Never critical. The lock-screen text hides names and numbers by default (privacy,
  same rule as Share).

### 3.7 Choosing what to say, without optimising for engagement
- Use Duolingo's two ideas, not its objective: eligibility rules per template and a recency
  penalty for variety ([Yancey and Settles](https://research.duolingo.com/papers/yancey.kdd20.pdf)).
  Do not run a bandit on deadline reminders; a deadline reminder is fixed text with the engine's
  date. Variety applies only to check-in wording and receipts.

### 3.8 Where AI fits, and where it must not
- Credit Karma's split is the right one: one system decides, a second only explains
  ([Tearsheet](https://tearsheet.co/artificial-intelligence/how-credit-karma-is-blending-traditional-ai-with-embedded-genai-to-create-more-impactful-user-experiences/)).
  For Duly the decider is the deterministic engine plus Loop templates; nothing generative
  decides a date, a step or a conclusion.
- The useful ML is small and local: (a) an on-device intent classifier that maps a typed question
  ("I lost my job", "going home in December") to a Loop template, with the top three shown as
  buttons so the student confirms the match; (b) document field reading on device (D55). Both
  run without sending text out (D60). A miss falls back to "I do not have a guide for that yet.
  Draft a question to your DSO?" and the unmatched phrase (with consent, stripped of values) feeds
  the backlog of new templates. That is how "anyone can ask anything" stays honest.
- Learn from Babylon and K Health: never claim accuracy versus a professional; route judgement
  to the DSO with a ready summary.

## 4. What makes it feel smart and not robotic, and calm rather than scary

Evidence first, then what it means for Duly.

- **Fear of the unknown is the fundamental fear.** Carleton argues fear of the unknown "may be a,
  or possibly the, fundamental fear" underlying anxiety
  ([Carleton 2016, J. Anxiety Disorders](https://www.sciencedirect.com/science/article/pii/S0887618516300469)).
  For Duly: the cure is not reassurance, it is a known next state. Every open Loop shows what it
  is waiting for and the date Duly will look again. "Waiting" with a date is calm; silence is not.
- **Showing the work raises trust and value.** People can prefer a service that shows its effort,
  even with a longer wait for identical results
  ([Buell and Norton 2011, Management Science](https://pubsonline.informs.org/doi/10.1287/mnsc.1110.1376);
  [HBS summary](https://www.hbs.edu/faculty/Pages/item.aspx?num=40158)). Buell's later work found
  operational transparency also raises trust in government services
  ([MSOM 2021](https://pubsonline.informs.org/doi/10.1287/msom.2020.0877), title only, unverified
  in detail). For Duly: the receipt after each Loop lists what Duly checked ("Checked your I-20
  end date, your EAD, the 90-day rule (8 CFR 214.2(f)(10)(ii)(E), checked Sep 2026)"). This is
  also the existing sources promise, just surfaced at the end of a Loop.
- **Plans with when and where get done.** Implementation intentions ("if situation X, I will do
  Y") had a medium-to-large effect on goal attainment, d = 0.65 across 94 studies (Gollwitzer and
  Sheeran 2006, Advances in Experimental Social Psychology 38; figure as summarised at
  [goalsandprogress.com](https://goalsandprogress.com/implementation-intentions-gollwitzer-how-to/)
  and the [NCI copy of Gollwitzer's chapter](https://cancercontrol.cancer.gov/sites/default/files/2020-06/goal_intent_attain.pdf);
  later, larger studies suggest a smaller true effect). For Duly: each step reads "what, where, by
  when", and offers "Add to calendar" so the student makes the if-then plan in one tap.
- **Unfinished tasks do not reliably nag; people do resume them.** A 2025 meta-analysis found no
  overall memory advantage for unfinished tasks (Zeigarnik), but a general tendency to resume
  interrupted tasks (Ovsiankina) (Ghibellini and Meier, Humanities and Social Sciences
  Communications;
  [ResearchGate](https://www.researchgate.net/publication/393261073_Interruption_recall_and_resumption_a_meta-analysis_of_the_Zeigarnik_and_Ovsiankina_effects),
  [Wikipedia, Ovsiankina effect](https://en.wikipedia.org/wiki/Ovsiankina_effect); abstract
  details from a search summary). For Duly: do not leave Loops open to create tension. Make
  "pick up where you left off" one tap, and close what can be closed.
- **Ask without accusing; give control.** Monzo: "Without accusation or interrogation, a simple
  prompt"; let people choose how and when they are contacted
  ([Monzo](https://monzo.com/blog/2017/01/27/designing-product-mental-health-mind)). For Duly: the
  check-in copy never implies the student is late; channel and hour are the student's.
- **Delight is rare and earned.** Monzo picks "carefully ... those moments where we arrest a
  user's attention" ([Monzo](https://monzo.com/blog/2022/11/04/how-we-design-magic-moments-at-monzo)).
  For Duly: one quiet moment at real milestones (EAD approved, STEM filed, program completed).
  Not for every tap.
- **Progressive disclosure.** "Disclose everything that users frequently need up front", keep the
  rest one obvious step away, with labels that set expectations
  ([NN/g](https://www.nngroup.com/articles/progressive-disclosure/)). This is the basis for Home
  as collapsed Loops (section 7).
- **Goal gradient** (effort rises as the finish nears; Kivetz, Urminsky and Zheng 2006, JMR) is
  often cited for progress bars. I could not open the paper this session: unverified. If used,
  only as "2 of 3 steps done" inside a Loop, never as a score.
- **What makes it robotic, by contrast:** the same sentence every time (Duolingo's desensitising
  finding), a question that does not change anything (TurboTax's reason for completeness
  pruning), an answer with no next step, and a button that names an action instead of the outcome.

## 5. Ten patterns for Duly

Each: the rule, a concrete example, how it closes, and the line it must not cross.

### P1. Every question and event becomes a Loop with a visible state
- **Rule:** one object per thing being dealt with. It shows its state in a few words ("Waiting
  for your DSO", "2 of 3 done, next by Nov 10", "Done Oct 2").
- **Example:** the student types "I lost my job". The router offers "My job ends or ended",
  "My hours dropped", "Something else". One tap opens the Job ended Loop.
- **Closes:** when every step is confirmed or handed off and returned.
- **Never:** a Loop with no state line. A Loop that opens without the student or an event opening it.

### P2. An answer always ends with what, where, when
- **Rule:** stage 3 is never the last screen. Below the engine's answer sit the steps, each with
  its place and its engine date, and "Add to calendar".
- **Example:** "Your job ended Oct 31. Report it to your DSO by Nov 10 (school portal). With no
  new job, day 90 is Dec 19." Then steps: report the end; record a new job when you have one;
  check-in on Nov 30.
- **Closes:** moves to acting, not done.
- **Never:** "you should be fine". Steps that state an obligation without a sourced rule.

### P3. Ask only the question that changes the answer
- **Rule:** clarifying questions come from the completeness pass. If the answer would not move any
  date or count, Duly does not ask.
- **Example:** Trip Loop. If the student is on OPT with a job recorded, Duly does not ask about
  unemployment; it asks for the EAD card only if the return date is after the card's end.
- **Closes:** returns to answered as soon as the last needed fact is in.
- **Never:** a form of every field "just in case".

### P4. The check-in branches and acknowledges
- **Rule:** every answer to a check-in produces a visible result and the next check date, then
  collapses. Today's "Yes, same" does nothing visible.
- **Example:** "Still at Northwind, about 40 hours a week?" Yes: "Saved. Count stays at 41 days
  as of Sep 30. I will ask again around Oct 30." Job ended: opens the Job ended Loop at P2. Hours
  changed: one field, then the same receipt. Not sure: "Check your last pay stub; I will ask
  tomorrow."
- **Closes:** immediately, with a receipt.
- **Never:** streaks, "you missed", a count carried past its last confirmed day.

### P5. Buttons name the outcome, and committing unfolds the plan
- **Rule:** replace "This happened" with the outcome ("Save: job ended Oct 31", "Save my trip,
  Dec 18 to Jan 9"). Saving opens the Loop's steps right there.
- **Example:** in Try a change, after the preview, "Save: job ended Oct 31" leads to the same
  steps as P2, already filled in.
- **Closes:** the preview closes; the Loop opens in acting.
- **Never:** a hypothetical in the record or reminders (VALUE-2 already says this).

### P6. Waiting is a state with a next check
- **Rule:** when the next move belongs to someone else (USCIS, the DSO, an employer), the Loop
  says who, since when, and when Duly will look again.
- **Example:** I-765 filed, receipt added. "Waiting on USCIS since Jan 14. I will ask you to check
  your status on Feb 14, or update you if the status connection is on." Lawfully's "what to expect
  next" goes here, as a quoted USCIS processing figure with its date, if you approve that.
- **Closes:** when the outside fact arrives (approval notice uploaded, new card added).
- **Never:** odds of approval, a predicted decision date for this student.

### P7. Close with a receipt, then collapse
- **Rule:** positive feedback is a factual receipt: what Duly saved, what changed, what it checked,
  the next date if any. Then the Loop folds into a single "Done" line.
- **Example:** "Done. You marked the report made on Oct 2. Your record now shows the job ended Oct
  31. Unemployment count resumes from Nov 1. Next: a check-in on Nov 30."
- **Closes:** this is the close.
- **Never:** "Great job", "You're all set", "safe", "on time".

### P8. Closed Loops reopen on events, and say why
- **Rule:** each Loop lists the rules and papers it read. A rule update, a new paper, a status
  change or a passed date reopens exactly the Loops that read them.
- **Example:** a pack update changes the cap-gap end. The Cap-gap Loop reopens: "Reopened: the
  cap-gap end rule changed on [date]. Your cap-gap now ends Apr 1, 2027. Nothing to do."
- **Closes:** often immediately ("Nothing to do"), which is itself the reassurance.
- **Never:** a law update to a student before publish_blockers is empty (CLAUDE.md).

### P9. Handoffs come back
- **Rule:** a DSO or attorney question is a Loop step with a return path: draft, send through the
  share sheet, then "Did they reply?" in a few days, then record the answer as a school-tagged
  fact with its date.
- **Example:** "Is my unpaid research position qualifying employment?" Duly cannot conclude; it
  drafts the email with the facts from the record. Five days later: "Did your DSO answer? Add what
  they said." The answer becomes a school-tagged fact the engine can read.
- **Closes:** when the answer is recorded, or the student marks "No answer, close".
- **Never:** a verdict while waiting, or treating the DSO's answer as a rule for others.

### P10. Runways: prepare ahead on a schedule
- **Rule:** dated goals (trip, STEM filing window, program end) open a Loop early with a short
  schedule of checks counted back from the date, each a passive or morning item.
- **Example:** program end May 15. At 90 days out: "Your OPT filing window opens Feb 14" (engine
  date). At the window: "Ask your DSO for the recommendation." At recommendation: the File-by
  Loop. Each step closes and the next appears.
- **Closes:** when the goal date passes and the outcome is recorded.
- **Never:** countdown timers, red alarms (existing rule).

## 6. Five worked loops

Dates below are the prototype's sample case (OPT, 41 unemployment days used as of Sep 30, job at
Northwind) and are illustrative; in the product every date comes from the engine.

### 6.1 Job loss
1. **Open:** check-in answer "Job ended", typed "I got laid off", or Try a change, "My job ends".
2. **Clarify:** last day of work (from the student). Whether another job is already recorded
   (from the record). Nothing else changes the dates.
3. **Answer:** "Report the end by Nov 10. With no new job, day 90 would be Dec 19."
   (opt.report_employer_within_days, guidance tag; unemployment counters.)
4. **Act:** (a) Report to DSO or the SEVP portal, with where to do it (b) Start your search; Duly
   does not run a job board, so the step is "When you have an offer, add it here" (c) Keep these
   dates: report by Nov 10, day 90 Dec 19, EAD end.
5. **Wait:** check-in every 2 weeks, wording varied: "Any new job or offer?"
6. **Confirm:** "Report made?" Yes: date saved. New job added: count stops; receipt.
7. **Done:** "Done. New job at Acme from Nov 20 saved. Count stopped at 61 days."
8. **Reopen:** new job ends; hours fall below the line; a rule update on reporting.
- **Never:** what follows day 90, "you will be out of status".

### 6.2 Travel
1. **Open:** Timeline, "Plan a trip", or typed "going home for Christmas".
2. **Clarify:** leave and return dates; purpose only if it changes a count. Passport and visa
   fields if not on file.
3. **Answer:** Trip check lines from VALUE-2 feature 3: travel signature coverage, EAD end against
   return, days away against the five-month line, passport and visa expiry as dates.
4. **Act:** (a) If the signature does not cover the return: "Ask your DSO for a new travel
   signature" with a draft (b) "Carry these" offline folder, preselected (c) Add both dates to
   calendar.
5. **Wait:** runway (P10): T-21 days "signature requested?", T-2 "folder downloaded on this
   phone?".
6. **Confirm:** on the return date, "Back in the US? Confirm your return date."
7. **Done:** "Trip saved, Dec 18 to Jan 9, 22 days. [Counts updated if any.]"
8. **Reopen:** return date changes; a new I-20 arrives.
- **Never:** "you can travel"; visa stamping and re-entry judgements go to the DSO.

### 6.3 STEM OPT filing
1. **Open:** runway from the EAD end date, or typed "STEM extension".
2. **Clarify:** whether the degree's CIP code is on the DHS list (read from the I-20 on device,
   not guessed from the major, per competitor/ANALYSIS.md, removed from the repo on 2026-10-03,
   D100; in git history at 67bbc33); employer E-Verify status as a student-entered fact; DSO
   recommendation date when it exists.
3. **Answer:** File-by date (VALUE-2 feature 1): "File your I-765 by [engine date]", the limit
   that sets it marked.
4. **Act:** (a) Complete the I-983 with your employer, upload it (b) Get the DSO recommendation
   (c) File the I-765 by the date (d) Add the receipt number.
5. **Wait:** after receipt, P6 waiting state, with cap on reminders.
6. **Confirm:** approval notice and new EAD uploaded, fields confirmed.
7. **Done:** the Loop closes and opens its children: STEM validation reports and the I-983
   evaluation dates (VALUE-2 feature 4), each its own small Loop.
8. **Reopen:** employer change (new I-983 due), RFE notice uploaded (handoff Loop to attorney or
   DSO).
- **Never:** "eligible", odds, a date from a rule not saved with its quote.

### 6.4 Address change
1. **Open:** typed "I moved", or Settings, address.
2. **Clarify:** new address, move date.
3. **Answer:** blocked today, and Duly says so plainly: the 10-day report under 8 CFR
   214.2(f)(17) is not yet a saved rule in the pack (VALUE-2 feature 4 and open decision 4), and
   AR-11 stays out until saved. So the Loop gives no date. It says "Tell your school about your new
   address; your DSO can confirm the deadline" and drafts the note.
4. **Act:** update the record; share the draft with the DSO.
5. **Confirm:** "Did you update it with your school?" with date.
6. **Done:** receipt with the date the student gave.
7. **When the rule is saved:** the Loop template gains the engine date and P8 reopens open
   address Loops to show it.
- **Never:** a "10 days" figure before the rule row with its quote exists.

### 6.5 Lost document
1. **Open:** Documents, "I lost a paper", or typed "lost my passport" / "lost my EAD card".
2. **Clarify:** which document; whether the student is outside the US (changes who to contact).
3. **Answer:** what Duly holds: "You have a copy of this saved on Mar 3, with its number and dates."
   The copy can be shared at once. No replacement procedure is in the F-1 pack today; Duly does
   not invent one.
4. **Act:** (a) open the stored copy offline (b) for an I-20: draft to the DSO for a reissue
   (c) for an EAD or passport: link to the official agency page saved as a source, once one is
   saved; until then, the DSO draft (d) mark the old paper "reported lost" so its dates stop
   feeding reminders only after a replacement is confirmed.
5. **Wait:** "Replacement arrived?" check every 2 weeks.
6. **Confirm and done:** new paper uploaded, fields confirmed, old one archived, receipt lists what
   moved (a new card number, any date change).
- **Never:** steps for a replacement filing until the rule and its source are saved.

## 7. Home as a set of collapsed Loops

The founder's point: Home is too crowded; most of it should be closed items that each deliver
something. Proposal, built on progressive disclosure ([NN/g](https://www.nngroup.com/articles/progressive-disclosure/)):

- **Top:** one line of where you stand ("On OPT. 41 of 90 days used as of Sep 30.") and the single
  next thing with its date. Nothing else above the fold on a phone.
- **Open Loops:** each one line, collapsed: name, state, next date. Tap to expand into its steps.
  At most three shown; "4 more" expands. Order: earliest engine date first.
- **Ask or tell Duly:** one field, always present, routing to Loop templates (section 3.8).
- **Done recently:** a single collapsed line ("3 done this month") that expands to receipts.
- **Everything else** (documents, timeline, USCIS status, News) lives in its own place, not on Home.

What the student should feel on opening: "I know what is next, and nothing is waiting on me that
I do not know about." When no Loop needs the student, Home says that in one sentence with the
next date Duly will look again. That empty state is a feature.

**Naming.** "Scenarios" is the wrong word for a student; it sounds hypothetical. The Loops above
are real situations. Candidates for the founder: "Situations", "What's happening", "If this
happens" (for Try a change only). The record of closed Loops plus papers, jobs and trips is the
"footprint"; a plain name for it could be "Your history" or "Your record".

## 8. What to measure

All computed on the device; only counts leave, and only with consent. These are product
proposals, not sourced findings.

- **Loop closure rate:** share of opened Loops that reach done or handed-off-and-returned.
- **Time to done:** median days from open to done, per template.
- **Stale Loops:** open with no state change past their next check date. Target near zero.
- **Unmatched questions:** typed questions that matched no template (the backlog for new ones).
- **Receipt feedback:** a one-tap "Was this clear?" on receipts, as TurboTax measured Explain Why
  helpfulness ([arXiv 2009.06103](https://arxiv.org/abs/2009.06103)).
- **Notification opt-outs and unanswered check-ins:** rising numbers mean Duly is nagging.
- **Disagreement checks:** a test fails if a Loop shows a date that differs from the engine item
  it cites (extends ANALYSIS.md move 1, removed from the repo on 2026-10-03, D100; in git history
  at 67bbc33).

## 9. Risks and how the design contains them

| Risk | Containment |
|---|---|
| False closure: a Loop says done when the obligation is not met | Done requires the student's confirmation or an outside fact; the receipt states "You marked this made on Oct 2", never "submitted" (VALUE-2 wording) |
| A Loop step reads as legal advice | Every obligation step cites a pack rule; anything else is a DSO step (BOUNDARY.md) |
| Nagging and fatigue | Back-off after three unanswered check-ins; one morning digest; varied wording only for non-deadline nudges (Duolingo finding) |
| Lock-screen leaks | Notification text hides names and numbers by default |
| iOS 64-notification cap drops a reminder | Schedule nearest first, reschedule on open and on record change, test with a fixed Clock |
| Router sends a question to the wrong Loop | Show top three matches as buttons; the student picks; no free generation |
| Replay resends messages | Side effects only through a gateway that knows replay (Fowler) |
| A rule change silently changes an old receipt | Receipts are immutable events; a rule change creates a new reopen event that cites both |

## 10. Decisions for the founder

1. Approve the Loop as Duly's one primitive (states in 3.3), replacing standalone question
   screens.
2. Approve outcome-named commit buttons ("Save: job ended Oct 31") in place of "This happened".
3. Approve the on-device router for typed questions, with the "no guide yet, draft to DSO"
   fallback, and no outside model.
4. Approve Home as: status line, next thing, up to three collapsed open Loops, ask field, done line.
5. Choose the name for the situations place.
6. Approve back-off after three unanswered check-ins.
7. Confirm the rule work these loops need first: 8 CFR 214.2(f)(17) (address), document
   replacement sources, the DHS STEM list (already open in ANALYSIS.md, removed from the repo on
   2026-10-03, D100; in git history at 67bbc33).

## Sources

- Yu, McCluskey, Mukherjee, "Tax Knowledge Graph for a Smarter and More Personalized TurboTax", KDD 2020 workshop: https://arxiv.org/abs/2009.06103
- TurboTax support, after filing: https://ttlc.intuit.com/community/after-you-file-7/why-am-i-not-able-to-track-my-refund-658867
- Tearsheet on Credit Karma: https://tearsheet.co/artificial-intelligence/how-credit-karma-is-blending-traditional-ai-with-embedded-genai-to-create-more-impactful-user-experiences/
- Credit Karma, Intuit Assist release: https://www.creditkarma.com/about/releases/introducing-intuit-assist-for-credit-karma
- Ada, App Store: https://apps.apple.com/us/app/ada-your-health-portal/id1099986434
- Ada help: https://ada.com/help/how-do-i-start-a-symptom-assessment/
- Babylon Health: https://en.wikipedia.org/wiki/Babylon_Health
- Clinical Maturity Lens on Babylon (secondary): https://www.clinicalmaturitylens.com/writing/babylon-symptom-checker
- K Health: https://en.wikipedia.org/wiki/K_Health
- Boundless individuals: https://www.boundless.com/services/individuals
- Boundless case lifecycle: https://www.boundless.com/services/business/case-lifecycle-management
- Lawfully: https://www.lawfully.com/ and https://www.lawfully.com/resources/what-is-uscis-case-tracker
- USCIS developer portal: https://developer.uscis.gov/
- SimpleCitizen: https://www.ycombinator.com/blog/simplecitizen/ and https://www.simplecitizen.com/how-it-works/
- Yancey and Settles, "A Sleeping, Recovering Bandit Algorithm for Optimizing Recurring Notifications", KDD 2020: https://research.duolingo.com/papers/yancey.kdd20.pdf
- Sherwood News on Duolingo notifications: https://sherwood.news/tech/duolingo-q2-earnings-monthly-active-users-milestone/
- Monzo data stack: https://monzo.com/blog/2021/10/14/an-introduction-to-monzos-data-stack
- Monzo security platform: https://monzo.com/blog/2022/03/31/how-we-secure-monzos-banking-platform
- Monzo, designing with mental health in mind: https://monzo.com/blog/2017/01/27/designing-product-mental-health-mind
- Monzo, magic moments: https://monzo.com/blog/2022/11/04/how-we-design-magic-moments-at-monzo
- Econsultancy on positive friction: https://econsultancy.com/prudent-ux-for-banking-monzo-designs-positive-friction/
- Chime SpotMe: https://www.chime.com/blog/how-to-use-spotme/
- Temporal use cases: https://docs.temporal.io/evaluate/use-cases-design-patterns
- Temporal human-in-the-loop: https://temporal.io/blog/human-in-the-loop-approvals
- Fowler, Event Sourcing: https://martinfowler.com/eaaDev/EventSourcing.html
- Stately, statecharts: https://stately.ai/docs/state-machines-and-statecharts
- GitHub notifications inbox: https://docs.github.com/en/subscriptions-and-notifications/how-tos/viewing-and-triaging-notifications/managing-notifications-from-your-inbox
- Apple interruption levels: https://developer.apple.com/documentation/usernotifications/unnotificationinterruptionlevel
- Apple forums, 64 pending notifications: https://developer.apple.com/forums/thread/811171
- NN/g, progressive disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- Carleton 2016, fear of the unknown: https://www.sciencedirect.com/science/article/pii/S0887618516300469
- Buell and Norton 2011, labor illusion: https://pubsonline.informs.org/doi/10.1287/mnsc.1110.1376 and https://www.hbs.edu/faculty/Pages/item.aspx?num=40158
- Buell et al., operational transparency in government: https://pubsonline.informs.org/doi/10.1287/msom.2020.0877
- Gollwitzer and Sheeran 2006 (summary): https://goalsandprogress.com/implementation-intentions-gollwitzer-how-to/ and https://cancercontrol.cancer.gov/sites/default/files/2020-06/goal_intent_attain.pdf
- Ghibellini and Meier 2025, Zeigarnik and Ovsiankina meta-analysis: https://www.researchgate.net/publication/393261073_Interruption_recall_and_resumption_a_meta-analysis_of_the_Zeigarnik_and_Ovsiankina_effects
- Ovsiankina effect: https://en.wikipedia.org/wiki/Ovsiankina_effect
