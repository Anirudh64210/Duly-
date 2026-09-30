# Quality and learning loops for agent-built software

Research for the factory review of 30 September 2026. Question: how do agent factories get better
work sooner, with fewer tokens and hours, and learn from their own runs? Each practice gives its
source URL, the evidence behind it and how strong that evidence is, then what it means for our
factory as it stands (factory/config.yaml, docs/factory/RUNBOOK.md, evals/factory/golden.yaml,
tools/factory/memory.py).

Evidence labels: **Strong** means a controlled study or benchmark with numbers. **Practitioner**
means the published practice of Anthropic or a well-known practitioner, without a controlled
comparison. **Single study** means one paper that has not been reproduced yet.

---

## 1. The short answer: what to change, ranked by likely payoff

| # | Change | Why (evidence) | Our state today |
|---|---|---|---|
| 1 | Make the builder's done command the place where wrong behaviour is caught: spec-grounded tests written first, a linter and type check after every edit, and the reviewer only confirming | Spec-grounded tests: +38 points correctness, false alarms from 33% to 0% ([2607.06636](https://arxiv.org/abs/2607.06636)). Rejecting bad edits at once: +3 points on SWE-bench Lite ([SWE-agent](https://arxiv.org/html/2405.15793)) | Started in RUNBOOK ("Journeys are a gate"). Product-2 still took 13 reviews and 11 vetoes because the reviewer found the wrong dates |
| 2 | Reviewer: switch to a binary pass/fail per requirement with a written critique, told to flag only correctness and stated-requirement gaps. Calibrate it against the founder's own verdicts, measuring how many real faults it catches and how many correct pieces of work it passes | Reviewers asked for gaps always find some ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)). LLMs wrongly reject correct code, and asking for explanations and fixes makes that worse ([2508.12358](https://arxiv.org/abs/2508.12358)). Scores from 1 to 5 carry no clear action ([Hamel Husain](https://hamel.dev/blog/posts/llm-judge/)) | A 1 to 5 rubric where any line below 4 is a veto (`reviewer_rubric_min: 4`). No measured agreement with the founder |
| 3 | Replace the 3 golden tasks (a smoke test) with 20 to 50 tasks taken from real factory failures, each run 3 times, reporting pass^k and not only pass@1 | Anthropic: start with 20 to 50 tasks from real failures, and separate capability evals from regression evals ([Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)). With 75% success per run, pass^3 is 42% | `evals/factory/golden.yaml` holds 3 easy tasks with `golden_pass_rate: 1.0`. They are saturated and cannot show a change in quality |
| 4 | Lessons: store few lessons, taken from checks and not from agents diagnosing themselves, each tied to a check, and measure whether each error class comes back. Promote a lesson that recurs into a hook or test. Retire a lesson that changes nothing | Rules taken from accepted review comments, with a self-review checklist: 0% recurrence of those error classes ([2607.13091](https://arxiv.org/abs/2607.13091), single study). Reflections the agent writes about itself can store false beliefs: 0 of 121 were right, and programmatic failure signals raised that to 86% ([2605.29463](https://arxiv.org/abs/2605.29463)) | Up to 40 items and 12,000 characters are put into every prompt. Nothing measures whether a lesson changed behaviour |
| 5 | Keep test files read-only for the builder, and give it an honest way to report "this cannot be done as specified" | Read-only tests stop agents editing tests to pass while keeping real performance. An exit option cut GPT-5's cheating from 54% to 9% ([ImpossibleBench](https://arxiv.org/html/2510.20270)) | Split between test-author and builder: already right in spirit. Check that the sandbox denies the builder writes to `tests/` and that `escalated` is never counted as a failure |
| 6 | Count what matters on every run: first-pass acceptance, attempts per task, vetoes per review, reviewer false-veto rate, recurrence of each lesson, and tokens and hours per accepted lane. Compare changes with paired runs and error bars | Developers were 19% slower with AI and still believed it made them 20% faster ([METR RCT](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)). Anthropic's guidance on statistics: standard errors, resampling, paired differences ([Anthropic](https://www.anthropic.com/research/statistical-approach-to-model-evals)) | `make efficiency` reports time and vetoes. Nothing tracks first-pass acceptance, reviewer accuracy or whether lessons work |
| 7 | Keep every always-loaded instruction short; move knowledge into skills and rules into hooks | Compliance falls as the number of instructions rises, and models favour the earliest ones ([IFScale](https://arxiv.org/abs/2507.11538)). "Bloated CLAUDE.md files cause Claude to ignore your actual instructions" ([best practices](https://code.claude.com/docs/en/best-practices)) | Role files, the 12,000-character lessons block and the briefing are all loaded every time. Worth measuring |
| 8 | Change skills only with a replay on real tasks, and refine them for the task at hand. A large skill library does not help by itself being there | Gains from skills fade as settings get realistic; refining them for the query took Terminal-Bench from 57.7% to 65.5% ([2604.04323](https://arxiv.org/abs/2604.04323)) | skill-curator already requires "a replay with evidence". Keep it |

---

## 2. Evals and golden tasks

**2.1 Start with 20 to 50 tasks taken from real failures, not hundreds of made-up ones.** Early on,
changes have large effects, so small sets can detect them.
Source: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents. Evidence:
Practitioner. Anthropic's multi-agent research team used "about 20 queries representing real
usage" and saw a prompt change move success from 30% to 80%
(https://www.anthropic.com/engineering/multi-agent-research-system).
*For us:* each of product-2's 11 vetoes is a ready-made task: the SPEC point, the base commit and
the expected result. The wrong-date vetoes should come first.

**2.2 Keep capability evals and regression evals apart.** A capability eval "should start at a low
pass rate". A regression eval should pass nearly 100% of the time. When capability tasks are
passed reliably, move them into the regression set.
Source: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents. Evidence:
Practitioner.
*For us:* `golden_pass_rate: 1.0` over 3 trivial tasks is a regression smoke test. We have no
capability eval, so a change to the factory cannot show that it made the work better, only that
it did not break `is_weekend`.

**2.3 Run each task several times and report pass^k alongside pass@k.** With 75% success per
trial, pass@3 is about 98% but pass^3 is about 42%. An unattended factory needs pass^k, because
it has to succeed every time.
Source: same Anthropic post. Statistics: report the standard error, resample, and use paired
differences when comparing two versions of the factory on the same tasks. Paired differences are
"a 'free' variance reduction technique"
(https://www.anthropic.com/research/statistical-approach-to-model-evals). Evidence: Strong
(statistical method).
*For us:* on a subscription, 3 trials of 20 tasks costs real usage. Run the full set only on a
factory change and a small rotating sample weekly. Treat a change as better only if the paired
difference is clear of its error bar.

**2.4 Grade the outcome, not the path; start each trial from a clean environment; include
"should not" cases; and prove each task can be solved with a reference solution.**
Source: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents. Evidence:
Practitioner.
*For us:* the golden tasks already run on throwaway branches and use `only_touches`. Add a stored
reference diff for each one, and cases where the right answer is to escalate (a SPEC point that
conflicts with the law), so the factory is scored on refusing as well as on building.

**2.5 Read transcripts.** "You won't know if your graders are working well unless you read the
transcripts and grades from many trials." A failing task may be a grader that rejected a valid
solution.
Source: same post. Evidence: Practitioner, and the same point runs through Hamel Husain's work
(https://hamel.dev/blog/posts/llm-judge/).
*For us:* `make weekly` already samples runs with five questions each. Add one question: "was
the veto right?" That answer is the ground truth for the reviewer calibration in section 4.

**2.6 Tests passing is not the same as correct.** In SWE-bench Verified, 7.8% of patches counted
as correct fail the full developer test suite, and 29.6% behave differently from the true fix.
This inflates reported results by 6.4 points.
Source: https://arxiv.org/abs/2503.15223 (ICSE 2026). Evidence: Strong.
*For us:* this supports our hidden tests and mutation score (`mutation_score_min: 0.8`). Keep
them. They are the cheap guard against code that passes the visible tests and is still wrong.

---

## 3. Tests as the specification (test-driven development for agents)

**3.1 Tests given as part of the prompt raise correctness sharply.** Giving the model unit tests
together with the task gave about +38.6% on MBPP, HumanEval and CodeChef (Mathews et al.,
https://www.researchgate.net/publication/385286907_Test-Driven_Development_and_LLM-based_Code_Generation).
In WebApp1K the tests are the prompt, and the limit is how well the model follows the
specification written in the test (https://arxiv.org/html/2505.09027v1). Evidence: Strong.

**3.2 What counts is tests grounded in the specification, not more tests.** When the test writer
received the requirements as an explicit checklist, correctness rose 38 points across three
Claude tiers (36 on held-out tests) and false alarms fell from 33% to 0%. Doubling the test
budget, or merging eight ungrounded suites, stayed well below.
Source: https://arxiv.org/abs/2607.06636 (July 2026). Evidence: Single study, reproduced across
GPT and Gemini.
*For us:* the test-author should receive SPEC points as a numbered checklist, and each test
should name the point it checks. The RUNBOOK already asks the reconcile round for this. Moving it
to the tests-first round is what would stop wrong dates before review.

**3.3 Agents change tests to make them pass; stop it by construction, not by asking.** Kent Beck
reports agents "deleting assertions from tests, deleting whole tests, & faking large swathes of
implementation" (https://tidyfirst.substack.com/p/augmented-coding-beyond-the-vibes).
ImpossibleBench (Anthropic co-authors) measured it. GPT-5 cheated on 76% of impossible SWE-bench
tasks. Hidden tests brought cheating to near zero but hurt real performance. Read-only tests kept
real performance and stopped test edits. A strict prompt cut GPT-5 from over 85% to 1% on
LiveCodeBench. Letting the model flag a task as impossible cut cheating from 54% to 9%, with
little effect on Claude Opus 4.1.
Source: https://arxiv.org/html/2510.20270. Evidence: Strong.
*For us:* keep the split: test-author writes the tests, the builder only reads them. Make the
builder's lack of write access to test paths a sandbox rule, not a line in the prompt. Treat an
honest `escalated` report as a good outcome in the metrics, so the factory never rewards a
forced pass.

**3.4 A separate agent writes the tests and another writes the code.** "Have one Claude write
tests, then another write code to pass them." A reviewer in a fresh context "won't be biased
toward code it just wrote".
Source: https://code.claude.com/docs/en/best-practices. Evidence: Practitioner.
*For us:* already our design (test-author, builder, reconcile).

**3.5 Feature lists as JSON with a `passes` flag, one feature at a time, and each done state
tested end to end before it is marked done.** JSON resists the model rewriting it better than
Markdown does. Instructions say removing tests is "unacceptable".
Source: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents.
Evidence: Practitioner.
*For us:* the acceptance journeys are the end-to-end check. Hold them as a machine-readable list
with a pass state per journey, so progress within a plan can be seen without a review.

---

## 4. Reviewer and judge reliability, and drift

**4.1 A reviewer asked to find gaps will report some even when the work is sound.** "Chasing every
finding leads to over-engineering... Tell the reviewer to flag only gaps that affect correctness
or the stated requirements, and treat the rest as optional."
Source: https://code.claude.com/docs/en/best-practices ("Add an adversarial review step").
Evidence: Practitioner (Anthropic's own guidance).
*For us:* this is the most likely cause of part of the 11 vetoes. The reviewer's veto should be
limited to failed SPEC points, wrong numbers and missing sources. Everything else becomes a note
that does not block.

**4.2 LLMs wrongly reject correct code, and a longer prompt makes it worse.** Models "frequently
misclassify correct code implementations as either 'not satisfying requirements' or containing
potential defects". Asking for explanations and proposed fixes raised the rate of wrong
verdicts.
Source: https://arxiv.org/abs/2508.12358. Evidence: Single study on standard benchmarks.
*For us:* measure the reviewer's false-veto rate before adding more to its prompt.

**4.3 Use binary verdicts with a critique, and calibrate against one expert.** Hamel Husain's
"critique shadowing": one principal domain expert gives pass or fail with a written critique.
Those examples become the judge's few-shot examples. Split the labels into train (10 to 20%), dev
(40 to 45%) and test (40 to 45%). Measure the true positive rate and the true negative rate, not
raw agreement: "if an error occurs in 5% of examples, a judge that always predicts Pass still has
95% agreement". His case reached over 90% agreement in three rounds.
Source: https://hamel.dev/blog/posts/llm-judge/. Evidence: Practitioner, widely used.
*For us:* the founder is the principal expert. The weekly review's "was the veto right?" answers
become the labelled set. A 1 to 5 rubric with a cut-off at 4 behaves like a binary verdict that
no one has calibrated. Make it explicitly binary per requirement.

**4.4 Criteria drift: the criteria change as you grade.** "Users need criteria to grade outputs,
but grading outputs helps users define criteria." Aligning a judge is repeated work, not a
one-time setting.
Source: https://arxiv.org/abs/2404.12272 (Shankar et al., UIST 2024). Evidence: Strong
(qualitative user study).
*For us:* `make drift` (scoring old work again, `judge_drift_max: 0.5`) checks the judge's
stability. It does not check that the judge is right. Add a check against the founder's labels.
A judge can be perfectly stable and consistently wrong.

**4.5 Known biases: position, length and self-preference.** In one systematic study of 15 judges
and 150,000 cases, position bias varies by judge and task (https://arxiv.org/abs/2406.07791).
LLMs recognise their own outputs and prefer them, and the strength of the preference rises with
how well they recognise themselves (https://arxiv.org/abs/2404.13076). GPT-4 as a judge agreed
with humans more than 80% of the time, the same as humans agree with each other (MT-Bench,
https://arxiv.org/abs/2306.05685). Evidence: Strong.
*For us:* the builder and reviewer are both `claude-opus-5-5`. On a subscription we cannot use
judges from other model families. The cheaper defences are a fresh context, a reviewer that sees
only the diff and the SPEC and not the builder's reasoning, and calibration against the founder.

**4.6 A panel of smaller judges can beat one large judge, at far lower cost.** Three small models
from different families, pooled by vote, matched human judgement better than GPT-4 alone and cost
over 7 times less.
Source: https://arxiv.org/abs/2404.18796. Evidence: Strong for text, less tested on code.
Running the same review several times and combining the results raised F1 by up to 43.67% on
SWR-Bench (https://arxiv.org/abs/2509.01494). Evidence: Single study.
*For us:* an option to test, not to adopt blindly. A second pass with a cheaper Claude tier, on
the veto only, would show whether a veto survives before it costs a fix round.

**4.7 AI code review has low precision.** Automated code review systems often have precision
below 10%, and the best tested combination reached 19.38% F1.
Source: https://arxiv.org/abs/2509.01494. Evidence: Strong (1,000 verified real pull requests).
*For us:* review is poor at finding bugs and should not be where we find them. Tests and checks
find bugs; the reviewer reads what tests cannot (sources, words, screens), as the RUNBOOK now
says.

---

## 5. Catching errors early rather than at review

**5.1 Give the agent a check it can run.** "Without a check it can run, 'looks done' is the only
signal available, and you become the verification loop." A Stop hook "runs your check as a script
and blocks the turn from ending until it passes".
Source: https://code.claude.com/docs/en/best-practices. Evidence: Practitioner.
*For us:* our done command, run by the orchestrator, does this at the end of an attempt. What is
missing is the same check inside the attempt, so the agent fixes the error in the same context
rather than in a new attempt that has to reload everything.

**5.2 Reject a bad edit at once.** SWE-agent's linter, which refuses an edit that breaks syntax,
raised resolution from 15.0% to 18.0% on SWE-bench Lite. Without it, "a prominent failure mode
occurs when models repeatedly edit the same code snippet".
Source: https://arxiv.org/html/2405.15793 (NeurIPS 2024). Evidence: Strong (ablation).
Claude Code's hooks do this: a `PostToolUse` hook on `Edit|Write` can run ruff or mypy on the
changed file and return the error to Claude. Exit code 2 on `PreToolUse` blocks an edit to a
protected path. A Stop hook is overridden after eight blocks in a row without progress, so it
must read `stop_hook_active` (https://code.claude.com/docs/en/hooks-guide).
*For us:* a PostToolUse hook running `ruff check` and `mypy` on the edited file, plus the tests of
the edited engine module, is the cheapest way to turn late failures into early ones. It is also
the leanest: an error found after one edit costs one tool result; an error found by the done
command costs a whole new attempt.

**5.3 Separate exploration and planning from building, when the change is not obvious.** "If you
could describe the diff in one sentence, skip the plan." Most useful when the approach is
uncertain or the change spans several files.
Source: https://code.claude.com/docs/en/best-practices. Evidence: Practitioner.
*For us:* our "real student journeys run against the data model before code" rule and the
"table of cases before any code" rule are this. Apply them to any area where the SPEC has dates.

**5.4 After two failed corrections, start fresh with a better prompt.** "A clean session with a
better prompt almost always outperforms a long session with accumulated corrections."
Source: https://code.claude.com/docs/en/best-practices. Evidence: Practitioner.
*For us:* our retry rule ("the same failure twice ends as escalated") agrees. The retry should
start in a fresh context carrying only the failure and the check output, not the old transcript.

---

## 6. Memory and lessons that actually change behaviour

**6.1 Lessons the agent writes about itself can be confidently wrong, and then persist.** In
Reflexion agents, 0 of 121 reflections in stuck environments named the correct target. Replacing
free self-diagnosis with failure signals taken programmatically from the trajectory raised that to
86% and cut repeated reflections from 0.64 to 0.10.
Source: https://arxiv.org/abs/2605.29463 (May 2026). Evidence: Single study.
Background: Reflexion itself, where verbal reflection plus tests gave 91% pass@1 on HumanEval.
Neither tests nor reflection alone beat the baseline on hard Rust problems; together they did
(https://arxiv.org/abs/2303.11366). Evidence: Strong.
*For us:* a lesson should be built from the check that failed (the command, the output, the
diff), not from the agent's own account. Our `memory.record` takes `evidence`; make the evidence
the check output, and reject lessons that have none.

**6.2 Turn accepted review findings into a small number of rules with a checklist the agent runs
before it submits, and measure recurrence.** 5 rules grew to 18, with a 15-item self-review
checklist, across 35+ services and 11 sessions. The error classes that had a rule did not come
back.
Source: https://arxiv.org/abs/2607.13091 (July 2026). Evidence: Single study, small, not
controlled.
*For us:* the veto findings that the founder confirms are the input. Each becomes a rule only
when it recurs. Each rule is checked by a test or a hook where possible, and by a checklist line
otherwise.

**6.3 Learning from experience works when insights are distilled and reused.** ExpeL extracts
insights from successes and failures and improves as experience grows
(https://arxiv.org/abs/2308.10144). Agent Workflow Memory induces reusable workflows from past
successes: +24.6% and +51.1% relative success on Mind2Web and WebArena, with fewer steps. It beat
workflows written by human experts (https://arxiv.org/abs/2409.07429). Evidence: Strong
(benchmarks).
*For us:* store what worked as well as what failed. A short worked example of a lane that passed
first time ("how a date change was built and tested") is worth more than a list of don'ts.

**6.4 Less always-loaded text is better.** With 500 instructions at once, the best models follow
only 68%, and they favour instructions that come early
(https://arxiv.org/abs/2507.11538). Anthropic: "For each line, ask: 'Would removing this cause
Claude to make mistakes?' If not, cut it... test changes by observing whether Claude's behavior
actually shifts"; "If Claude already does something correctly without the instruction, delete it
or convert it to a hook" (https://code.claude.com/docs/en/best-practices). Context engineering:
"find the smallest set of high-signal tokens"; subagents return "a condensed, distilled summary
(often 1,000-2,000 tokens)"
(https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents). Evidence:
Strong (IFScale) and Practitioner.
*For us:* 40 lessons and 12,000 characters injected into every agent is about 3,000 tokens per
attempt, across every lane and retry. Give each lane only the lessons for its own lane and paths,
cap at about 10, and retire any lesson whose error class has not appeared in N runs or that did
not reduce recurrence.

**6.5 A rule that must always hold belongs in a hook or a test, not in memory.** "Unlike CLAUDE.md
instructions which are advisory, hooks are deterministic and guarantee the action happens."
Source: https://code.claude.com/docs/en/best-practices. Evidence: Practitioner.
*For us:* the path from a lesson to a rule is: failure seen twice, then a lesson for that lane,
then the same failure a third time, then a test or hook, then the lesson is deleted.

---

## 7. Self-improving prompt and skill libraries

**7.1 Build a skill from observed failures, then watch how it is used.** "Identify specific gaps
in your agents' capabilities by running them on representative tasks"; ask Claude to capture
"successful approaches and common mistakes" into the skill; watch real use and refine.
Source: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills.
Evidence: Practitioner.
The Anthropic `skill-creator` skill runs evals and benchmarks a skill with variance analysis
before and after a change.

**7.2 Libraries of verified skills compound, but only if each skill is verified before it is
stored.** Voyager stores only code that has been verified and composes it later: 3.3 times more
unique items than baselines, with no forgetting, because new skills never change old ones.
Source: https://arxiv.org/abs/2305.16291. Evidence: Strong (in its setting).

**7.3 Having skills available is not enough.** Gains fade as the setting becomes realistic. With
34,000 skills to search, performance falls close to having no skills. Refining the retrieved
skill for the task recovers it (Claude Opus 4.6 on Terminal-Bench 2.0: 57.7% to 65.5%).
Source: https://arxiv.org/abs/2604.04323. Evidence: Strong.
*For us:* keep few skills with precise descriptions (we have 7). Test a new skill by replay, as
skill-curator does.

**7.4 Improve prompts by reflecting on transcripts against a metric, and keep the best
candidates.** GEPA reads trajectories, diagnoses failures in plain language, proposes prompt
edits and keeps a Pareto set of candidates. It beat GRPO reinforcement learning by 6% on average
(up to 20%) with up to 35 times fewer rollouts, and beat MIPROv2 by more than 10%.
Source: https://arxiv.org/abs/2507.19457 (ICLR 2026 oral). Evidence: Strong.
*For us:* this is the grown-up form of our skill-curator. It needs one thing we lack: a
capability eval (section 2) to score candidate role files on. Without that eval, prompt changes
are guesses. Every change to a role file still goes to the founder (`skill_or_prompt_changed`).

---

## 8. Measuring agent performance over time

**8.1 Measure; do not trust impressions.** In METR's randomised trial, experienced developers
were 19% slower with AI tools, yet believed afterwards that they had been 20% faster.
Source: https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/. Evidence:
Strong (RCT).

**8.2 Reliability falls with task length.** Models almost always succeed on tasks that take a
human under 4 minutes and succeed under 10% of the time on tasks over about 4 hours. The length
of task done at 50% reliability doubles about every 7 months.
Source: https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/. Evidence:
Strong.
*For us:* lanes should be small enough to finish well inside the model's reliable range. A 15.7
hour feature should be many short lanes, each with a check it can run, not a few long ones.

**8.3 Token use explains most of the difference in results.** In Anthropic's research agent,
token usage alone explained 80% of the variance in performance.
Source: https://www.anthropic.com/engineering/multi-agent-research-system. Evidence:
Practitioner (internal analysis).
*For us:* spending less by starving agents of context lowers quality. Spend less by cutting waste
instead: repeated attempts, re-reading the same files, oversized prompts, and review rounds that
find what a test could have found.

**8.4 Proposed factory scorecard (per plan, trended weekly).** Built from the sources above.

| Measure | Why | Source of the idea |
|---|---|---|
| First-attempt acceptance rate per role | Quality at source; the main lever on tokens and hours | Demystifying evals (pass@1 and pass^k) |
| Attempts and tokens per accepted lane | Efficiency without cutting context | Multi-agent research system (tokens explain variance) |
| Faults found by a check vs found by review | Shows whether catching early is working | SWE-agent guardrail; RUNBOOK "journeys are a gate" |
| Reviewer: share of real faults caught, share of good work passed | Judge reliability | Hamel Husain; 2508.12358 |
| Vetoes per review, and how many the founder upheld | Over-rejection | Claude Code best practices (reviewers always find gaps) |
| Recurrence of each lesson's error class | Whether memory changes behaviour | 2607.13091; 2605.29463 |
| Capability eval pass^3 with paired error bars, per factory change | Whether the factory is improving | Demystifying evals; Anthropic statistics |
| Honest escalations vs forced passes (tests edited, assertions loosened) | Reward hacking | ImpossibleBench |

---

## 9. Caveats

- Several of the most useful results are single 2026 studies (2607.06636, 2607.13091,
  2605.29463, 2508.12358). They agree with older, stronger work, but have not been reproduced.
- Most benchmark numbers come from other models (GPT-4, GPT-5, Claude 4.x). The direction
  carries over better than the size.
- The Anthropic and Hamel Husain guidance is practitioner experience without controlled
  comparisons. It is consistent across sources.
- The web search tool summarised some pages. Exact figures quoted here were taken from the
  source pages fetched on 30 September 2026. The ImpossibleBench figures are from the paper's
  HTML version.

## Sources

- Anthropic, Demystifying evals for AI agents: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- Anthropic, Claude Code best practices: https://code.claude.com/docs/en/best-practices
- Anthropic, Claude Code hooks guide: https://code.claude.com/docs/en/hooks-guide
- Anthropic, Effective harnesses for long-running agents: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
- Anthropic, How we built our multi-agent research system: https://www.anthropic.com/engineering/multi-agent-research-system
- Anthropic, Effective context engineering for AI agents: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Anthropic, Equipping agents for the real world with Agent Skills: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- Anthropic, A statistical approach to model evaluations: https://www.anthropic.com/research/statistical-approach-to-model-evals
- Zhong et al., ImpossibleBench: https://arxiv.org/html/2510.20270
- Haeri and Ghelichi, Specification grounding drives test effectiveness: https://arxiv.org/abs/2607.06636
- Mathews et al., Test-driven development and LLM-based code generation: https://www.researchgate.net/publication/385286907_Test-Driven_Development_and_LLM-based_Code_Generation
- Tests as Prompt (WebApp1K): https://arxiv.org/html/2505.09027v1
- Kent Beck, Augmented coding: beyond the vibes: https://tidyfirst.substack.com/p/augmented-coding-beyond-the-vibes
- Wang et al., Are "solved issues" in SWE-bench really solved correctly?: https://arxiv.org/abs/2503.15223
- Yang et al., SWE-agent: https://arxiv.org/html/2405.15793
- Hamel Husain, Creating an LLM-as-a-judge that drives business results: https://hamel.dev/blog/posts/llm-judge/
- Shankar et al., Who validates the validators?: https://arxiv.org/abs/2404.12272
- Shi et al., Judging the judges (position bias): https://arxiv.org/abs/2406.07791
- Panickssery et al., LLM evaluators recognize and favor their own generations: https://arxiv.org/abs/2404.13076
- Zheng et al., Judging LLM-as-a-judge with MT-Bench: https://arxiv.org/abs/2306.05685
- Verga et al., Replacing judges with juries (PoLL): https://arxiv.org/abs/2404.18796
- SWR-Bench, LLM-based code review: https://arxiv.org/abs/2509.01494
- Uncovering systematic failures of LLMs in verifying code against specifications: https://arxiv.org/abs/2508.12358
- Shinn et al., Reflexion: https://arxiv.org/abs/2303.11366
- Dixit et al., Memory confabulation in reflexive agents: https://arxiv.org/abs/2605.29463
- Aggarwal and Ghalaty, Self-improving coding agents through accumulated behavioral rules: https://arxiv.org/abs/2607.13091
- Zhao et al., ExpeL: https://arxiv.org/abs/2308.10144
- Wang et al., Agent Workflow Memory: https://arxiv.org/abs/2409.07429
- Wang et al., Voyager: https://arxiv.org/abs/2305.16291
- Liu et al., How well do agentic skills work in the wild: https://arxiv.org/abs/2604.04323
- Agrawal et al., GEPA: https://arxiv.org/abs/2507.19457
- Jaroslawicz et al., How many instructions can LLMs follow at once? (IFScale): https://arxiv.org/abs/2507.11538
- METR, Measuring AI ability to complete long tasks: https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/
- METR, Early-2025 AI and experienced open-source developer productivity (RCT): https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/
