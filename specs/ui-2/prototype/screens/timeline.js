/* Timeline. The student's F-1 years as one accordion of phases.
   Done phases summarise what was done; the current phase (NOW) is open by
   default and shows only what matters now: unemployment days and the job.
   USCIS status lives on its own page, so it is not repeated here. The STEM
   OPT phase is its title and window date, with no inline action; the plan
   and the choice live on Next steps. Round 3: no subtext; any explanation
   sits behind C.info.
   Routes: #/timeline, #/timeline/<phase key> opens that phase,
   #/timeline/no-ead shows the screen without an EAD card on file. */
(function () {
  'use strict';

  /* Layout only. Type sizes come from system.css. */
  const STYLE =
    '<style>' +
    '.screen-timeline .tl-bar { margin-top: var(--s-12); max-width: 50%; }' +
    '.screen-timeline .disc > .list + .disc-link { margin-top: var(--s-4); }' +
    '.screen-timeline .disc > p + .list { margin-top: var(--s-8); }' +
    '</style>';

  const EAD_UNKNOWN = { action: 'Add your EAD card', rest: 'to see these dates.', href: '#/documents/add' };

  /* ---------------- helpers ---------------- */

  function docsLink(link) {
    return '<a class="disc-link" href="' + C.esc(link.href) + '">' + C.esc(link.label) + '</a>';
  }

  /* ---------------- phase content ---------------- */

  /* A done phase: its rows, or its documents. The title and dates already say what was done. */
  function doneContent(p) {
    if (p.rows) {
      return C.list(p.rows.map((r) => C.row({ title: r.title, meta: r.meta })), { accordion: false, label: p.title });
    }
    return p.link ? docsLink(p.link) : C.disclosure({ text: p.text });
  }

  /* The current phase: unemployment days and the job. Rows that open another
     page (USCIS status) are left to that page. */
  function optContent(data, p, noEad) {
    const rows = p.now
      .filter((n) => !n.href && !(noEad && n.source === 'unemployment'))
      .map((n) => C.valueRow({ label: n.label, value: n.value, source: n.source, editable: false, num: true }));
    return (noEad ? '<p>' + C.unknown(EAD_UNKNOWN) + '</p>' : '') +
      C.list(rows, { accordion: false, label: 'Now' }) +
      docsLink(p.link);
  }

  /* ---------------- render ---------------- */

  function render(data, params) {
    const noEad = (params || []).indexOf('no-ead') !== -1;
    const keys = data.phases.map((p) => p.key).filter((k) => k !== 'stem');
    const asked = (params || []).find((k) => keys.indexOf(k) !== -1);
    const openKey = asked || (data.phases.find((p) => p.state === 'now') || {}).key;

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
      /* STEM OPT: title and window date only. Without the EAD card the date is unknown. */
      if (p.key === 'stem') {
        return C.row({ key: p.key, title: p.title, meta: noEad ? 'Needs your EAD card' : p.meta, lead: base.lead });
      }
      return C.row(Object.assign(base, { content: C.disclosure({ text: p.text }) }));
    });

    return C.pageHeader({ title: 'Timeline', info: "What you've done, where you are now, and when to start what comes next." }) +
      C.list(items, { label: 'Your phases' }) +
      C.footer() +
      STYLE;
  }

  /* ---------------- behaviour ---------------- */

  function mount(root) {
    root.classList.add('screen-timeline');
  }

  window.SCREENS['timeline'] = {
    title: 'Timeline',
    titleFor: () => 'Timeline',
    render: render,
    mount: mount,
  };
})();
