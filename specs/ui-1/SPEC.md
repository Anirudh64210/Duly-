# ui-1: the screens as the founder will see them

The founder's check of the rendered screens (make design-shots, 2026-09-30) against
design/canvas/png. Timeline, Checklists, Your case and Updates match the canvas. These do not.

1. Home's verdict block (web/src/app/Home.tsx) lists every verdict reason, one line each: a field
   id shown raw ("Duly needs your a1.dso on."), and "Duly is waiting for your answer to a question
   below." twelve times. The canvas (Main.png) is a headline, one calm line, then "Your next move"
   rows. Make it so:
   - one line under the headline that says what would let Duly finish, with the count ("11
     answers would let Duly finish your dates."), and a "Your next move" row that goes to the
     questions section already on Home;
   - identical reason lines appear once; a reason about a question uses the same plain words the
     questions section uses for that question id, never the id;
   - the full reasons stay one tap away (a "Why" disclosure), in plain words, none dropped.
2. Every screen with the sidebar scrolls sideways at 1280x832. No screen may be wider than the
   window, at 1280x832 or at 390 wide.
3. Your case shows the heading "Your answers" over nothing. Show the answers given, or, when there
   are none, one line saying where the open questions are, with a link.
4. Onboarding step 1 offers only "Another status" when the rule list cannot be read. Say plainly
   that Duly could not load its rules, offer Try again, and never offer only "Another status".
   The shot run (web/src/shots.tsx) supplies the status list from the samples, so step 1 is shot
   as a student sees it.

Nothing here changes a date, a count or what is asked. Words follow D56 and the copy lint.

## From the review (reviews/ui-1.md)

5. Plain words for every question the pack can ask (findings 1 and 2). Most question ids have no
   copy, so seventeen become "Duly has a question about what you entered." and the questions
   section reads "Missing a1 dso on.". Write the copy once in web/src/lib/labels.ts, keyed by what
   is asked, not by the record id: `<record>.<field>` by the field and the record's kind,
   `complete.<kind>` by the kind, `typed_dates.*` by its own words. The `because` line uses the
   same words. A test reads rulepacks/f1-us/v2026.09/parameters.yaml and fails for any field,
   list kind or confirmation the pack can ask that has no copy, and fails if any rendered Home line
   holds an id in any form (dots, underscores, or either turned into spaces).
6. The "each reason once" test states its expected lines literally, never by the code's formula
   (finding 3).
7. The shot run fails when a screen is wider than its window: document scrollWidth greater than
   innerWidth, at 1280x832 and at 390x844 (finding 4). desktop/src/shots.ts records it per shot.
8. Home follows the canvas order: headline, calm line, the metrics, then Your next move
   (finding 5). openQuestionsLine goes back into Home as a literal; the two extra .why margins go
   (finding 6).
