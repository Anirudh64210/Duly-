/* Next steps (#/steps): the path the student is on (STEM OPT), its key dates
   and short tasks, in one page (Round 3, notes 2 and 4). Replaces What's next
   and Checklists; #/next and #/checklists redirect here with their params.

   Only the current path shows. Past and later paths (CPT, OPT, H-1B) live on
   the Timeline, so #/steps/cpt, #/steps/opt and #/steps/h1b go to #/timeline
   in place.

     title, with the why behind its ⓘ
     the intent, answered right here (data-answer="stemIntent", shared with
       Home, Timeline and Your profile); once answered, one quiet line + Change
     the key dates as a strip, each with its source mark
     Steps: federal and "Your school" steps together, in order (App.steps).
       Title only; the detail sits behind the row's one mark. The count at
       the right of the heading moves in place (app.js updateProgress).
     "Add your school's page": one control. It opens to a link or a PDF,
       shows the steps found, and they are confirmed once (C.schoolImport).
     The DSO email opens only on request, from the school step that needs it.

   Review links: #/steps/school (steps found, waiting to confirm),
   #/steps/school-added (confirmed). */
(function () {
  'use strict';

  /* Layout only. Sizes are the system's three (big, medium, small). */
  const STYLE = '<style>' +
    '.screen-steps .st-head { margin-bottom: var(--s-48); }' +
    '.screen-steps .st-ask { margin-top: var(--s-24); display: flex; flex-direction: column; align-items: flex-start; gap: var(--s-16); }' +
    '.screen-steps .st-intent { margin-top: var(--s-12); display: flex; align-items: center; gap: var(--s-12); }' +
    '.screen-steps .st-intent .btn { padding: 0; }' +
    '.screen-steps .st-big { display: flex; align-items: center; gap: var(--s-8); }' +
    '.screen-steps .st-big .inline-src { margin-left: 0; }' +
    /* The date's source mark sits beside its label, not on a line of its own. */
    '.screen-steps .date-pt { display: grid; grid-template-columns: auto 16px; justify-content: start; align-items: center; column-gap: var(--s-8); }' +
    '.screen-steps .date-pt .dp-date { grid-column: 1 / -1; }' +
    '.screen-steps .date-pt .src { margin-top: 0; }' +
    '.screen-steps .st-add { display: flex; align-items: center; gap: var(--s-8); }' +
    '.screen-steps .st-add .btn { padding: var(--s-12) 0; }' +
    '.screen-steps .st-steps .rules-line { margin-top: var(--s-24); }' +
    '.screen-steps .st-done-list .row-lead { height: var(--lh-small); }' +
    '</style>';

  const OPEN = 'steps:schoolOpen';
  const e = (s) => C.esc(s);

  /* Old path views now live on the Timeline. The hash is swapped before the
     router reads it: once at load, and on each hashchange in the capture
     phase, which runs ahead of the router's own listener. */
  const OLD_PATH = /^#\/?(?:steps|next|checklists)\/(?:cpt|opt|h1b)(?:\/|$)/;
  function toTimeline() {
    if (!OLD_PATH.test(location.hash || '')) return false;
    try { history.replaceState(history.state, '', '#/timeline'); } catch (err) { location.replace('#/timeline'); }
    return true;
  }
  toTimeline();
  window.addEventListener('hashchange', toTimeline, true);

  function parse(params) {
    let demo = null;
    (params || []).forEach((x) => {
      if (x === 'school' || x === 'school-added') demo = x;
    });
    return { demo: demo };
  }

  /* A review link forces the school import state once per visit, so the
     student's own clicks afterwards are never overridden by a redraw. */
  let demoApplied = null;
  function applyDemo(demo) {
    if (!demo || demoApplied === location.hash) return;
    demoApplied = location.hash;
    App.setSchoolImport('stem', demo === 'school' ? 'found' : 'confirmed',
      { href: App.data.schoolImport.href, label: App.data.schoolImport.label });
  }
  window.addEventListener('hashchange', () => { if (!/^#\/steps\/.*school/.test(location.hash)) demoApplied = null; });

  function answerBtn(label, value, cls) {
    return '<button type="button" class="' + cls + '" data-answer="stemIntent" data-value="' + e(value) + '">' + e(label) + '</button>';
  }

  /* One mark per step: the rule, with the step's own detail as its plain line. */
  function mark(step) {
    const rule = step.source ? C.getRule(step.source) : null;
    if (!rule) return { info: step.info || null, source: null };
    return { info: null, source: Object.assign({}, rule, { plain: step.info || rule.plain }) };
  }

  /* The rule with one more sentence of its own, so a line keeps one mark. */
  function withPlain(key, extra) {
    const rule = C.getRule(key) || {};
    return Object.assign({}, rule, { plain: [rule.plain, extra].filter(Boolean).join(' ') });
  }

  function sentence(t) { return t ? String(t).replace(/\.?$/, '.') : null; }

  function fedRow(entry) {
    const s = entry.step;
    const m = mark(s);
    return C.task({
      key: entry.key, title: s.title, done: entry.done,
      source: m.source, info: m.info, updated: s.updated || null,
      onDone: s.onDone ? C.unknown(s.onDone) : null,
    });
  }

  function schoolRow(entry, data) {
    const s = entry.step;
    const plain = Object.assign({}, entry, { step: Object.assign({}, s, { meta: null, info: s.info || sentence(s.meta) }) });
    return C.schoolStep(plain, { email: Object.assign({}, data.email, { openLabel: 'Email your DSO' }) });
  }

  function schoolAdd(data) {
    const imp = App.schoolImport('stem');
    if (imp.state !== 'empty' || App.state[OPEN]) return C.schoolImport({ path: 'stem' });
    /* Collapsed: one quiet action. A PDF dropped on it works too. */
    return '<div class="school-import" data-school-import-wrap="stem" data-state="empty">' +
      '<div class="st-add" data-school-import-zone>' +
      '<button type="button" class="btn btn-text" data-steps-school="open">Add your school\'s page</button>' +
      C.info(data.schoolImport.info, { label: "About your school's page" }) +
      '</div></div>';
  }

  function stemView(data) {
    const stem = data.stem;
    const intent = App.stemIntent();
    const head = (inner) => '<header class="page-header st-head">' +
      C.titleWith('<h1 class="t-big" tabindex="-1">STEM OPT extension</h1>', stem.askInfo) + inner + '</header>';

    if (intent === 'no') {
      return head('<p class="st-intent t-meta"><span>Not applying this time</span>' + answerBtn('Change', '', 'btn btn-text is-small') + '</p>') +
        '<p class="st-big t-medium"><span>' + C.escText(stem.noTitle) + '</span>' + C.source(withPlain('eadEnds', stem.noInfo), { inline: true }) + '</p>' +
        C.footer();
    }

    let ask;
    if (intent === 'yes') {
      ask = '<p class="st-intent t-meta"><span>You plan to apply</span>' + answerBtn('Change', '', 'btn btn-text is-small') + '</p>';
    } else {
      ask = '<div class="st-ask">' +
        '<p class="t-medium">' + e(stem.askTitle) + '</p>' +
        '<div class="btn-group">' +
        answerBtn('Yes, I plan to', 'yes', 'btn btn-primary') +
        answerBtn('No, not this time', 'no', 'btn btn-pill') +
        (intent === 'unsure' ? '' : answerBtn('Not sure yet', 'unsure', 'btn btn-text is-quiet')) +
        '</div></div>';
    }

    const entries = App.steps('stem');
    const rows = entries.map((en) => (en.type === 'school' ? schoolRow(en, data) : fedRow(en)));
    const visible = entries.filter((en) => !(en.afterOf && !en.afterOf.done));
    const done = visible.filter((en) => en.done).length;

    const steps = '<section class="section st-steps" aria-labelledby="st-steps-h">' +
      '<div class="section-head"><h2 class="sh-label t-eyebrow" id="st-steps-h">Steps</h2>' +
      '<span class="t-meta num" data-progress><span data-progress-label>' + done + ' of ' + visible.length + ' done</span></span></div>' +
      C.list(rows, { accordion: false, label: 'STEM OPT steps' }) +
      schoolAdd(data) +
      C.rulesLine(data.rules) +
      '</section>';

    return head(ask) + C.dates({ points: stem.dates }) + steps + C.footer();
  }

  window.SCREENS.steps = {
    title: 'Next steps',
    paramsInPlace: true,
    titleFor() { return 'Next steps'; },
    render(data, params) {
      /* Fallback if the hash got past the swap: redraw as the Timeline. */
      if (toTimeline()) setTimeout(App.rerender, 0);
      const r = parse(params);
      applyDemo(r.demo);
      return STYLE + stemView(data);
    },
    mount(root) {
      root.classList.add('screen-steps');
      root.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-steps-school="open"]');
        if (!b) return;
        App.state[OPEN] = true;
        App.rerender();
        const input = document.querySelector('main#main [data-school-import-url]');
        if (input) input.focus({ preventScroll: true });
      });
      wire();
    },
  };

  /* ---------------- behaviour, wired once ---------------- */
  let wired = false;
  function wire() {
    if (wired) return;
    wired = true;
    document.addEventListener('duly:change', (ev) => {
      const d = ev.detail || {};
      if (App.route !== 'steps') return;
      if (d.kind === 'school-import' && d.value === 'empty') {
        /* Not now folds it away; Change keeps the box open for a new link. */
        App.state[OPEN] = !(d.el && d.el.dataset && d.el.dataset.schoolImport === 'dismiss');
        return;
      }
      if (d.kind !== 'answer' || d.key !== 'stemIntent') return;
      App.rerender();
      const first = document.querySelector('main#main [data-answer="stemIntent"]');
      if (first) first.focus({ preventScroll: true });
      const v = App.stemIntent();
      App.toast(v === 'yes' ? 'Saved. Your steps are below' : v === 'no' ? 'Saved. Not this time' : v === 'unsure' ? 'Saved. Decide any time' : 'Answer cleared');
    });
  }
})();
