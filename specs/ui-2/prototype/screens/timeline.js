/* Timeline. The student's F-1 years as one accordion of phases.
   Done phases summarise what was done, the current phase (NOW) is open by
   default and shows what matters now, the STEM OPT phase carries the plan:
   its dates, and every step in order, the student's own school steps
   included (App.steps('stem'), Note 10). The federal steps are worked out
   from the current rule pack; a step a rule change touched shows
   "Updated Sep 30" and the phase ends with the quiet "Rules checked" line.
   The STEM OPT choice is answered here, in place (Note 1).
   Routes: #/timeline, #/timeline/<phase key> opens that phase,
   #/timeline/no-ead shows the screen without an EAD card on file. */
(function () {
  'use strict';

  /* Layout only. Type sizes come from system.css. */
  const STYLE =
    '<style>' +
    '.screen-timeline .tl-bar { margin-top: var(--s-12); max-width: 50%; }' +
    '.screen-timeline .disc > .list + .tl-links, .screen-timeline .disc > .list + .disc-link { margin-top: var(--s-4); }' +
    '.screen-timeline .disc > .t-eyebrow { margin-top: var(--s-16); }' +
    '.screen-timeline .disc > .t-eyebrow:first-child { margin-top: 0; }' +
    '.screen-timeline .disc > .t-eyebrow + .list { margin-top: var(--s-4); }' +
    '.screen-timeline .tl-line .src { margin-left: var(--s-4); vertical-align: middle; }' +
    '.screen-timeline .tl-links { display: flex; flex-wrap: wrap; align-items: baseline; column-gap: var(--s-24); row-gap: var(--s-8); }' +
    '.screen-timeline .tl-links .rules-line { margin-top: 0; }' +
    '.screen-timeline .disc > .list > .ask:first-child { border-top: 0; }' +
    '.screen-timeline .disc > .list > .ask:last-child { border-bottom: 0; }' +
    '.screen-timeline .disc > .list > .ask > .row { padding-top: 0; }' +
    '.screen-timeline .vrow a.v-value:hover { color: var(--accent-hover); }' +
    '</style>';

  const EAD_UNKNOWN = { action: 'Add your EAD card', rest: 'to see these dates.', href: '#/documents/add' };

  /* ---------------- helpers ---------------- */

  function docsLink(link) {
    return '<a class="disc-link" href="' + C.esc(link.href) + '">' + C.esc(link.label) + '</a>';
  }

  /* A value row whose answer opens a page (the OPT application). */
  function linkRow(label, value, href) {
    return '<div class="item vrow"><div class="row is-static">' +
      '<span class="v-label">' + C.esc(label) + '</span>' +
      '<span class="v-cell"><a class="v-value link num" href="' + C.esc(href) + '">' + C.esc(value) + '</a></span>' +
      '</div></div>';
  }

  /* The STEM OPT steps as shown now: after-steps count only once revealed. */
  function stemCount() {
    const shown = App.steps('stem').filter((e) => !(e.afterOf && !e.afterOf.done));
    return { done: shown.filter((e) => e.done).length, total: shown.length };
  }

  /* ---------------- phase content ---------------- */

  function doneContent(p) {
    if (p.rows) {
      return C.list(p.rows.map((r) => C.row({ title: r.title, meta: r.meta })), { accordion: false, label: p.title });
    }
    return C.disclosure({ text: p.text }) + (p.link ? docsLink(p.link) : '');
  }

  function optContent(data, p, noEad) {
    const rows = [];
    p.now.forEach((n) => {
      if (noEad && n.source === 'unemployment') return;
      if (n.label === 'Application') {
        const app = App.findApplication('opt');
        if (app) { rows.push(linkRow('Application', (app.receipt ? app.receipt + ' · ' : '') + C.statusLine(app), '#/applications/' + app.id)); return; }
      }
      rows.push(C.valueRow({ label: n.label, value: n.value, source: n.source, editable: false, num: true }));
    });
    return (noEad ? '<p>' + C.unknown(EAD_UNKNOWN) + '</p>' : '') +
      '<p class="t-eyebrow">What matters now</p>' +
      C.list(rows, { accordion: false, label: 'What matters now' }) +
      docsLink(p.link);
  }

  /* The plan: the window in one line, then every step in order. */
  function stemPlan(data, noEad) {
    const line = noEad
      ? '<p>' + C.unknown({ action: 'Add your EAD card', rest: 'to see when your window opens.', href: '#/documents/add' }) + '</p>'
      : '<p class="tl-line">' + C.esc(data.stem.yesTitle + ' You can file from ' + data.stem.dates[1].date + ' to ' + data.stem.dates[2].date + '.') + C.source('startPreparing', { inline: true }) + '</p>';
    const steps = App.steps('stem').map((e) => {
      if (e.type === 'school') return C.schoolStep(e, { email: data.email, primary: false });
      return C.task(Object.assign({}, e.step, { key: e.key, done: e.done, waitingOn: e.waitingOn }));
    });
    return line +
      '<p class="t-eyebrow">Your steps</p>' +
      C.list(steps, { accordion: false, label: 'Your STEM OPT steps' }) +
      '<div class="tl-links">' +
      '<a class="disc-link" href="#/checklists/stem">Open the checklist</a>' +
      C.rulesLine(data.rules) +
      '</div>';
  }

  function stemAsk(data, intent) {
    return C.list([C.ask({
      key: 'stemIntent',
      title: data.stem.askTitle,
      meta: intent === 'unsure' ? data.stem.unsureLine : data.stem.askLine,
      choices: [{ label: 'Yes, I plan to', value: 'yes' }, { label: 'No, not this time', value: 'no' }],
      notSure: intent === 'unsure' ? null : "I'm not sure yet",
    })], { accordion: false, label: 'STEM OPT' });
  }

  function stemContent(data, p, intent, noEad) {
    if (intent === 'yes') return stemPlan(data, noEad);
    if (intent === 'no') {
      return '<p>' + C.esc(data.stem.noTitle + ' ' + data.stem.noLine) + '</p>' +
        '<div class="btn-group"><button type="button" class="btn btn-text is-small" data-tl="change">Change your answer</button></div>';
    }
    /* Not answered yet: ask here. Not sure: ask again, with the plan anyway. */
    return stemAsk(data, intent) + (intent === 'unsure' ? stemPlan(data, noEad) : '');
  }

  function stemMeta(p, intent, noEad) {
    if (noEad) return 'Your window dates come from your EAD card';
    if (intent === 'no') return 'Not this time';
    if (intent === 'yes') {
      const c = stemCount();
      return p.meta + ' · ' + c.done + ' of ' + c.total + ' steps done';
    }
    return p.meta;
  }

  /* ---------------- render ---------------- */

  function render(data, params) {
    const noEad = (params || []).indexOf('no-ead') !== -1;
    const keys = data.phases.map((p) => p.key);
    const asked = (params || []).find((k) => keys.indexOf(k) !== -1);
    const openKey = asked || (data.phases.find((p) => p.state === 'now') || {}).key;
    const intent = App.stemIntent();

    const items = data.phases.map((p) => {
      const base = { key: p.key, title: p.title, meta: p.meta, lead: C.phaseMark(p.state), open: p.key === openKey };
      if (p.state === 'done') return C.row(Object.assign(base, { content: doneContent(p) }));
      if (p.state === 'now') {
        return C.row(Object.assign(base, {
          nowTag: true,
          meta: noEad ? p.meta.split(' · ')[0] : p.meta,
          below: noEad ? '' : '<div class="tl-bar">' + C.bar(p.bar, 'Days used on your card') + '</div>',
          content: optContent(data, p, noEad),
        }));
      }
      if (p.key === 'stem') {
        return C.row(Object.assign(base, { meta: stemMeta(p, intent, noEad), content: stemContent(data, p, intent, noEad) }));
      }
      return C.row(Object.assign(base, { content: C.disclosure({ text: p.text }) }));
    });

    return C.pageHeader({ title: 'Timeline', subline: "What you've done, where you are now, and when to start what comes next." }) +
      C.list(items, { label: 'Your phases' }) +
      C.footer() +
      STYLE;
  }

  /* ---------------- behaviour ---------------- */

  const here = () => window.App && App.route === 'timeline';

  /* After a step is ticked: the STEM row's count, and confetti the first time
     every step is done (the same key Checklists uses, so it fires once). */
  function onTask() {
    const main = document.getElementById('main');
    const item = main && main.querySelector('.item[data-key="stem"]');
    if (!item) return;
    const intent = App.stemIntent();
    const meta = item.querySelector(':scope > .row .row-meta');
    const phase = App.data.phases.find((p) => p.key === 'stem');
    if (meta && phase && intent === 'yes' && !(App.params || []).includes('no-ead')) meta.textContent = stemMeta(phase, intent, false);
    const checks = Array.from(item.querySelectorAll('.disc [role="checkbox"][data-task]')).filter((c) => !c.closest('[hidden]'));
    if (checks.length && checks.every((c) => c.getAttribute('aria-checked') === 'true')) {
      App.complete('tasks:' + checks.map((c) => c.dataset.task).sort().join(','), item.querySelector('.phase-mark'));
    }
  }

  let listening = false;
  function listen() {
    if (listening) return;
    listening = true;
    document.addEventListener('duly:change', (e) => {
      if (!here()) return;
      const d = e.detail || {};
      if (d.kind === 'answer' && d.key === 'stemIntent') { App.rerender(); return; }
      if (d.kind === 'task') onTask();
    });
  }

  function mount(root) {
    root.classList.add('screen-timeline');
    listen();
    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-tl]');
      if (!act) return;
      if (act.dataset.tl === 'change') {
        App.state.stemIntent = null;
        App.emit('answer', 'stemIntent', null, act);
      }
    });
  }

  window.SCREENS['timeline'] = {
    title: 'Timeline',
    titleFor: () => 'Timeline',
    render: render,
    mount: mount,
  };
})();
