/* Duly ui-2 prototype: router, shell and shared behaviour.
   A screen registers itself:
     window.SCREENS.home = {
       title: 'Home',
       bare?: true,                 // no sidebar (onboarding)
       paramsInPlace?: true,        // a change of params on this screen (e.g. a
                                    // chip that switches a view) swaps in place,
                                    // keeping the scroll, instead of a page change
       render(data, params) -> html,
       mount?(root, data, params),  // wire screen-specific behaviour
     };
   Routes are #/<name>[/<param>...]; params arrive as an array of strings.

   How pages move (Note 1):
   - The shell (sidebar, top bar, tab bar) is drawn once. A page change swaps
     only the content column (<main id="main">), with a quiet 120ms crossfade
     and no slide. The current nav item moves at once.
   - The rise stagger plays only the first time the shell is drawn.
   - App.rerender() redraws the column in place: no fade, same scroll, the
     same disclosures open, focus kept. Checkboxes, answers, disclosures and
     the email draft change the DOM directly and never redraw.
   - Back and Forward bring back the scroll position and open rows; a new
     page starts at the top. App.from is the page the student came from,
     used by C.backLink().
   The root passed to mount() is a fresh element on every render, so
   listeners added to it never pile up.

   Shared behaviour is wired here once, by data attributes, and every change
   is announced as a 'duly:change' event on document:
     detail = { kind, key, value, el }
     kind: 'task' | 'choice' | 'answer' | 'toggle' | 'edit' | 'field' | 'confirm'
           | 'step' | 'draft' | 'school-import' | 'document'
           | 'share' | 'calendar' | 'stem-field'            (round 4)

   Round 4 (VALUE.md) adds, for every screen:
     App.unemployment({ noJob? })  the count, its state and a C.metrics cell
     App.setJobs(v)                answer "Is that every job?" ('every'|'none'|null)
     App.stemField()               the I-20 field code fact ('found'|'confirmed')
     App.employer()                Employer check data; route #/employer is built in
     App.processingFor(app, o?)    USCIS processing time, filed and undecided only
     App.share(doc)                the phone's share sheet for a document
     App.calendarFile(), App.addToCalendar()   every reminder date as one .ics

   Old routes redirect in place (Round 3, note 7): #/next and #/checklists
   go to #/steps, #/applications to #/uscis, keeping their params.

   Round 5 (BRIEF.md, Round 5) adds:
     App.haptic(kind)              a light tap through navigator.vibrate where
                                   the phone has it: 'tick' 10ms, 'select' 6ms,
                                   'complete' a softer double. No-op elsewhere,
                                   under prefers-reduced-motion, and when
                                   App.state.haptics === false.
     App.play(el, cls)             add a one-shot motion class ('is-ticking',
                                   'is-settling', 'is-arriving', 'is-complete'),
                                   removed when it ends. No-op under reduced motion.
     App.currentStep(path)         the key of the step that is now: the first
                                   open, visible step of App.steps(path).
     App.advanceCurrent(listEl)    move "current" to the first open step in a
                                   list, with a short highlight. setTask calls it.
     App.stemPlan()                the STEM OPT choice and its dates, one source
                                   for Home and Next steps:
                                   { intent, today, dates, byKey, decide, timeline }
     App.setStemIntent(v)          answer it ('yes'|'no'|'unsure'|null) in place
     App.stemTimeline({ today? })  props for C.timeline, from DULY_SAMPLE.stem
     App.layoutTimelines(root?)    lay out timeline labels; runs after every
                                   render and on resize, so screens never call it
                                   unless they insert a timeline themselves
     App.formTypes(), App.formType(key)
     App.normalizeReceipt(v), App.isReceipt(v)
     App.addCase({ receipt, form, other?, title? })  -> { ok, item } | { ok: false, errors }
     App.removeCase(id)            only a case the student added
   New 'duly:change' kinds: 'case' (add | remove), 'current' (key of the new
   current step). */

/* app/core.js: The App object, the shared helpers every app file uses.
   Every other file in app/ extends window.App. Helpers one file
   shares with another sit on App._, which is not enumerable and not
   part of the public App. This was app.js before the split; a comment
   that says app.js means app/*.js. */

window.SCREENS = window.SCREENS || {};

(function () {
  'use strict';

  const data = window.DULY_SAMPLE;
  const App = {
    data: data,
    state: {},
    route: null,
    params: [],
    from: null,
    /* Set by app/router.js, app/overlays.js, app/tasks.js and app/events.js. */
    go: null,
    rerender: null,
    toast: null,
    confetti: null,
    complete: null,
    closePopover: null,
    emit: null,
  };
  window.App = App;
  Object.defineProperty(App, '_', { value: {} });

  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isPhone = () => window.matchMedia('(max-width: 640px)').matches;
  const cssEsc = (v) => (window.CSS && CSS.escape ? CSS.escape(v) : String(v).replace(/["\\]/g, '\\$&'));

  function shortToday() { return data.today.short.replace(/, \d{4}$/, ''); }

  Object.assign(App._, { reduced, isPhone, cssEsc, shortToday });
})();
