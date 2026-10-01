/* Plan (#/plan): what comes next and by when, the student's USCIS cases, and
   her work (BLUEPRINT 3.1: Next steps on the time strip, reports owed,
   Status, WorkBook). One page title, then three views as chips that wrap
   (nothing scrolls sideways):

     #/plan                Next steps. The STEM OPT page from screens/steps.js,
                           drawn as a view: the intent, the real timeline, the
                           steps with their ticks, school steps, Reports you
                           owe, cap-gap. Its review links work here too
                           (#/plan/rec-2026-12-01, #/plan/reports-sample, ...).
                           The STEM OPT filing loop lives here (BLUEPRINT 2.6 C):
                           "Yes" opens it, planned, not a strip that stops.
                           Under the steps: every other open loop ("Also open").
     #/plan/status         USCIS status, from screens/uscis.js: each case with
                           its receipt, last checked and next check.
     #/plan/status/<id>    one case (a drilled page with its back link).
     #/plan/workbook       WorkBook: the jobs on the record, where a change at
                           work opens its loop, and what WorkBook will hold.

   Old routes redirect here, keeping their params: #/steps, #/next and
   #/checklists to #/plan; #/uscis and #/applications to #/plan/status.

   The STEM OPT loop and the page agree (every date from app/record.js through
   App.loops; nothing is worked out here):
     loop saves "I-983 signed"     the step "Fill out your training plan" ticks
     loop saves the recommendation the step "Get your new I-20" ticks, and the
                                   timeline's last day moves (2026-12-01 + 60
                                   = 2027-01-30, python3)
     loop saves the receipt        "File Form I-765" ticks, and the STEM OPT
                                   case in USCIS status gets the receipt,
                                   Received, as of that day
     loop saves the new card       the case reads Approved
     ticking the training plan     takes the loop's "I-983 signed" exit
     a receipt added in USCIS      takes the loop's "filed" exit when the loop
     status                        is at its filing step
     the loop closes "not applying" the intent reads "Not applying this time"
   Undo in the loop undoes what it set here; a tick the student made herself
   is never taken back. */
(function () {
  'use strict';

  const STYLE = '<style>' +
    '.screen-plan .plan-head { margin-bottom: var(--s-16); }' +
    /* Three equal chips on one line at phone width; never a sideways scroll. */
    '.screen-plan .plan-views { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); max-width: 420px; margin-bottom: var(--s-32); }' +
    '.screen-plan .plan-views .chip { justify-content: center; min-width: 0; padding: 0 var(--s-8); text-decoration: none; white-space: nowrap; }' +
    '.screen-plan .wb-actions { margin-top: var(--s-16); }' +
    '.screen-plan .wb-loops { margin-top: var(--s-24); }' +
    '.screen-plan .wb-soon .row-title { color: var(--ink-2); }' +
    '</style>';

  const e = (s) => C.esc(s);
  const VIEWS = [
    { key: 'steps', label: 'Next steps', href: '#/plan' },
    { key: 'status', label: 'USCIS status', href: '#/plan/status' },
    { key: 'workbook', label: 'WorkBook', href: '#/plan/workbook' },
  ];
  const INFO = 'What comes next and by when, your cases with USCIS, and your work. Every date is worked out from your record.';

  /* Old routes. The router swaps the first part and keeps the rest:
     #/uscis/opt becomes #/plan/status/opt. */
  Object.assign(App.ALIASES, { steps: 'plan', next: 'plan', checklists: 'plan', uscis: 'plan/status', applications: 'plan/status' });

  /* Which view a hash asks for. A bare case id (#/plan/opt) is a case. */
  function route(params) {
    const p = (params || []).slice();
    if (p[0] === 'status') return { view: 'status', id: p[1] && App.findApplication(p[1]) ? p[1] : null, params: [] };
    if (p[0] === 'workbook') return { view: 'workbook', id: null, params: [] };
    if (p[0] && App.findApplication && App.findApplication(p[0])) return { view: 'status', id: p[0], params: [] };
    return { view: 'steps', id: null, params: p };
  }
  const placeOf = (params) => { const r = route(params); return r.view + ':' + (r.id || ''); };

  /* ---------------- the loops this page holds ---------------- */

  const L = () => App.loops;
  const isOpen = (lp) => lp && lp.state !== 'closed' && lp.state !== 'dismissed';
  const closedToday = (lp) => lp && lp.state === 'closed' && lp.closedOn === L().now();
  const ofKind = (kind) => (L() ? L().list({ all: true }).filter((lp) => lp.kind === kind) : []);
  const openOf = (kind) => ofKind(kind).filter(isOpen)[0] || null;
  const latest = (list) => list[list.length - 1] || null;

  /* The STEM OPT filing loop to show on Next steps: the open one; else, with
     a yes, the approved one or a new one (a yes given on Today, or saved
     before this page loaded); else one closed today, so its receipt stays in
     view until she leaves. */
  function stemLoop() {
    if (!L()) return null;
    const open = openOf('stem-filing');
    if (open) return open;
    const all = ofKind('stem-filing');
    if (App.stemIntent() === 'yes') {
      const approved = latest(all.filter((lp) => lp.state === 'closed' && lp.outcome === 'approved'));
      if (approved) return approved;
      return startStem();
    }
    return latest(all.filter(closedToday));
  }
  function startStem() {
    const lp = openOf('stem-filing') || L().start('stem-filing', {});
    if (lp && App.state['loopOpen:' + lp.id] == null) App.state['loopOpen:' + lp.id] = true;
    if (lp) syncStem(lp);
    return lp;
  }

  /* What the loop saved, mirrored on the page's own state. */
  const TICKS = { i983Signed: 'i983', recommended: 'i20', filed: 'i765' };
  function syncTicks(lp) {
    Object.keys(TICKS).forEach((save) => {
      const task = TICKS[save];
      const flag = 'plan:tickFromLoop:' + task;
      if (lp.saved && lp.saved[save]) {
        if (!App.state['task:' + task]) { App.state['task:' + task] = true; App.state[flag] = true; }
      } else if (App.state[flag]) {
        App.state['task:' + task] = false;
        delete App.state[flag];
      }
    });
  }

  /* The STEM OPT case in USCIS status follows the loop's receipt and card.
     The case as it was is kept, so Undo in the loop puts it back. */
  const CASE_STAGES = [
    { save: 'filed', status: 'Received', step: 'Received', onlyIfNoReceipt: true },
    { save: 'newCard', status: 'Approved', step: 'Decision' },
  ];
  function syncCase(lp) {
    const a = App.findApplication ? App.findApplication('stem') : null;
    if (!a) return;
    const r = App.record();
    const on = App.dates.fmt(L().now(), { year: true });
    CASE_STAGES.forEach((st) => {
      const key = 'plan:caseBefore:' + st.save;
      if (lp.saved && lp.saved[st.save]) {
        if (App.state[key]) return;
        if (st.onlyIfNoReceipt && (a.receipt || !(r.stem || {}).receipt)) return;
        App.state[key] = JSON.stringify({ receipt: a.receipt, status: a.status, current: a.current, statusOn: a.statusOn || null, asOf: a.asOf, dates: a.dates || [] });
        /* Filed: the planning dates give way to the day it was filed. */
        if (st.save === 'filed') { a.receipt = r.stem.receipt; a.dates = [{ label: 'Filed', date: on }]; }
        a.status = st.status;
        a.current = App.data.applications.steps.indexOf(st.step);
        a.statusOn = on;
        a.asOf = on;
      } else if (App.state[key]) {
        Object.assign(a, JSON.parse(App.state[key]));
        delete App.state[key];
      }
    });
  }
  function syncStem(lp) {
    syncTicks(lp);
    syncCase(lp);
    /* "Not applying for STEM OPT this time" in the loop is the same answer
       as No: every screen that asks reads it. */
    if (lp.state === 'closed' && lp.outcome === 'not-applying' && App.stemIntent() !== 'no') App.state.stemIntent = 'no';
  }

  /* One loop redrawn where it stands, for a change made outside it. */
  function redrawLoop(lp) {
    if (!lp || !C.loop) return;
    document.querySelectorAll('[data-loop="' + CSS.escape(lp.id) + '"]').forEach((el) => {
      const w = document.createElement('div');
      w.innerHTML = C.loop(lp);
      const next = w.firstElementChild;
      el.replaceWith(next);
      const rc = next.querySelector('.loop-receipt');
      if (rc) rc.focus({ preventScroll: true });
    });
  }
  /* Is this exit on the loop's current step? ready: and can it be taken now. */
  const hasExit = (lp, key, ready) => {
    const v = L().view(lp);
    return !!(v.step && v.step.exits.some((x) => x.key === key && !(ready && x.disabled)));
  };
  const exitOpen = (lp, key) => hasExit(lp, key, true);

  document.addEventListener('duly:change', (ev) => {
    const d = ev.detail || {};
    if (!L()) return;
    /* The STEM OPT answer, from any screen. */
    if (d.kind === 'answer' && d.key === 'stemIntent') {
      const v = App.stemIntent();
      if (v === 'yes') startStem();
      else if (v === 'no') { const lp = openOf('stem-filing'); if (lp && exitOpen(lp, 'no')) L().take(lp.id, 'no'); }
      return;
    }
    if (d.kind === 'loop') {
      const lp = L().get(d.key);
      if (lp && lp.kind === 'stem-filing') syncStem(lp);
      return;
    }
    /* Undo of "not applying" opens the loop again: the answer is yes again. */
    if (d.kind === 'record' && d.key === 'loop:undo' && d.value === 'stem-filing') {
      const lp = openOf('stem-filing');
      if (lp && App.stemIntent() === 'no') App.state.stemIntent = 'yes';
      return;
    }
    /* Ticking the training plan is the loop's "I-983 signed". Unticking it
       right after undoes that, and only that. */
    if (d.kind === 'task' && d.key === 'i983') {
      const lp = openOf('stem-filing');
      if (!lp) return;
      if (d.value) {
        if (lp.step === 'facts' && exitOpen(lp, 'start')) L().take(lp.id, 'start');
        if (lp.step === 'i983' && exitOpen(lp, 'signed')) { L().take(lp.id, 'signed'); App.state['loopOpen:' + lp.id] = true; redrawLoop(lp); }
      } else if (lp.saved.i983Signed && !App.state['plan:tickFromLoop:i983']) {
        const u = lp.undo[lp.undo.length - 1];
        if (u && u.action === 'signed') { L().undo(lp.id); redrawLoop(lp); }
      }
      return;
    }
    /* A receipt added in USCIS status is the loop's "filed" when the loop is
       at its filing step. */
    if (d.kind === 'edit' && d.key === 'us-receipt:stem') {
      const lp = openOf('stem-filing');
      if (lp && hasExit(lp, 'filed', false)) {
        L().take(lp.id, 'filed', { receipt: d.value });
      }
    }
  });

  /* ---------------- views ---------------- */

  function head(view) {
    return '<header class="page-header plan-head">' +
      C.titleWith('<h1 class="t-big" tabindex="-1">Plan</h1>', INFO) + '</header>' +
      '<nav class="chips plan-views" aria-label="Plan">' + VIEWS.map((v) =>
        '<a class="chip" href="' + v.href + '"' + (v.key === view ? ' aria-current="page"' : '') + '>' + e(v.label) + '</a>').join('') +
      '</nav>';
  }

  /* Every other loop open in the student's plan, earliest engine date first
     (App.loops.whatsNext), and any closed today with its receipt. The STEM
     OPT loop sits with its steps above; reports sit in Reports you owe; the
     crisis screen keeps nothing. */
  function alsoOpen() {
    if (!L() || !C.loops) return '';
    const skip = (lp) => lp.kind === 'stem-filing' || lp.kind === 'report-owed' || (L().def(lp.kind) || {}).private;
    const open = L().whatsNext({ max: 50 }).loops.filter((lp) => !skip(lp));
    const done = L().list({ all: true }).filter((lp) => closedToday(lp) && !skip(lp));
    const list = open.concat(done);
    if (!list.length) return '';
    return C.section({ cls: 'plan-also', eyebrow: 'Also open', content: C.loops(list, { label: 'Also open' }) });
  }

  function stepsView(data, params) {
    const S = window.SCREENS.steps;
    if (!S || !S.view) return '';
    const lp = stemLoop();
    if (lp) syncStem(lp);
    return S.view(data, params, { embedded: true, loop: lp }) + alsoOpen();
  }

  function statusView(data) {
    const U = window.SCREENS.uscis;
    return U && U.view ? U.view(data, [], { embedded: true }) : '';
  }

  /* ---------------- WorkBook ---------------- */

  /* Hours on a day: the newest change on or before it, else the hours saved
     with the job. Northwind on 2026-09-30: no changes, 40. */
  function hoursOn(j, iso) {
    const ch = (j.hoursChanges || []).filter((c) => c.on <= iso).sort((a, b) => (a.on < b.on ? -1 : 1));
    if (ch.length) return ch[ch.length - 1].hours;
    return j.hours;
  }

  function jobRow(j, today) {
    const F = (iso) => App.dates.fmt(iso, { year: true });
    const ended = j.end && j.end < today;
    const h = hoursOn(j, today);
    const meta = [j.title || null,
      ended ? null : (h != null ? h + ' hours a week' : 'Hours not saved yet'),
      ended ? F(j.start) + ' to ' + F(j.end) : 'Since ' + F(j.start)].filter(Boolean).join(' · ');
    return C.row({
      key: 'wb:' + j.id,
      title: j.employer,
      meta: meta,
      value: ended ? 'Ended' : (j.confirmedOn ? 'Confirmed ' + App.dates.fmt(j.confirmedOn) : null),
    });
  }

  /* The employer's public fact, as Next steps shows it, with See. */
  function employerRow() {
    const emp = App.employer ? App.employer() : null;
    const ev = emp && emp.everify;
    if (!emp || !ev || !ev.value) return '';
    return C.row({
      key: 'wb:employer',
      title: 'Employer details: ' + emp.name,
      meta: ev.label + ': ' + String(ev.value).toLowerCase() + (ev.checked ? ', checked ' + ev.checked : ''),
      href: '#/employer',
    });
  }

  const WORK = ['job-ends', 'checkin'];
  function workLoops() {
    if (!L()) return [];
    return L().list({ all: true }).filter((lp) => WORK.indexOf(lp.kind) >= 0 && (isOpen(lp) || closedToday(lp)));
  }

  const SOON = [
    { title: 'Hours, week by week', meta: 'A change in hours opens its report' },
    { title: 'Employer details for your I-983', meta: 'E-Verify company ID, address and your manager' },
    { title: 'Offers and start dates', meta: 'Saved once, used for your reports and your count' },
  ];

  function workbookView(data) {
    const r = App.record();
    const today = L() ? L().now() : data.today.iso;
    const jobs = (r.jobs || []).slice().sort((a, b) => (a.start < b.start ? 1 : -1));
    const current = jobs.filter((j) => !j.end || j.end >= today);
    const rows = jobs.map((j) => jobRow(j, today));
    const emp = employerRow();
    if (emp) rows.push(emp);
    const actions = current.length
      ? C.btnGroup([
        C.button({ label: 'My job ended', kind: 'pill', attrs: { 'data-plan-start': 'job-ends' } }),
        C.button({ label: 'My hours changed', kind: 'text', attrs: { 'data-plan-start': 'hours' } }),
      ])
      : '';
    const loops = workLoops();
    const jobsSection = C.section({
      cls: 'wb-jobs', eyebrow: 'Your work',
      info: 'Each job with its hours and dates, from your record. A change here opens its steps, with the dates worked out for you.',
      content: (rows.length ? C.list(rows, { accordion: false, label: 'Your jobs' }) : '<p class="t-meta">No job on your record yet.</p>') +
        (actions ? '<div class="wb-actions">' + actions + '</div>' : '') +
        (loops.length && C.loops ? '<div class="wb-loops">' + C.loops(loops, { label: 'Changes at work' }) + '</div>' : ''),
    });
    const soon = C.section({
      cls: 'wb-soon', eyebrow: 'Coming to WorkBook',
      content: C.list(SOON.map((s) => C.row({ title: s.title, meta: s.meta })), { accordion: false, label: 'Coming to WorkBook' }),
    });
    return jobsSection + soon;
  }

  /* Start a change at work and open it in place. */
  function startWork(what) {
    if (!L()) return;
    const r = App.record();
    const today = L().now();
    const job = (r.jobs || []).filter((j) => !j.end || j.end >= today)[0];
    if (!job) return;
    let lp = null;
    if (what === 'job-ends') {
      lp = openOf('job-ends') || L().start('job-ends', { jobId: job.id });
    } else if (what === 'hours') {
      lp = L().list().filter((x) => x.kind === 'checkin' && (x.context || {}).jobId === job.id)[0] || L().start('checkin', { jobId: job.id });
      if (lp && lp.step === 'ask' && exitOpen(lp, 'hours')) L().take(lp.id, 'hours');
    }
    if (!lp) return;
    App.state['loopOpen:' + lp.id] = true;
    if (App.haptic) App.haptic('select');
    App.rerender();
    const box = document.querySelector('main#main [data-loop="' + CSS.escape(lp.id) + '"]');
    if (box) {
      const first = box.querySelector('.loop-body input, .loop-body [role="radio"], .loop-body .btn');
      (first || box.querySelector('.loop-head')).focus({ preventScroll: true });
      if (App.play) App.play(box, 'is-arriving');
      box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  window.SCREENS.plan = {
    title: 'Plan',
    paramsInPlace(params, prev) { return placeOf(params) === placeOf(prev); },
    titleFor(params) {
      const r = route(params);
      if (r.view === 'status' && r.id) { const a = App.findApplication(r.id); return a ? a.title : 'USCIS status'; }
      return r.view === 'status' ? 'USCIS status' : (r.view === 'workbook' ? 'WorkBook' : 'Plan');
    },
    render(data, params) {
      const r = route(params);
      /* One case: a drilled page, with its back link and no view chips. */
      if (r.view === 'status' && r.id) {
        const one = window.SCREENS.uscis.view(data, [r.id]);
        return STYLE + one + (one.indexOf('class="footer"') >= 0 ? '' : C.footer());
      }
      const body = r.view === 'status' ? statusView(data) : (r.view === 'workbook' ? workbookView(data) : stepsView(data, r.params));
      return STYLE + head(r.view) + body + C.footer();
    },
    mount(root, data, params) {
      root.classList.add('screen-plan');
      const r = route(params);
      if (r.view === 'steps' && window.SCREENS.steps) window.SCREENS.steps.mount(root);
      if (r.view === 'status' && window.SCREENS.uscis) window.SCREENS.uscis.mount(root);
      if (r.view === 'workbook') {
        root.addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-plan-start]');
          if (b) startWork(b.dataset.planStart);
        });
      }
    },
  };
})();
