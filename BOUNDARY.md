# The line: where Duly helps and where it stops

Status: approved by the founder on 2026-09-28 (DECISIONS.md D29). This file is binding on the assistant, the engine, the updates pipeline, all copy, and all marketing. It is enforced by code and tests, not by good intentions.

Honest limit: no design removes legal risk completely. This line puts Duly on the side that courts and regulators have treated as publishing information, and keeps it off the side they have treated as practising law or immigration consulting. Source research: docs/research/law-liability-design-2026-09.md.

## The rule in one sentence

Duly tells you what the rule says, where it is written, what its legal status is today, and what the arithmetic gives for the dates you entered. Duly never tells you what the rule means for you, what you should do, or how your case will turn out.

## Side A: Duly does this

| # | What | Example |
|---|---|---|
| A1 | State a rule with its citation and legal status | "Post-completion OPT allows 90 days of unemployment in total. 8 CFR 214.2(f)(10)(ii)(E). In effect." |
| A2 | Explain a term in plain words | What cap-gap is, what an RFE is, what "enjoined" means |
| A3 | Do arithmetic on a rule with fixed numbers, using dates the user entered, and show the working | "EAD start Jun 1 plus the days you marked without an employer gives 41 of 90." Inputs and rule shown. Ends with "Confirm with your DSO." |
| A4 | Say which updates touch the user's category, and name the field that matched | "Shown because your status is STEM OPT." |
| A5 | List what an official source says a process requires | The steps USCIS lists for a STEM extension, each linked |
| A6 | Report what the user's school publishes | "Your school's ISSS page says CPT needs a course enrollment. Checked Sep 20." |
| A7 | Handle nuance by showing every rule that touches the situation, side by side, with status | A founder on OPT asking about self-employment sees the SEVP guidance text, its source, and that it is guidance, not regulation |
| A8 | Keep and organise the user's own records | Documents, WorkBook days, exports |
| A9 | Draft a question for the user to send to their DSO or attorney | The step-back card, below |

## Side B: Duly stops here

| # | Never | Example of a request that triggers the stop |
|---|---|---|
| B1 | Say whether the user is in status, out of status, or safe | "Am I still in status?" |
| B2 | Say whether the user is or is not eligible for anything | "Can I apply for STEM OPT?" |
| B3 | Judge whether the user's facts meet a legal standard | "Does my job count as related to my degree?" "Does my startup count as employment?" |
| B4 | Recommend an action or compare strategies | "Should I travel?" "Is O-1 better than H-1B for me?" |
| B5 | Pick a form, a category code, or an answer on a form | "Which eligibility code do I put on the I-765?" |
| B6 | Predict an outcome or odds | "Will my H-1B get picked?" |
| B7 | Write anything addressed to a government agency | Cover letters, RFE responses, explanations, declarations |
| B8 | Fill in or submit a government form | Any |
| B9 | Resolve a conflict between sources on the user's behalf | When the school page and SEVP guidance differ, show both and stop |
| B10 | Reassure | "You're fine", "nothing to worry about", "you have plenty of time" |

## Before the tests: match a guide (D76)

A question or event is first matched to a guide: a Situation or a loop whose words, steps and
sources were written ahead of time, checked against this file and reviewed. "I lost my job", "what
do I do now?" and "when is my deadline?" each have one. A matched guide answers with its reviewed
words (general rules, Side A), the student's own dates and counts under A3, and the steps of its
loop, and carries the loop to done. The three tests below then apply to anything said about this
person beyond the guide's reviewed words, and a guide step that needs a judgement still ends in
the step back. When no guide matches, the step back is the answer. Doubt still resolves to the stop.

## The three tests, applied in order

1. Judgement test. Does answering need a judgement about this person's facts against a standard that has no fixed number (related, bona fide, qualifying, reasonable, material)? If yes, stop.
2. Modal test. Would the answer contain should, can, may, must, will, safe, fine, eligible, or qualify, with the user as the subject? If yes, stop.
3. Arithmetic test. Is the answer a date or a count from a rule with fixed numbers and inputs the user entered? If yes, answer under A3 with the working shown.

Anything that passes none of the tests cleanly is treated as a stop. Doubt always resolves to the stop.

## The step back

When the assistant stops, the user never sees a refusal. They see a calm card with four parts:

1. The rule or rules that touch the question, with citations and status (Side A still applies).
2. One plain sentence: "This part depends on your own situation, so it is a question for your DSO."
3. A drafted email to the DSO, built from a template and the user's own record, which the user can edit and send from their own mail. Duly never sends it.
4. Where to find an attorney if the matter is beyond a DSO (a neutral pointer such as the AILA lawyer search, no paid referrals).

The drafted email asks a question. It never argues a position and never states a conclusion for the DSO to agree with.

## Enforcement in code

| Layer | What it does |
|---|---|
| Question classifier | Runs on the whole conversation, not only the last message, so a user cannot walk the assistant across the line in small steps. Labels each turn A or B. Uncertain is B |
| Retrieval only | The assistant can only speak from the verified rule library, school records, and engine output. No source, no sentence |
| Output validator | Rejects any draft answer that contains a Side B pattern (second person plus a modal or a status word), a number that is not an engine value, or a sentence with no source. A rejected answer becomes a step-back card |
| No live drafting to agencies | There is no code path that produces text addressed to USCIS, SEVP, or a consulate |
| Copy linter | The same Side B word list runs over UI strings, emails, and marketing |
| Boundary test set | evals/ holds paired questions on each side of the line for every visa category, plus drift conversations. Any Side B answer that gets through fails the build. Part of the set is hidden from the agents that build the assistant |
| Audit | Every answer and every step back is logged with its sources and the rule that decided it |

## Where the assistant runs

In the released product, Ask reasons and writes its answers with Claude through Amazon Bedrock inside Duly's own AWS account, with no training on the data and no retention by the provider, so no user question and no user record is sent to Anthropic or any other outside model provider (D79, D80). The engine still supplies every date and count, and every rule in this file still applies (D79). That service has its own Ask address with logs off, its requests cannot be linked to an account, and crisis and enforcement questions stay on the device (D80). No value from a document reaches it, or any model, until the founder decides otherwise (D60). It comes after the open-source launch as a paid service, never part of the free core; the launch itself is local-only, with no Duly server holding student data (D84).

Until that service exists, Ask on a real record, in a test build (D85) or at launch, uses only the guides on the device and the drafted DSO question, and nothing about the student leaves the device (D84, D86).

For prototype testing only, a local helper sends the made-up sample student's record to Claude through the founder's own Claude Code login. No real record goes through it (D79, D86).

In the updates pipeline, models read public law text only.

## Words Duly never uses about itself

Lawyer, attorney, legal advice, consultant, paralegal, notario, guaranteed, prevents, protects your status, never miss a deadline, in any language, in any channel, including social posts and investor material.

## Changing this file

Only by founder decision recorded in DECISIONS.md. Agents may propose changes; they may not make them.
