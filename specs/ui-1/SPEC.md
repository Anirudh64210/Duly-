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
