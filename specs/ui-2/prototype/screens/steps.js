/* Next steps (#/steps): the path the student is on (STEM OPT), its key dates
   and short tasks, in one page (Round 3, notes 2 and 4). Replaces What's next
   and Checklists; #/next and #/checklists redirect here with their params.

   Only the current path shows. Past and later paths (CPT, OPT, H-1B) live on
   the Timeline, so #/steps/cpt, #/steps/opt and #/steps/h1b go to #/timeline
   in place.

   Round 5, note 3: the page comes alive.
     title, with the why behind its ⓘ
     the intent, answered right here (data-answer="stemIntent", shared with
       Home, Timeline and Your profile); once answered, one quiet line + Change
     C.timeline(App.stemTimeline()): drawn to scale from today to the last
       day to file, the Prepare and Filing window spans, the Today marker
       with one line ("46 days until the window opens"), only the date that
       matters now emphasized. It draws in once (its own key, so Home's strip
       never uses up the motion) and is at rest on every redraw.
     Steps: federal and "Your school" steps together, in order (App.steps).
       The current step (App.currentStep) has a quiet tint. Each step opens
       in place, from its chevron or a tap on its row, to its one plain line
       and the rule behind it (the source mark sits inside the detail, so a
       row carries one mark). Ticking a step draws its check, settles the
       row, fills the bar beside the count, gives a light tap and moves the
       tint to the next open step (app.js setTask, advanceCurrent). The list
       carries data-current, so unticking brings the tint back too.
       When every step is done: the bar settles, the confetti plays the first
       time only (App.complete), and one quiet line says what comes next.
       The E-Verify step carries the Employer check's fact as its meta and
       keeps See, to #/employer. School steps keep Open, to the school page.
     "Add your school's page": one control. It opens to a link or a PDF,
       shows the steps found, and they are confirmed once (C.schoolImport).
     The DSO email opens only on request, from the school step that needs it.

   Review links: #/steps/school (steps found, waiting to confirm),
   #/steps/school-added (confirmed), #/steps/2026-12-01 (the timeline as it
   reads on that day: inside the window, the last day emphasized). */
(function () {
  'use strict';

  /* Layout only. Sizes are the system's three (big, medium, small). */
  const STYLE = '<style>' +
    '.screen-steps .st-head { margin-bottom: var(--s-32); }' +
    '.screen-steps .st-ask { margin-top: var(--s-24); display: flex; flex-direction: column; align-items: flex-start; gap: var(--s-16); }' +
    '.screen-steps .st-intent { margin-top: var(--s-12); display: flex; align-items: center; gap: var(--s-12); }' +
    '.screen-steps .st-intent .btn { padding: 0; }' +
    '.screen-steps .st-big { display: flex; align-items: center; gap: var(--s-8); }' +
    '.screen-steps .st-big .inline-src { margin-left: 0; }' +
    '.screen-steps .st-when { margin-bottom: 0; }' +
    /* The count and its bar, at the right of the Steps heading. */
    '.screen-steps .st-steps .section-head { align-items: center; }' +
    '.screen-steps .st-progress { gap: var(--s-12); min-width: 0; }' +
    '.screen-steps .st-progress .bar { width: 96px; flex: none; }' +
    '.screen-steps .st-progress [data-progress-label] { white-space: nowrap; }' +
    /* A step's detail: its plain line, then the rule in a quieter voice. */
    '.screen-steps .task-detail p { margin: 0; }' +
    '.screen-steps .task-detail .st-rule { color: var(--ink-3); }' +
    '.screen-steps .task-detail .st-rule .inline-src { vertical-align: -3px; }' +
    /* The current step, open: the tint runs on under its detail. */
    '.screen-steps .task.is-current.is-open > .row { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }' +
    '.screen-steps .task.is-current > .task-detail { background: var(--accent-tint); border-radius: 0 0 var(--r-field) var(--r-field); transition: background .3s ease; }' +
    '.screen-steps .task-detail { transition: background .3s ease; }' +
    '.screen-steps .st-add { display: flex; align-items: center; gap: var(--s-8); }' +
    '.screen-steps .st-add .btn { padding: var(--s-12) 0; }' +
    '.screen-steps .st-complete { margin-top: var(--s-16); color: var(--ink-2); }' +
    '.screen-steps .st-steps .rules-line { margin-top: var(--s-24); }' +
    '.screen-steps .st-done-list .row-lead { height: var(--lh-small); }' +
    '</style>';

  const OPEN = 'steps:schoolOpen';
  const e = (s) => C.esc(s);
  const ISO = /^\d{4}-\d{2}-\d{2}$/;

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
    let demo = null, today = null;
    (params || []).forEach((x) => {
      if (x === 'school' || x === 'school-added') demo = x;
      else if (ISO.test(x) && !isNaN(Date.parse(x))) today = x;
    });
    return { demo: demo, today: today };
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
  window.addEventListener('hashchange', () => { if (location.hash !== demoApplied) demoApplied = null; });

  function answerBtn(label, value, cls) {
    return '<button type="button" class="' + cls + '" data-answer="stemIntent" data-value="' + e(value) + '">' + e(label) + '</button>';
  }

  /* The rule with one more sentence of its own, so a line keeps one mark. */
  function withPlain(key, extra) {
    const rule = C.getRule(key) || {};
    return Object.assign({}, rule, { plain: [rule.plain, extra].filter(Boolean).join(' ') });
  }

  function sentence(t) { return t ? String(t).replace(/\.?$/, '.') : null; }

  /* A step's detail, opened in place: its own plain line, then the rule it
     comes from with the source mark. Nothing when there is neither. */
  function detailOf(line, ruleKey) {
    const rule = ruleKey ? C.getRule(ruleKey) : null;
    const parts = [];
    if (line) parts.push('<p>' + C.escText(line) + '</p>');
    if (rule) {
      parts.push('<p class="st-rule">' + (rule.plain ? C.escText(rule.plain) : C.escText(rule.name || '')) +
        ' ' + C.source(ruleKey, { inline: true }) + '</p>');
    }
    return parts.length ? parts.join('') : null;
  }

  /* The E-Verify step: the Employer check's fact as its meta, so the page
     never says it twice. Never a verdict, only what the search shows. */
  function everifyMeta() {
    const emp = App.employer ? App.employer() : null;
    const ev = emp && emp.everify;
    if (!ev || !ev.value) return null;
    return ev.label + ': ' + String(ev.value).toLowerCase() + (ev.checked ? ', checked ' + ev.checked : '');
  }

  function fedRow(entry, current) {
    const s = entry.step;
    const isEv = entry.key === 'everify';
    const detail = detailOf(s.info, s.source);
    return C.task({
      key: entry.key, title: s.title, done: entry.done,
      meta: isEv ? (everifyMeta() || s.meta || null) : (s.meta || null),
      open: isEv && s.open ? s.open : null,
      /* Without a detail the explanation stays behind an ⓘ, as before. */
      info: detail ? null : (s.info || null),
      updated: s.updated || null,
      onDone: s.onDone ? C.unknown(s.onDone) : null,
      current: current,
      detail: detail,
    });
  }

  function schoolRow(entry, data, current) {
    const s = entry.step;
    const line = s.info || sentence(s.meta);
    const plain = Object.assign({}, entry, { step: Object.assign({}, s, { meta: null, info: null }) });
    return C.schoolStep(plain, {
      email: Object.assign({}, data.email, { openLabel: 'Email your DSO' }),
      current: current,
      detail: detailOf(line, null),
    });
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

  /* The line under a finished list. */
  const COMPLETE_LINE = 'All steps done. Your receipt number goes in ';
  function completeLine(allDone) {
    return '<p class="st-complete t-meta" data-steps-complete' + (allDone ? '' : ' hidden') + '>' +
      e(COMPLETE_LINE) + '<a class="link" href="#/uscis">USCIS status</a>.</p>';
  }

  /* The real timeline. Its own key, so the draw-in plays here once even
     after Home has shown its small strip. */
  function timelineFor(today) {
    const props = App.stemTimeline(today ? { today: today } : undefined);
    return '<section class="st-when" aria-label="' + e(props.label || 'Key dates') + '">' +
      C.timeline(Object.assign({}, props, { key: 'steps:stem' })) + '</section>';
  }

  function stemView(data, r) {
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
    const now = App.currentStep('stem');
    const rows = entries.map((en) => (en.type === 'school' ? schoolRow(en, data, en.key === now) : fedRow(en, en.key === now)));
    const visible = entries.filter((en) => !(en.afterOf && !en.afterOf.done));
    const done = visible.filter((en) => en.done).length;
    const total = visible.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const label = done + ' of ' + total + ' done';

    /* data-current on the list: app.js keeps one step current in it, even
       after every step was done and one is unticked again. */
    const list = C.list(rows, { accordion: false, label: 'STEM OPT steps' }).replace('<div class="list"', '<div class="list" data-current');

    const steps = '<section class="section st-steps" aria-labelledby="st-steps-h">' +
      '<div class="section-head"><h2 class="sh-label t-eyebrow" id="st-steps-h">Steps</h2>' +
      '<div class="progress st-progress" data-progress>' + '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Steps done"><i style="width:' + pct + '%"></i></div>' +
      '<span class="t-meta num" data-progress-label>' + e(label) + '</span></div></div>' +
      list +
      completeLine(total > 0 && done === total) +
      schoolAdd(data) +
      C.rulesLine(data.rules) +
      '</section>';

    return head(ask) + timelineFor(r.today) + steps + C.footer();
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
      return STYLE + stemView(data, r);
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

  /* The finished line shows and hides in place as steps are ticked. It sits
     under the list, so nothing above it moves. */
  function syncComplete() {
    const main = document.querySelector('main#main.screen-steps');
    if (!main) return;
    const line = main.querySelector('[data-steps-complete]');
    if (!line) return;
    const checks = Array.from(main.querySelectorAll('.st-steps .list [role="checkbox"][data-task]')).filter((c) => !c.closest('[hidden]'));
    const all = checks.length > 0 && checks.every((c) => c.getAttribute('aria-checked') === 'true');
    if (all === !line.hidden) return;
    line.hidden = !all;
    if (all) App.play(line, 'is-arriving');
  }

  let wired = false;
  function wire() {
    if (wired) return;
    wired = true;
    document.addEventListener('duly:change', (ev) => {
      const d = ev.detail || {};
      if (App.route !== 'steps') return;
      if (d.kind === 'task') { syncComplete(); return; }
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
