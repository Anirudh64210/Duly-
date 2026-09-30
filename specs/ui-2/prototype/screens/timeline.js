/* Timeline. The student's F-1 years as one accordion of phases.
   Done phases summarise what was done, the current phase (NOW) is open by
   default and shows what matters now, later phases ask or wait.
   Routes: #/timeline, #/timeline/<phase key> opens that phase,
   #/timeline/no-ead shows the screen without an EAD card on file. */
(function () {
  'use strict';

  const STYLE =
    '<style>' +
    '.screen-timeline .tl-bar { margin-top: var(--s-12); max-width: 50%; }' +
    '.screen-timeline .disc > .list + .disc-link { margin-top: var(--s-4); }' +
    '.screen-timeline .disc > .t-eyebrow + .list { margin-top: var(--s-4); }' +
    '.screen-timeline .disc > p + .t-eyebrow { margin-top: var(--s-16); }' +
    '.screen-timeline .tl-line { display: flex; flex-wrap: wrap; align-items: baseline; column-gap: var(--s-8); }' +
    '</style>';

  const EAD_UNKNOWN = { action: 'Add your EAD card', rest: 'to see these dates.', href: '#/documents/add' };

  /* The STEM OPT intent. The question is owned by What's next; this screen
     shows the answer as one quiet line with a link there. */
  function stemIntent() { return App.stemIntent(); }

  function docsLink(link) {
    return '<a class="disc-link" href="' + C.esc(link.href) + '">' + C.esc(link.label) + '</a>';
  }

  /* ---------------- phase content ---------------- */

  function doneContent(p) {
    if (p.rows) {
      return C.list(p.rows.map((r) => C.row({ title: r.title, meta: r.meta })), { accordion: false, label: p.title });
    }
    return C.disclosure({ text: p.text }) + (p.link ? docsLink(p.link) : '');
  }

  function optContent(p, noEad) {
    const rows = [];
    p.now.forEach((n) => {
      if (!(noEad && n.source === 'unemployment')) {
        rows.push(C.valueRow({ label: n.label, value: n.value, source: n.source, editable: false, num: true }));
      }
    });
    return (noEad ? '<p>' + C.unknown(EAD_UNKNOWN) + '</p>' : '') +
      '<p class="t-eyebrow">What matters now</p>' +
      C.list(rows, { accordion: false, label: 'What matters now' }) +
      docsLink(p.link);
  }

  function stemContent(data, p, intent, noEad) {
    const lead = noEad ? '<p>' + C.unknown({ action: 'Add your EAD card', rest: 'to see when your window opens.', href: '#/documents/add' }) + '</p>' : '';
    if (intent === 'yes') {
      return lead +
        '<p class="tl-line"><span>' + C.esc(p.after.text) + '</span>' + C.source('startPreparing', { inline: true }) + '</p>' +
        docsLink(p.after.link);
    }
    const line = intent === 'no' ? p.declined : p.undecided;
    return lead + '<p>' + C.esc(line.text) + '</p>' + docsLink(line.link);
  }

  function stemMeta(p, intent, noEad) {
    if (noEad) return 'Your window dates come from your EAD card';
    if (intent === 'yes') return p.meta + ' · start preparing by Oct 15';
    return p.meta;
  }

  /* ---------------- render ---------------- */

  function render(data, params) {
    const noEad = (params || []).indexOf('no-ead') !== -1;
    const keys = data.phases.map((p) => p.key);
    const asked = (params || []).find((k) => keys.indexOf(k) !== -1);
    const openKey = asked || (data.phases.find((p) => p.state === 'now') || {}).key;
    const intent = stemIntent();

    const items = data.phases.map((p) => {
      const base = { key: p.key, title: p.title, meta: p.meta, lead: C.phaseMark(p.state), open: p.key === openKey };
      if (p.state === 'done') return C.row(Object.assign(base, { content: doneContent(p) }));
      if (p.state === 'now') {
        return C.row(Object.assign(base, {
          nowTag: true,
          meta: noEad ? p.meta.split(' · ')[0] : p.meta,
          below: noEad ? '' : '<div class="tl-bar">' + C.bar(p.bar, 'Days used on your card') + '</div>',
          content: optContent(p, noEad),
        }));
      }
      if (p.key === 'stem') {
        return C.row(Object.assign(base, { meta: stemMeta(p, intent, noEad), content: stemContent(data, p, intent, noEad) }));
      }
      return C.row(Object.assign(base, { content: C.disclosure({ text: p.text }) }));
    });

    return C.pageHeader({ title: 'Timeline', subline: "Your F-1 years, from arrival to what comes next." }) +
      C.list(items, { label: 'Your phases' }) +
      C.footer() +
      STYLE;
  }

  /* ---------------- behaviour ---------------- */

  function mount(root, data) {
    root.classList.add('screen-timeline');
    const phase = (key) => data.phases.find((p) => p.key === key);

    /* Confetti once per finished phase, the first time it opens. */
    function watchOpen(head) {
      const item = head.closest('.item');
      const was = head.getAttribute('aria-expanded') === 'true';
      setTimeout(() => {
        const now = head.getAttribute('aria-expanded') === 'true';
        const p = item && phase(item.dataset.key);
        if (!was && now && p && p.state === 'done' && !App.state['tl-confetti:' + p.key]) {
          App.state['tl-confetti:' + p.key] = true;
          App.confetti(item.querySelector('.phase-mark'));
        }
      }, 0);
    }
    root.addEventListener('click', (e) => {
      const head = e.target.closest('[data-disclosure]');
      if (head && !e.target.closest('a, button')) watchOpen(head);
    });
    root.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-disclosure]')) watchOpen(e.target);
    });
  }

  window.SCREENS['timeline'] = {
    title: 'Timeline',
    render: render,
    mount: mount,
  };
})();
