# duly-2 research: fear-reducing psychology and the design that supports it

Date: 2026-09-30. Scope: calm technology, anxiety-aware design in finance and health, reassurance and
sense of control, predictability, progressive disclosure, feedback without gamification, delivering
errors and bad news, trust signals. Output: the evidence, what it means for the founder's "open
loop, closed loop" critique, and ten principles for Duly, each with a do and a do not.

How to read the evidence grades:

- **Strong:** a meta-analysis, or a randomized experiment with a large sample.
- **Moderate:** a single controlled experiment, or a large observational study.
- **Practice:** a published design standard or guideline from a recognised body (NN/g, GOV.UK, W3C).
- **Weak:** a vendor blog, a case study run by the vendor, or a small convenience survey.
- **Unverified:** a claim I could not confirm against a primary or reputable secondary source. It is
  marked where it appears and is never the sole basis for a principle.

Every external claim carries its URL. Copy suggestions in this file follow the repo's copy rules (no
long dashes, no words on the copy_lint list, buttons name outcomes).

---

## 1. Why fear is the design problem

**The audience is frightened, and the fear is about status.** A December 2025 Stop AAPI Hate data
brief reported that 89% of the international students it surveyed fear for their visa or residency
status. Weak evidence for prevalence: 87 students from 36 schools, not a random sample.
[stopaapihate.org press release](https://stopaapihate.org/2025/12/10/run-dont-come-new-study-finds-international-students-feel-unsafe-unwelcome-amid-rising-xenophobia-and-policy-instability/),
[data brief PDF](https://stopaapihate.org/wp-content/uploads/2025/12/25-SAH-IntlStudents-DataBrief-F-2-1.pdf),
[Inside Higher Ed summary](https://www.insidehighered.com/news/quick-takes/2025/12/11/international-students-afraid-under-trump-administration).
A secondary source reports more than 4,700 SEVIS records terminated in 2025
([f1visanetwork.com](https://f1visanetwork.com/alert-mass-f-1-sevis-terminations-status-2025/));
unverified against ICE data.

**People check status compulsively when they are anxious, and alerts make it worse.** A 2025 JAMA
Network Open study of 290,349 patients and 968,774 test results at Vanderbilt found patients
"refreshed" the portal while waiting for 25.9% of results, 39.3% for high-sensitivity results such
as biopsies. The authors call refreshing "a possible measure" of anxiety. Patients with
notifications turned on had higher odds of refreshing. Moderate evidence.
[Steitz et al. 2025, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11979724/),
[JAMA Netw Open](https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2832287).
This is the closest analogue I found to a student refreshing the USCIS case status page.

**People still want the bad news, fast.** In a 2023 survey of 8,139 patients at four US academic
medical centres, 96% preferred results released to them at once, even before a clinician had seen
them. Abnormal results raised reported anxiety (16.5% vs 5.0%; OR 2.71), and the preference held
even among people with abnormal results. Moderate evidence.
[Steitz et al. 2023, JAMA Netw Open](https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2802672),
[Healio summary](https://www.healio.com/news/primary-care/20230323/most-patients-prefer-receiving-immediate-test-results-through-electronic-portals).

**Implication.** Duly is used by a frightened person. Every screen either lowers or raises arousal.
The question for each screen is not only "is it correct" but "after reading this, does the student
know what will happen, when, and what they control?"

---

## 2. The evidence, by mechanism

### 2.1 Uncertainty hurts more than known bad news

- **Uncertainty drives the stress response.** In a UCL study (45 volunteers, mild electric shocks),
  stress, measured as pupil dilation and skin conductance plus self-report, peaked at a 50% chance
  of a shock and was lowest at 0% and 100%. "It's much worse not knowing you are going to get a
  shock than knowing you definitely will or won't." Moderate evidence.
  [de Berker et al. 2016, Nature Communications](https://www.nature.com/articles/ncomms10996),
  [ScienceDaily](https://www.sciencedaily.com/releases/2016/03/160329101037.htm),
  [UCL news](https://www.ucl.ac.uk/brain-sciences/news/2016/mar/uncertainty-can-cause-more-stress-inevitable-pain).
- **Intolerance of uncertainty sits under anxiety disorders.** It is a transdiagnostic factor.
  Higher intolerance raises negative emotion and damps positive emotion under uncertainty. Strong,
  across many studies. [PMC10073686](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10073686/),
  [PMC4890765](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4890765/).
- **Waits feel longer when they are uncertain or unexplained.** Maister (1985) set out eight
  propositions. Four matter most here: "anxiety makes waits seem longer", "uncertain waits are
  longer than known, finite waits", "unexplained waits are longer than explained waits", and
  "occupied time feels shorter than unoccupied time". Practice-level, widely used in service
  design. [davidmaister.com](https://davidmaister.com/articles/the-psychology-of-waiting-lines/),
  [Columbia PDF](https://www.columbia.edu/~ww2040/4615S13/Psychology_of_Waiting_Lines.pdf).

**For Duly.** Duly can almost never remove uncertainty about the outcome (USCIS decides). It can
remove uncertainty about **timing and next steps**: the window opens on this day, the last day is
this day, the next check is on this day, and the answer arrives here. The engine's dates are the
anxiety treatment. An unknown should always be turned into a known *step* ("Add your EAD card to see
this date"), never left as a blank.

### 2.2 A sense of control buffers stress

- An experimentally raised sense of control reduced subjective stress after a later psychosocial
  stressor and gave more relief afterwards. Two studies, N=473 and N=295. Moderate.
  [Fielder et al., "Sense of control buffers against stress", eLife 2026, PMC12890248](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12890248/),
  [eLife reviewed preprint](https://elifesciences.org/reviewed-preprints/105025).
- Predictability and believing one has control each reduced heart-rate reactivity during an
  aversive task. [Springer, BF02688786](https://link.springer.com/article/10.1007/BF02688786).
- Presenting setbacks as controllable undid the harm stress did to persistence.
  [PMC4755928](https://pmc.ncbi.nlm.nih.gov/articles/PMC4755928/).
- Perceived control as a resilience factor across neural, physiological and mental-health
  measures. [Translational Psychiatry 2025](https://www.nature.com/articles/s41398-025-03786-6).

**For Duly.** Control is not cosmetic. It is the student editing a fact and watching the date move,
undoing an answer, choosing "I'm not sure", trying a change before making it, exporting or deleting
everything, and choosing when reminders arrive. Each is a felt "I am steering this".

### 2.3 Open loops, and what actually closes them

This is the research behind the founder's "close the loop".

- **What replicated and what did not.** The famous Zeigarnik claim, that unfinished tasks are
  *remembered* better, did not hold up. A 2025 meta-analysis found interrupted and completed tasks
  recalled at about the same rate. What did replicate is the **Ovsiankina effect**: people feel
  pulled to *go back and finish* an interrupted task (about 67% resumption against a 50% baseline).
  Strong. [Ghibellini and Meier 2025, Humanities and Social Sciences Communications (Semantic Scholar)](https://www.semanticscholar.org/paper/Interruption,-recall-and-resumption:-a-of-the-and-Ghibellini-Meier/c98a41f13fd6f3b0b86047ecf92eeb03ac458626).
  So the pull of an open item is real, and it persists until the item is resolved.
- **A specific plan closes the loop without finishing the task.** Unfulfilled goals intruded on
  thinking and hurt performance on unrelated tasks. When participants wrote a specific plan for
  the goal (what, when, where), the interference disappeared, although the goal was still not done.
  Moderate. [Masicampo and Baumeister 2011, JPSP 101(4):667-683, PDF](https://users.wfu.edu/masicaej/MasicampoBaumeister2011JPSP.pdf),
  [Semantic Scholar](https://www.semanticscholar.org/paper/Consider-it-done!-Plan-making-can-eliminate-the-of-Masicampo-Baumeister/16e52874d2679b969279793b57d67ec68e111223).
- **If-then plans make action happen.** Implementation intentions ("when X happens, I will do Y
  at Z") had a medium-to-large effect on goal attainment, d = 0.65 across 94 studies and 8,461
  people. Strong. [Gollwitzer and Sheeran 2006, Adv Exp Soc Psych 38 (summary)](https://howtostopprocrastinating.org/research/gollwitzer-2006-implementation-intentions/),
  [Gollwitzer chapter, NCI PDF](https://cancercontrol.cancer.gov/sites/default/files/2020-06/goal_intent_attain.pdf).

**For Duly.** This is the most important finding in this file. A loop does not close when Duly
*answers*. It closes when the student holds either (a) a done state or (b) a concrete plan with a
when and a where, written down somewhere they trust. The founder's chain, "find a job, how, where,
when, what to keep in mind", is literally the structure of an implementation intention. Today's
prototype stops after the answer, which leaves the goal open and intruding. That is why it "feels
static".

### 2.4 Waiting, status and showing the work

- **Visibility of system status** is the first of Nielsen's ten heuristics: "The design should
  always keep users informed about what is going on, through appropriate feedback within a
  reasonable amount of time." Practice.
  [NN/g, updated 2024](https://www.nngroup.com/articles/ten-usability-heuristics/).
- **Say what happens next and when.** The GOV.UK confirmation page pattern requires "details of
  what happens next and when"; the page should "reassure users that they have completed a
  transaction and help them understand what to expect next". Practice.
  [GOV.UK Design System](https://design-system.service.gov.uk/patterns/confirmation-pages/).
- **Showing the work raises perceived value.** Across five experiments, people valued a service
  more, and sometimes preferred a slower one, when the site showed the work it was doing (the
  "labor illusion"). Moderate. [Buell and Norton 2011, Management Science 57(9)](https://pubsonline.informs.org/doi/10.1287/mnsc.1110.1376),
  [HBS](https://www.hbs.edu/faculty/Pages/item.aspx?num=40158).

**For Duly.** "Rules checked Sep 30", "Counted from your EAD card", "Last checked USCIS: today 8:02"
and "Next check: tomorrow morning" are operational transparency. They also answer Maister: the wait
for USCIS is explained and finite in its *checking*, even if the decision date is not. Showing the
work must stay truthful: never a fake progress animation, never a "checking" spinner when nothing is
being checked (that would be a dark pattern; see 2.10).

### 2.5 Calm technology and attention

- **Center and periphery.** Weiser and Brown (Xerox PARC, 1995) defined calm technology as that
  "which informs but doesn't demand our focus or attention", moving easily from the periphery of
  attention to the centre and back. Their example was a dangling string that twitched with network
  traffic. [Wikipedia](https://en.wikipedia.org/wiki/Calm_technology),
  [original paper PDF](https://people.csail.mit.edu/rudolph/Teaching/weiser.pdf).
- **Amber Case's eight principles:** require the smallest possible amount of attention; inform and
  create calm; make use of the periphery; amplify the best of technology and the best of humanity;
  communicate without speaking; work even when it fails; use the minimum technology needed; respect
  social norms. Practice. [caseorganic.com](https://caseorganic.com/post/principles-of-calm-technology/),
  [Calm Tech Institute](https://www.calmtech.institute/calm-tech-principles).
- **Notifications cost attention.** In a within-person experiment, a week of alerts on produced
  more self-reported inattention and hyperactivity than a week of alerts off, which predicted lower
  productivity and well-being. Moderate.
  [Kushlev, Proulx and Dunn, CHI 2016](https://dl.acm.org/doi/10.1145/2858036.2858359).
- **Batching helps.** In a randomized field experiment (N=237), notifications batched three times
  a day lowered stress and raised mood and felt control. Hourly batching did little. Anxiety itself
  did not change significantly per one summary
  ([Prosocial Design Network](https://www.prosocialdesign.org/library/batching-notifications)).
  Moderate. [Fitz et al. 2019, Computers in Human Behavior](https://www.sciencedirect.com/science/article/abs/pii/S0747563219302596).
- **Limit interruptions, keep things where they are.** W3C's cognitive accessibility guidance has
  the patterns "Limit Interruptions", "Ensure Controls and Content Do Not Move Unexpectedly" and
  "Provide Human Help", and notes that content that changes unexpectedly can cause anxiety.
  Practice. [W3C COGA, Working Group Note 2021](https://www.w3.org/TR/coga-usable/),
  [design guide](https://www.w3.org/TR/coga-usable/design_guide.html).

**For Duly.** Most of Duly should live in the periphery: a status line, a date, a quiet mark that a
rule was checked. It comes to the centre only when a fact changed or a date is near. One morning
digest, at a time the student picks, beats a stream of pushes. Updates that change nothing for this
student never push.

### 2.6 Progressive disclosure

- "Initially, show users only a few of the most important options. Offer a larger set of
  specialized options upon request." Two requirements: show everything frequently needed up front,
  and make the way to more obvious with clear labels. Designs with more than two levels of
  disclosure "typically have low usability". Practice.
  [Nielsen 2006, NN/g](https://www.nngroup.com/articles/progressive-disclosure/).
- A figure seen in secondary blogs, that progressive disclosure cuts task time 20 to 40%, is not in
  the NN/g article. **Unverified**; do not quote it.

**For Duly.** The founder's "most of Home should be closed" is progressive disclosure. The rule from
the evidence: a collapsed item must still *deliver* at the first level (its one fact and its date),
and open to at most one more level. A closed card that says only a title is a chore, not calm.

### 2.7 Bad news, errors and negative feedback

- **SPIKES.** The oncology protocol for bad news: Setting, Perception, Invitation, Knowledge,
  Emotions, Strategy. Its last step, agreeing a strategy, is what software usually leaves out.
  Practice with training evidence. [Baile et al. 2000, The Oncologist (MD Anderson)](https://mdanderson.elsevierpure.com/en/publications/spikes-a-six-step-protocol-for-delivering-bad-news-application-to/),
  [UBC summary PDF](https://ubccpd.ca/sites/default/files/documents/SPIKES_Protocol_for_Breaking_Bad_News.pdf),
  [25-year reflection, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12990979/).
- **Fear messages work when paired with what to do.** A meta-analysis of 127 articles (248 samples,
  27,372 people) found fear appeals changed attitudes, intentions and behaviour, and were more
  effective when they included efficacy statements and recommended a one-time behaviour. Strong.
  [Tannenbaum et al. 2015, Psychological Bulletin (PubMed 26501228)](https://pubmed.ncbi.nlm.nih.gov/26501228/).
- **People look away from bad news.** Investors looked up their portfolios more when markets rose
  and less when they fell (the "ostrich effect").
  [Karlsson, Loewenstein and Seppi, J Risk Uncertainty 2009](https://link.springer.com/article/10.1007/s11166-009-9060-6),
  [Wikipedia summary](https://en.wikipedia.org/wiki/Ostrich_effect). Moderate; I could not read the
  primary paper's full text in this session.
- **Bad is stronger than good.** Across emotions, relationships, memory and feedback, negative
  events weigh more than equal positive ones. Strong (major review).
  [Baumeister et al. 2001, Review of General Psychology 5(4)](https://www.researchgate.net/publication/46608952_Bad_Is_Stronger_than_Good).
- **Error messages.** Plain language, say exactly what is wrong, give a remedy, keep the user's
  input, never blame. "Merely stating the problem is not enough." Practice.
  [NN/g error-message guidelines, 2023](https://www.nngroup.com/articles/error-message-guidelines/),
  [NN/g heuristic 9](https://www.nngroup.com/articles/ten-usability-heuristics/).

**For Duly.** A negative item (a job ended, a day count rising, a date passed) arrives with its
strategy in the same view: the fact, the date, one next action, and the DSO question drafted when a
judgement is needed. Because bad weighs more than good and people avoid it, Duly should deliver bad
news only once, in full, with a path, and never repeat it as a red banner. Otherwise students stop
opening the app, which is the worst outcome for a record-keeping product.

### 2.8 Positive feedback without gamification

- **Expected tangible rewards undermine intrinsic motivation; informational feedback does not.**
  A meta-analysis of 128 studies found engagement-, completion- and performance-contingent rewards
  undermined free-choice motivation (d = -0.40, -0.36, -0.28). Verbal rewards were more enhancing
  for college students than for children. Strong.
  [Deci, Koestner and Ryan 1999, Psychological Bulletin 125(6), PDF](https://home.ubalt.edu/tmitch/642/articles%20syllabus/Deci%20Koestner%20Ryan%20meta%20IM%20psy%20bull%2099.pdf).
  Note the dispute: [Eisenberger, Pierce and Cameron comment, PubMed 10589298](https://pubmed.ncbi.nlm.nih.gov/10589298).
- **Streaks and game mechanics can take over the goal.** A qualitative study of nine years of
  Duolingo forum posts and 15 interviews found "gamification misuse" driven by competition,
  over-engagement with mechanics and conformity, harming learning and well-being. Moderate
  (qualitative). [Hadi Mogavi et al., L@S 2022, arXiv 2203.16175](https://arxiv.org/abs/2203.16175).
  Claims that about 40% of users who break a long streak leave within two weeks come from a
  consultant's blog. **Unverified.** [yukaichou.com](https://yukaichou.com/gamification-analysis/streak-design-gamification-motivation-burnout/).
- **Real progress already made motivates.** Car-wash cards with two of ten stamps pre-filled were
  completed 34% of the time against 19% for blank eight-stamp cards, though both needed eight
  washes. Moderate. [Nunes and Dreze 2006, J Consumer Research 32(4) (summary)](https://www.coglode.com/nuggets/endowed-progress-effect).
  Used honestly, this means crediting what the student has *actually* done (papers already added,
  CPT already finished), never inventing progress.
- **People remember the peak and the end.** Patients' memory of a colonoscopy tracked the worst
  moment and the final moments, not the duration (Redelmeier and Kahneman 1996, observational). In
  a randomized follow-up, a gentler ending made the whole procedure remembered as less unpleasant
  and patients more willing to return (Redelmeier, Katz and Kahneman 2003). Moderate to strong.
  [Wikipedia, peak-end rule](https://en.wikipedia.org/wiki/Peak%E2%80%93end_rule).

**For Duly.** Positive feedback is *information about real change* ("Your EAD is added. Your OPT
dates are now counted from it."), shown once, at the end of a loop, softly. The end of every loop
is designed on purpose, because that is what the student remembers. No points, no streaks, no
scores, no "you're on a roll". The existing confetti rule (first completion only) fits; it should be
rare enough to mean something.

### 2.9 Facts beat reassurance

- **Reassurance relieves short-term and feeds anxiety long-term.** Excessive reassurance seeking
  reduces anxiety at once, the relief fades, and the urge returns; it blocks learning that the
  feared outcome does not follow. Strong in the clinical literature.
  [Rector et al. via ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0887618511000934),
  [PMC5504131](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5504131/),
  [ScienceDirect, directionality](https://www.sciencedirect.com/science/article/abs/pii/S0887618511001551).
- **Notifications increased refreshing** in the patient-portal study (2.1 above).

**For Duly.** This backs the reassurance phrases already banned in tools/copy_lint/lint.py. The calm
comes from a fact, a date and a plan, not from a soothing sentence. A rhythm the student can predict
(one check-in when a fact goes stale, one morning digest, a stated next check for USCIS status)
gives them a reason to stop checking. "Next check: tomorrow morning. You'll get a note if anything
changes." is the anti-refresh line.

### 2.10 Trust signals

- **Trustworthiness has three parts: ability, benevolence and integrity.** Trust is the
  willingness to be vulnerable to another. Strong (foundational model).
  [Mayer, Davis and Schoorman 1995, summary](https://explore.psychsafety.com/n/mayer-davis-schoorman-1995/).
- **What makes a site credible.** Stanford's guidelines (over 5,500 participants across studies):
  make accuracy easy to verify; show a real organisation; show expertise; show honest people; make
  contact easy; look professional and fit for purpose; be easy to use and useful; update often, or
  at least show it was reviewed recently; restrain promotion; avoid errors of all types. People
  judge heavily on visual design, but distrust a look that is too "slick". Moderate.
  [Stanford Web Credibility Guidelines](https://credibility.stanford.edu/guidelines/index.html),
  [Wikipedia](https://en.wikipedia.org/wiki/Stanford_Web_Credibility_Project),
  [Fogg et al. 2003, ACM](https://dl.acm.org/doi/10.1145/997078.997097).
- **Honest uncertainty from an assistant improves the user's accuracy.** In a pre-registered
  experiment (N=404), first-person uncertainty ("I'm not sure, but...") reduced over-reliance on
  wrong answers and raised accuracy; impersonal phrasing ("It's not clear, but...") had weaker,
  non-significant effects. Moderate.
  [Kim et al., FAccT 2024, arXiv 2405.00623](https://arxiv.org/abs/2405.00623).
  Caution for Duly: the repo prefers not to make "Duly" a speaking character, so this finding
  supports stating the specific unknown plainly ("Your hours are not recorded, so this count is
  unknown") rather than a vague hedge.
- **Manipulation destroys trust and draws regulators.** The FTC's September 2022 staff report
  names false urgency and scarcity, confirmshaming and obstruction of cancellation among "dark
  patterns". [FTC, Bringing Dark Patterns to Light](https://www.ftc.gov/reports/bringing-dark-patterns-light).

**For Duly.** Duly's trust signals are already in the design language: the source one tap away,
"Rules checked Sep 30", an as-of date on every count, a named limit ("This needs your DSO"), export
and delete in plain view, and no urgency theatre. Security shown as plain, scoped facts ("Read on
this phone", "Backup is end-to-end encrypted if you turn it on") rather than shields and padlocks.

### 2.11 Practice from finance and health apps (weak evidence, for ideas only)

- A fintech studio argues anxiety, not confusion, stalls money flows, and that up-front
  transparency, visible progress, calm error states and undo help. Its numbers (Add Money +35.3%)
  are its own client case study. Weak.
  [Phenomenon Studio](https://phenomenonstudio.com/article/fintech-ux-design-how-to-reduce-user-anxiety-in-high-stakes-financial-journeys/).
- Monzo is reported to use "positive friction" for customers with mental illness. **Unverified**
  in a primary Monzo source this session; reported via
  [Eleken](https://www.eleken.co/blog-posts/fintech-ux-design).
- Patients' views of anxiety apps: [PMC9474730](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9474730/).

---

## 3. What this means for "Duly feels static"

### 3.1 The anatomy of a closed loop

The evidence (2.3, 2.4, 2.7, 2.8) gives one shape for every interaction, from a check-in card to a
question about travel. Each step has its research reason.

| Step | What the student gets | Why (evidence) |
|---|---|---|
| 1. Open | Anyone can start a loop from any item, or a fact change starts one | Ovsiankina pull; control (2.2, 2.3) |
| 2. Answer | The fact from the engine, with its date and as-of | Uncertainty about timing removed (2.1) |
| 3. Feedback | What changed because of this answer, positive or negative, said once | Visibility of status; bad news with strategy (2.4, 2.7) |
| 4. Plan | What to do, how, where, by when, what to keep in mind | Implementation intentions; plan making closes the loop (2.3) |
| 5. Commit | The plan becomes a reminder, a calendar entry or a drafted DSO email | Plan written somewhere trusted (2.3) |
| 6. Close | A done state that says what is now true and what happens next and when | GOV.UK "what happens next"; peak-end (2.4, 2.8) |
| 7. Reopen hook | What would reopen it, and when Duly will check | Predictable rhythm beats reassurance (2.9) |

A loop may close at step 4 to 6 by **plan**, not only by completion. That is what the research says
removes the intrusive pull (Masicampo and Baumeister). A loop that stops at step 2 is the "static"
feeling the founder names.

### 3.2 The founder's example, run through the loop

"Do you still have this job?" while an OPT clock runs:

1. **Open:** the check-in card, "Still at Northwind, about 40 hours a week?" with the choices
   *Same as before*, *Hours changed*, *My job ended*, *New job*.
2. **Answer (My job ended):** "Ended on" with a date picker, default today.
3. **Feedback, said once:** "Recorded. Your unemployment count restarts from Oct 31. Day 90 would
   be Dec 19 if you have no new job by then." (engine values; no verdict.)
4. **Plan, collapsed into four short rows, each opening one level:**
   - *Report the end:* by Nov 10, through your school's portal. Draft for your DSO ready.
   - *Find a role:* what counts toward OPT employment, with the source; links to where the student
     keeps job leads (Duly does not run a job board).
   - *When:* the date strip shows today, Nov 10 and Dec 19.
   - *Keep in mind:* travel adds to the count; hours under the line are a DSO question.
5. **Commit:** "Remind me Nov 7" and "Add to calendar" pre-set; the DSO draft opens on tap.
6. **Close:** the card collapses to one line: "Job end recorded. Report by Nov 10. Next check-in
   Nov 14." A soft settle, no confetti (nothing was achieved; something was handled).
7. **Reopen hook:** "New job" on that line, or the next check-in, reopens it; adding a new employer
   closes the count and gives the positive close: "New job recorded. Your count stopped at 23
   days."

### 3.3 The label "This happened"

The founder called it the worst label. The research and the repo agree: buttons name outcomes
(CLAUDE.md), and the student needs to know what pressing it does (heuristic 1). Use the event:
"My job ended on Oct 31", "Save this trip", "Record the new job". The confirmation then says what
changed and what happens next (step 3 and step 6).

### 3.4 Home, collapsed

Progressive disclosure (2.6) and calm technology (2.5) together suggest Home as a short stack of
closed items, each of which delivers one fact at the first level and opens one level only:

- one line on where the student stands, with its as-of;
- the next thing owed, with its date (the only item open by default);
- one row per open loop, each showing its next date;
- documents: "All 12 papers kept. Next to run out: Passport, Mar 3, 2027.";
- USCIS status: "Case received. Last checked today. Next check tomorrow morning.";
- what changed for you, only when something did.

Everything else lives one tap away. This file does not specify layout; it sets the rule that a
closed item still delivers.

---

## 4. Ten principles for Duly

Each principle names its evidence. "Do" and "Do not" are written as tests a reviewer can apply to a
screen.

### 1. Make the timing certain even when the outcome is not
Evidence: 2.1 (de Berker 2016; Maister; intolerance of uncertainty).
- **Do:** show a date for every open thing: when the window opens, the last day, when Duly next
  checks, when the student will hear. Turn an unknown into the one step that makes it known ("Add
  your EAD card to see this date").
- **Do not:** leave a blank, a spinner, "pending" with no date, or "Can't tell yet" as a headline.
  Never guess an outcome to fill the silence.

### 2. Every answer ends in a plan with a when
Evidence: 2.3 (Masicampo and Baumeister 2011; Gollwitzer and Sheeran 2006; Ghibellini and Meier 2025).
- **Do:** after any answer, offer the next step as what, how, where, by when, and what to keep in
  mind, and let the student commit it (reminder, calendar, DSO draft) in one tap.
- **Do not:** end an interaction on an answer alone, or leave a choice saved with nothing after it
  (the "I clicked yes and it just stays there" failure).

### 3. Close every loop on purpose, and say what happens next
Evidence: 2.4 (GOV.UK confirmation pattern; NN/g heuristic 1), 2.8 (peak-end).
- **Do:** give every loop a closed state that states what is now true, what happens next and when,
  and what would reopen it. Design the last moment of each flow, because it is what is remembered.
- **Do not:** leave a finished card open and unchanged, or close silently with no record of what was
  done ("You did this" summaries stay).

### 4. Quiet by default; come forward only when something changed
Evidence: 2.5 (Weiser and Brown 1995; Case; Kushlev 2016; Fitz 2019; W3C COGA).
- **Do:** keep status in the periphery (a line, a date, a mark). Push only for a changed fact or a
  near date that belongs to this student. Batch into one digest at a time the student picks.
- **Do not:** push news that changes nothing for this student, send hourly nudges, use red for
  anything not near, or move content on the screen without the student's action.

### 5. Disclose in two levels, and make the first level deliver
Evidence: 2.6 (Nielsen 2006), 2.5 (minimum technology).
- **Do:** collapse most of Home into items whose closed state already shows the one fact and its
  date; one tap opens the detail; the source and the reasoning sit behind the ⓘ.
- **Do not:** nest a third level, hide the next date behind a tap, or collapse an item to a bare
  title that forces a tap to learn anything.

### 6. Deliver bad news once, in full, with the path in the same view
Evidence: 2.7 (SPIKES; Tannenbaum 2015; ostrich effect; Baumeister 2001; NN/g errors).
- **Do:** state the fact plainly, give its date, give one action the student can take now, and
  draft the DSO question when a judgement is involved. Keep the student's input when something
  fails.
- **Do not:** repeat bad news as a standing banner, use alarm colour or alarm words, blame the
  student, say "error occurred", or give a negative without a next step.

### 7. Hand the student the controls
Evidence: 2.2 (Fielder 2026; prediction and control studies).
- **Do:** let every answer be edited or undone; offer "I'm not sure" on every question; let the
  student try a change before recording it; let them set reminder timing; keep export and delete in
  plain view.
- **Do not:** lock a choice, auto-record a hypothetical, decide on the student's behalf, or bury
  delete and export.

### 8. Feedback informs; it never scores
Evidence: 2.8 (Deci, Koestner and Ryan 1999; Hadi Mogavi 2022; Nunes and Dreze 2006).
- **Do:** say what real change an action made ("Your OPT dates now count from your EAD card"),
  credit real progress already made (papers kept, phases done), and mark a first completion softly
  and once.
- **Do not:** add streaks, points, badges, levels, scores, guilt messages, or invented progress. No
  celebration for handling a loss (a job ending is handled, not achieved).

### 9. Calm comes from facts and rhythm, not reassurance
Evidence: 2.9 (reassurance-seeking literature; Steitz 2025 refresh study), 2.1.
- **Do:** give the count, the date and the plan, then a predictable rhythm: a stated next check for
  USCIS status, one check-in when a fact goes stale, a morning digest. Let quiet weeks be quiet.
- **Do not:** soothe (the reassurance phrases on the copy_lint list), invite constant re-checking, or show a
  count carried past its last confirmed fact.

### 10. Be checkable, be plain about limits, never manipulate
Evidence: 2.10 (Mayer et al. 1995; Stanford credibility; Kim et al. 2024; FTC 2022), 2.4 (Buell and
Norton).
- **Do:** keep the source one tap away, show "Rules checked" and as-of dates, name exactly what is
  unknown and why, send disputed points to the DSO in the student's words, and state privacy and
  storage facts in plain, scoped sentences. Show work only when work is being done.
- **Do not:** use false urgency, countdown theatre, confirmshaming ("No thanks, I like losing
  papers"), fake progress, vague hedges, or a design so glossy it reads as marketing.

---

## 5. Anti-patterns seen or likely in the current prototype

Measured against the ten principles. The prototype was not re-run for this file; these come from
the founder's critique and BRIEF.md.

- A saved answer with no next state (principle 2, 3): "after i click yes, it just stays there".
- A button named for the mechanism, not the outcome (principle 3): "This happened".
- Many open sections on Home (principle 4, 5): "home is too crowded".
- An answer without a plan (principle 2): "okay i answered, what now?"
- No positive or negative feedback after an answer (principle 3, 8): "theres no positive triggers".

## 6. Gaps and what I could not verify

- The Stop AAPI Hate data brief PDF could not be read in this session; the 89% figure and sample
  size come from its press release and search summaries.
- The ostrich-effect primary paper and the Weiser and Brown PDF could not be parsed; summaries used.
- The 20 to 40% progressive-disclosure figure, the 40% streak-abandonment figure, Monzo "positive
  friction" details and the SEVIS termination count are unverified.
- No study found tests anxiety-aware design on immigration software specifically. The closest
  evidence is patient portals (Steitz 2023, 2025). A small Duly study would fill this: measure
  status-page checks per week and a short state-anxiety item before and after the closed-loop
  design, with consent and no data to an outside model.
- Further reading not fetched this session: Witte's extended parallel process model (fear and
  efficacy), Sweeny et al. 2010 on information avoidance, Apple's notification interruption levels
  (the HIG page did not render).

## 7. Sources

- Baile et al. 2000, SPIKES: https://mdanderson.elsevierpure.com/en/publications/spikes-a-six-step-protocol-for-delivering-bad-news-application-to/
- SPIKES summary: https://ubccpd.ca/sites/default/files/documents/SPIKES_Protocol_for_Breaking_Bad_News.pdf
- SPIKES at 25: https://pmc.ncbi.nlm.nih.gov/articles/PMC12990979/
- Baumeister et al. 2001: https://www.researchgate.net/publication/46608952_Bad_Is_Stronger_than_Good
- Buell and Norton 2011: https://pubsonline.informs.org/doi/10.1287/mnsc.1110.1376
- Case, principles: https://caseorganic.com/post/principles-of-calm-technology/
- Calm Tech Institute: https://www.calmtech.institute/calm-tech-principles
- Calm technology (Weiser and Brown): https://en.wikipedia.org/wiki/Calm_technology
- Weiser and Brown PDF: https://people.csail.mit.edu/rudolph/Teaching/weiser.pdf
- de Berker et al. 2016: https://www.nature.com/articles/ncomms10996
- UCL news: https://www.ucl.ac.uk/brain-sciences/news/2016/mar/uncertainty-can-cause-more-stress-inevitable-pain
- ScienceDaily: https://www.sciencedaily.com/releases/2016/03/160329101037.htm
- Deci, Koestner and Ryan 1999: https://home.ubalt.edu/tmitch/642/articles%20syllabus/Deci%20Koestner%20Ryan%20meta%20IM%20psy%20bull%2099.pdf
- Comment on Deci et al.: https://pubmed.ncbi.nlm.nih.gov/10589298
- Eleken fintech UX: https://www.eleken.co/blog-posts/fintech-ux-design
- f1visanetwork SEVIS: https://f1visanetwork.com/alert-mass-f-1-sevis-terminations-status-2025/
- Fielder et al. 2026: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12890248/
- eLife preprint: https://elifesciences.org/reviewed-preprints/105025
- Fitz et al. 2019: https://www.sciencedirect.com/science/article/abs/pii/S0747563219302596
- Prosocial Design Network, batching: https://www.prosocialdesign.org/library/batching-notifications
- Fogg et al. 2003: https://dl.acm.org/doi/10.1145/997078.997097
- FTC 2022: https://www.ftc.gov/reports/bringing-dark-patterns-light
- Ghibellini and Meier 2025: https://www.semanticscholar.org/paper/Interruption,-recall-and-resumption:-a-of-the-and-Ghibellini-Meier/c98a41f13fd6f3b0b86047ecf92eeb03ac458626
- Gollwitzer chapter: https://cancercontrol.cancer.gov/sites/default/files/2020-06/goal_intent_attain.pdf
- Gollwitzer and Sheeran 2006 summary: https://howtostopprocrastinating.org/research/gollwitzer-2006-implementation-intentions/
- GOV.UK confirmation pages: https://design-system.service.gov.uk/patterns/confirmation-pages/
- Hadi Mogavi et al. 2022: https://arxiv.org/abs/2203.16175
- Healio on Steitz 2023: https://www.healio.com/news/primary-care/20230323/most-patients-prefer-receiving-immediate-test-results-through-electronic-portals
- Inside Higher Ed: https://www.insidehighered.com/news/quick-takes/2025/12/11/international-students-afraid-under-trump-administration
- Intolerance of uncertainty: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10073686/
- Intolerance of uncertainty induction: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4890765/
- Karlsson, Loewenstein and Seppi 2009: https://link.springer.com/article/10.1007/s11166-009-9060-6
- Ostrich effect: https://en.wikipedia.org/wiki/Ostrich_effect
- Kim et al. 2024: https://arxiv.org/abs/2405.00623
- Kushlev, Proulx and Dunn 2016: https://dl.acm.org/doi/10.1145/2858036.2858359
- Maister: https://davidmaister.com/articles/the-psychology-of-waiting-lines/
- Maister PDF: https://www.columbia.edu/~ww2040/4615S13/Psychology_of_Waiting_Lines.pdf
- Masicampo and Baumeister 2011: https://users.wfu.edu/masicaej/MasicampoBaumeister2011JPSP.pdf
- Mayer, Davis and Schoorman 1995: https://explore.psychsafety.com/n/mayer-davis-schoorman-1995/
- NN/g error messages: https://www.nngroup.com/articles/error-message-guidelines/
- NN/g heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/
- NN/g progressive disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- Nunes and Dreze 2006 summary: https://www.coglode.com/nuggets/endowed-progress-effect
- Peak-end rule: https://en.wikipedia.org/wiki/Peak%E2%80%93end_rule
- Perceived control, persistence: https://pmc.ncbi.nlm.nih.gov/articles/PMC4755928/
- Perceived control, resilience: https://www.nature.com/articles/s41398-025-03786-6
- Prediction and control, heart rate: https://link.springer.com/article/10.1007/BF02688786
- Phenomenon Studio: https://phenomenonstudio.com/article/fintech-ux-design-how-to-reduce-user-anxiety-in-high-stakes-financial-journeys/
- Anxiety apps, user views: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9474730/
- Reassurance seeking: https://www.sciencedirect.com/science/article/abs/pii/S0887618511000934
- Reassurance seeking, function: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5504131/
- Reassurance seeking, directionality: https://www.sciencedirect.com/science/article/abs/pii/S0887618511001551
- Stanford credibility guidelines: https://credibility.stanford.edu/guidelines/index.html
- Stanford Web Credibility Project: https://en.wikipedia.org/wiki/Stanford_Web_Credibility_Project
- Steitz et al. 2023: https://jamanetwork.com/journals/jamanetworkopen/fullarticle/2802672
- Steitz et al. 2025: https://pmc.ncbi.nlm.nih.gov/articles/PMC11979724/
- Stop AAPI Hate release: https://stopaapihate.org/2025/12/10/run-dont-come-new-study-finds-international-students-feel-unsafe-unwelcome-amid-rising-xenophobia-and-policy-instability/
- Stop AAPI Hate brief: https://stopaapihate.org/wp-content/uploads/2025/12/25-SAH-IntlStudents-DataBrief-F-2-1.pdf
- Tannenbaum et al. 2015: https://pubmed.ncbi.nlm.nih.gov/26501228/
- W3C COGA: https://www.w3.org/TR/coga-usable/
- Streak claims (unverified): https://yukaichou.com/gamification-analysis/streak-design-gamification-motivation-burnout/
