/* Timeline. The student's F-1 years as one accordion of phases.
   Done phases summarise what was done; the current phase (NOW) is open by
   default and shows only what matters now: unemployment days and the job.
   USCIS status lives on its own page, so it is not repeated here. The STEM
   OPT phase is its title and window date, with no inline action; the plan
   and the choice live on Next steps. Round 3: no subtext; any explanation
   sits behind C.info.
   Round 4 (VALUE move 7.1, one value everywhere): the unemployment row and
   the job in the phase meta come from App.unemployment() and App.state, the
   same source as Home, so the two never disagree. The count shows with its
   as-of date, or the one line that asks for the job list. The job is named
   once, in the meta.
   Routes: #/timeline, #/timeline/<phase key> opens that phase,
   #/timeline/no-ead shows the screen without an EAD card on file,
   #/timeline/ask and #/timeline/no-job mirror the Home demo states. */
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

  /* The unemployment count for this view, read the way Home reads it.
     "No job yet" (from onboarding or #/timeline/no-job) means no job on file;
     #/timeline/ask shows the job list as not confirmed until answered. */
  function unemploymentFor(data, params) {
    const noJob = params.indexOf('no-job') !== -1 || App.state.jobsComplete === 'none';
    const u = App.unemployment({ noJob: noJob });
    if (params.indexOf('ask') !== -1 && App.state.jobsComplete !== 'every') {
      const d = data.unemployment || {};
      const add = u.hasJob ? d.confirm : d.add;
      return Object.assign({}, u, { state: 'ask', line: null, metric: Object.assign({}, u.metric, { add: add || u.metric.add }) });
    }
    return u;
  }

  /* The job half of the phase meta, from the same state as the count. */
  function jobMeta(data, u) {
    const j = data.job || {};
    if (!u.hasJob) return 'No job yet';
    return j.title ? j.title + ' at ' + j.employer : j.employer;
  }

  /* The current phase: the unemployment count with its as-of date, or the
     line that asks for the job list. Rows that open another page (USCIS
     status) are left to that page; the job is already in the meta. */
  function optContent(p, u, noEad) {
    let row = '';
    if (!noEad) {
      const label = (u.metric && u.metric.eyebrow) || 'Unemployment days';
      row = u.line
        ? C.valueRow({ label: label, value: u.line, source: 'unemployment', editable: false, num: true })
        : '<div class="item vrow"><div class="row is-static"><span class="v-label">' + C.esc(label) + '</span>' +
          '<span class="v-cell">' + C.unknown(u.metric.add) + '</span></div></div>';
    }
    return (noEad ? '<p>' + C.unknown(EAD_UNKNOWN) + '</p>' : '') +
      (row ? C.list([row], { accordion: false, label: 'Now' }) : '') +
      docsLink(p.link);
  }

  /* ---------------- render ---------------- */

  function render(data, params) {
    params = params || [];
    const noEad = params.indexOf('no-ead') !== -1;
    const u = unemploymentFor(data, params);
    const keys = data.phases.map((p) => p.key).filter((k) => k !== 'stem');
    const asked = params.find((k) => keys.indexOf(k) !== -1);
    const openKey = asked || (data.phases.find((p) => p.state === 'now') || {}).key;

    const items = data.phases.map((p) => {
      const base = { key: p.key, title: p.title, meta: p.meta, lead: C.phaseMark(p.state), open: p.key === openKey };
      if (p.state === 'done') return C.row(Object.assign(base, { content: doneContent(p) }));
      if (p.state === 'now') {
        return C.row(Object.assign(base, {
          nowTag: true,
          meta: noEad ? jobMeta(data, u) : [jobMeta(data, u)].concat(p.meta.split(' · ').slice(1)).join(' · '),
          below: noEad ? '' : '<div class="tl-bar">' + C.bar(p.bar, 'Days used on your card') + '</div>',
          content: optContent(p, u, noEad),
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
