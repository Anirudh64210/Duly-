/* Work (#/work): the student's jobs, each in its own rounded panel (BRIEF
   Round 8, note 4). More than one job at a time is normal: part time at one
   employer and full time at her own company.

     Work
     one quiet line
     a panel per job now:
       the employer (and "Your company"), its hours at the right
       the title and the first day
       Reported to your DSO      Marked Feb 27 | By <due> and Mark reported
       any other job report owed (new hours, the end), the same way
       Last confirmed            Aug 28 · next check-in Sep 27
       a job loop that needs her (the check-in, a job ending), open in place
       Change hours · My job ended
     Earlier jobs, one quiet line each
     Add a job (an employer, or my own company)

   One place per item (Round 7, rule 1): the job loops (check-in, job ends)
   and the job reports live here, not in Plan. Every loop and every action
   here closes itself (Round 8, rule 7): the self-drawing check and the one
   line, a light tap, held 1.6 s, then it folds away and Undo waits in a
   toast. Loops do that through app/motion.js; the actions on this page
   (add a job, mark reported, new hours) do the same through settle() below.

   Every date is the record's (app/record.js):
     Northwind, first day 2026-02-27: its report is due 2026-02-27 + 10 =
       2026-03-09, marked made 2026-02-27 (records.made).
     Last confirmed 2026-08-28; next check-in 2026-08-28 + 30 (checkin.jobDays)
       = 2026-09-27, so on 2026-09-30 the check-in is open here. Confirmed
       on 2026-09-30, the next is 2026-09-30 + 30 = 2026-10-30.
     A job added with first day 2026-10-01 owes its report by 2026-10-01 + 10
       = 2026-10-11 (python3). */
(function () {
  'use strict';
  if (window.SCREENS.work) return;

  const STYLE = '<style>' +
    '.screen-work .page-header { margin-bottom: var(--s-8); }' +
    '.screen-work .wk-sub { margin: var(--s-4) 0 0; color: var(--ink-2); }' +
    '.screen-work .wk-jobs { display: flex; flex-direction: column; gap: var(--s-16); margin-top: var(--s-24); }' +
    '.screen-work .wk-job { background: var(--surface); border: 1px solid var(--hairline); border-radius: 16px; overflow: hidden; }' +
    '.screen-work .wk-head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--s-16); padding: var(--s-16) var(--s-16) var(--s-12); }' +
    '.screen-work .wk-name { margin: 0; font-size: var(--t-body); line-height: var(--lh-body); font-weight: 600; color: var(--ink); }' +
    '.screen-work .wk-mark { margin-left: var(--s-8); font-size: var(--t-small); font-weight: 400; color: var(--ink-3); }' +
    '.screen-work .wk-meta { margin: 2px 0 0; font-size: var(--t-small); line-height: var(--lh-meta); color: var(--ink-2); }' +
    '.screen-work .wk-hours { flex: none; font-size: var(--t-small); color: var(--ink-2); font-variant-numeric: tabular-nums; }' +
    '.screen-work .wk-line { position: relative; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; column-gap: var(--s-16); row-gap: var(--s-4); padding: var(--s-12) var(--s-16); min-height: 48px; }' +
    '.screen-work .wk-line::before { content: ""; position: absolute; top: 0; left: var(--s-16); right: 0; height: 1px; background: var(--hairline); }' +
    '.screen-work .wk-job > .wk-line:first-child::before { display: none; }' +
    '.screen-work .wk-line > span:first-child { font-size: var(--t-small); color: var(--ink); }' +
    '.screen-work .wk-val { display: inline-flex; align-items: center; gap: var(--s-12); font-size: var(--t-small); color: var(--ink-2); font-variant-numeric: tabular-nums; }' +
    '.screen-work .wk-val .btn { min-height: 32px; }' +
    '.screen-work .wk-acts { position: relative; padding: var(--s-8) var(--s-16) var(--s-12); }' +
    '.screen-work .wk-acts::before { content: ""; position: absolute; top: 0; left: var(--s-16); right: 0; height: 1px; background: var(--hairline); }' +
    '.screen-work .wk-acts .btn-group { column-gap: var(--s-16); row-gap: 0; }' +
    '.screen-work .wk-acts .btn-text { padding-left: 0; padding-right: 0; }' +
    '.screen-work .wk-loop { position: relative; padding: 0 var(--s-4); }' +
    '.screen-work .wk-loop::before { content: ""; position: absolute; top: 0; left: var(--s-16); right: 0; height: 1px; background: var(--hairline); }' +
    '.screen-work .wk-loop .loop { border: 0; }' +
    '.screen-work .wk-loop .loop-body { padding: var(--s-16) var(--s-12); }' +
    '.screen-work .wk-loop .loop.is-flat > .loop-settle { padding: var(--s-16) var(--s-12); }' +
    '.screen-work .wk-loop .loop.is-settled:not(.is-flat) { padding: var(--s-12) var(--s-12) 0; }' +
    '.screen-work .wk-loop .loop.is-settled .loop-head { padding: 0 0 var(--s-4); }' +
    '.screen-work .wk-loop .loop.is-settled:not(.is-flat) .loop-settle { padding-left: 0; }' +
    '.screen-work .wk-form { position: relative; display: flex; flex-direction: column; gap: var(--s-16); padding: var(--s-16); }' +
    '.screen-work .wk-job .wk-form::before { content: ""; position: absolute; top: 0; left: var(--s-16); right: 0; height: 1px; background: var(--hairline); }' +
    '.screen-work .wk-form .field { margin: 0; }' +
    '.screen-work .wk-pair { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-12); }' +
    '.screen-work .wk-form .btn-row { display: flex; justify-content: flex-end; gap: var(--s-12); }' +
    '.screen-work .wk-add { margin-top: var(--s-24); }' +
    '.screen-work .wk-add > .btn { padding-left: 0; }' +
    '.screen-work .wk-earlier { margin-top: var(--s-32); }' +
    '.screen-work .wk-earlier h2 { margin: 0 0 var(--s-8) var(--s-16); font-size: var(--t-small); font-weight: 500; color: var(--ink-3); }' +
    '.screen-work .wk-empty { margin: var(--s-24) 0 0; color: var(--ink-2); }' +
    /* The receipt line of an action here, the same as a loop\'s. */
    '.screen-work .wk-settle, .screen-plan .wk-settle { padding: var(--s-12) var(--s-16); }' +
    '@media (max-width: 640px) { .screen-work .wk-pair { grid-template-columns: 1fr; } .screen-work .wk-head { flex-direction: column; align-items: flex-start; gap: 2px; } }' +
    '</style>';

  const e = (s) => C.esc(s);
  const W = () => App.data.work || {};
  const fill = (t, v) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));
  const L = () => App.loops;
  const today = () => (L() ? L().now() : App.data.today.iso);
  const fmt = (iso) => App.dates.fmt(iso);
  const fmtY = (iso) => App.dates.fmtY(iso);
  const okIso = (v) => App.dates.okIso(v);
  const RULE = () => App.RULE || {};
  const reportDays = () => RULE().reportWithin || 10;
  const cssq = (v) => (window.CSS && CSS.escape ? CSS.escape(v) : String(v).replace(/["\\]/g, '\\$&'));
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isOpen = (lp) => lp && lp.state !== 'closed' && lp.state !== 'dismissed';

  /* ---------------- the record ---------------- */

  function hoursOn(j, iso) {
    let h = j.hours;
    (j.hoursChanges || []).slice().sort((a, b) => (a.on < b.on ? -1 : 1)).forEach((c) => { if (c.on <= iso) h = c.hours; });
    return h;
  }
  /* "At least 20 hours a week" when the hours were saved as a band. */
  function hoursText(j, iso) {
    const changed = (j.hoursChanges || []).some((c) => c.on <= iso);
    if (!changed && j.hoursBand === 'full') return 'At least ' + (RULE().minHours || 20) + ' hours a week';
    if (!changed && j.hoursBand === 'part') return 'Fewer than ' + (RULE().minHours || 20) + ' hours a week';
    const h = hoursOn(j, iso);
    return h != null && h !== '' ? fill(W().hours, { hours: h }) : W().noHours;
  }
  const jobsNow = () => (App.record().jobs || []).filter((j) => !j.end || j.end >= today()).sort((a, b) => (a.start < b.start ? -1 : 1));
  const jobsBefore = () => (App.record().jobs || []).filter((j) => j.end && j.end < today()).sort((a, b) => (a.end < b.end ? 1 : -1));
  const jobById = (id) => (App.record().jobs || []).filter((j) => j.id === id)[0] || null;

  /* The job reports owed or made, from App.reportsOwed: start, new hours,
     end, a new training plan. */
  function jobReports(j) {
    const all = App.reportsOwed ? App.reportsOwed() : null;
    return ((all && all.rows) || []).filter((x) => !x.standing && x.id.indexOf(':' + j.id) > 0 &&
      /^report:(job-start|job-hours|job-end|new-plan|eval-final):/.test(x.id));
  }
  /* A report-owed loop opened for a report: its "made" exit is the same as
     Mark reported. */
  const owedLoop = (reportId) => (L() ? L().list({ all: true }).filter((lp) => lp.kind === 'report-owed' && isOpen(lp) && (lp.context || {}).reportId === reportId)[0] : null) || null;

  /* The loops about a job: the check-in and the job ending. A loop with no
     job named is about the first job now (app/loops.js jobOf). Shown while
     open, while it settles, and while its receipt is unread. */
  const WORK_KINDS = ['checkin', 'job-ends'];
  function jobOfLoop(lp) {
    const id = (lp.context || {}).jobId;
    if (id && jobById(id)) return id;
    const first = jobsNow()[0];
    return first ? first.id : null;
  }
  function shownLoop(lp) {
    if (isOpen(lp)) return true;
    if (App.settleLine && App.settleLine(lp.id)) return true;
    return lp.state === 'closed' && lp.closedOn === today() && lp.receipt && !lp.receipt.folded;
  }
  function loopsFor(j) {
    if (!L()) return [];
    return L().list({ all: true }).filter((lp) => WORK_KINDS.indexOf(lp.kind) >= 0 && jobOfLoop(lp) === j.id && shownLoop(lp));
  }
  /* For Plan: is this loop drawn on Work? */
  function isWorkLoop(lp) {
    if (!lp) return false;
    if (WORK_KINDS.indexOf(lp.kind) >= 0) return true;
    return lp.kind === 'report-owed' && /^report:(job-|new-plan:)/.test(String((lp.context || {}).reportId || ''));
  }

  /* ---------------- the panels ---------------- */

  function line(label, value) {
    return '<div class="wk-line"><span>' + e(label) + '</span><span class="wk-val">' + value + '</span></div>';
  }
  function reportLine(x, first) {
    const w = W();
    const label = first ? w.reportedLabel : x.title.replace(/ at .*$/, '');
    if (x.made) return line(label, e(fill(w.reported, { date: fmt(x.made) })));
    return line(label, '<span>' + e(fill(w.reportBy, { date: fmt(x.due) })) + '</span>' +
      '<button type="button" class="btn btn-pill is-small" data-wk-report="' + e(x.id) + '">' + e(w.markReported) + '</button>');
  }

  function jobPanel(j) {
    const w = W();
    const t = today();
    const reps = jobReports(j);
    const start = reps.filter((x) => x.id === 'report:job-start:' + j.id)[0];
    const others = reps.filter((x) => x !== start && !x.made);
    const loops = loopsFor(j);
    const asking = loops.some(isOpen);
    const rows = [];
    rows.push(start ? reportLine(start, true) : line(w.reportedLabel, e(fill(w.reportLater, { days: reportDays() }))));
    others.forEach((x) => rows.push(reportLine(x, false)));
    /* Next check-in: last confirmed + checkin.jobDays (2026-08-28 + 30 =
       2026-09-27). Shown once nothing about the job is open. */
    if (!asking && okIso(j.confirmedOn)) {
      const next = App.dates.addDays(j.confirmedOn, (App.data.checkin || {}).jobDays || 30);
      rows.push(line(w.checkinLabel, e(fill(w.checkin, { date: fmt(j.confirmedOn), next: fmt(next < t ? t : next) }))));
    }
    /* A loop about the job is drawn flat in its panel: its question and its
       answers at once, no head to unfold. */
    const loopHtml = loops.map((lp) => '<div class="wk-loop">' + C.loop(lp, { flat: true }) + '</div>').join('');
    const editing = App.state['work:hours'] === j.id;
    const acts = asking || editing ? '' : '<div class="wk-acts">' + C.btnGroup([
      C.button({ label: w.changeHours, kind: 'text', attrs: { 'data-wk-hours': j.id } }),
      C.button({ label: w.jobEnded, kind: 'text', attrs: { 'data-wk-ended': j.id } }),
    ]) + '</div>';
    const meta = [j.title || null, fill(w.since, { date: fmtY(j.start) })].filter(Boolean).join(' · ');
    return '<section class="wk-job" data-job="' + e(j.id) + '" aria-label="' + e(j.employer) + '">' +
      '<div class="wk-head"><div><h2 class="wk-name">' + C.escText(j.employer) + (j.own ? '<span class="wk-mark">' + e(w.ownMark) + '</span>' : '') + '</h2>' +
      '<p class="wk-meta">' + C.escText(meta) + '</p></div>' +
      '<span class="wk-hours">' + e(hoursText(j, t)) + '</span></div>' +
      loopHtml + rows.join('') + (editing ? hoursForm(j) : acts) +
      '</section>';
  }

  function earlierLine(j) {
    const w = W();
    const reps = jobReports(j).filter((x) => !x.made);
    return line(j.employer, e(fill(w.between, { from: fmtY(j.start), to: fmtY(j.end) }))) + reps.map((x) => reportLine(x, false)).join('');
  }

  /* ---------------- forms ---------------- */

  const val = (k) => (App.state['work:f:' + k] == null ? '' : String(App.state['work:f:' + k]));
  const errOf = (k) => (App.state['work:err'] || {})[k] || null;

  function hoursForm(j) {
    const w = W();
    const from = App.state['work:f:from'] || today();
    return '<form class="wk-form" data-wk-form="hours" data-job="' + e(j.id) + '" novalidate>' +
      '<div class="wk-pair">' +
      C.field({ key: 'work:f:newHours', label: w.fields.hours, type: 'number', inputmode: 'numeric', value: val('newHours'), error: errOf('newHours') }) +
      C.field({ key: 'work:f:from', label: w.hoursFrom, type: 'date', value: from, error: errOf('from') }) +
      '</div><div class="btn-row">' +
      C.button({ label: w.cancel, kind: 'text', attrs: { 'data-wk-cancel': 'hours' } }) +
      C.button({ label: w.saveHours, kind: 'primary', type: 'submit' }) +
      '</div></form>';
  }

  function addForm() {
    const w = W();
    const own = App.state['work:addKind'] === 'own';
    return '<section class="wk-job wk-adding" aria-label="' + e(w.add) + '"><form class="wk-form" data-wk-form="add" novalidate>' +
      C.segment({ key: 'work:addKind', label: w.add, selected: own ? 'own' : 'employer',
        options: [{ value: 'employer', label: w.kinds.employer }, { value: 'own', label: w.kinds.own }] }) +
      C.field({ key: 'work:f:employer', label: own ? w.fields.company : w.fields.employer, value: val('employer'), error: errOf('employer'), autocomplete: 'organization' }) +
      C.field({ key: 'work:f:title', label: w.fields.title, value: val('title') }) +
      '<div class="wk-pair">' +
      C.field({ key: 'work:f:hours', label: w.fields.hours, type: 'number', inputmode: 'numeric', value: val('hours'), error: errOf('hours') }) +
      C.field({ key: 'work:f:start', label: w.fields.start, type: 'date', value: val('start'), error: errOf('start') }) +
      '</div><div class="btn-row">' +
      C.button({ label: w.cancel, kind: 'text', attrs: { 'data-wk-cancel': 'add' } }) +
      C.button({ label: w.save, kind: 'primary', type: 'submit' }) +
      '</div></form></section>';
  }

  function clearForm() {
    Object.keys(App.state).forEach((k) => { if (k.indexOf('work:f:') === 0) delete App.state[k]; });
    delete App.state['work:err'];
  }

  /* ---------------- actions (each closes itself) ---------------- */

  const CHECK = '<svg class="settle-check" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' +
    '<circle cx="12" cy="12" r="10.25" pathLength="1"/><path d="M7.6 12.3l3 3.1 5.8-6.3" pathLength="1"/></svg>';
  const HOLD = (App.settle && App.settle.HOLD) || 1600;

  function collapse(el, done) {
    if (!el || !el.isConnected || reduced() || !Element.prototype.animate) { done(); return; }
    const cs = getComputedStyle(el);
    el.style.overflow = 'hidden';
    el.animate([
      { height: el.offsetHeight + 'px', opacity: 1, paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom },
      { height: '0px', opacity: 0, paddingTop: '0px', paddingBottom: '0px' },
    ], { duration: 240, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).onfinish = done;
  }

  /* settle(selector, line, undo): the page is redrawn; at the top of the
     element the change landed in, the self-drawing check and the one line
     ("Added Lumen Labs. Report it to your DSO by Oct 11."), with one light
     tap. Held 1.6 s, then it folds away and Undo waits in a toast. */
  function settle(sel, text, undo) {
    App.rerender();
    if (App.haptic) App.haptic('success');
    const host = sel ? document.querySelector('main#main ' + sel) : null;
    const toast = () => App.toast(text, undo ? { action: W().undo || 'Undo', onAction: undo } : {});
    if (!host) { toast(); return; }
    const el = document.createElement('div');
    el.className = 'loop-receipt loop-settle wk-settle';
    el.setAttribute('role', 'status');
    el.tabIndex = -1;
    el.innerHTML = CHECK + '<p>' + C.escText(text) + '</p>';
    const head = host.querySelector(':scope > .wk-head, :scope > .pl-goal-head');
    if (head) head.after(el); else host.prepend(el);
    el.focus({ preventScroll: true });
    host.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
    setTimeout(() => collapse(el, () => { el.remove(); toast(); }), HOLD);
  }

  /* addJob({ employer, title?, hours, start, own? }) -> { ok, job, text, undo } | { ok: false, errors } */
  function addJob(v) {
    const w = W();
    const errors = {};
    const employer = String(v.employer || '').trim();
    const hours = Number(v.hours);
    if (!employer) errors.employer = v.own ? w.errors.company : w.errors.employer;
    if (!(hours > 0)) errors.hours = w.errors.hours;
    if (!okIso(v.start)) errors.start = w.errors.start;
    if (Object.keys(errors).length) return { ok: false, errors: errors };
    const rec = App.record();
    rec.jobs = rec.jobs || [];
    let id = employer.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + v.start;
    while (rec.jobs.some((j) => j.id === id)) id += '-2';
    const job = { id: id, title: String(v.title || '').trim(), employer: employer, start: v.start, end: null,
      hours: hours, hoursChanges: [], confirmedOn: today(), own: !!v.own };
    rec.jobs.push(job);
    /* Her own company: its steps join Plan. */
    const addedGoal = v.own && App.addGoal ? App.addGoal('company', { quiet: true }) : null;
    App.emit('record', 'job', id, null);
    const rep = jobReports(job).filter((x) => x.id === 'report:job-start:' + id)[0];
    const text = (rep ? fill(w.receipts.added, { employer: employer, due: fmt(rep.due) }) : fill(w.receipts.addedLater, { employer: employer, days: reportDays() })) +
      (v.own ? w.receipts.addedOwn : '');
    const undo = () => {
      const r = App.record();
      r.jobs = (r.jobs || []).filter((j) => j.id !== id);
      if (Array.isArray(r.events)) r.events = r.events.filter((x) => x.jobId !== id);
      if (addedGoal && addedGoal.added && App.removeGoal) App.removeGoal('company', { quiet: true });
      App.emit('record', 'job:undo', id, null);
      App.rerender();
    };
    return { ok: true, job: job, text: text, undo: undo };
  }

  /* setHours(jobId, hours, from) : through the job's check-in loop, so the
     record, the report owed and, under the hours line, the count are what
     app/loops.js saves. The loop closes itself where it is drawn (its check,
     its line, then Undo in a toast, app/motion.js); the text is returned for
     a caller elsewhere (Ask). -> { ok, text, undo, loopId } | { ok: false, errors } */
  function setHours(jobId, hours, from) {
    const w = W();
    const errors = {};
    if (hours === '' || hours == null || !(Number(hours) >= 0)) errors.newHours = w.errors.hours;
    if (!okIso(from)) errors.from = w.errors.start;
    if (Object.keys(errors).length) return { ok: false, errors: errors };
    const j = jobById(jobId);
    if (!j || !L()) return { ok: false, errors: { newHours: w.errors.hours } };
    const lp = L().list().filter((x) => x.kind === 'checkin' && jobOfLoop(x) === j.id)[0] || L().start('checkin', { jobId: j.id });
    if (!lp) return { ok: false, errors: { newHours: w.errors.hours } };
    if (lp.step === 'ask') L().take(lp.id, 'hours');
    const values = { newHours: String(Number(hours)), hoursFrom: from };
    let res = L().take(lp.id, 'save', values);
    if (!res.ok) res = L().take(lp.id, 'saveBelow', values);
    if (!res.ok) return { ok: false, errors: { newHours: w.errors.hours } };
    const rc = lp.receipt && lp.receipt.text;
    const text = rc ? (App.receiptLine ? App.receiptLine(rc) : rc) : fill(w.receipts.hours, { hours: Number(hours), employer: j.employer, from: fmt(from) });
    return { ok: true, loopId: lp.id, text: text, undo: () => { L().undo(lp.id); App.rerender(); } };
  }

  function markReported(reportId) {
    const lp = owedLoop(reportId);
    let viaLoop = false;
    if (lp) {
      const res = L().take(lp.id, 'made');
      viaLoop = !!(res && res.ok);
      if (viaLoop && L().foldReceipt) L().foldReceipt(lp.id);
    }
    if (!viaLoop) App.markReport(reportId, true);
    const undo = () => { if (viaLoop) L().undo(lp.id); else App.markReport(reportId, false); App.rerender(); };
    return { ok: true, text: fill(W().receipts.reported, { today: fmt(today()) }), undo: undo };
  }

  /* ---------------- the page ---------------- */

  function render() {
    const w = W();
    const now = jobsNow();
    const before = jobsBefore();
    const adding = !!App.state['work:adding'];
    const head = '<header class="page-header"><h1 class="t-big" tabindex="-1">' + e(w.title) + '</h1>' +
      '<p class="wk-sub t-meta">' + e(w.sub) + '</p></header>';
    const jobs = now.length ? '<div class="wk-jobs">' + now.map(jobPanel).join('') + '</div>' : (adding ? '' : '<p class="wk-empty">' + e(w.empty) + '</p>');
    const add = adding ? '<div class="wk-jobs">' + addForm() + '</div>'
      : '<div class="wk-add">' + C.button({ label: w.add, kind: 'text', attrs: { 'data-wk-add': '' } }) + '</div>';
    const earlier = before.length ? '<section class="wk-earlier" aria-label="' + e(w.earlier) + '"><h2>' + e(w.earlier) + '</h2>' +
      '<div class="wk-job">' + before.map(earlierLine).join('') + '</div></section>' : '';
    return STYLE + head + jobs + add + earlier + C.footer();
  }

  function focusIn(sel) {
    const el = document.querySelector('main#main ' + sel);
    if (el) el.focus({ preventScroll: true });
  }

  function mount(root) {
    root.classList.add('screen-work');
    root.addEventListener('click', (ev) => {
      const t = ev.target;
      const add = t.closest('[data-wk-add]');
      if (add) {
        clearForm();
        App.state['work:adding'] = true;
        if (App.haptic) App.haptic('select');
        App.rerender();
        const box = document.querySelector('main#main .wk-adding');
        if (box) { if (App.play) App.play(box, 'is-arriving'); box.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); }
        focusIn('.wk-adding [data-field="work:f:employer"]');
        return;
      }
      const cancel = t.closest('[data-wk-cancel]');
      if (cancel) {
        if (cancel.dataset.wkCancel === 'add') delete App.state['work:adding'];
        else delete App.state['work:hours'];
        clearForm();
        App.rerender();
        return;
      }
      const hours = t.closest('[data-wk-hours]');
      if (hours) {
        clearForm();
        App.state['work:hours'] = hours.dataset.wkHours;
        App.rerender();
        focusIn('[data-wk-form="hours"] [data-field="work:f:newHours"]');
        return;
      }
      const ended = t.closest('[data-wk-ended]');
      if (ended && L()) {
        const id = ended.dataset.wkEnded;
        const lp = L().list().filter((x) => x.kind === 'job-ends' && jobOfLoop(x) === id)[0] || L().start('job-ends', { jobId: id });
        if (!lp) return;
        App.state['loopOpen:' + lp.id] = true;
        if (App.haptic) App.haptic('select');
        App.rerender();
        const box = document.querySelector('main#main [data-loop="' + cssq(lp.id) + '"]');
        if (box) {
          const first = box.querySelector('.loop-body input, .loop-body [role="radio"], .loop-body .btn');
          (first || box.querySelector('.loop-head')).focus({ preventScroll: true });
          if (App.play) App.play(box, 'is-arriving');
        }
        return;
      }
      const rep = t.closest('[data-wk-report]');
      if (rep) {
        const panel = rep.closest('[data-job]');
        const res = markReported(rep.dataset.wkReport);
        settle(panel ? '.wk-job[data-job="' + cssq(panel.dataset.job) + '"]' : null, res.text, res.undo);
      }
    });
    root.addEventListener('submit', (ev) => {
      const form = ev.target.closest('[data-wk-form]');
      if (!form) return;
      ev.preventDefault();
      const read = (k) => { const el = form.querySelector('[data-field="work:f:' + k + '"]'); return el ? el.value : ''; };
      if (form.dataset.wkForm === 'add') {
        const res = addJob({ employer: read('employer'), title: read('title'), hours: read('hours'), start: read('start'), own: App.state['work:addKind'] === 'own' });
        if (!res.ok) { App.state['work:err'] = res.errors; App.rerender(); focusIn('[aria-invalid="true"]'); return; }
        clearForm();
        delete App.state['work:adding'];
        delete App.state['work:addKind'];
        settle('.wk-job[data-job="' + cssq(res.job.id) + '"]', res.text, res.undo);
        return;
      }
      if (form.dataset.wkForm === 'hours') {
        const res = setHours(form.dataset.job, read('newHours'), read('from'));
        if (!res.ok) { App.state['work:err'] = res.errors; App.rerender(); focusIn('[aria-invalid="true"]'); return; }
        clearForm();
        delete App.state['work:hours'];
        /* The check-in loop settles in the panel (app/motion.js). */
        App.rerender();
      }
    });
    /* A loop opened from elsewhere (Home, Plan) for a job: unfolded here. */
    const focusId = App.state['work:focus'];
    if (focusId) {
      delete App.state['work:focus'];
      const box = root.querySelector('[data-loop="' + cssq(focusId) + '"]');
      if (box) {
        setTimeout(() => {
          box.scrollIntoView({ block: 'center' });
          const h = box.querySelector('.loop-head');
          if (h) h.focus({ preventScroll: true });
          if (App.play) App.play(box, 'is-arriving');
        }, 0);
      }
    }
  }

  /* The segment relabels the name field in place. */
  document.addEventListener('duly:change', (ev) => {
    const d = ev.detail || {};
    if (d.kind === 'choice' && d.key === 'work:addKind' && document.querySelector('main#main.screen-work')) App.rerender();
    if (d.kind === 'loop' || d.kind === 'record') setTimeout(workDot, 0);
  });

  /* Work's waiting dot: a job loop that needs her. The nav moves its dots in
     place (app/nav.js updateNav); Work's is set right after. */
  const needsYou = () => !!L() && (App.record().jobs || []).some((j) => loopsFor(j).some((lp) => isOpen(lp) && L().seen(lp).kind === 'needs'));
  function workDot() {
    let on = false;
    try { on = needsYou(); } catch (err) { on = false; }
    document.querySelectorAll('.nav-item[data-place="work"]').forEach((a) => {
      const dot = a.querySelector('.wait-dot');
      if (on && !dot) a.insertAdjacentHTML('beforeend', '<span class="wait-dot" role="img" aria-label="Something here is waiting for you"></span>');
      if (!on && dot) dot.remove();
    });
  }
  if (App._ && typeof App._.updateNav === 'function') {
    const base = App._.updateNav;
    App._.updateNav = function () { const r = base.apply(this, arguments); workDot(); return r; };
  }

  window.SCREENS.work = {
    title: 'Work',
    paramsInPlace: true,
    titleFor() { return 'Work'; },
    render: render,
    mount: mount,
    /* For Plan and the Ask actions. */
    isWorkLoop: isWorkLoop,
    settle: settle,
    addJob: addJob,
    setHours: setHours,
    jobsNow: jobsNow,
    /* For the nav dot: a job loop that needs her. */
    needsYou: () => needsYou(),
    jobReports: jobReports,
  };
})();
