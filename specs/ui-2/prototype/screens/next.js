/* What's next: the student's next step after OPT (STEM OPT extension).
   States, from App.state.stemIntent (shared with Home, Timeline and Your case):
     null      A. ask intent first (hero with Yes / No / I'm not sure yet)
     'unsure'  A plus the dates and the steps, to read before deciding
     'yes'     B. the plan: dates, your steps (federal plus your school's, with
               the DSO email draft on the school step), your applications
     'no'      C. a short line and "Change my answer"
   The hero is the page title here: no pageHeader above it. Its eyebrow
   carries the screen name, "What's next · STEM OPT extension".

   The steps are live, not a saved draft (Note 11). They come from
   App.steps('stem'): the federal steps worked out from the sourced rule pack,
   with the student's own school steps placed Before, Alongside or After them
   (Note 10). One quiet line says so and links to Updates, and a step a rule
   change touched carries "Updated Sep 30", linking to that update's page.

   The DSO email opens only when asked (Note 4): it lives on the school step
   and moves closed, open, "Email sent?", done, in place (C.emailDraft).

   Every change inside the page happens in place: checkboxes, the draft, the
   school step form and the intent answer never move the scroll.
   #/next/ask, #/next/yes, #/next/no and #/next/unsure force a state for review. */
(function () {
  'use strict';

  /* Layout only. Type sizes come from system.css. */
  const STYLE = '<style>' +
    '.screen-next .hero-note { margin-top: var(--s-12); }' +
    '.screen-next .next-steps-head { display: flex; flex-direction: column; gap: var(--s-12); margin-bottom: var(--s-16); }' +
    '.screen-next .next-steps-head .rules-line { margin-top: 0; }' +
    '.screen-next .next-change { margin-top: var(--s-24); }' +
    '</style>';

  const FORCED = { ask: null, yes: 'yes', no: 'no', unsure: 'unsure' };

  /* This screen owns the STEM OPT question. Every other screen links here. */
  function currentIntent(params) {
    const p = params && params[0];
    if (p && Object.prototype.hasOwnProperty.call(FORCED, p)) return FORCED[p];
    return App.stemIntent();
  }
  const e = (s) => C.esc(s);
  const eyebrow = (topic) => "What's next · " + topic;

  /* ---------------- hero ---------------- */

  function heroAsk(stem, unsure) {
    const actions =
      C.button({ label: 'Yes, I plan to', kind: 'primary', attrs: { 'data-answer': 'stemIntent', 'data-value': 'yes' } }) +
      C.button({ label: 'No, not this time', kind: 'pill', attrs: { 'data-answer': 'stemIntent', 'data-value': 'no' } }) +
      (unsure ? '' : C.button({ label: "I'm not sure yet", kind: 'text', cls: 'is-quiet is-small', attrs: { 'data-answer': 'stemIntent', 'data-value': 'unsure' } }));
    return C.hero({ eyebrow: eyebrow(stem.eyebrow), title: stem.askTitle, subline: stem.askLine, icon: null, source: 'stemList', actions: actions }) +
      (unsure ? '<p class="t-lead hero-note">' + e(stem.unsureLine) + '</p>' : '');
  }
  function heroYes(stem) {
    return C.hero({ eyebrow: eyebrow(stem.eyebrow), title: stem.yesTitle, subline: stem.yesLine, icon: null, source: 'stemOpens' });
  }
  function heroNo(stem) {
    return C.hero({
      eyebrow: eyebrow('After OPT'), title: stem.noTitle, subline: stem.noLine, icon: null, source: 'eadEnds',
      actions: C.button({ label: 'Change my answer', kind: 'text', attrs: { 'data-next': 'change' } }),
    });
  }

  /* ---------------- 1. dates ---------------- */

  /* Today is its own first point (Sep 30, from data.today), so it never
     shares an x position with a dated point: the strip reads Today, then
     Start preparing, Window opens, Latest day to file. Its dot is a small
     quiet one (.date-pt.is-today in system.css), not an accent milestone. */
  function datesSection(data) {
    const stem = data.stem;
    const today = { date: data.today.short, label: stem.today.label, today: true };
    return C.section({
      eyebrow: 'Your dates',
      content: '<div class="next-dates">' + C.dates({ points: [today].concat(stem.dates) }) + '</div>',
    });
  }

  /* ---------------- 2. your steps: federal plus your school's ---------------- */

  function federalTask(entry) {
    const t = entry.step;
    return C.task({
      key: entry.key, title: t.title, meta: t.meta, source: t.source, done: entry.done,
      caution: t.caution, cautionSource: t.cautionSource,
      updated: t.updated ? { date: t.updated.date, href: t.updated.href } : null,
      waitingOn: entry.waitingOn,
      below: t.unknown ? C.unknown(t.unknown) : null,
      onDone: t.onDone ? C.unknown(t.onDone) + C.source(t.onDone.source, { inline: true }) : null,
    });
  }

  /* One list of steps, shared with Checklists through App.steps('stem').
     planned: the DSO email draft and "Add your school's step" show only once
     the student plans to apply. */
  function stepsSection(data, planned) {
    const entries = App.steps('stem');
    const shown = entries.filter((x) => !x.afterOf || x.afterOf.done);
    const done = shown.filter((x) => x.done).length;
    const pct = shown.length ? Math.round((done / shown.length) * 100) : 0;
    const suffix = data.checklists.stem.progressMeta;
    const rows = entries.map((x) => x.type === 'school'
      ? C.schoolStep(x, { email: planned ? data.email : null, primary: true })
      : federalTask(x));
    const add = planned ? C.addSchoolStep({
      path: 'stem',
      federal: data.stem.tasks.map((t) => ({ key: t.key, title: t.title })),
    }) : '';
    return C.section({
      id: 'next-steps',
      eyebrow: 'Your steps',
      content: '<div class="next-steps-head">' +
        C.progress({ pct: pct, label: done + ' of ' + shown.length + ' done · ' + suffix, suffix: suffix }) +
        C.rulesLine(data.rules) + '</div>' +
        C.list(rows, { accordion: false, label: 'Steps' }) + add,
    });
  }

  /* ---------------- 3. your applications ---------------- */

  /* The STEM OPT application first, then the OPT one it follows. Each opens
     its own page in Applications (receipt number, status as of a date). */
  function appsSection(data) {
    const items = (data.applications && data.applications.items) || [];
    const order = ['stem', 'opt'].map((id) => items.filter((a) => a.id === id)[0]).filter(Boolean);
    return C.section({
      eyebrow: 'Your applications',
      content: C.list(order.map(C.applicationRow), { accordion: false, label: 'Applications' }),
    });
  }

  /* ---------------- screen ---------------- */

  window.SCREENS['next'] = {
    title: "What's next",
    paramsInPlace: true,
    render(data, params) {
      const stem = data.stem;
      const intent = currentIntent(params);
      const out = [STYLE];
      if (intent === 'yes') {
        out.push(heroYes(stem), datesSection(data), stepsSection(data, true), appsSection(data),
          '<p class="next-change">' + C.button({ label: 'Not planning to apply? Change my answer', kind: 'text', cls: 'is-quiet is-small', attrs: { 'data-next': 'change' } }) + '</p>');
      } else if (intent === 'no') {
        out.push(heroNo(stem));
      } else {
        out.push(heroAsk(stem, intent === 'unsure'));
        if (intent === 'unsure') out.push(datesSection(data), stepsSection(data, false));
      }
      out.push(C.footer());
      return out.join('');
    },
    mount(root) {
      root.classList.add('screen-next');
      root.addEventListener('click', onClick);
      listen();
      if (App.state.nextFocusHero) {
        App.state.nextFocusHero = false;
        const h = root.querySelector('#hero-title');
        if (h) h.focus({ preventScroll: true });
      }
    },
  };

  /* ---------------- behaviour ---------------- */

  function here() { return App.route === 'next' && document.querySelector('main.screen-next'); }

  /* A new intent redraws in place, then puts focus on the new title. */
  function refresh() {
    App.state.nextFocusHero = true;
    if (App.params && App.params.length) App.go('next', { replace: true, inPlace: true });
    else App.rerender();
  }

  function onClick(ev) {
    const act = ev.target.closest('[data-next]');
    if (!act) return;
    if (act.dataset.next === 'change') {
      App.state.stemIntent = null;
      App.emit('answer', 'stemIntent', null, act);
    }
  }

  /* Unchecking the school step after "Mark done" brings the draft back to
     "Email sent?", so the two never disagree. */
  function syncDraft(key, on) {
    const email = App.data.email || {};
    if (key !== email.step || on) return;
    const k = email.key || 'dso';
    if (App.state['draft:' + k] !== 'done') return;
    App.state['draft:' + k] = 'left';
    document.querySelectorAll('.screen-next [data-draft="' + k + '"]').forEach((b) => { b.dataset.state = 'left'; });
  }

  let listening = false;
  function listen() {
    if (listening) return;
    listening = true;
    document.addEventListener('duly:change', (ev) => {
      if (!here()) return;
      const d = ev.detail || {};
      if (d.kind === 'answer' && d.key === 'stemIntent') { refresh(); return; }
      if (d.kind === 'task') syncDraft(d.key, d.value);
    });
  }
})();
