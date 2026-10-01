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
    go: go,
    rerender: () => render('inplace'),
    toast: toast,
    confetti: confetti,
    complete: complete,
    closePopover: closePopover,
    emit: emit,
  };
  window.App = App;

  /* The STEM OPT intent, shared by every screen: null, 'yes', 'no' or 'unsure'. */
  function stemIntent() {
    const v = 'stemIntent' in App.state && App.state.stemIntent != null ? App.state.stemIntent : data.stem.intent;
    if (v == null || v === '') return null;
    const s = String(v).toLowerCase();
    if (s === 'unsure' || s.indexOf('not sure') !== -1) return 'unsure';
    if (s.charAt(0) === 'y') return 'yes';
    if (s.charAt(0) === 'n') return 'no';
    return null;
  }
  App.stemIntent = stemIntent;

  /* Is "Was your degree awarded?" waiting in Your case? Only after onboarding
     with a passed end date and no answer yet, or on the #/case/no-degree demo. */
  function awardedWaiting() {
    const st = App.state;
    if (st.caseAwarded && st.caseAwarded !== 'unsure') return false;
    if (st.caseAwardedDemo) return true;
    const onb = st.onb;
    if (!onb || onb.awarded || !onb.end) return false;
    const end = new Date(String(onb.end).trim());
    return !isNaN(end.getTime()) && end < new Date(data.today.iso + 'T00:00:00');
  }
  App.awardedWaiting = awardedWaiting;

  /* Nav dots: where something is waiting for the student. */
  function waitingIn() {
    const out = (data.waitingIn || []).filter((k) => k !== 'steps' && k !== 'case');
    const intent = stemIntent();
    if (intent === null || intent === 'unsure') out.push('steps');
    if (awardedWaiting()) out.push('case');
    return out;
  }
  App.waitingIn = waitingIn;

  /* ---------------- steps: federal plus the student's school steps ---------------- */

  /* Is a task done? App.state wins over the data. School step keys are
     'school:<id>'. */
  function isDone(key, fallback) {
    const v = App.state['task:' + key];
    if (v != null) return !!v;
    if (fallback != null) return !!fallback;
    if (String(key).indexOf('school:') === 0) {
      const s = findSchoolStep(String(key).slice(7));
      return !!(s && s.done);
    }
    return false;
  }
  App.isDone = isDone;

  function findSchoolStep(id) { return (data.schoolSteps || []).filter((s) => s.id === id)[0] || null; }
  App.findSchoolStep = findSchoolStep;
  App.findUpdate = (id) => ((data.updates && data.updates.items) || []).filter((u) => u.id === id)[0] || null;
  App.findApplication = (id) => ((data.applications && data.applications.items) || []).filter((a) => a.id === id)[0] || null;

  /* App.steps(path) : the checklist for a path ('stem', 'opt', ...) in order,
     the standard federal steps with the student's school steps placed against
     them. Each entry:
       { type: 'federal', key, step, done, waitingOn? { key, title, done } }
       { type: 'school',  key: 'school:<id>', step, done, placement, afterOf? { key, done } }
     Render a federal entry with C.task({ ...entry.step, key, done, waitingOn })
     and a school entry with C.schoolStep(entry, { email: data.email }). */
  function steps(path) {
    const fed = path === 'stem' ? data.stem.tasks : (((data.checklists || {})[path] || {}).steps || []);
    const school = (data.schoolSteps || []).filter((s) => s.path === path);
    const schoolEntry = (s) => ({ type: 'school', key: 'school:' + s.id, step: s, done: isDone('school:' + s.id, s.done), placement: s.placement });
    const out = [];
    fed.forEach((f) => {
      const fDone = isDone(f.key, f.done);
      const before = school.filter((s) => s.placement === 'before' && s.federal === f.key);
      before.forEach((s) => out.push(schoolEntry(s)));
      const blocking = before.filter((s) => !isDone('school:' + s.id, s.done))[0] || before[0];
      out.push({
        type: 'federal', key: f.key, step: f, done: fDone,
        waitingOn: blocking ? { key: 'school:' + blocking.id, title: blocking.title, done: isDone('school:' + blocking.id, blocking.done) } : null,
      });
      school.filter((s) => s.placement === 'alongside' && s.federal === f.key).forEach((s) => out.push(schoolEntry(s)));
      school.filter((s) => s.placement === 'after' && s.federal === f.key).forEach((s) => {
        out.push(Object.assign(schoolEntry(s), { afterOf: { key: f.key, done: fDone } }));
      });
    });
    school.filter((s) => !fed.some((f) => f.key === s.federal)).forEach((s) => out.push(schoolEntry(s)));
    return out;
  }
  App.steps = steps;

  /* App.schoolImport(path) : where the school's steps stand for a path.
       { state: 'empty' | 'found' | 'confirmed', href, label, steps }
     state lives in App.state['schoolImport:<path>'] (falls back to
     data.schoolImport.state). App.setSchoolImport(path, state) forces one,
     for a review link such as #/steps/school. Confirming copies the found
     steps into data.schoolSteps, where App.steps() places them. */
  function schoolImportOf(path) {
    const d = data.schoolImport || {};
    const st = App.state['schoolImport:' + path] || d.state || 'empty';
    const src = App.state['schoolImportSrc:' + path] || null;
    return {
      state: st,
      href: src ? src.href : (st === 'empty' ? null : d.href),
      label: src ? src.label : d.label,
      steps: (d.found || []).filter((s) => (s.path || 'stem') === path),
    };
  }
  App.schoolImport = schoolImportOf;
  function setSchoolImport(path, state, src) {
    const imp = schoolImportOf(path);
    data.schoolSteps = (data.schoolSteps || []).filter((s) => !(s.from === 'school-page' && s.path === path));
    if (state === 'confirmed') {
      imp.steps.forEach((s) => data.schoolSteps.push(Object.assign({}, s, {
        path: path, from: 'school-page', done: isDone('school:' + s.id, s.done),
        link: s.link || (imp.href ? { label: 'Open', href: imp.href } : null),
      })));
    }
    if (src !== undefined) App.state['schoolImportSrc:' + path] = src;
    App.state['schoolImport:' + path] = state;
  }
  App.setSchoolImport = setSchoolImport;
  /* Seed: a state set in the data starts with its steps in place. */
  if (data.schoolImport && data.schoolImport.state === 'confirmed') setSchoolImport('stem', 'confirmed');

  /* ---------------- round 4: the value a student gets (VALUE.md) ---------------- */

  /* App.unemployment({ noJob? }) : the unemployment count as every screen
     shows it, so Home, Timeline and Your profile never disagree.
       { state: 'ask' | 'every' | 'none', hasJob, used, left, limit, pct, asOf,
         line, metric, counted, ask, everyLine, noneLine }
     state comes from App.state.jobsComplete ('every' | 'none'), else the data.
     noJob: true (the #/home/no-job demo) means no job on file: 'every' is not
     a possible answer, so it reads as 'ask'.
     metric is a cell for C.metrics: the count with "As of Sep 30" once the job
     list is complete, otherwise the one line that asks for it. used, left and
     line are null until then: a number with a missing fact is not shown. */
  function unemployment(opts) {
    const o = opts || {};
    const u = data.unemployment || {};
    const hasJob = !o.noJob && !!(data.job && data.job.employer);
    let state = App.state.jobsComplete || u.state || 'ask';
    if (state === 'every' && !hasJob) state = 'ask';
    if (state === 'none' && hasJob) state = 'every';
    const n = state === 'every' ? u.every : (state === 'none' ? u.none : null);
    const asOf = u.asOf ? 'As of ' + u.asOf : null;
    const base = ((data.home && data.home.metrics) || [])[0] || { eyebrow: 'Unemployment days' };
    const metric = n
      ? { eyebrow: base.eyebrow, value: String(n.used), unit: n.left > 0 ? 'used · ' + n.left + ' left' : 'of ' + u.limit, bar: n.pct, source: 'unemployment', asOf: asOf }
      : { eyebrow: base.eyebrow, add: hasJob ? u.confirm : u.add };
    return {
      state: state, hasJob: hasJob,
      used: n ? n.used : null, left: n ? n.left : null, limit: u.limit, pct: n ? n.pct : null,
      asOf: u.asOf, asOfLong: u.asOfLong,
      line: n ? (n.left > 0 ? n.used + ' of ' + u.limit + ' used, as of ' + u.asOf : n.used + ' days without work, as of ' + u.asOf) : null,
      counted: n ? n.counted : null,
      metric: metric, ask: u.ask, everyLine: u.everyLine, noneLine: u.noneLine,
    };
  }
  App.unemployment = unemployment;
  /* App.setJobs('every' | 'none' | null) : answer (or clear) "Is that every
     job?", then redraw the column in place. */
  App.setJobs = (v) => { App.state.jobsComplete = v || null; emit('answer', 'jobsComplete', v || null, null); render('inplace'); };

  /* App.stemField() : DULY_SAMPLE.stemField with App.state.stemField
     ('found' | 'confirmed') as its state. */
  App.stemField = () => Object.assign({}, data.stemField || {}, App.state.stemField ? { state: App.state.stemField } : {});

  /* App.employer() : the Employer check for the student's own job. */
  App.employer = () => data.employer || null;

  /* App.processingFor(appOrId, { force? }) : USCIS's processing time for an
     application, only while it is filed and not decided (a receipt number,
     and a status that is not Approved, Denied or Not filed yet). force: true
     returns it anyway, for a review link. Null otherwise. */
  App.processingFor = (a, o) => {
    const app = typeof a === 'string' ? App.findApplication(a) : a;
    if (!app || !app.processing) return null;
    const pt = (data.processingTimes || {})[app.processing] || null;
    if (o && o.force) return pt;
    const receipt = App.state['receipt:' + app.id] || app.receipt;
    const status = App.state['status:' + app.id] || app.status || '';
    const open = !!receipt && !/^(approved|denied|not filed)/i.test(status) && !/card mailed/i.test(status);
    return open ? pt : null;
  };

  /* ---------------- round 5: the STEM OPT choice, one source (note 1) ---------------- */

  const isoT = (iso) => Date.parse(String(iso).slice(0, 10) + 'T12:00:00Z');
  const dayCount = (a, b) => Math.round((isoT(b) - isoT(a)) / 86400000);
  const nDays = (n) => n + (n === 1 ? ' day' : ' days');
  const fill = (tpl, v) => String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));

  /* App.stemTimeline({ today? }) : props for C.timeline from DULY_SAMPLE.stem.
     Scaled from today (or from the start of the first span once today is past
     it, so the Today marker travels through the plan) to the last day to
     file. Emphasis and the one line follow where today is: the window
     opening until it opens, then the last day to file. today overrides the
     sample's today, for a review link. */
  function stemTimeline(o) {
    const opt = o || {};
    const st = data.stem || {};
    const tl = st.timeline || {};
    const c = tl.captions || {};
    const today = opt.today || data.today.iso;
    const by = {};
    (st.dates || []).forEach((d) => { by[d.key] = d; });
    const opens = by.opens, closes = by.closes;
    const t = isoT(today);
    let emph = null, caption = null;
    if (opens && t < isoT(opens.iso)) { emph = 'opens'; caption = fill(c.before, { n: nDays(dayCount(today, opens.iso)) }); }
    else if (closes && t < isoT(closes.iso)) { emph = 'closes'; caption = fill(c.open, { n: nDays(dayCount(today, closes.iso)) }); }
    else if (closes && t === isoT(closes.iso)) { emph = 'closes'; caption = c.last; }
    else if (closes) { caption = fill(c.after, { date: closes.date }); }
    const spans = (tl.spans || []).filter((s) => by[s.from] && by[s.to]).map((s) => ({ label: s.label, from: by[s.from].iso, to: by[s.to].iso }));
    const first = spans.length ? spans[0].from : today;
    const end = closes ? closes.iso : today;
    return {
      key: 'stem', label: tl.label, today: today,
      from: isoT(first) < t ? first : today,
      to: isoT(end) > t ? end : today,
      spans: spans,
      marks: (st.dates || []).map((d) => ({ label: d.label, date: d.iso, emphasis: d.key === emph, source: d.source })),
      caption: caption,
    };
  }
  App.stemTimeline = stemTimeline;

  /* App.stemPlan({ today? }) : what Home and Next steps both read.
       intent    App.stemIntent()
       dates     the three key dates [{ key, iso, date, label, source, end? }]
       byKey     the same by key: prepare, opens, closes
       decide    DULY_SAMPLE.stem.decide (title, choices, lines, seeAll)
       timeline  App.stemTimeline() */
  function stemPlan(o) {
    const st = data.stem || {};
    const dates = (st.dates || []).map((d) => Object.assign({}, d));
    const byKey = {};
    dates.forEach((d) => { byKey[d.key] = d; });
    return {
      intent: stemIntent(), today: (o && o.today) || data.today.iso,
      dates: dates, byKey: byKey, decide: st.decide || {}, timeline: stemTimeline(o),
    };
  }
  App.stemPlan = stemPlan;

  /* App.setStemIntent('yes' | 'no' | 'unsure' | null) : the answer, from any
     screen. A light tap, the 'answer' event (Next steps redraws on it), and
     every C.stemDecide block on the page redrawn in place. */
  function setStemIntent(v, el) {
    App.state.stemIntent = v == null ? '' : String(v);
    haptic('tick');
    emit('answer', 'stemIntent', App.state.stemIntent, el || null);
    refreshDecide(el);
  }
  App.setStemIntent = setStemIntent;

  /* Redraw each [data-stem-decide] in place, keep focus inside it. */
  function refreshDecide(from) {
    const hadFocus = from && from.closest && from.closest('[data-stem-decide]');
    document.querySelectorAll('main#main [data-stem-decide]').forEach((box) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = C.stemDecide({ seeAll: box.dataset.seeAll !== 'no' });
      const next = tmp.firstElementChild;
      if (!next) return;
      box.replaceWith(next);
      layoutTimelines(next);
      play(next, 'is-arriving');
      if (hadFocus) {
        const f = next.querySelector('[data-answer="stemIntent"][aria-pressed="true"], [data-answer="stemIntent"], a');
        if (f) f.focus({ preventScroll: true });
      }
    });
  }

  /* ---------------- round 5: track another case (note 2) ---------------- */

  const RECEIPT_RE = /^[A-Z]{3}\d{10}$/;
  App.normalizeReceipt = (v) => String(v || '').toUpperCase().replace(/[\s-]/g, '');
  App.isReceipt = (v) => RECEIPT_RE.test(App.normalizeReceipt(v));
  App.formTypes = () => ((data.applications || {}).formTypes || []).slice();
  App.formType = (key) => App.formTypes().filter((t) => t.key === key)[0] || null;

  /* App.addCase({ receipt, form, other?, title? }) : save a case to track.
     receipt is normalised (upper case, no spaces or dashes) and checked:
     three letters and ten digits, not already on the list. form is a
     formTypes key; 'other' needs `other`, the form in the student's words.
     The case joins DULY_SAMPLE.applications.items as
       { id: 'case-<receipt>', title, form, formType, receipt, status: 'Unknown',
         current: null, asOf: null, added: 'Sep 30', tracked: true, manual: true,
         dates: [{ label: 'Added', date }], next: { title, href }, processing: null }
     and stays Unknown until the student records a status after rechecking.
     Returns { ok: true, item } or { ok: false, errors: { receipt?, form?, other? } }
     with the copy to show under each field. */
  function addCase(o) {
    const opt = o || {};
    const apps = data.applications = data.applications || { items: [] };
    apps.items = apps.items || [];
    const add = apps.add || {};
    const E = add.errors || {};
    const receipt = App.normalizeReceipt(opt.receipt);
    const errors = {};
    if (!receipt) errors.receipt = E.empty || 'Add the receipt number.';
    else if (!RECEIPT_RE.test(receipt)) errors.receipt = E.format || 'Three letters and ten digits.';
    else if (apps.items.some((x) => App.normalizeReceipt(App.state['receipt:' + x.id] || x.receipt) === receipt)) errors.receipt = E.duplicate || 'Already on your list.';
    const type = App.formType(opt.form);
    const other = String(opt.other || '').trim();
    if (!type) errors.form = E.form || 'Choose what the case is for.';
    else if (type.key === 'other' && !other) errors.other = E.other || 'Name the form.';
    if (Object.keys(errors).length) return { ok: false, errors: errors };
    const tr = apps.tracking || {};
    const item = {
      id: 'case-' + receipt.toLowerCase(),
      title: opt.title || (type.key === 'other' ? other : type.label),
      form: type.key === 'other' ? other : type.form,
      formType: type.key,
      receipt: receipt,
      status: add.unknown || 'Unknown',
      current: null,
      asOf: null,
      added: shortToday(),
      manual: true,
      tracked: true,
      dates: [{ label: 'Added', date: data.today.short }],
      next: { title: add.unknownLine || 'Recheck on USCIS to see its status', href: (tr.caseStatus && tr.caseStatus.href) || (tr.recheck && tr.recheck.href) || null },
      processing: null,
      schoolSteps: [],
    };
    apps.items.push(item);
    emit('case', 'add', item.id, null);
    return { ok: true, item: item };
  }
  App.addCase = addCase;
  /* App.removeCase(id) : only a case the student added (tracked: true). */
  App.removeCase = (id) => {
    const apps = data.applications || {};
    const before = (apps.items || []).length;
    apps.items = (apps.items || []).filter((x) => !(x.id === id && x.tracked));
    const gone = apps.items.length !== before;
    if (gone) emit('case', 'remove', id, null);
    return gone;
  };

  /* C.trackCase in place: open, cancel, save, the form type, Enter to save. */
  function redrawTrackCase(el) {
    const box = el && el.closest ? el.closest('.track-case') : document.querySelector('main#main .track-case');
    if (!box) return null;
    const tmp = document.createElement('div');
    tmp.innerHTML = C.trackCase();
    const next = tmp.firstElementChild;
    box.replaceWith(next);
    return next;
  }
  function clearTrackCase() {
    ['open', 'receipt', 'form', 'other', 'error'].forEach((k) => { delete App.state['trackCase:' + k]; });
  }
  function trackCaseAct(btn) {
    const act = btn.dataset.caseAct;
    if (act === 'open') {
      App.state['trackCase:open'] = true;
      const box = redrawTrackCase(btn);
      if (box) { play(box, 'is-arriving'); const i = box.querySelector('input'); if (i) i.focus(); }
      return;
    }
    if (act === 'cancel') {
      clearTrackCase();
      const box = redrawTrackCase(btn);
      const b = box && box.querySelector('[data-case-act="open"]'); if (b) b.focus();
      return;
    }
    if (act === 'save') {
      const res = addCase({ receipt: App.state['trackCase:receipt'], form: App.state['trackCase:form'], other: App.state['trackCase:other'] });
      if (!res.ok) {
        App.state['trackCase:error'] = res.errors;
        const box = redrawTrackCase(btn);
        const k = res.errors.receipt ? 'receipt' : (res.errors.form ? 'form' : 'other');
        const f = box && (k === 'form' ? box.querySelector('[data-choices="trackCase:form"] [role="radio"]') : box.querySelector('[data-field="trackCase:' + k + '"]'));
        if (f) f.focus();
        return;
      }
      clearTrackCase();
      haptic('complete');
      toast(((data.applications || {}).add || {}).saved || 'Case added');
      render('inplace');
      const row = document.querySelector('main#main .item[data-key="' + cssEsc(res.item.id) + '"]');
      if (row) play(row, 'is-arriving');
    }
  }

  /* App.share({ title, text?, url? }) : one tap to the phone's share sheet
     where the browser has one; otherwise a quiet toast (the prototype has no
     real files). Emits 'share'. */
  function share(doc) {
    const d = typeof doc === 'string' ? { title: doc } : (doc || {});
    emit('share', d.title || '', true, null);
    if (navigator.share && isPhone()) {
      navigator.share({ title: d.title, text: d.text || d.title, url: d.url }).catch(() => { /* closed */ });
      return;
    }
    toast('Share ' + (d.title || 'this document') + ' to Mail, Messages or any app');
  }
  App.share = share;

  /* App.calendarFile() : every reminder date as an .ics text (all-day events).
     App.addToCalendar() saves it once; the calendar app takes it from there. */
  function calendarFile() {
    const r = data.reminders || {};
    const stamp = (data.today.iso || '').replace(/-/g, '') + 'T060000Z';
    const next = (iso) => { const t = new Date(iso + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10).replace(/-/g, ''); };
    const ev = (r.dates || []).map((d, i) => [
      'BEGIN:VEVENT',
      'UID:duly-' + d.iso + '-' + i + '@duly.local',
      'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:' + d.iso.replace(/-/g, ''),
      'DTEND;VALUE=DATE:' + next(d.iso),
      'SUMMARY:' + String(d.title).replace(/([,;])/g, '\\$1'),
      'END:VEVENT',
    ].join('\r\n'));
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Duly//Dates//EN', 'CALSCALE:GREGORIAN'].concat(ev, ['END:VCALENDAR']).join('\r\n') + '\r\n';
  }
  App.calendarFile = calendarFile;
  App.addToCalendar = () => {
    const r = data.reminders || {};
    try {
      const url = URL.createObjectURL(new Blob([calendarFile()], { type: 'text/calendar' }));
      const a = document.createElement('a');
      a.href = url; a.download = r.file || 'dates.ics';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { /* blocked download: the toast still says what happened */ }
    App.state['remind:calendar'] = true;
    emit('calendar', 'remind:calendar', true, null);
    toast((r.dates || []).length + ' dates ready for your calendar');
  };

  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- round 5: motion and haptics (note 4) ---------------- */

  /* Light, never loud: one short tap for a tick, a softer double for a
     completion. Phones without the Vibration API (iPhone Safari) and every
     desktop simply do nothing. */
  const HAPTICS = { tick: 10, select: 6, complete: [8, 70, 8] };
  let lastHaptic = 0;
  function haptic(kind) {
    if (reduced() || App.state.haptics === false) return false;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
    const now = Date.now();
    if (kind !== 'complete' && now - lastHaptic < 60) return false;
    lastHaptic = now;
    try { return navigator.vibrate(HAPTICS[kind] || HAPTICS.tick); } catch (e) { return false; }
  }
  App.haptic = haptic;

  /* play(el, cls) : a one-shot motion class, removed when it ends (or after
     1.2s as a guard). Under reduced motion nothing is added; the end state is
     already on screen. */
  function play(el, name) {
    if (!el || reduced()) return;
    el.classList.remove(name);
    void el.offsetWidth;
    el.classList.add(name);
    const done = () => el.classList.remove(name);
    el.addEventListener('animationend', function end(ev) {
      if (ev.target !== el && !el.contains(ev.target)) return;
      if (el.getAnimations && el.getAnimations({ subtree: true }).some((a) => a.playState === 'running')) return;
      el.removeEventListener('animationend', end);
      done();
    });
    setTimeout(done, 1200);
  }
  App.play = play;

  /* App.currentStep(path) : the key of the first open, visible step. */
  App.currentStep = (path) => {
    const open = App.steps(path || 'stem').filter((s) => !s.done && !(s.afterOf && !s.afterOf.done));
    return open[0] ? open[0].key : null;
  };

  /* App.advanceCurrent(list) : in a list that marks a current step, the first
     open visible step becomes current; when that changes, it gets a short
     highlight. Returns the new current item or null. */
  function advanceCurrent(list) {
    if (!list) return null;
    const items = Array.from(list.querySelectorAll(':scope > .task'));
    const was = items.filter((it) => it.classList.contains('is-current'))[0] || null;
    const next = items.filter((it) => !it.hidden && !it.classList.contains('is-done'))[0] || null;
    if (was === next) return next;
    if (was) { was.classList.remove('is-current'); was.removeAttribute('aria-current'); }
    if (next) {
      next.classList.add('is-current');
      next.setAttribute('aria-current', 'step');
      play(next, 'is-arriving');
    }
    emit('current', next ? next.dataset.key : null, true, next);
    return next;
  }
  App.advanceCurrent = advanceCurrent;

  /* ---------------- round 5: timelines (note 3) ---------------- */

  /* A C.timeline stepper fits its column: each label sits centred under
     its point (the first and last at the edges). Where two labels would
     touch, the longer name wraps; where even the dates would touch, the
     steps stack on a vertical line (.is-stacked). The accent line fills
     once per timeline key. */
  const drawn = {};
  let tlObserver = null;
  function layoutTimeline(fig) {
    if (!fig || !fig.isConnected) return;
    const ol = fig.querySelector('.tl-steps');
    if (!ol) return;
    if (tlObserver) tlObserver.observe(ol);
    fig.classList.remove('is-stacked', 'is-tight');
    const items = Array.from(ol.children);
    items.forEach((li) => { li.style.maxWidth = ''; });
    const W = ol.clientWidth;
    if (!W) return;
    const n = items.length;
    if (n > 1) {
      const dot = parseFloat(getComputedStyle(fig).getPropertyValue('--dot')) || 12;
      const D = (W - dot) / (n - 1);
      const A = D - 12;  /* the room between two points, less a 12px gap */
      const width = (li) => Math.max(li.getBoundingClientRect().width, li.firstElementChild ? li.firstElementChild.scrollWidth : 0);
      /* How far each label reaches left and right of its point. */
      const reach = () => items.map((li, i) => {
        const w = width(li);
        if (i === 0) return { l: 0, r: w - dot / 2 };
        if (i === n - 1) return { l: w - dot / 2, r: 0 };
        return { l: w / 2, r: w / 2 };
      });
      const need = reach();
      const cap = need.map((x) => ({ l: x.l, r: x.r }));
      for (let i = 0; i < n - 1; i += 1) {
        const a = need[i].r, b = need[i + 1].l;
        if (a + b <= A) continue;
        if (a <= A / 2) cap[i + 1].l = A - a;
        else if (b <= A / 2) cap[i].r = A - b;
        else { cap[i].r = A / 2; cap[i + 1].l = A / 2; }
      }
      items.forEach((li, i) => {
        const c = i === 0 ? cap[0].r + dot / 2 : (i === n - 1 ? cap[i].l + dot / 2 : 2 * Math.min(cap[i].l, cap[i].r));
        if (c < width(li) - 0.5) li.style.maxWidth = Math.floor(c) + 'px';
      });
      const touches = () => { const got = reach(); return got.some((x, i) => i < n - 1 && x.r + got[i + 1].l > D - 4); };
      if (touches() && fig.querySelector('.tl-y')) fig.classList.add('is-tight');
      if (touches()) {
        fig.classList.remove('is-tight');
        items.forEach((li) => { li.style.maxWidth = ''; });
        fig.classList.add('is-stacked');
      }
    }

    const key = fig.dataset.timeline || '';
    if (!drawn[key]) {
      drawn[key] = true;
      if (!reduced()) fig.classList.add('is-drawing');
    }
  }
  function layoutTimelines(root) {
    const scope = root || document;
    if (scope.matches && scope.matches('[data-timeline]')) layoutTimeline(scope);
    scope.querySelectorAll('[data-timeline]').forEach(layoutTimeline);
  }
  App.layoutTimelines = layoutTimelines;
  if (window.ResizeObserver) {
    tlObserver = new ResizeObserver((entries) => {
      entries.forEach((en) => {
        const fig = en.target.closest('[data-timeline]');
        if (!fig || !fig.isConnected) { tlObserver.unobserve(en.target); return; }
        const w = Math.round(en.contentRect.width);
        if (fig._tlW === w) return;
        fig._tlW = w;
        layoutTimeline(fig);
      });
    });
  } else {
    window.addEventListener('resize', () => layoutTimelines());
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layoutTimelines());
  const isPhone = () => window.matchMedia('(max-width: 640px)').matches;
  const cssEsc = (v) => (window.CSS && CSS.escape ? CSS.escape(v) : String(v).replace(/["\\]/g, '\\$&'));

  /* ---------------- theme ---------------- */
  function readTheme() { try { return localStorage.getItem('duly-theme') || 'system'; } catch (e) { return 'system'; } }
  function applyTheme(t) {
    const root = document.documentElement;
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
    try { localStorage.setItem('duly-theme', t); } catch (e) { /* storage may be blocked */ }
    App.state.theme = t;
  }
  App.setTheme = applyTheme;
  applyTheme(readTheme());

  /* ---------------- router ---------------- */
  const ALIASES = { next: 'steps', checklists: 'steps', applications: 'uscis' };
  App.ALIASES = ALIASES;
  /* An old hash is swapped for its new one in place, keeping history.state. */
  function redirect() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    const parts = h.split('/');
    /* After Delete everything (App.state.deleted) only Welcome and its
       onboarding open; any other route, Back included, lands on Welcome.
       Finishing onboarding again clears the flag (welcome.js). */
    if (App.state.deleted && parts[0] !== 'welcome' && parts[0] !== 'onboarding') {
      try { history.replaceState(history.state, '', '#/welcome'); } catch (e) { location.replace('#/welcome'); }
      return;
    }
    const to = ALIASES[parts[0]];
    if (!to) return;
    parts[0] = to;
    try { history.replaceState(history.state, '', '#/' + parts.join('/')); } catch (e) { location.replace('#/' + parts.join('/')); }
  }
  function parse() {
    redirect();
    const h = (location.hash || '').replace(/^#\/?/, '');
    const parts = h.split('/').filter(Boolean).map(decodeURIComponent);
    return { name: parts[0] || 'home', params: parts.slice(1) };
  }

  /* go(path, { replace?, inPlace? }) : replace swaps the current history
     entry; inPlace keeps the scroll and skips the fade. */
  let pending = null;
  function go(path, opts) {
    const o = opts || {};
    const target = path.charAt(0) === '#' ? path : '#/' + path.replace(/^\//, '');
    if (location.hash === target) { render('inplace'); return; }
    pending = o;
    if (o.replace) location.replace(target); else location.hash = target;
  }

  /* History entries: each gets a key and an index in history.state, so Back
     and Forward find their scroll and open rows, and App.from is the entry
     before this one. */
  const session = Date.now().toString(36);
  let seq = 0;
  let curKey = null;
  let curIdx = 0;
  const entries = {};   /* idx -> { hash, title } */
  const saved = {};     /* key -> snapshot */
  try { history.scrollRestoration = 'manual'; } catch (e) { /* older browsers */ }

  function stamp(replace) {
    const st = history.state;
    if (st && st.dulyKey && !replace) {
      curKey = st.dulyKey;
      curIdx = st.idx || 0;
      return saved[curKey] || null;
    }
    if (!replace && curKey != null) curIdx += 1;
    curKey = session + '-' + (seq += 1);
    try { history.replaceState({ dulyKey: curKey, idx: curIdx }, '', location.href); } catch (e) { /* file:// */ }
    Object.keys(entries).forEach((i) => { if (Number(i) > curIdx) delete entries[i]; });
    return null;
  }

  function onNavigate() {
    const o = pending || {};
    pending = null;
    const root = document.getElementById('main');
    if (curKey && root) saved[curKey] = snapshot(root);
    const prevRoute = App.route;
    const prevParams = App.params;
    const back = stamp(!!o.replace);
    const r = parse();
    const screen = window.SCREENS[r.name];
    const inPlace = screen && (typeof screen.paramsInPlace === 'function' ? screen.paramsInPlace(r.params, prevParams) : screen.paramsInPlace);
    const quiet = o.inPlace || (inPlace && r.name === prevRoute);
    if (quiet) render('inplace');
    else render('page', App.state.deleted ? null : back);
  }

  let frame = null;    /* 'shell' | 'bare' */
  let shellDrawn = false;

  /* render(mode, restore?) : mode is 'launch', 'page' or 'inplace'. */
  function render(mode, restore) {
    const r = parse();
    let screen = window.SCREENS[r.name];
    if (!screen) { history.replaceState(history.state, '', '#/home'); r.name = 'home'; screen = window.SCREENS.home; }
    const old = document.getElementById('main');
    const keep = mode === 'inplace' && old ? snapshot(old) : null;

    App.route = r.name;
    App.params = r.params;
    entries[curIdx] = { hash: location.hash || '#/home', title: titleOf(screen, r) };
    const prev = entries[curIdx - 1];
    App.from = prev && prev.hash !== entries[curIdx].hash ? prev : null;
    closePopover(false);
    closeMenu();

    const main = document.createElement('main');
    main.id = 'main';
    main.className = screen.bare ? 'bare' : 'col';
    main.innerHTML = screen.render(data, r.params);

    const motion = !reduced();
    const want = screen.bare ? 'bare' : 'shell';
    const app = document.getElementById('app');
    if (want !== frame) {
      if (want === 'bare') {
        app.innerHTML = '';
        app.appendChild(main);
        if (motion && mode !== 'launch') main.classList.add('is-fading');
        else if (motion) main.classList.add('is-entering');
      } else {
        const nav = { route: r.name, waiting: waitingIn() };
        app.innerHTML = '<div class="shell">' + C.sidebar(nav) +
          '<div class="main" id="main-wrap">' + C.topbar({ date: phoneDate() }) + '</div></div>' + C.tabbar(nav);
        document.getElementById('main-wrap').appendChild(main);
        /* The rise plays once, the first time the shell appears. */
        if (motion) main.classList.add(shellDrawn ? 'is-fading' : 'is-entering');
        shellDrawn = true;
      }
      frame = want;
    } else if (old) {
      if (mode === 'page' && motion) {
        old.parentNode.insertBefore(main, old);
        leave(old);
        main.classList.add('is-fading');
      } else {
        old.parentNode.replaceChild(main, old);
      }
    }
    updateNav();
    /* Onboarding pages carry the product name once, in the wordmark. */
    document.title = screen.bare ? screen.title : screen.title + ' · Duly';

    if (mode === 'inplace') {
      if (keep) reopen(main, keep, true);
      window.scrollTo(0, keep ? keep.y : window.scrollY);
    } else {
      if (restore) reopen(main, restore, false);
      window.scrollTo(0, restore ? restore.y : 0);
      const h1 = main.querySelector('h1');
      if (h1 && App.booted) h1.focus({ preventScroll: true });
    }
    if (typeof screen.mount === 'function') screen.mount(main, data, r.params);
    layoutTimelines(main);
    if (keep && keep.focus) refocus(main, keep.focus);
  }

  function titleOf(screen, r) {
    if (typeof screen.titleFor === 'function') {
      try { return screen.titleFor(r.params, data) || screen.title; } catch (e) { return screen.title; }
    }
    return screen.title;
  }

  /* The old column fades out where it stood while the new one fades in. */
  function leave(old) {
    const box = old.getBoundingClientRect();
    old.removeAttribute('id');
    old.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    old.setAttribute('aria-hidden', 'true');
    old.inert = true;
    old.classList.remove('is-entering', 'is-fading');
    old.classList.add('is-leaving-page');
    Object.assign(old.style, {
      top: box.top + 'px', left: box.left + 'px', width: box.width + 'px', height: box.height + 'px',
    });
    document.body.appendChild(old);
    setTimeout(() => old.remove(), 180);
  }

  /* What a redraw must keep: scroll, open rows, focus. */
  function snapshot(root) {
    return {
      y: window.scrollY,
      open: Array.from(root.querySelectorAll('.item.is-open[data-key]')).map((el) => el.dataset.key),
      focus: describeFocus(root),
    };
  }
  function reopen(root, snap, still) {
    (snap.open || []).forEach((k) => {
      const item = root.querySelector('.item[data-key="' + cssEsc(k) + '"]');
      if (!item || item.classList.contains('is-open')) return;
      const list = item.parentElement;
      if (list && list.hasAttribute('data-accordion') && list.querySelector(':scope > .item.is-open')) return;
      setOpen(item, true);
      const d = item.querySelector(':scope > .disc');
      if (d) d.style.animation = 'none';
    });
    if (still) root.querySelectorAll('.bar > i').forEach((i) => { i.style.animation = 'none'; });
  }
  const FOCUS_ATTRS = ['data-task', 'data-field', 'data-draft-act', 'data-school-import', 'data-edit', 'data-next', 'data-action', 'data-toggle', 'data-copy'];
  function describeFocus(root) {
    const el = document.activeElement;
    if (!el || el === document.body || !root.contains(el)) return null;
    if (el.id && !/^(c|f|d|sh|disc|email|pop|src|sa|danger)-\d+(-\w+)?$/.test(el.id)) return '#' + cssEsc(el.id);
    if (el.matches('[data-answer]')) return '[data-answer="' + cssEsc(el.dataset.answer) + '"][data-value="' + cssEsc(el.dataset.value || '') + '"]';
    if (el.matches('[role="radio"][data-value]')) {
      const g = el.closest('[data-choices]');
      if (g) return '[data-choices="' + cssEsc(g.dataset.choices) + '"] [data-value="' + cssEsc(el.dataset.value) + '"]';
    }
    for (let i = 0; i < FOCUS_ATTRS.length; i++) {
      const a = FOCUS_ATTRS[i];
      if (el.hasAttribute(a)) {
        const scope = el.closest('[data-key]');
        return (scope ? '[data-key="' + cssEsc(scope.dataset.key) + '"] ' : '') + '[' + a + '="' + cssEsc(el.getAttribute(a)) + '"]';
      }
    }
    if (el.matches('[data-disclosure]')) {
      const item = el.closest('.item[data-key]');
      if (item) return '.item[data-key="' + cssEsc(item.dataset.key) + '"] ' + (el.classList.contains('task-more') ? '.task-more' : '> [data-disclosure]');
    }
    if (el.matches('a[href]')) return 'a[href="' + cssEsc(el.getAttribute('href')) + '"]';
    return null;
  }
  function refocus(root, sel) {
    if (document.activeElement && document.activeElement !== document.body && root.contains(document.activeElement)) return;
    let el = null;
    try { el = root.querySelector(sel); } catch (e) { el = null; }
    if (el && !el.closest('[hidden]')) el.focus({ preventScroll: true });
  }

  /* The nav is never redrawn: the current item and the waiting dots move in place. */
  function updateNav() {
    const waiting = waitingIn();
    document.querySelectorAll('.nav-item').forEach((a) => {
      const name = (a.getAttribute('href') || '').replace(/^#\//, '');
      if (name === App.route) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      const dot = a.querySelector('.wait-dot');
      const on = waiting.indexOf(name) !== -1;
      if (on && !dot) a.insertAdjacentHTML('beforeend', '<span class="wait-dot" role="img" aria-label="Something here is waiting for you"></span>');
      if (!on && dot) dot.remove();
    });
    document.querySelectorAll('.tabbar .tab').forEach((a) => {
      const name = (a.getAttribute('href') || '').replace(/^#\//, '');
      if (name === App.route) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  App.updateNav = updateNav;

  function phoneDate() {
    const t = data.today.long.split(', ');
    return t.length > 1 ? t[1] : t[0];
  }

  /* ---------------- events ---------------- */
  function emit(kind, key, value, el) {
    document.dispatchEvent(new CustomEvent('duly:change', { detail: { kind: kind, key: key, value: value, el: el } }));
    updateNav();
  }

  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onInput);

  function onClick(e) {
    const t = e.target;

    /* source mark */
    const src = t.closest('[data-source]');
    if (src) { e.preventDefault(); e.stopPropagation(); togglePopover(src); return; }
    const pop = t.closest('.pop');
    if (pop) {
      if (t.closest('[data-show-all]')) {
        const q = pop.querySelector('.pop-quote');
        if (q) q.classList.add('is-all');
        t.closest('[data-show-all]').remove();
      }
      return;
    }
    if (openPop && !t.closest('.pop')) closePopover(false);

    /* menu */
    if (t.closest('[data-menu]')) { toggleMenu(); return; }
    if (menuOpen && !t.closest('.menu')) closeMenu();

    /* back link: return through history when it leads to the same place */
    const back = t.closest('[data-back]');
    if (back && !e.metaKey && !e.ctrlKey && App.from && back.getAttribute('href') === App.from.hash) {
      e.preventDefault(); history.back(); return;
    }

    /* round 4: share a document, add dates to a calendar, confirm the STEM
       field, change the job-list answer */
    const sh = t.closest('[data-share]');
    if (sh) { e.preventDefault(); share({ title: sh.dataset.share }); return; }
    if (t.closest('[data-calendar]')) { e.preventDefault(); App.addToCalendar(); return; }
    const sf = t.closest('[data-stem-field]');
    if (sf) {
      App.state.stemField = sf.dataset.stemField === 'confirm' ? 'confirmed' : 'found';
      emit('stem-field', 'stemField', App.state.stemField, sf);
      render('inplace');
      if (App.state.stemField === 'confirmed') toast('Field code confirmed');
      return;
    }
    if (t.closest('[data-jobs="change"]')) { App.setJobs(null); return; }

    /* round 5: track another case */
    const ca = t.closest('[data-case-act]');
    if (ca) { e.preventDefault(); trackCaseAct(ca); return; }

    /* disclosure rows: one open per list. A step with detail opens from its
       chevron button or a tap anywhere on its row that is not a control. */
    const head = t.closest('[data-disclosure]');
    const ctl = t.closest('a, button, input, textarea, select, [contenteditable]');
    if (head && (!ctl || ctl === head)) { toggleDisclosure(head); return; }
    const drow = t.closest('.task.has-detail > .row');
    if (drow && !ctl) {
      const h = drow.querySelector('[data-disclosure]');
      if (h) { toggleDisclosure(h); return; }
    }

    /* checkbox tasks */
    const check = t.closest('[role="checkbox"][data-task]');
    if (check) { setTask(check, check.getAttribute('aria-checked') !== 'true'); return; }

    /* the email draft */
    const dact = t.closest('[data-draft-act]');
    if (dact) { draftAction(dact); return; }

    /* your school's steps, from its page */
    const si = t.closest('[data-school-import]');
    if (si) { schoolImportAct(si); return; }

    /* radios: choice cards and chips */
    const radio = t.closest('[role="radiogroup"] [role="radio"]');
    if (radio) { selectRadio(radio); return; }

    /* switches */
    const sw = t.closest('[role="switch"]');
    if (sw) {
      const on = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', on ? 'true' : 'false');
      App.state[sw.dataset.toggle] = on;
      emit('toggle', sw.dataset.toggle, on, sw);
      return;
    }

    /* inline asks and "I'm not sure" */
    const ans = t.closest('[data-answer]');
    if (ans) { answer(ans); return; }

    /* destructive confirm */
    const conf = t.closest('[data-confirm]');
    if (conf) {
      const box = document.getElementById(conf.dataset.confirm);
      conf.hidden = true; box.hidden = false;
      const first = box.querySelector('button'); if (first) first.focus();
      return;
    }
    const keep = t.closest('[data-keep]');
    if (keep) {
      const box = document.getElementById(keep.dataset.keep);
      box.hidden = true;
      const trigger = document.querySelector('[data-confirm="' + keep.dataset.keep + '"]');
      if (trigger) { trigger.hidden = false; trigger.focus(); }
      return;
    }
    const confirmed = t.closest('[data-confirmed]');
    if (confirmed) { emit('confirm', confirmed.dataset.confirmed, true, confirmed); return; }

    /* copy email (the older always-open panel, C.email) */
    const copy = t.closest('[data-copy]');
    if (copy) { copyEmail(copy); return; }

    /* edit in place */
    const edit = t.closest('[data-edit]');
    if (edit) { startEdit(edit); return; }
    const save = t.closest('[data-edit-save]');
    if (save) { finishEdit(save.closest('.vrow'), true); return; }
    const cancel = t.closest('[data-edit-cancel]');
    if (cancel) { finishEdit(cancel.closest('.vrow'), false); return; }

    /* focus a field (date "Change") */
    const f = t.closest('[data-focus]');
    if (f) { const el = document.getElementById(f.dataset.focus); if (el) el.focus(); return; }

    /* onboarding step list */
    const step = t.closest('[data-step]');
    if (step) { emit('step', 'step', Number(step.dataset.step), step); return; }

    /* generic toast trigger */
    const tt = t.closest('[data-toast]');
    if (tt) { toast(tt.dataset.toast); }
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      if (openPop) { closePopover(true); return; }
      if (menuOpen) { closeMenu(); const m = document.querySelector('[data-menu]'); if (m) m.focus(); return; }
      const editing = document.querySelector('.vrow.is-editing');
      if (editing) { finishEdit(editing, false); return; }
    }
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t.matches && t.matches('[data-disclosure]') && t.tagName !== 'BUTTON') {
      e.preventDefault(); toggleDisclosure(t); return;
    }
    if (e.key === 'Enter' && t.closest && t.closest('.vrow.is-editing') && t.matches('input')) {
      e.preventDefault(); finishEdit(t.closest('.vrow'), true); return;
    }
    if (e.key === 'Enter' && t.matches && t.matches('[data-field^="trackCase:"]')) {
      const save = t.closest('.track-case') && t.closest('.track-case').querySelector('[data-case-act="save"]');
      if (save) { e.preventDefault(); trackCaseAct(save); return; }
    }
    if (e.key === 'Enter' && t.matches && t.matches('[data-school-import-url]')) {
      e.preventDefault(); schoolImportAct(t.closest('.school-import').querySelector('[data-school-import="fetch"]')); return;
    }
    /* arrow keys inside a radiogroup */
    if (/^Arrow(Up|Down|Left|Right)$/.test(e.key) && t.matches && t.matches('[role="radio"]')) {
      const group = t.closest('[role="radiogroup"]');
      const items = Array.from(group.querySelectorAll('[role="radio"]'));
      const i = items.indexOf(t);
      const d = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
      const next = items[(i + d + items.length) % items.length];
      e.preventDefault(); next.focus(); selectRadio(next);
      return;
    }
    /* Cmd or Ctrl + O adds a document from anywhere */
    if ((e.metaKey || e.ctrlKey) && (e.key === 'o' || e.key === 'O')) {
      e.preventDefault(); addDocument();
    }
  }

  function onInput(e) {
    const el = e.target;
    if (e.type === 'change' && el.matches && el.matches('[data-school-import-pdf]')) {
      const f = el.files && el.files[0];
      if (f) schoolImportFound(el.closest('.school-import'), { label: f.name, href: null });
      return;
    }
    const body = el.closest && el.closest('.draft .email-body');
    if (body) { App.state['draftHtml:' + body.closest('[data-draft]').dataset.draft] = body.innerHTML; return; }
    if (!el.dataset || !el.dataset.field) return;
    if (el.dataset.auto) el.dataset.auto = '';
    App.state[el.dataset.field] = el.value;
    emit('field', el.dataset.field, el.value, el);
  }

  /* ---------------- disclosure ---------------- */
  function toggleDisclosure(head) {
    const item = head.closest('.item');
    const open = head.getAttribute('aria-expanded') !== 'true';
    const listEl = item.parentElement;
    if (open && listEl && listEl.hasAttribute('data-accordion')) {
      Array.from(listEl.children).forEach((sib) => { if (sib !== item) setOpen(sib, false); });
    }
    setOpen(item, open);
    /* The drop plays only here, when the student opens the row. */
    const disc = item.querySelector(':scope > .disc');
    if (open && disc && !reduced()) {
      disc.classList.remove('is-dropping');
      void disc.offsetWidth;
      disc.classList.add('is-dropping');
      disc.addEventListener('animationend', () => disc.classList.remove('is-dropping'), { once: true });
    }
  }
  function setOpen(item, open) {
    const head = item.querySelector(':scope > [data-disclosure], :scope > .row > .row-trail > [data-disclosure]');
    const disc = item.querySelector(':scope > .disc');
    if (!head || !disc) return;
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    item.classList.toggle('is-open', open);
    disc.hidden = !open;
  }
  App.setOpen = setOpen;

  /* ---------------- tasks ---------------- */
  let completedNow = false;
  function setTask(check, on) {
    check.setAttribute('aria-checked', on ? 'true' : 'false');
    const item = check.closest('.task');
    const key = check.dataset.task;
    const list = item && item.parentElement;
    const tracksCurrent = !!(list && (list.hasAttribute('data-current') || list.querySelector(':scope > .task.is-current')));
    if (on) { play(check, 'is-ticking'); if (item) play(item, 'is-settling'); }
    if (item) {
      item.classList.toggle('is-done', on);
      const meta = item.querySelector('.row-meta');
      if (meta) {
        const doneMeta = meta.dataset.doneMeta || ('Done ' + shortToday());
        meta.textContent = on ? doneMeta : meta.dataset.meta;
        meta.hidden = !meta.textContent;
      }
      const onDone = item.querySelector('[data-on-done]');
      if (onDone) onDone.hidden = !on;
    }
    App.state['task:' + key] = on;
    if (key.indexOf('school:') === 0) {
      const s = findSchoolStep(key.slice(7));
      if (s) s.done = on;
    }
    /* Other copies of the same task on the page, and the steps that wait on it. */
    document.querySelectorAll('[role="checkbox"][data-task="' + cssEsc(key) + '"]').forEach((c) => {
      if (c === check) return;
      c.setAttribute('aria-checked', on ? 'true' : 'false');
      const it = c.closest('.task'); if (it) it.classList.toggle('is-done', on);
    });
    document.querySelectorAll('[data-waits="' + cssEsc(key) + '"]').forEach((el) => { el.hidden = on; });
    document.querySelectorAll('[data-after="' + cssEsc(key) + '"]').forEach((el) => { el.hidden = !on; });
    completedNow = false;
    updateProgress(check.closest('main'));
    if (on && !completedNow) haptic('tick');
    emit('task', key, on, check);
    if (tracksCurrent) { list.setAttribute('data-current', ''); advanceCurrent(list); }
  }
  App.setTask = (key, on) => {
    const c = document.querySelector('[role="checkbox"][data-task="' + cssEsc(key) + '"]');
    if (c) setTask(c, on);
    else { App.state['task:' + key] = on; emit('task', key, on, null); }
  };
  function shortToday() { return data.today.short.replace(/, \d{4}$/, ''); }
  function updateProgress(root) {
    if (!root) return;
    const prog = root.querySelector('[data-progress]');
    if (!prog) return;
    const checks = Array.from(root.querySelectorAll('[role="checkbox"][data-task]')).filter((c) => !c.closest('[hidden]'));
    const done = checks.filter((c) => c.getAttribute('aria-checked') === 'true').length;
    const pct = checks.length ? Math.round((done / checks.length) * 100) : 0;
    const fill = prog.querySelector('.bar > i');
    if (fill) fill.style.width = pct + '%';
    const bar = prog.querySelector('.bar');
    if (bar) bar.setAttribute('aria-valuenow', pct);
    const label = prog.querySelector('[data-progress-label]');
    if (label) {
      const suffix = label.dataset.suffix || '';
      label.textContent = done + ' of ' + checks.length + ' done' + (suffix ? ' · ' + suffix : '');
    }
    if (checks.length && done === checks.length) {
      const key = 'tasks:' + checks.map((c) => c.dataset.task).sort().join(',');
      complete(key, prog);
    }
  }
  App.updateProgress = updateProgress;

  /* ---------------- radios ---------------- */
  function selectRadio(radio) {
    const group = radio.closest('[role="radiogroup"]');
    group.querySelectorAll('[role="radio"]').forEach((r) => {
      const on = r === radio;
      r.setAttribute('aria-checked', on ? 'true' : 'false');
      r.tabIndex = on ? 0 : -1;
    });
    const key = group.dataset.choices;
    App.state[key] = radio.dataset.value;
    haptic('select');
    if (key === 'theme') applyTheme(radio.dataset.value);
    if (key === 'trackCase:form') {
      const box = group.closest('.track-case');
      const other = box && box.querySelector('.tc-other');
      if (other) {
        const show = radio.dataset.value === 'other';
        other.hidden = !show;
        if (show) { play(other, 'is-arriving'); const i = other.querySelector('input'); if (i) i.focus({ preventScroll: true }); }
      }
    }
    emit('choice', key, radio.dataset.value, radio);
  }

  /* ---------------- inline asks ---------------- */
  function answer(btn) {
    const key = btn.dataset.answer;
    const value = btn.dataset.value;
    /* The STEM OPT choice is answered in place wherever it is asked. */
    if (key === 'stemIntent' && btn.closest('[data-stem-decide]')) { setStemIntent(value, btn); return; }
    if (key === 'stemIntent') haptic('tick');
    App.state[key] = value;
    const item = btn.closest('.ask');
    if (item) {
      if (value === 'unsure') {
        const n = item.querySelector('[data-ask-note]');
        if (n) n.hidden = false;
      } else if (!reduced()) {
        item.classList.add('is-leaving');
        setTimeout(() => item.remove(), 280);
      } else {
        item.remove();
      }
    }
    emit('answer', key, value, btn);
    /* The job-list answer starts the count: every number on the page changes,
       so the column redraws in place once the ask has faded. */
    if (key === 'jobsComplete' && value !== 'unsure') setTimeout(() => render('inplace'), reduced() ? 0 : 300);
  }

  /* ---------------- the email draft (C.emailDraft) ---------------- */
  function setDraft(box, state) {
    const key = box.dataset.draft;
    App.state['draft:' + key] = state;
    document.querySelectorAll('[data-draft="' + cssEsc(key) + '"]').forEach((b) => { b.dataset.state = state; });
    const part = box.querySelector('[data-part="' + state + '"]');
    const target = part && (state === 'open' ? part.querySelector('.email-body') : part.querySelector('button'));
    if (target) target.focus({ preventScroll: true });
    if (state === 'open' && part && part.scrollIntoView && !reduced()) part.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    emit('draft', key, state, box);
  }
  function draftText(box) {
    const subject = (box.querySelector('[data-subject]') || {}).textContent || '';
    const body = box.querySelector('.email-body');
    return { subject: subject, body: body ? body.innerText.trim() : '' };
  }
  function draftAction(btn) {
    const box = btn.closest('[data-draft]');
    if (!box) return;
    const act = btn.dataset.draftAct;
    if (act === 'open') { setDraft(box, 'open'); return; }
    if (act === 'close') { setDraft(box, App.state['draftLeft:' + box.dataset.draft] ? 'left' : 'closed'); return; }
    if (act === 'copy' || act === 'mail') {
      const m = draftText(box);
      App.state['draftLeft:' + box.dataset.draft] = true;
      if (act === 'copy') {
        const text = (m.subject ? 'Subject: ' + m.subject + '\n\n' : '') + m.body;
        const done = () => toast('Email copied');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done); else done();
        setDraft(box, 'left');
      } else {
        setDraft(box, 'left');
        window.location.href = 'mailto:?subject=' + encodeURIComponent(m.subject) + '&body=' + encodeURIComponent(m.body);
      }
      return;
    }
    if (act === 'done') {
      const step = box.dataset.draftStep;
      setDraft(box, 'done');
      if (step && !isDone(step)) App.setTask(step, true);
      toast('Marked done');
    }
  }

  /* ---------------- your school's steps, from its page (C.schoolImport) ---------------- */
  function schoolImportFound(wrap, src) {
    if (!wrap) return;
    const path = wrap.dataset.schoolImportWrap || 'stem';
    setSchoolImport(path, 'found', src);
    emit('school-import', path, 'found', wrap);
    render('inplace');
    const btn = document.querySelector('[data-school-import="confirm"]');
    if (btn) btn.focus({ preventScroll: true });
  }
  function schoolImportAct(btn) {
    if (!btn) return;
    const wrap = btn.closest('.school-import');
    const path = (wrap && wrap.dataset.schoolImportWrap) || 'stem';
    const act = btn.dataset.schoolImport;
    if (act === 'fetch') {
      const input = wrap.querySelector('[data-school-import-url]');
      const v = input ? input.value.trim() : '';
      if (!v) { if (input) input.focus(); toast('Paste the link first'); return; }
      const href = /^https?:/.test(v) ? v : 'https://' + v;
      const d = data.schoolImport || {};
      schoolImportFound(wrap, { href: href, label: d.label || href.replace(/^https?:\/\//, '').split('/')[0] });
      return;
    }
    if (act === 'confirm') {
      const n = schoolImportOf(path).steps.length;
      setSchoolImport(path, 'confirmed');
      emit('school-import', path, 'confirmed', btn);
      render('inplace');
      toast(n + ' steps added');
      return;
    }
    if (act === 'dismiss' || act === 'reset') {
      setSchoolImport(path, 'empty', null);
      emit('school-import', path, 'empty', btn);
      render('inplace');
      const input = document.querySelector('[data-school-import-url]');
      if (input) input.focus({ preventScroll: true });
    }
  }

  /* ---------------- edit in place ---------------- */
  function startEdit(btn) {
    const row = btn.closest('.vrow');
    if (!row || row.classList.contains('is-editing')) return;
    const current = document.querySelector('.vrow.is-editing');
    if (current) finishEdit(current, false);
    row.classList.add('is-editing');
    const label = row.querySelector('.v-label').textContent;
    const box = document.createElement('div');
    box.className = 'v-edit';
    /* The one placement rule: Cancel on the left, Save on the right. */
    box.innerHTML = '<input class="input" type="text" aria-label="' + C.esc(label) + '" value="' + C.esc(btn.textContent) + '">' +
      '<button type="button" class="btn btn-text is-quiet" data-edit-cancel>Cancel</button>' +
      '<button type="button" class="btn btn-pill" data-edit-save>Save</button>';
    btn.hidden = true;
    row.querySelector('.row').appendChild(box);
    row.querySelector('.row').style.flexWrap = 'wrap';
    const input = box.querySelector('input');
    input.focus(); input.select();
  }
  function finishEdit(row, keep) {
    if (!row) return;
    const btn = row.querySelector('[data-edit]');
    const box = row.querySelector('.v-edit');
    if (keep && box) {
      const v = box.querySelector('input').value.trim();
      if (v) {
        btn.textContent = v;
        App.state['edit:' + btn.dataset.edit] = v;
        emit('edit', btn.dataset.edit, v, btn);
        toast('Saved');
      }
    }
    if (box) box.remove();
    row.querySelector('.row').style.flexWrap = '';
    row.classList.remove('is-editing');
    btn.hidden = false;
    btn.focus();
  }

  /* ---------------- popover ---------------- */
  let openPop = null;
  function togglePopover(mark) {
    if (openPop && openPop.mark === mark) { closePopover(true); return; }
    closePopover(false);
    const rule = C.getRule(mark.dataset.source);
    if (!rule) return;
    const id = C.uid('pop');
    const wrap = document.createElement('div');
    const sheet = isPhone();
    wrap.innerHTML = (sheet ? '<div class="scrim" data-scrim></div>' : '') + C.popover(rule, id);
    const nodes = Array.from(wrap.children);
    nodes.forEach((n) => document.body.appendChild(n));
    const pop = document.getElementById(id);
    if (sheet) {
      pop.classList.add('is-sheet');
      pop.setAttribute('aria-modal', 'true');
    } else {
      place(pop, mark);
    }
    mark.setAttribute('aria-expanded', 'true');
    mark.setAttribute('aria-controls', id);
    openPop = { mark: mark, nodes: nodes, pop: pop };
    pop.focus({ preventScroll: true });
    pop.addEventListener('keydown', trapFocus);
  }
  function place(pop, mark) {
    const r = mark.getBoundingClientRect();
    const w = pop.offsetWidth;
    let left = r.right - w + window.scrollX;
    const min = 16 + window.scrollX;
    const max = window.innerWidth - w - 16 + window.scrollX;
    left = Math.max(min, Math.min(left, max));
    let top = r.bottom + 8 + window.scrollY;
    const h = pop.offsetHeight;
    if (r.bottom + 8 + h > window.innerHeight - 16 && r.top - 8 - h > 16) top = r.top - 8 - h + window.scrollY;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }
  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const f = Array.from(this.querySelectorAll('a[href], button:not([disabled])'));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === this)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function closePopover(returnFocus) {
    if (!openPop) return;
    openPop.nodes.forEach((n) => n.remove());
    openPop.mark.setAttribute('aria-expanded', 'false');
    openPop.mark.removeAttribute('aria-controls');
    if (returnFocus && document.contains(openPop.mark)) openPop.mark.focus();
    openPop = null;
  }
  window.addEventListener('resize', () => { if (openPop) closePopover(false); });

  /* ---------------- menu (tablet and phone) ---------------- */
  let menuOpen = false;
  function toggleMenu() { if (menuOpen) closeMenu(); else openMenu(); }
  function openMenu() {
    const holder = document.createElement('div');
    holder.innerHTML = C.menuSheet({ route: App.route, waiting: waitingIn() });
    document.body.appendChild(holder.firstChild);
    const b = document.querySelector('[data-menu]');
    if (b) { b.setAttribute('aria-expanded', 'true'); b.textContent = 'Close'; }
    menuOpen = true;
    const first = document.querySelector('.menu a');
    if (first) first.focus();
  }
  function closeMenu() {
    const m = document.getElementById('menu');
    if (m) m.remove();
    const b = document.querySelector('[data-menu]');
    if (b) { b.setAttribute('aria-expanded', 'false'); b.textContent = 'Menu'; }
    menuOpen = false;
  }

  /* ---------------- copy email (C.email) ---------------- */
  function copyEmail(btn) {
    const body = document.getElementById(btn.dataset.copy);
    /* Copy may sit in the panel's header or under it (email({ copyBelow: true })). */
    const panel = (body && body.closest('.email')) || btn.closest('.email');
    const subject = panel ? (panel.querySelector('[data-subject]') || {}).textContent || '' : '';
    const text = (subject ? 'Subject: ' + subject + '\n\n' : '') + (body ? body.innerText.trim() : '');
    const done = () => toast('Email copied');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      done();
    }
  }

  /* ---------------- toast ---------------- */
  let toastTimer = null;
  function toast(message, opts) {
    const o = opts || {};
    const old = document.querySelector('.toast');
    if (old) old.remove();
    clearTimeout(toastTimer);
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<span>' + C.esc(message) + '</span>' + (o.action ? '<button type="button">' + C.esc(o.action) + '</button>' : '');
    document.body.appendChild(el);
    if (o.action) {
      el.querySelector('button').addEventListener('click', () => { el.remove(); if (o.onAction) o.onAction(); });
    }
    toastTimer = setTimeout(() => el.remove(), o.action ? 6000 : 3000);
  }

  /* ---------------- completions and confetti ---------------- */

  /* complete(key, anchor?) : records that something was completed. Returns true
     and fires confetti from anchor only the first time; a key already in
     DULY_SAMPLE.completions (things done before, a finished checklist
     reopened) never fires. */
  function complete(key, anchor) {
    data.completions = data.completions || [];
    if (!key || data.completions.indexOf(key) !== -1) return false;
    data.completions.push(key);
    completedNow = true;
    haptic('complete');
    if (anchor) { play(anchor, 'is-complete'); burst(anchor); }
    return true;
  }

  /* confetti(anchor, key?) : kept for existing callers. Without a key, the key
     is route:param:row, e.g. 'checklists:cpt' or 'timeline:cpt', so opening
     something already done never fires. Pass a key for anything new. */
  function confetti(anchor, key) {
    let k = key;
    if (!k) {
      const row = anchor && anchor.closest && anchor.closest('[data-key]');
      k = [App.route, App.params && App.params[0], row && row.dataset.key].filter(Boolean).join(':');
    }
    return complete(k, anchor);
  }

  /* Soft arcs in the canvas colours, about 1.2 to 1.6 seconds. */
  function burst(anchor) {
    if (reduced() || !anchor || !anchor.getBoundingClientRect || !Element.prototype.animate) return;
    const r = anchor.getBoundingClientRect();
    const cs = getComputedStyle(document.documentElement);
    const colors = ['--accent', '--accent-soft', '--accent-muted', '--tint-border', '--caution']
      .map((v) => cs.getPropertyValue(v).trim()).filter(Boolean);
    /* On a phone the burst starts from the middle of the screen; on a wider
       window from the start of the anchor. The fan is then narrowed to the
       room on either side, so no arc leaves the window. */
    const ox = isPhone() ? innerWidth / 2
      : Math.min(Math.max(r.left + Math.min(r.width, 240) / 2, 120), innerWidth - 120);
    const oy = r.top + Math.min(r.height, 24) / 2;
    const room = Math.min(ox, innerWidth - ox) - 24;
    const spread = Math.max(0.3, Math.min(1, room / 240));
    const n = 18;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      p.className = 'confetti' + (i % 3 === 0 ? ' is-strip' : '');
      p.style.left = ox + 'px';
      p.style.top = oy + 'px';
      p.style.background = colors[i % colors.length];
      document.body.appendChild(p);
      const a = -Math.PI / 2 + ((i / (n - 1)) - 0.5) * Math.PI * 0.8 + (Math.random() - 0.5) * 0.2;
      const v = 150 + Math.random() * 90;
      const vx = Math.cos(a) * v * spread;
      const vy = Math.sin(a) * v;
      const g = 360 + Math.random() * 80;
      const spin = (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 220);
      const frames = [];
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        const x = vx * t + Math.sin(t * Math.PI * 2 + i) * 6;
        const y = vy * t + g * t * t * 0.5;
        frames.push({
          transform: 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + (i * 23 + spin * t).toFixed(0) + 'deg)',
          opacity: t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3),
          offset: t,
        });
      }
      p.animate(frames, { duration: 1200 + Math.random() * 400, easing: 'cubic-bezier(.25,.6,.35,1)' }).onfinish = () => p.remove();
    }
  }

  /* ---------------- documents from anywhere ---------------- */
  function addDocument(file) {
    App.state.pendingDocument = file ? file.name : null;
    emit('document', 'add', file ? file.name : null, null);
    if (App.route !== 'documents') go('#/documents/add'); else render('inplace');
  }
  App.addDocument = addDocument;
  window.addEventListener('dragover', (e) => { e.preventDefault(); });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    /* A school PDF dropped on the school box gives steps, not a document. */
    const zone = e.target && e.target.closest && e.target.closest('[data-school-import-zone]');
    if (zone && f) { schoolImportFound(zone.closest('.school-import'), { label: f.name, href: null }); return; }
    addDocument(f || null);
  });

  /* ---------------- built-in screens ---------------- */

  /* #/employer : Employer check (VALUE.md section 3). Two public facts about
     the student's own employer, each with its source and date, never a
     verdict. Reached from the STEM OPT step "Check that Northwind Systems
     uses E-Verify" and from Your profile's Job section (C.employerRow).
     The H-1B years open as a plain list. */
  const BUILTIN = {
    employer: {
      title: 'Employer check',
      render(d) {
        const emp = d.employer;
        const back = { label: 'Your profile', href: '#/case' };
        if (!emp) {
          return C.pageHeader({ title: 'Employer check', back: back }) +
            C.empty({ text: 'Add your job to see this.', action: C.button({ label: 'Add your job', href: '#/case/jobs' }) });
        }
        return C.pageHeader({
          eyebrow: emp.title, title: emp.name, info: emp.info, back: back,
          subline: emp.role + ', since ' + emp.since,
        }) +
          C.employerCheck(emp, { next: true }) +
          (emp.offer ? '<p class="employer-offer">' + C.unknown(emp.offer) + '</p>' : '') +
          C.footer(emp.footer);
      },
    },
  };
  App.BUILTIN = BUILTIN;

  /* ---------------- boot ---------------- */
  window.addEventListener('hashchange', onNavigate);
  window.addEventListener('DOMContentLoaded', () => {
    Object.keys(BUILTIN).forEach((k) => { if (!window.SCREENS[k]) window.SCREENS[k] = BUILTIN[k]; });
    if (!location.hash) history.replaceState(null, '', '#/home');
    stamp(true);
    render('launch');
    App.booted = true;
  });
})();
