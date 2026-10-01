/* Plan (#/plan): built from the record and the student's goals (BRIEF
   Round 8, note 5). From the top:
     Plan
     any loop that needs her now and is not about STEM OPT or a job (a trip,
       an address, a lost document), one line each
     STEM OPT: the answer, the stepper, then one list of everything to do in
       date order (screens/steps.js draws it: the steps, the STEM OPT filing
       loop, reports owed), "Add your school's steps"
     each goal added ("Start my own company", "O-1 later"): its title, one
       quiet line, and a short ordered list of steps, each with its date where
       the record gives one; opened, a step has one plain line and at its
       bottom the one ⓘ (Round 7, rule 2)
     Add a goal
   Work is its own page now (#/work, screens/work.js): the jobs, their
   check-in and their reports live there and nowhere here (Round 7, rule 1).
   Round 7, rule 5: USCIS status is its own page (#/uscis).

     #/plan                the page
     #/plan/workbook       old link: goes to #/work
   Old routes redirect here, keeping their params: #/steps, #/next and
   #/checklists to #/plan. #/plan/status and #/plan/status/<id> go to
   #/uscis and #/uscis/<id>.

   For the Ask answers (app/ask.js):
     App.addGoal(kind, { quiet? })  'company' | 'o1' (and their spellings)
                                    -> { ok, kind, title, added, text, undo }
     App.removeGoal(kind, { quiet? })
     App.goals()                    the goals on the plan, in order
     App.saveFact(fact, { quiet? }) a fact the student stated, saved to the
                                    record:
                                      { kind: 'job', employer, title?, hours,
                                        start, own? }
                                      { kind: 'hours', employer? | jobId?,
                                        hours, from? (today) }
                                      { kind: 'goal', goal }
                                      { kind: 'stemIntent', value }
                                    -> { ok, text, undo }
                                     | { ok: false, errors?, needs? }
   Each closes itself (Round 8, rule 7): on Plan or Work the check and the
   line settle where the change landed; elsewhere one toast with Undo.

   Goal step dates (data.js GOALS):
     the first STEM OPT day  the OPT card's last day + 1: 2027-02-13 + 1 =
                             2027-02-14 (python3); a saved STEM card's first
                             day wins
     the card's end          2027-02-13, the OPT card; a saved STEM card's
                             last day wins
     her company's report    its first day + 10 days, from App.reportsOwed
                             (a company started 2026-10-01: 2026-10-11)

   The STEM OPT loop and the page agree (every date from app/record.js through
   App.loops; nothing is worked out here):
     loop saves "I-983 signed"     the step "Fill out your I-983" ticks
     loop saves the recommendation the step "Get your new I-20" ticks, and the
                                   stepper's last day moves (2026-12-01 + 60
                                   = 2027-01-30, python3)
     loop saves the receipt        "File Form I-765" ticks, and the STEM OPT
                                   case in USCIS status gets the receipt,
                                   Received, as of that day
     loop saves the new card       the case reads Approved
     ticking the training plan     takes the loop's "I-983 signed" exit
     a receipt added in USCIS      takes the loop's "filed" exit when the loop
     status                        is at its filing step
     the loop closes "not applying" the answer reads "Not applying this time"
   Undo in the loop undoes what it set here; a tick the student made herself
   is never taken back. */
(function () {
  'use strict';

  const STYLE = '<style>' +
    /* Sections 40 apart; a goal's title 8 above its list. */
    '.screen-plan .page-header { margin-bottom: var(--s-24); }' +
    '.screen-plan .pl-sec + .pl-sec { margin-top: 40px; }' +
    '.screen-plan .pl-now { margin-bottom: var(--s-32); }' +
    '.screen-plan .pl-goal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--s-16); margin: 0 0 var(--s-8); }' +
    '.screen-plan .pl-goal-head .pl-sub { margin: 2px 0 0; }' +
    '.screen-plan .pl-goal-head .btn { flex: none; min-height: 32px; padding: 0; color: var(--ink-3); }' +
    '.screen-plan .pl-goal-head .btn:hover { color: var(--ink-2); }' +
    '.screen-plan .pl-add { margin-top: 40px; }' +
    '.screen-plan .pl-add > .btn { padding-left: 0; }' +
    '.screen-plan .pl-pick { margin-top: 40px; background: var(--surface); border: 1px solid var(--hairline); border-radius: 16px; overflow: hidden; }' +
    '.screen-plan .pl-pick-title { margin: 0; padding: var(--s-16) var(--s-16) var(--s-8); font-size: var(--t-small); font-weight: 500; color: var(--ink-3); }' +
    '.screen-plan .pl-pick-opt { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; padding: var(--s-12) var(--s-16); min-height: 56px; text-align: left; background: none; border: 0; color: var(--ink); font: inherit; cursor: pointer; }' +
    '.screen-plan .pl-pick-opt::before { content: ""; position: absolute; top: 0; left: var(--s-16); right: 0; height: 1px; background: var(--hairline); }' +
    '.screen-plan .pl-pick-opt:hover { background: var(--row-hover); }' +
    '.screen-plan .pl-pick-opt span:first-child { font-weight: 500; }' +
    '.screen-plan .pl-pick-opt span + span { font-size: var(--t-small); color: var(--ink-2); }' +
    '.screen-plan .pl-pick-foot { position: relative; padding: var(--s-8) var(--s-16); }' +
    '.screen-plan .pl-pick-foot::before { content: ""; position: absolute; top: 0; left: var(--s-16); right: 0; height: 1px; background: var(--hairline); }' +
    '.screen-plan .pl-pick-foot .btn { padding-left: 0; }' +
    '.screen-plan .pl-goal .wk-settle { padding: var(--s-8) 0 var(--s-12); }' +
    '</style>';

  const e = (s) => C.esc(s);
  /* Old routes. The router swaps the first part and keeps the rest:
     #/applications/opt becomes #/uscis/opt. */
  Object.assign(App.ALIASES, { steps: 'plan', next: 'plan', checklists: 'plan', applications: 'uscis' });
  delete App.ALIASES.uscis;
  /* #/plan/status(/<id>) from before: USCIS status is its own page. Swapped
     before the router reads the hash, at load and on each hashchange. */
  function toUscis() {
    /* #/plan/workbook from before: Work is its own page. */
    if (/^#\/?plan\/workbook\/?$/.test(location.hash || '')) {
      try { history.replaceState(history.state, '', '#/work'); } catch (err) { location.replace('#/work'); }
      return true;
    }
    const m = /^#\/?plan\/status(\/[^/]+)?\/?$/.exec(location.hash || '');
    if (!m) return false;
    try { history.replaceState(history.state, '', '#/uscis' + (m[1] || '')); } catch (err) { location.replace('#/uscis' + (m[1] || '')); }
    return true;
  }
  toUscis();
  window.addEventListener('hashchange', toUscis, true);

  /* Which view a hash asks for. */
  function route(params) {
    return { view: 'steps', id: null, params: (params || []).slice() };
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

  const W = () => window.SCREENS.work || null;
  const onWork = (lp) => !!(W() && W().isWorkLoop && W().isWorkLoop(lp));
  /* A closed loop stays only while it settles or its receipt is unread;
     then it leaves on its own (Round 8, rule 7; app/motion.js). */
  const stillShown = (lp) => closedToday(lp) && ((App.settleLine && App.settleLine(lp.id)) || (lp.receipt && !lp.receipt.folded));

  /* Every other loop open in her plan, earliest engine date first
     (App.loops.whatsNext), and any still settling. Not STEM OPT (it sits in
     the I-765 row's place), not a report (by its due date), not a job loop
     (Work), not the crisis screen's. */
  function otherLoops() {
    if (!L()) return [];
    const skip = (lp) => lp.kind === 'stem-filing' || lp.kind === 'report-owed' || onWork(lp) || (L().def(lp.kind) || {}).private;
    const open = L().whatsNext({ max: 50 }).loops.filter((lp) => !skip(lp));
    const done = L().list({ all: true }).filter((lp) => stillShown(lp) && !skip(lp));
    return open.concat(done);
  }

  function nowView() {
    const others = otherLoops();
    if (!others.length) return '';
    return '<section class="pl-now" aria-label="Needs you now"><div class="list pl-list">' +
      others.map((lp) => '<div class="item pl-loop" data-key="loop:' + C.esc(lp.id) + '">' + C.loop(lp) + '</div>').join('') +
      '</div></section>';
  }

  function stepsView(data, params) {
    const S = window.SCREENS.steps;
    if (!S || !S.view) return '';
    let lp = stemLoop();
    if (lp) syncStem(lp);
    if (lp && lp.state === 'closed' && closedToday(lp) && lp.outcome !== 'approved' && !stillShown(lp)) lp = null;
    return '<section class="pl-sec pl-stem" data-goal="stem">' + S.view(data, params, { embedded: true, loop: lp, others: [] }) + '</section>';
  }

  /* ---------------- goals ---------------- */

  const G = () => App.data.goals || { kinds: {}, order: [] };
  const fill = (t, v) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));
  const KIND = { company: 'company', 'own-company': 'company', ownCompany: 'company', startCompany: 'company', 'start-company': 'company', self: 'company', 'self-employment': 'company', business: 'company',
    o1: 'o1', 'o-1': 'o1', 'O-1': 'o1', O1: 'o1', 'o1-later': 'o1' };
  const kindOf = (k) => KIND[k] || KIND[String(k || '').toLowerCase()] || null;
  const goalList = () => (App.state.goals = App.state.goals || []);
  App.goals = () => goalList().slice();

  /* Her own company on the record: a job she marked as hers, now. */
  function ownJob() {
    const t = L() ? L().now() : App.data.today.iso;
    return (App.record().jobs || []).filter((j) => j.own && (!j.end || j.end >= t))[0] || null;
  }
  /* The work permission she has now: the saved STEM card, else the OPT card. */
  function cardNow() {
    const r = App.record();
    const s = (r.stem || {}).card;
    if (s && App.dates.okIso(s.from) && App.dates.okIso(s.until) && !s.sample) return { from: s.from, until: s.until, stem: true };
    return r.opt && App.dates.okIso(r.opt.until) ? { until: r.opt.until, stem: false } : null;
  }
  const holes = () => ({
    major: (App.record().program || {}).major || 'your',
    minHours: (App.RULE || {}).minHours || 20,
    days: (App.RULE || {}).reportWithin || 10,
  });

  /* A step's date, done state and how it was counted (data.js GOALS). */
  function stepFacts(kind, st) {
    const fmtY = App.dates.fmtY;
    const out = { meta: null, done: !!App.state['task:goal:' + kind + ':' + st.key], doneMeta: null, counted: null, extra: [] };
    if (st.date === 'report') {
      const j = ownJob();
      const rep = j && W() ? W().jobReports(j).filter((x) => x.id === 'report:job-start:' + j.id)[0] : null;
      if (rep) {
        out.done = !!rep.made;
        out.meta = 'By ' + App.dates.fmt(rep.due);
        out.doneMeta = rep.made ? 'Marked ' + App.dates.fmt(rep.made) : null;
        out.reportId = rep.id;
        out.counted = fmtY(rep.from) + ', plus ' + holes().days + ' days, is ' + fmtY(rep.due) + '.';
      }
    } else if (st.date === 'stemStart') {
      const c = cardNow();
      if (c && c.stem) out.meta = 'From ' + App.dates.fmt(c.from);
      else if (c) {
        /* The OPT card's last day + 1: 2027-02-13 + 1 = 2027-02-14. */
        const first = App.dates.addDays(c.until, 1);
        out.meta = 'From ' + App.dates.fmt(first);
        out.counted = 'Your OPT card ends ' + fmtY(c.until) + '. STEM OPT would start the day after, ' + fmtY(first) + '.';
        out.extra.push('eadEnds');
      }
    } else if (st.date === 'cardEnd') {
      const c = cardNow();
      if (c) {
        out.meta = 'By ' + App.dates.fmt(c.until);
        out.counted = 'Your ' + (c.stem ? 'STEM OPT' : 'OPT') + ' card ends ' + fmtY(c.until) + '.';
        out.extra.push('eadEnds');
      }
    }
    return out;
  }

  function goalStep(kind, st) {
    const h = holes();
    const f = stepFacts(kind, st);
    const refs = [];
    if (st.source) refs.push(App.ruleWith && f.counted ? App.ruleWith(st.source, [f.counted]) : st.source);
    f.extra.forEach((x) => refs.push(x));
    const detail = '<p>' + C.escText(fill(st.line, h)) + '</p>' + (refs.length ? C.how(refs) : '');
    return C.task({
      key: 'goal:' + kind + ':' + st.key, title: fill(st.title, h), done: f.done,
      meta: f.meta, doneMeta: f.doneMeta, detail: detail,
    });
  }

  function goalSection(kind) {
    const g = G().kinds[kind];
    if (!g) return '';
    return '<section class="pl-sec pl-goal" data-goal="' + C.esc(kind) + '" aria-label="' + C.esc(g.title) + '">' +
      '<header class="pl-goal-head"><div><h2 class="pl-sec-title">' + C.escText(g.title) + '</h2>' +
      (g.sub ? '<p class="pl-sub t-meta">' + C.escText(g.sub) + '</p>' : '') + '</div>' +
      '<button type="button" class="btn btn-text is-small" data-goal-remove="' + C.esc(kind) + '" aria-label="' + C.esc(G().remove + ': ' + g.title) + '">' + C.esc(G().remove) + '</button>' +
      '</header>' +
      '<div class="list pl-list" aria-label="' + C.esc(g.title) + '">' + g.steps.map((st) => goalStep(kind, st)).join('') + '</div>' +
      '</section>';
  }

  function addView() {
    const all = (G().order || Object.keys(G().kinds)).filter((k) => G().kinds[k] && goalList().indexOf(k) < 0);
    if (!all.length) return '';
    if (!App.state['plan:adding']) {
      return '<div class="pl-add">' + C.button({ label: G().add, kind: 'text', attrs: { 'data-goal-add': '' } }) + '</div>';
    }
    return '<div class="pl-pick" role="group" aria-label="' + C.esc(G().addTitle) + '"><p class="pl-pick-title">' + C.esc(G().addTitle) + '</p>' +
      all.map((k) => '<button type="button" class="pl-pick-opt" data-goal-pick="' + C.esc(k) + '"><span>' + C.escText(G().kinds[k].title) + '</span>' +
        (G().kinds[k].sub ? '<span>' + C.escText(G().kinds[k].sub) + '</span>' : '') + '</button>').join('') +
      '<div class="pl-pick-foot">' + C.button({ label: G().cancel, kind: 'text', attrs: { 'data-goal-cancel': '' } }) + '</div></div>';
  }

  const onPlan = () => !!document.querySelector('main#main.screen-plan');
  /* The check and the line where the change landed, or one toast. */
  function receipt(sel, text, undo) {
    const S = W();
    if (S && S.settle && document.querySelector('main#main.screen-plan, main#main.screen-work')) { S.settle(sel, text, undo); return; }
    App.rerender();
    App.toast(text, undo ? { action: G().undo || 'Undo', onAction: undo } : {});
  }

  App.addGoal = (k, o) => {
    const kind = kindOf(k);
    const g = kind && G().kinds[kind];
    if (!g) return { ok: false, error: 'unknown goal' };
    const list = goalList();
    const added = list.indexOf(kind) < 0;
    if (added) list.push(kind);
    if (kind === 'company') delete App.state['goal:company:removed'];
    delete App.state['plan:adding'];
    const text = fill(G().added, { title: g.title });
    const undo = added ? () => { App.removeGoal(kind, { quiet: true }); App.rerender(); } : null;
    if (added) App.emit('goal', kind, true, null);
    if (!(o && o.quiet)) receipt('.pl-goal[data-goal="' + kind + '"]', text, undo);
    return { ok: true, kind: kind, title: g.title, added: added, text: text, undo: undo };
  };
  App.removeGoal = (k, o) => {
    const kind = kindOf(k);
    const list = goalList();
    const i = list.indexOf(kind);
    if (i < 0) return { ok: false };
    list.splice(i, 1);
    App.emit('goal', kind, false, null);
    const g = G().kinds[kind];
    const text = fill(G().removed, { title: g ? g.title : kind });
    const undo = () => { if (goalList().indexOf(kind) < 0) goalList().splice(i, 0, kind); App.emit('goal', kind, true, null); App.rerender(); };
    if (!(o && o.quiet)) {
      App.rerender();
      if (App.haptic) App.haptic('select');
      App.toast(text, { action: G().undo || 'Undo', onAction: undo });
    }
    return { ok: true, kind: kind, text: text, undo: undo };
  };

  /* App.saveFact(fact, { quiet? }) : a fact the student stated in Ask, saved
     to her record with Undo. Nothing is assumed: a job needs its first day. */
  App.saveFact = (fact, o) => {
    const f = fact || {};
    const quiet = !!(o && o.quiet);
    const S = W();
    let res = null;
    if (f.kind === 'goal') return App.addGoal(f.goal || f.value, o);
    if (f.kind === 'stemIntent') {
      if (['yes', 'no', 'unsure'].indexOf(f.value) < 0 || !App.setStemIntent) return { ok: false, error: 'unknown answer' };
      const was = App.stemIntent();
      App.setStemIntent(f.value);
      res = { ok: true, text: f.value === 'yes' ? 'Saved: you plan to apply for STEM OPT.' : f.value === 'no' ? 'Saved: not applying for STEM OPT this time.' : 'Saved: not sure yet about STEM OPT.',
        undo: () => { App.setStemIntent(was || null); } };
      if (!quiet) App.toast(res.text, { action: G().undo || 'Undo', onAction: res.undo });
      return res;
    }
    if (!S) return { ok: false, error: 'work page not loaded' };
    if (f.kind === 'job') {
      res = S.addJob({ employer: f.employer, title: f.title, hours: f.hours, start: f.start, own: !!f.own });
      if (!res.ok) return { ok: false, errors: res.errors, needs: Object.keys(res.errors) };
      if (!quiet) receipt('.wk-job[data-job="' + (window.CSS && CSS.escape ? CSS.escape(res.job.id) : res.job.id) + '"]', res.text, res.undo);
      return res;
    }
    if (f.kind === 'hours') {
      const name = String(f.employer || '').toLowerCase();
      const job = S.jobsNow().filter((j) => j.id === f.jobId || (name && j.employer.toLowerCase() === name))[0] || (S.jobsNow().length === 1 ? S.jobsNow()[0] : null);
      if (!job) return { ok: false, needs: ['employer'] };
      res = S.setHours(job.id, f.hours, f.from || (L() ? L().now() : App.data.today.iso));
      if (!res.ok) return { ok: false, errors: res.errors, needs: Object.keys(res.errors) };
      /* On Work the check-in loop settles in its panel; elsewhere one toast. */
      App.rerender();
      if (!quiet && !document.querySelector('main#main [data-loop="' + res.loopId + '"]')) App.toast(res.text, { action: G().undo || 'Undo', onAction: res.undo });
      return res;
    }
    return { ok: false, error: 'unknown fact' };
  };

  /* Her own company on the record brings its goal with it. */
  function goalsShown() {
    const list = goalList();
    if (ownJob() && list.indexOf('company') < 0 && !App.state['goal:company:removed']) list.push('company');
    return list.filter((k) => G().kinds[k]);
  }

  /* A goal step ticked: the report step of her company is Mark reported. */
  document.addEventListener('duly:change', (ev) => {
    const d = ev.detail || {};
    if (d.kind === 'task' && d.key === 'goal:company:report') {
      const j = ownJob();
      const rep = j && W() ? W().jobReports(j).filter((x) => x.id === 'report:job-start:' + j.id)[0] : null;
      if (rep && App.markReport) App.markReport(rep.id, !!d.value);
    }
  });

  window.SCREENS.plan = {
    title: 'Plan',
    paramsInPlace(params, prev) { return placeOf(params) === placeOf(prev); },
    titleFor() { return 'Plan'; },
    render(data, params) {
      const r = route(params);
      return STYLE + '<header class="page-header"><h1 class="t-big" tabindex="-1">Plan</h1></header>' +
        nowView() + stepsView(data, r.params) + goalsShown().map(goalSection).join('') + addView() + C.footer();
    },
    mount(root) {
      root.classList.add('screen-plan');
      if (window.SCREENS.steps) window.SCREENS.steps.mount(root);
      root.addEventListener('click', (ev) => {
        const t = ev.target;
        if (t.closest('[data-goal-add]')) {
          App.state['plan:adding'] = true;
          if (App.haptic) App.haptic('select');
          App.rerender();
          const pick = document.querySelector('main#main .pl-pick');
          if (pick) {
            if (App.play) App.play(pick, 'is-arriving');
            pick.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            const first = pick.querySelector('[data-goal-pick]');
            if (first) first.focus({ preventScroll: true });
          }
          return;
        }
        if (t.closest('[data-goal-cancel]')) { delete App.state['plan:adding']; App.rerender(); return; }
        const pick = t.closest('[data-goal-pick]');
        if (pick) { App.addGoal(pick.dataset.goalPick); return; }
        const rm = t.closest('[data-goal-remove]');
        if (rm) {
          const kind = rm.dataset.goalRemove;
          if (kind === 'company') App.state['goal:company:removed'] = true;
          const res = App.removeGoal(kind, { quiet: true });
          if (!res.ok && kind === 'company') res.ok = true;
          App.rerender();
          App.toast(fill(G().removed, { title: (G().kinds[kind] || {}).title || kind }), { action: G().undo || 'Undo', onAction: () => {
            delete App.state['goal:company:removed'];
            if (res.undo) res.undo(); else App.rerender();
          } });
        }
      });
      /* A line on Home opened this loop: it is unfolded here; bring it into
         view and put focus on it. A job's loop opens on Work. */
      const focusId = App.state['plan:focus'];
      if (focusId) {
        delete App.state['plan:focus'];
        const lp = L() ? L().get(focusId) : null;
        if (lp && onWork(lp)) {
          App.state['work:focus'] = focusId;
          App.state['loopOpen:' + focusId] = true;
          setTimeout(() => App.go('work', { replace: true }), 0);
          return;
        }
        const box = root.querySelector('[data-loop="' + CSS.escape(focusId) + '"]');
        if (box) {
          setTimeout(() => {
            box.scrollIntoView({ block: 'center' });
            const head = box.querySelector('.loop-head');
            if (head) head.focus({ preventScroll: true });
            if (App.play) App.play(box, 'is-arriving');
          }, 0);
        }
      }
    },
  };

})();
