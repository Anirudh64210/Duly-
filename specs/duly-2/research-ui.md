# duly-2 research: UI, loops, Home and navigation

2026-09-30. Research for the founder's critique that Duly feels static: a question is asked, answered, and then nothing happens. This file looks at how quiet but capable products build their home screens, inboxes, ask entry points and history views. It draws the patterns Duly should take, and proposes Duly's information architecture: what sits on Home (collapsed), where the assistant lives, and where the footprint lives.

Basis:
- Duly's side: specs/ui-2/BRIEF.md, specs/ui-2/VALUE-2.md, specs/ui-2/competitor/ANALYSIS.md, DECISIONS.md (D23, D27, D47, D54, D55, D60, D72, D73, D74), and the prototype code (specs/ui-2/prototype/screens/home.js, data.js, components/shell.js).
- Outside: every external claim carries its URL. "Fetched" means the page itself was read. "Snippet" means only a search result summary was read because the page refused the fetch. "Unverified" means it could not be confirmed against a primary page. The full list is in section 12.

## 0. Summary

1. The founder is right on the facts. The prototype has several dead ends: the check-in's "Yes, same" leaves the card on Home; "This happened" ends with a toast and nothing next; the STEM OPT "Yes" shows a strip and stops. Not one of them says what happens now, what Duly will do next, or when it will come back (section 1).
2. Every product studied that feels calm and capable has two things Duly lacks. First, a **finite list of open items, each with explicit closing verbs**: Linear Triage (Accept, Decline, Snooze), Copilot Money's "Mark as reviewed", Superhuman's inbox and its reward at zero. Second, a **permanent log of what was closed**: the Things Logbook, Raycast's chat history.
3. The research says a loop does not have to be finished to stop weighing on the mind. It has to be **handed to a credible plan with a time** (Masicampo and Baumeister 2011). Duly can close almost every loop the same day, even when the real-world task takes weeks: "Planned. Next check Oct 30."
4. Proposal: one object, the **Loop**, with six states (Open, Asking, Answered, Planned, Waiting, Closed). Each is derived on the device from the engine, the record and a versioned loop template. Every Loop must reach Closed, and a build gate fails any template that has a state with no next action.
5. Home becomes **Today**, and it holds very little: one status line, one strip of the three numbers, at most three open loops (collapsed, each header showing its answer), an "That's everything for now" end line, the Ask entry, and three collapsed "kept for you" rows (Papers, USCIS, Record). Nothing else.
6. The assistant is **not a chat tab**. It is one Ask entry, present everywhere (the bottom of Today on the phone, Cmd K on the laptop), that routes each question to a loop template, a paper, a rule or a DSO draft. This is the Raycast and Linear pattern. Its fallback is a DSO question, never a generated answer.
7. The footprint is **Your record**: an append-only, dated history of every fact confirmed, paper kept, report made, loop closed and rule change applied. It is what Share, export and the attorney packet are built from. Technically it is the event log the record already needs.
8. Navigation: four destinations (Today, Plan, Papers, Record), plus Ask as an action rather than a tab. This follows Apple's rule that tabs are for navigation, not actions, and Material's three to five destinations. News, USCIS status and Timeline keep their pages but move under these four.
9. A better name for "scenarios": **What if** for trying a change on your own record, and the same entry for situations ("My job ends", "A trip home", "I lost my I-20"). Each one opens a Loop.
10. Decisions for the founder are in section 11. The main ones: Ask versus VALUE-2's "says no to Ask your record"; What if on Home versus D72; how far "find a job: where" goes, given D47's immigration scope.

## 1. What is static today, found in the prototype

Each item is a place where the student acts and the loop is left open.

| Where | What the student does | What happens now | What is missing |
|---|---|---|---|
| Home check-in (home.js `checkinHtml`, data.js `checkin`) | Taps "Yes, same" on "Still at {employer}, about {hours} hours a week?" | The card stays on Home and reads "Confirmed {date}. Your count is as of today." | When the next check is ("Next check Oct 30"). The card leaving Home. A record entry. "Hours changed" and "Job ended" do not lead into a loop |
| Try a change (data.js `change.save: 'This happened'`, record.js `applyChange`) | Taps "This happened" | Toast: "Saved to your record", with Undo | The label names no outcome (CLAUDE.md: "buttons name outcomes"). Nothing follows: no report deadline turned into a task, no reminder set, no "what now" |
| STEM OPT on Home (home.js `stemItemHtml`) | Taps Yes | A row "You plan to apply · Change", a strip and "See all steps" | The first step is not offered, nor its date. No "we'll remind you on Oct 15". The next move does not advance |
| News "For you" | Reads an item | "Nothing now" | When Duly will look again, and what would change the answer |
| DSO email (BRIEF round 2, note 4) | Copies the draft | "Email sent? Mark done" | What happens after the DSO replies: where to put the answer, and what it unlocks |

Home today stacks eight blocks: hero, promise line, three numbers, next move, check-in, News, "rules checked" line and footer (home.js `render`). Several of them can be open at once, and none of them ends. That is the "crowded" feeling: everything is shown, and nothing is finished.

## 2. Teardown: what each product does

For each product: what the home or entry screen delivers while collapsed, how an item opens and closes, where history lives, and the lesson for Duly.

### 2.1 Things 3 (Cultured Code)

- **Lists by time, not by type.** Today "filter[s] across the entire app": anything whose start date, deadline or repeat matches today shows there. Upcoming items "hop into Today" when their start date arrives. Someday items "won't show up in Anytime or Upcoming" and are "designed to take a backseat visually." Fetched: https://culturedcode.com/things/support/articles/4001304/
- **This Evening** is a section inside Today. Its items are "still present, so you know there's more to do, but unobtrusive". Snippet: https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/
- **Open in place.** "Tap on a task, and it will pop out into a card-like form while the rest of the list fades into the background." Checking off has haptic feedback on iPhone. Fetched: https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/
- **The Logbook.** "All your completed or cancelled to-dos and projects end up here." Logged items "stay in the Logbook indefinitely, a complete reference for everything you've achieved in the past." Fetched: https://culturedcode.com/things/support/articles/4001304/
- **Lesson for Duly.** Things is the model for "closed, not static". Items have a home that matches their time. A future item is hidden until its day and then arrives by itself. A finished item leaves the working view and goes into a permanent log. Duly's Waiting state (section 4) is Things' Upcoming. Duly's Record is the Logbook.

### 2.2 Linear

- **Inbox.** It shows "in-app notifications for work that needs attention", with a Priority tab that "separates notifications that need your attention from other updates". Snooze (H) "hides a notification from your Inbox until the selected time", and there is a "Remind Me" option. Fetched: https://linear.app/docs/inbox
- **Triage.** "A special inbox for your team" to "review, update, and prioritize issues before they are added to your team's workflow." There are four verbs: Accept (1), Decline (2), Mark as Duplicate (3), Snooze (H). A snoozed issue returns "at a time of your choosing, or when there's new activity on that issue: whichever comes first." Triage Intelligence suggests properties and related issues. Fetched: https://linear.app/docs/triage
- **My Issues.** A curated view split into assigned, created, subscribed and recent activity. Snippet: https://linear.app/docs/my-issues
- **Command menu.** Cmd K reaches every action by name and puts the context-relevant actions first. Unverified on linear.app; from a third-party guide: https://www.storylane.io/tutorials/how-to-use-linears-command-menu
- **Lesson for Duly.** Every open item has a small, fixed set of closing verbs, and snoozing is itself a way to close. "Return at a time, or when there's new activity, whichever comes first" is exactly the wake rule Duly needs: a loop waits until a date or until a new paper or fact arrives.

### 2.3 Superhuman

- **Split Inbox and reminders.** Inboxes are split by purpose. "Remind me" (H) takes a message out and brings it back. "Remind me if no reply" brings a thread back by itself if nobody answers. Snippet: https://medium.com/swlh/superhumans-superpowers-a-product-review-6f21535b9a45 and https://new.superhuman.com/split-inbox-88255
- **Reward at the end.** "Rewards you with stunning imagery when you hit Inbox Zero." The images are chosen "that reward our users with joy and surprise ... This encodes emotion into our users' email habits." Fun is defined as "pleasant surprise." Fetched: https://blog.superhuman.com/how-superhuman-chooses-inbox-zero-images/
- **Ask AI and auto follow-up.** "Stop searching, start asking" across email and calendar. It reminds you when an email needs a reply and "will even write the email for you, so all you need to do is hit send." Fetched: https://superhuman.com/ai
- **Lesson for Duly.** The empty state is the reward, and it is calm, not a streak. "Remind me if no reply" is the DSO email loop: once the student marks the email sent, Duly asks after a set number of days, "Did your DSO reply?", and the answer moves the loop on. Superhuman's AI writes outgoing text; Duly's equivalent is the DSO draft, already decided in D57.

### 2.4 Apple Health

- **Summary.** "Your Pinned list shows how you're doing in each health category that day." "Highlights show your Health over time, so you can see how you're doing overall." Fetched: https://support.apple.com/en-au/104997
- **Trends.** Health alerts you to notable changes in metrics such as resting heart rate, and shows how much and for how long they changed. Snippet: https://support.apple.com/guide/iphone/view-your-health-data-iphe3d379c32/ios and https://www.myhealthyapple.com/how-to-use-health-trends-in-ios15/
- **2026 redesign.** A new Insights tab "surfaces timely health information with a summary that updates throughout the day", with "personalized recommendations and relevant articles based on a user's data." Movement evaluation "runs entirely on device." Fetched: https://www.apple.com/newsroom/2026/09/apple-advances-health-and-fitness-capabilities-using-apple-intelligence/
- **Lesson for Duly.** Each pinned row on the summary shows its value while collapsed; the row is the answer and the tap gives the detail. Apple keeps the personal data processing on the device and says so plainly. Duly's D55 and D73 are the same stance.

### 2.5 Copilot Money

- **Dashboard order.** A spending graph, then **To Review**, then budgets, upcoming recurring payments and the net for the month. Fetched: https://help.copilot.money/en/articles/6045480-dashboard-tab-overview
- **The review loop.** To Review "displays all new transactions that have been imported but have not been marked as reviewed by you". If they are right, "tap MARK AS REVIEWED and they will be dismissed." An unreviewed marker shows on such transactions everywhere in the app, items can be reviewed in bulk, and the R key reviews on web and Mac. Fetched: https://help.copilot.money/en/articles/6045480-dashboard-tab-overview, snippet: https://help.copilot.money/en/articles/9554412-transactions-tab-overview
- **Lesson for Duly.** This is the exact shape of Duly's "documents fill fields" confirmation (D55). A paper read on the device lands in a To Review loop on Today. One tap confirms it, the loop closes, and the confirmed fields recompute the dates. One marker means the same thing everywhere.

### 2.6 Monarch

- **Customize dashboard.** Widgets can be dragged, reordered or removed, separately on web and mobile. Snippet: https://hometechhacker.com/monarch-money-review-budgeting-the-smart-way/
- **Weekly Recap.** "A short summary of your finances each week, bringing together major changes ... so you can quickly understand what happened and why." It can be removed, and AI features can be turned off in Settings. Snippet, because the page refused the fetch: https://help.monarch.com/hc/en-us/articles/37526856682260-AI-in-Monarch
- **Lesson for Duly.** A recap that says what changed and why is the right shape for a dated rule change or a stale fact. Monarch writes it with AI. Duly's recap must be a fixed template over engine diffs (VALUE-2 feature 7 already says "No model writes it"). The option to remove or turn off is a trust signal worth copying.

### 2.7 Notion AI

- **Where it lives.** "The circular icon with a face in the bottom-right corner of your Notion page", in the left sidebar under Search, and on Shift Cmd J. Fetched: https://www.notion.com/help/guides/everything-you-can-do-with-notion-ai
- **In place.** "Ask AI" from a block's menu, or the space bar on an empty line, drafts content in the page. Agents are called with @ and answer inline or in a side panel. Snippet: https://zapier.com/blog/how-to-use-notion-ai/ and https://www.notion.com/releases/2026-09-15
- **Follow-up as the next step.** After an answer you can ask it to "summarize key points, create an action plan, or even draft an email." Fetched: https://www.notion.com/help/guides/everything-you-can-do-with-notion-ai
- **Lesson for Duly.** One entry everywhere, plus the same entry on the object itself, with the answer attached to that object. The follow-ups Notion offers (plan, email) are the ones Duly can offer deterministically: a plan of steps from the loop template, and a DSO email from the D57 template.

### 2.8 Arc

- **Command Bar.** Cmd T searches tabs, bookmarks, history and the web from one field. Snippet: https://zapier.com/blog/arc-browser-review/ and https://allthings.how/how-to-use-the-arc-browser/
- **Auto-archive.** Unpinned tabs are archived after 12 hours by default; pinned tabs stay. Unverified on Arc's own pages; from https://supasidebar.com/blog/what-is-arc-browser-sidebar-2026
- **Ask on Page.** Cmd F then a question about the page. Snippet: https://allthings.how/how-to-use-the-arc-browser/
- **Lesson for Duly.** Clutter is removed by the product, not by the user: what you did not pin goes away on its own, and stays retrievable in the archive. On Duly's Today, a closed loop leaves by itself and stays findable in Record.

### 2.9 Raycast

- **One field, escalating.** From Root Search, "start typing your question, then press Tab" to send it to Quick AI. Text that matches no command can go to Quick AI as a fallback. ⌘J will "move the conversation into AI Chat. The full history, model, and any attachments come with it." Fetched: https://manual.raycast.com/ai/quick-ai
- **History and memory.** "The history sidebar lists every chat. Search at the top matches chat titles and message content." Memory keeps "durable facts across conversations". Projects make "every conversation in the project start with the right context." Fetched: https://manual.raycast.com/ai/ai-chat
- **Lesson for Duly.** The best ask entry is the same field as navigation and commands. It answers small questions in place and hands larger ones to a fuller surface with the context carried along. Duly's version: the field first matches papers, dates, pages and loop templates; a question that matches a template opens that loop; anything left over becomes a DSO question, never free generation.

### 2.10 ChatGPT (Pulse and Tasks)

- **Pulse.** Proactive research delivered as "topical visual cards" each morning, "a handful" (about 5 to 10) rather than an endless feed, with thumbs up or down on each card, ending with "that's it for today". OpenAI's pages refused the fetch (403); these details come from secondary reporting and are **unverified** against OpenAI: https://www.therundown.ai/p/chatgpt-gets-proactive-with-pulse, https://www.sentisight.ai/is-sam-altman-right-about-chatgpt-pulse/, https://alternativeto.net/news/2025/9/openai-launches-chatgpt-pulse-in-preview-to-proactively-do-your-daily-research. OpenAI's announcement: https://openai.com/index/introducing-chatgpt-pulse/
- **Tasks.** Scheduled prompts that run once, repeat, or watch for a change, and notify when ready. Reported as relaunched in June 2026 with its own Scheduled sidebar, and as pausing by itself when ignored. **Unverified**, from https://www.usecarly.com/blog/chatgpt-scheduled-tasks/ and https://zapier.com/blog/chatgpt-scheduled-tasks/
- **Lesson for Duly.** A finite set of cards with a visible end is the right Home. Feedback on a card teaches the product what to show. Duly's feedback should be closing verbs ("Done", "Not for me", "Remind me Oct 15"), not thumbs, because the answer is not a matter of taste. "Watch for a change" is Duly's updates pipeline (D22), delivered as a loop.

### 2.11 Claude apps

- **Projects** keep files, instructions and context together across conversations. **Memory** saves short topics about you, and **chat search** looks through past chats when asked. Memory is optional, with controls. Snippet: https://claude.com/blog/memory
- **Incognito.** "Temporary conversations that aren't saved to your chat history or to Claude's memory", kept by the system for 30 days for safety. Fetched: https://support.claude.com/en/articles/12260368-use-incognito-chats
- **Lesson for Duly.** Students will ask hypotheticals they do not want on their record. Duly already keeps What if out of the record until saved (VALUE-2 feature 2). Make that visible: a What if shows "Not saved to your record" until the student saves the outcome.

### 2.12 1Password Watchtower (added: the closest analogue for papers)

- Items in a Watchtower category show on its dashboard. Expiry dates can be set on any item; it flags items expiring soon, for example "passports expiring within 9 months". An alert banner shows on the item wherever it appears. Snippet: https://1password.com/blog/1password-q1-2025-usability-updates and https://securetoolsguide.com/1password-watchtower-feature-review/
- **Lesson for Duly.** A vault earns daily use by watching what is inside it. Duly's "Document watch" (VALUE-2 feature 6) is this, and it belongs on the Papers row of Today as "Next to run out: Passport, Mar 3, 2027". Duly's lead times must come from sourced rules or the student's own setting, never a vendor default like "9 months".

## 3. Research on fear, attention and closure

These findings support the design. They are not product features.

- **Uncertainty drives anxiety.** "Uncertainty about a possible future threat disrupts our ability to avoid it or to mitigate its negative impact and thus results in anxiety." Grupe and Nitschke 2013, Nature Reviews Neuroscience 14:488 to 501. Snippet: https://www.nature.com/articles/nrn3524
  - Design consequence: the calming move is to make a threat specific (a date, a step, who decides), not to reassure. "Report the end by Nov 10" calms more than "You're fine", which is banned copy anyway.
- **A plan closes a loop in the mind.** Unfinished goals intrude on thinking (the Zeigarnik line of research), but writing a specific plan removed the intrusions even though the goal was not done. Masicampo and Baumeister 2011, Journal of Personality and Social Psychology 101(4):667 to 683. The primary PDF could not be read here; this is from secondary summaries and is **unverified** against the paper: https://www.researchgate.net/publication/51234294_Consider_It_Done_Plan_Making_Can_Eliminate_the_Cognitive_Effects_of_Unfulfilled_Goals, https://users.wfu.edu/masicaej/MasicampoBaumeister2011JPSP.pdf
  - Design consequence: Duly can close a loop on the day it opens by turning it into a plan with a date and a promised return. "Planned" is a closing state.
- **If-then plans work.** A meta-analysis of 94 studies found a medium-to-large effect of implementation intentions on reaching goals (d = 0.65). Gollwitzer and Sheeran 2006, Advances in Experimental Social Psychology 38:69 to 119. The record: https://kops.uni-konstanz.de/handle/123456789/10973. The effect size is from secondary summaries and is **unverified** against the paper: https://goalsandprogress.com/implementation-intentions-gollwitzer-how-to/
  - Design consequence: steps are written as "When your new I-20 arrives, file within 30 days", with the trigger first and the date from the engine.
- **Calm technology.** "Technology should require the smallest possible amount of attention." It should "make use of the periphery", moving "from the periphery of our attention, to the center, and back". It should "work even when it fails". "The right amount of technology is the minimum needed to solve the problem." Fetched: https://calmtech.com/
  - Design consequence: a loop moves to the center (Today) only when it needs the student, and goes back to the periphery (Record, a lock screen notice) when it does not. The Papers folder opens offline.
- **Progressive disclosure, two levels at most.** Show "only a few of the most important options" first. "Designs that go beyond 2 disclosure levels typically have low usability." The trigger needs a label with clear "information scent." Fetched: https://www.nngroup.com/articles/progressive-disclosure/
- **Accordions.** They help "when users need only a few pieces of information on the page", and hurt "when your audience requires the majority or all the content on the page." "A clear, descriptive heading is key." Fetched: https://www.nngroup.com/articles/accordions-on-desktop/
  - Design consequence: a collapsed Duly card is useful only if its header carries the answer. "STEM OPT: file by Jan 14" is a deliverable; "STEM OPT" is a chore.

## 4. The pattern Duly needs: the Loop

### 4.1 Definition

A **Loop** is one question in the student's immigration life, carried from the moment it opens to an outcome on the record. It is the single unit that Today, Ask, What if, check-ins, rule changes, paper reads and the DSO email all share.

A loop can be opened by:
- **the student:** Ask, What if, "Something changed";
- **a date:** the window opens soon, a paper runs out;
- **a stale fact:** a check-in (D66, D73);
- **a new paper:** read on the device (D55);
- **a rule change** that touches this student's items (D22, computed on the device per VALUE-2);
- **a USCIS status** the student entered.

### 4.2 States

1. **Open.** One header line that already delivers something, such as "STEM OPT: window opens Nov 15".
2. **Asking.** At most three questions, each inferred first from the record or papers, each with "I'm not sure" (BRIEF). Every answer writes a record fact.
3. **Answered.** The engine output for this question, in plain words, with the source mark (BRIEF round 3). If the engine says cannot_tell, this state shows the one thing that would make it tell ("Add your EAD card to see this date") or the DSO step.
4. **Planned.** The steps, each written as when, what and where, each date from the engine, each step from the pack or the student's school (BRIEF round 2, note 10). Reminders are set here, and the student sees them ("We'll remind you Nov 1 and Nov 8").
5. **Waiting.** The loop leaves Today. It comes back on a date or on an event, whichever comes first (Linear's snooze rule): the date of the next step, a new paper, a USCIS status change, a rule pack bump, or the check-in's staleness date.
6. **Closed.** The outcome is recorded ("Reported job end, Nov 3") with a short, calm acknowledgement that says what changed and what is next, or "Nothing else needs you for this." The loop becomes one line in Record.

Every state has an exit, and "Not now" is always one of them. Not now moves the loop to Waiting with a date the student picks, never to nowhere. Any closed loop can be reopened from Record.

### 4.3 Feedback, positive and negative

- **Positive, on close.** One line naming the change: "Your count now runs to Dec 19." "File-by date set: Jan 14." The existing confetti stays for the first completion of a whole path only (BRIEF round 2, note 6). There are no streaks (VALUE-2).
- **Positive, on a quiet Today.** "That's everything for now. Next check: Oct 30." This is the Pulse and Inbox Zero end state, and it is the most calming screen Duly can show.
- **Negative, calm.** When a date is close or a fact is stale, the loop rises to the top of Today with its one action. Colour signals closeness only when a date is near (VALUE-2 feature 6). It never says "late"; it says "You marked this made on Oct 2" (VALUE-2 feature 4).
- **Feedback from the student.** Closing verbs, not thumbs: Done, Not for me, Remind me on a date, Something's wrong here (opens Feedback with the loop attached, and no document values).

### 4.4 The founder's chain, built as a loop

The founder's words: "do you still have this job? no. what to do? find a job. how? here. where? here. when? time. what to keep in mind? these dates." This is the Job ended loop for an OPT student, with the sample record (Northwind, card to Feb 13, 2027). Every date below is labelled as an engine value; none is computed in this file.

| Step | Screen | Source of truth |
|---|---|---|
| Open | Check-in on Today: "Still at Northwind, about 40 hours a week?" with Yes, same / Hours changed / Job ended / New job | data.js `checkin`; D66, D73 |
| Asking | "Last day at work?" with a date picker, prefilled from nothing (never guessed). "Is there a new job lined up?" Yes, with a start date / Not yet / Not sure | Record facts |
| Answered | "Report the end by [engine: report_*_within_days]. With no new job, day 90 of days without work would be [engine: unemployment count]." With a source mark | opt.report_employer_within_days (guidance), opt.unemployment_limit_days; VALUE-2 feature 2 |
| Planned, step 1 (what to do) | "Report the end of Northwind by [date]", with where to report (the SEVP portal or the school's process) and "Done" | Pack rule; school step if the student pasted the school page (BRIEF round 3, note 4) |
| Planned, step 2 (find a job: how) | "What a job needs to count on OPT", in plain words from the pack (related to your field, hours per week), with the source mark. No verdict on any particular offer | opt.* requires rows; BOUNDARY |
| Planned, step 3 (where) | Your school's career office, from the school page the student pasted. Optional public employer lookups only where a rule makes them matter (for STEM OPT, employer E-Verify participation, if that pack row and source exist). No job board, no listings | VALUE-2 "Still no: job board"; D47. **Founder decision** (section 11) |
| Planned, step 4 (when) | "Day 90 would be [date]." A reminder at the student's chosen lead | Engine; reminders (ANALYSIS 7.3) |
| Planned, step 5 (keep in mind) | Two or three lines that each move a date: "A trip abroad with no job adds days (try it in What if)"; "When you have an offer, add it here: it starts the report clock" | Pack rules; What if |
| Waiting | The loop leaves Today. It wakes on the reminder date, at the check-in staleness, or when a new job is added | Linear's "time or new activity, whichever comes first" |
| Closed | New job added: "Report the new job by [date]" opens as a child loop. When that is done: "Closed. Northwind ended Oct 31; Contoso started Nov 16; both reported." One line in Record | Record event log |
| Cannot tell | Two jobs that reach 20 hours only together: the count shows as unknown with the DSO question (VALUE-2 feature 2). The loop still ends in Planned (DSO email sent, reply expected) | BOUNDARY; D57 |

### 4.5 Loop templates to build first

Ordered by how often students meet each one and how costly a miss is. The order is a proposal; VALUE-2 already ranks the features behind most of these.

1. A paper was read (To Review): confirm the fields, then the dates recompute.
2. A window or file-by date is coming (STEM OPT, OPT, file within 30 or 60 days of the recommendation).
3. Job ended, new job, hours changed.
4. Check-in (a stale fact).
5. A trip (VALUE-2 feature 3).
6. A report is owed (STEM validations, evaluations, new I-983, 10-day change reports).
7. A paper is running out (Document watch).
8. A rule change touches your plan (News "For you").
9. A USCIS notice or status arrives. Anything beyond "received" and "approved" goes to the DSO or an attorney as a pointer (BOUNDARY).
10. Lost or replaced paper: the student gets the latest version from Papers in one tap. The loop to request a new I-20 is a school step.
11. H-1B petition and cap-gap (VALUE-2 feature 8, D63 to D66).

Each template is a versioned data file next to the rule pack. It names: its opening triggers, its questions (with the record facts each one writes), the engine item ids it reads, its plan steps (each with a pack rule id or a school step), its wake conditions, its closing outcomes, and its Record line.

## 5. The ask entry: where the assistant lives

### 5.1 What the products show

- One field does navigation, commands and questions (Raycast Root Search, Linear Cmd K, Arc Command Bar).
- The same entry also appears on the object itself (Notion's Ask AI on a block, Arc's Ask on Page).
- Small answers come back in place; large ones hand off to a fuller surface with the context carried along (Raycast ⌘J).
- Unmatched text has a defined fallback (Raycast's fallback commands).

### 5.2 Duly's Ask

- **Placement.**
  - Phone: a field fixed at the bottom of Today, above the tab bar, reading "Ask about a date, a paper, or what if". On other pages it is one tap away in the top bar.
  - Laptop and web: Cmd K from anywhere, plus the same field at the top of Today.
  - Ask is an action, so it is not a tab. Apple: tab bars are "to enable navigation, not to help people perform actions." Snippet: https://developers.apple.com/design/human-interface-guidelines/components/navigation-and-search/tab-bars
- **What it matches, in order:**
  1. a paper ("I-20", "EAD"): opens it, with Share;
  2. a date or count the engine holds ("when does my card end"): answers in place, with the source mark;
  3. a page;
  4. a loop template ("I lost my job", "can I travel in December"): opens that loop at Asking;
  5. a rule in plain words ("what is cap-gap"): the plain-words sheet with its quote (D56);
  6. nothing matched: "Ask your DSO", as a drafted email in the student's voice (D57), plus "Tell us this was missing" (Feedback, no values).
- **The open loop promise.** "Anybody can ask anything" is honoured by guaranteeing that every question ends somewhere useful: a paper, a date, a plan, a rule or a DSO draft. Never a generated paragraph about the student's case.

### 5.3 How it is built within the hard rules

- **Matching runs on the device first.** Paper names, engine item ids, page names and the template catalogue form a small, fixed vocabulary. Synonym lists plus a small on-device text classifier cover most phrasings. No question text leaves the device for these.
- **Using the D23 and D27 assistant model.** If the founder approves the live assistant model (D23, D27: Bedrock with no retention), it is used only to map a phrasing to a template id and its slots. The device first replaces names, numbers, receipt numbers and dates in the question with slot markers, so no document value reaches the model (D60). The model's output is an id from the closed catalogue, checked against it. It never writes an answer, a date or a conclusion (CLAUDE.md hard rules).
- **All visible words come from templates and the pack.** The answer text is a fixed template filled from engine items, so the boundary-answer-shape rules hold for every answer.
- **Evaluation.** A labelled set of real student phrasings mapped to template ids, measured for precision. A wrong match is worse than "Ask your DSO", so the threshold favours the fallback. Pairs on each side of the boundary go in evals/boundary (skill add-eval-case).

## 6. The footprint: Your record

The founder's "digital immigrant footprint of every student".

### 6.1 What the products show

- Things' Logbook keeps every completed and cancelled item "indefinitely".
- Raycast keeps every chat, searchable by content.
- Arc archives automatically and keeps the archive retrievable.
- Claude separates what is remembered (memory, projects) from what is not (incognito).

### 6.2 What Record holds

One chronological, dated ledger, newest first, grouped by phase (BRIEF Timeline: "CPT: two internships, done"). Each entry has its date, what happened and its source:

- facts confirmed, with "confirmed on";
- papers kept, and their versions;
- programs, cards, jobs, trips and petitions;
- reports the student marked made;
- loops closed, with their outcome;
- rule changes applied to this student's dates ("Rules updated Sep 30: your file-by date did not move");
- DSO emails sent, and the replies the student recorded.

What Record can do:
- **Filters:** Programs, Work, Travel, Papers, USCIS, Reports.
- **Search,** matching content as in Raycast.
- **Share and export** build from it (VALUE-2 feature 7; ANALYSIS 7.9).
- **Reopen** any closed loop.

### 6.3 Technically

The footprint is not a new feature. It is the **append-only event log** the record already needs:
- the event log is the source of truth;
- the current record is a projection of it;
- the engine runs over the projection with an injected Clock;
- each loop is derived from (record, engine output, pack version, template version, clock).

This gives:
- a deterministic replay ("why did this date change on Oct 3?": the event and the pack bump that caused it);
- Undo as a compensating event;
- an audit trail for liability;
- a single encrypted object to sync end to end between phone and laptop (D54).

Infrastructure is for the security and data research; this file only names the shape the UI depends on.

## 7. Information architecture

### 7.1 Navigation

Today the prototype has six main places (Home, Next steps, USCIS status, Documents, News, Timeline), five of them tabs, plus Your profile, Settings and Feedback (components/shell.js `NAV`). Material: navigation bars are for "three to five destinations" (snippet: https://m3.material.io/components/navigation-bar/guidelines). Things and Linear group by time and state, not by data type.

Proposed: four destinations, plus Ask.

| Destination | Holds | From today's places |
|---|---|---|
| **Today** | Status line and numbers, up to three open loops, the end line, Ask, and the "kept for you" rows | Home; the open parts of News and the check-in |
| **Plan** | The path the student is on: Next steps with the time-scaled strip (BRIEF round 5), reports owed, USCIS cases with their status and next step, and What if | Next steps, USCIS status, the future part of Timeline |
| **Papers** | Every document: chips, All documents, Carry these (offline), Document watch, Share | Documents |
| **Record** | The footprint (section 6), Your profile (facts, edit in place), the News archive, Export | Timeline (past), Your profile, News list |

- Settings and Feedback sit behind the account mark on every page.
- The founder said Updates, USCIS status and Documents "look great" (BRIEF round 5). Their pages stay as they are; only where they are reached from changes. A News article that affects the student also appears on Today as a loop.
- On the laptop, the sidebar shows the same four with Ask at the top (Cmd K). At 1024px and wider, Papers and Record become two panes (list and detail), as in Linear's and Superhuman's inboxes.

### 7.2 Today, collapsed

Today is ordered top to bottom as follows, with sample values from the prototype's demo record. Every value is an engine item.

1. **Status line (the hero, kept from the canvas).** "You're working on OPT at Northwind Systems." Below it, one row of the three numbers (round 3 kept them): days without work used, card valid to, next date. Tapping a number opens its source sheet.
2. **Open for you (at most three loops, each collapsed to one line that delivers the answer):**
   - "STEM OPT: decide by Oct 15", with Decide. It opens in place (round 5, note 1). After a yes, it goes to Planned: "First step: get your I-983 signed. We'll remind you Oct 15." Then it leaves Today.
   - "Still at Northwind, about 40 hours a week?", with Yes, same and Something changed. Yes, same closes it: "Confirmed. Next check Oct 30", and it leaves Today. Something changed opens the matching loop.
   - "1 rule change touches your plan: nothing to do now". It opens to the For you box, then Done.
   - Order: by the engine's next date, then by staleness. A fourth or later loop shows as "2 more, next on Nov 1" (Things' This Evening: present but unobtrusive).
3. **The end line.** "That's everything for now. Next check: Oct 30." When no loop is open, this line stands right under the status line, and that is the calmest screen in the app.
4. **Ask.** "Ask about a date, a paper, or what if".
5. **Kept for you (three collapsed rows, each header a deliverable):**
   - Papers: "14 kept · Next to run out: Passport, Mar 3, 2027".
   - USCIS: "No case yet", or "I-765 · Received · checked Sep 28".
   - Record: "Last: Confirmed your job, Sep 30".
6. **Footer.** "Records and dates from your documents, not legal advice." Plus "Rules checked Sep 30" (BRIEF).

What leaves Today:
- the promise line, which moves to Welcome and Settings (said once, ANALYSIS 7.8);
- the News list, which moves to Record; only an item that touches the student comes to Today, as a loop;
- the open check-in after it is answered.

### 7.3 Name for "scenarios"

Recommended: **What if**. It is short and plain. It already describes Try a change (VALUE-2 feature 2): "What if my job ends", "What if I travel Dec 19 to Jan 9". It reads naturally as an Ask suggestion. And it is honest that nothing is saved: "Not saved to your record" is shown until the student saves the outcome.

- The save button names its outcome instead of "This happened": "Save to my record: job ends Oct 31". After saving, the loop goes straight to Planned (section 4.4), never to a toast and nothing.
- Situations that are not hypotheticals ("I lost my I-20", "My DSO replied") are the same loops, reached from Ask and listed under Plan as "Something changed".
- Alternatives considered: Situations (plain, but sounds like a help centre), Try a change (current; good as a button, weak as a place), Life events (a government phrase, cold), Playbooks (jargon).

## 8. Beyond the canvas while staying calm

What to keep (BRIEF design laws, D52, D53):
- the tokens;
- the spacing scale;
- three text sizes;
- hairlines, not boxes, for lists;
- one column for reading;
- one hero and one primary action per screen;
- motion off under reduced motion.

What to change, and the precedent for each:
- **One raised level for an open loop.** A collapsed loop is a hairline row. When opened, it lifts into a card while the rest of the list dims, as Things does ("pop out into a card-like form while the rest of the list fades"). This is the only place a card appears; everything else stays hairlines.
- **A done state.** A loop that closes shows its acknowledgement line for about two seconds, then folds into the end line. With reduced motion, it simply is not there next time. Things and Linear both remove done items from the working view.
- **Two panes on large screens** for Papers and Record, and a persistent Ask at the top. The 720px column stays the reading width inside the detail pane.
- **Cmd K** on laptop and web.
- **Collapsed by default with information scent.** No accordion header without its answer in it (NN/g). Disclosure is never more than two levels deep: row, then the opened loop. Sources and the working sit behind the ⓘ inside the opened loop, as today.

## 9. Measures that tell if Duly stopped being static

All counted on the device and sent, if at all, only as anonymous counts with the student's consent (D60, D73). The data and security research decides the method.

- **Dead-end rate:** loops with no next action and not Closed. The target is zero. Enforced as a build gate: a property test over every template that from every state a path to Closed exists and every non-terminal state has at least one action.
- **Time to Planned:** from Open to Planned. The target is the same session for most loops, the Masicampo and Baumeister closure.
- **Reopen rate after Closed:** a high rate means a loop was closed too early or its outcome was wrong.
- **Ask fallback rate:** the share of asks ending in "Ask your DSO" because nothing matched. It feeds the template backlog. It is not a failure in itself.
- **Quiet days:** the share of opens where Today shows only the end line. It should rise as a student's record matures, which is the calm product working.

## 10. Risks

- **Ask may read as a chatbot that answers anything.** Its placeholder and its fallback must make the closed set honest ("Ask about a date, a paper, or what if"), and a wrong match must cost more than a fallback in the eval threshold.
- **A Planned loop is not a filed form.** The acknowledgement must never imply that Duly reported anything for the student (BOUNDARY: no filing on their behalf). Use "You marked this made on Oct 2."
- **Templates as a second source of law.** Every plan step must point at a pack rule id or a school step; a template with free text in a step fails the gate. Templates are versioned with the pack, and a pack bump re-derives every loop.
- **Too many loops on Today.** A hard cap of three, the overflow line, and the Waiting state keep Today finite. If the cap is often hit, the templates are too chatty.
- **Unverified outside claims** (Pulse details, ChatGPT Tasks, Arc auto-archive, Linear Cmd K, Monarch recap, two research effect sizes) are inspiration only and must not be cited in product copy.

## 11. Decisions for the founder

1. **Ask.** VALUE-2 section 3 says no to "Ask your record (a search box)". The critique asks for an open loop anyone can start. Proposed: approve Ask as in section 5 (a closed catalogue, falling back to the DSO, no generated answers), with the D27 model allowed only for phrasing-to-template-id on redacted text.
2. **What if on Home.** D72 puts Try a change on cards and Your profile, not on Home. Proposed: no What if button on Today, but "what if" phrasings typed into Ask open it.
3. **Find a job: where.** D47 keeps Duly to immigration, and VALUE-2 refuses a job board. Proposed: Duly gives what the rule asks of a job, the dates, the reports, and the school career office from the pasted school page. No listings and no career tools. Optional public lookups only where a rule makes them matter, each saved as a source first.
4. **Navigation to four destinations** (Today, Plan, Papers, Record) plus Ask, with News, USCIS status and Timeline regrouped as in section 7.1.
5. **The name What if**, and the save button naming its outcome instead of "This happened".
6. **The Loop as a contract object** (template files beside the pack, the event-log record). This is a contract change, which lands first and alone (CLAUDE.md).
7. **The dead-end gate** (section 9) added to the gates.

## 12. Sources

Fetched (page read):
- https://culturedcode.com/things/support/articles/4001304/
- https://www.macstories.net/reviews/things-3-beauty-and-delight-in-a-task-manager/
- https://linear.app/docs/inbox
- https://linear.app/docs/triage
- https://blog.superhuman.com/how-superhuman-chooses-inbox-zero-images/
- https://superhuman.com/ai
- https://support.apple.com/en-au/104997
- https://www.apple.com/newsroom/2026/09/apple-advances-health-and-fitness-capabilities-using-apple-intelligence/
- https://help.copilot.money/en/articles/6045480-dashboard-tab-overview
- https://www.notion.com/help/guides/everything-you-can-do-with-notion-ai
- https://manual.raycast.com/ai/quick-ai
- https://manual.raycast.com/ai/ai-chat
- https://support.claude.com/en/articles/12260368-use-incognito-chats
- https://calmtech.com/
- https://www.nngroup.com/articles/progressive-disclosure/
- https://www.nngroup.com/articles/accordions-on-desktop/

Snippet only (the page refused the fetch, or only a search summary was read):
- https://linear.app/docs/my-issues
- https://help.copilot.money/en/articles/9554412-transactions-tab-overview
- https://help.monarch.com/hc/en-us/articles/37526856682260-AI-in-Monarch
- https://hometechhacker.com/monarch-money-review-budgeting-the-smart-way/
- https://support.apple.com/guide/iphone/view-your-health-data-iphe3d379c32/ios
- https://www.myhealthyapple.com/how-to-use-health-trends-in-ios15/
- https://zapier.com/blog/how-to-use-notion-ai/
- https://www.notion.com/releases/2026-09-15
- https://zapier.com/blog/arc-browser-review/
- https://allthings.how/how-to-use-the-arc-browser/
- https://medium.com/swlh/superhumans-superpowers-a-product-review-6f21535b9a45
- https://new.superhuman.com/split-inbox-88255
- https://claude.com/blog/memory
- https://1password.com/blog/1password-q1-2025-usability-updates
- https://securetoolsguide.com/1password-watchtower-feature-review/
- https://developers.apple.com/design/human-interface-guidelines/components/navigation-and-search/tab-bars
- https://m3.material.io/components/navigation-bar/guidelines
- https://www.nature.com/articles/nrn3524

Unverified (secondary sources only; not to be cited in product copy):
- ChatGPT Pulse details: https://openai.com/index/introducing-chatgpt-pulse/ (403), https://www.therundown.ai/p/chatgpt-gets-proactive-with-pulse, https://www.sentisight.ai/is-sam-altman-right-about-chatgpt-pulse/, https://alternativeto.net/news/2025/9/openai-launches-chatgpt-pulse-in-preview-to-proactively-do-your-daily-research
- ChatGPT Tasks: https://www.usecarly.com/blog/chatgpt-scheduled-tasks/, https://zapier.com/blog/chatgpt-scheduled-tasks/
- Arc auto-archive: https://supasidebar.com/blog/what-is-arc-browser-sidebar-2026
- Linear Cmd K: https://www.storylane.io/tutorials/how-to-use-linears-command-menu
- Masicampo and Baumeister 2011: https://www.researchgate.net/publication/51234294_Consider_It_Done_Plan_Making_Can_Eliminate_the_Cognitive_Effects_of_Unfulfilled_Goals, https://users.wfu.edu/masicaej/MasicampoBaumeister2011JPSP.pdf
- Gollwitzer and Sheeran 2006: https://kops.uni-konstanz.de/handle/123456789/10973, https://goalsandprogress.com/implementation-intentions-gollwitzer-how-to/
