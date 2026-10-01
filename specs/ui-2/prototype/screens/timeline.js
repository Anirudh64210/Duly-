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
   Round 5 (VALUE-2 features 3 and 8): the OPT meta is built from
   App.record(): the job open today (or when it ends or ended) and the days
   left on the card, App.dates.daysBetween(today, opt.until). Sep 30, 2026
   to Feb 13, 2027 is 136 days (checked with python3 on 2026-09-30). The
   record's trips sit under the current phase with one quiet Check a trip
   (Try a change on the trip preset). A saved H-1B petition shows its
   cap-gap end under After OPT, from App.capGap, with no date worked out here.
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
    '.screen-timeline .disc > .list + .list { margin-top: var(--s-8); }' +
    '.screen-timeline .tl-trip { margin-top: var(--s-8); }' +
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

  /* The job half of the phase meta, from the record, so a saved job end or
     new job shows here as it does on Your profile. The no-job demo routes
     (and "I haven't had a job yet") still read "No job yet".
       open today, no end    "Software Engineer at Northwind Systems"
       open today, ends      "... until Oct 31" (a saved job end)
       ended                 "Northwind Systems, ended Oct 31"
       starts later          "Kite, from Nov 16" */
  function jobMeta(u) {
    if (!u.hasJob) return 'No job yet';
    const D = App.dates;
    const t = App.data.today.iso;
    const jobs = (App.record().jobs || []).filter((j) => D.okIso(j.start));
    const name = (j) => (j.title ? j.title + ' at ' + j.employer : j.employer);
    const open = jobs.filter((j) => j.start <= t && (!j.end || t <= j.end));
    if (open.length) {
      const j = open[open.length - 1];
      return name(j) + (D.okIso(j.end) ? ' until ' + D.fmt(j.end) : '');
    }
    const later = jobs.filter((j) => j.start > t).sort((a, b) => (a.start < b.start ? -1 : 1))[0];
    if (later) return name(later) + ', from ' + D.fmt(later.start);
    const ended = jobs.filter((j) => D.okIso(j.end)).sort((a, b) => (a.end < b.end ? 1 : -1))[0];
    return ended ? name(ended) + ', ended ' + D.fmt(ended.end) : 'No job yet';
  }

  /* The card half of the phase meta. Today 2026-09-30, card until
     2027-02-13: daysBetween is 136 (checked with python3). */
  function cardMeta() {
    const opt = App.record().opt || {};
    const D = App.dates;
    if (!D.okIso(opt.until)) return '';
    const left = D.daysBetween(App.data.today.iso, opt.until);
    return left > 0 ? left + (left === 1 ? ' day' : ' days') + ' left on your card' : 'Card ended ' + D.fmtY(opt.until);
  }

  /* Trips on the record, each with its days away, and one quiet Check a
     trip. Sample trip 2026-12-19 to 2027-01-09: 21 days away (checked with
     python3). Nothing is said about whether a trip is fine. */
  function tripsContent() {
    const D = App.dates;
    const trips = (App.record().trips || []).filter((x) => D.okIso(x.leave) && D.okIso(x.back))
      .slice().sort((a, b) => (a.leave < b.leave ? -1 : 1));
    const rows = trips.map((x) => {
      const n = D.daysBetween(x.leave, x.back);
      return C.row({ key: 'trip-' + x.id, title: 'Trip', meta: D.fmtY(x.leave) + ' to ' + D.fmtY(x.back) + ' · ' + n + (n === 1 ? ' day' : ' days') + ' away', source: 'travelAbsence' });
    });
    return (rows.length ? C.list(rows, { accordion: false, label: 'Trips' }) : '') +
      '<div class="tl-trip">' + C.tryChange({ preset: 'trip', presets: ['trip'], label: 'Check a trip' }) + '</div>';
  }

  /* After OPT: each saved petition's cap-gap end, read from App.capGap.
     With the sheet's sample petition (filed 2027-04-01, start 2027-10-01):
     fiscal year 2028, so pending ends 2028-04-01 "or the H-1B start if
     earlier"; approved ends min(2028-04-01, 2027-10-01) = 2027-10-01. The
     card ends 2027-02-13, before that filing day, so App.capGap gives
     "Ask your DSO" and the question sits on USCIS status. */
  function petitions() {
    return (App.record().petitions || []).filter((p) => App.capGap(p));
  }
  function outcomeLabel(v) {
    const o = (((App.data.change || {}).outcomes) || []).filter((x) => x.value === v)[0];
    return o ? o.label : v;
  }
  function afterContent(ps) {
    const D = App.dates;
    const rows = [];
    ps.forEach((pt) => {
      const g = App.capGap(pt);
      rows.push(C.row({ title: 'H-1B petition', meta: 'Filed ' + D.fmtY(pt.filed) + ' · ' + outcomeLabel(g.outcome) +
        (g.outcome !== 'pending' && D.okIso(pt.decided) ? ' ' + D.fmtY(pt.decided) : '') }));
      rows.push(C.row({ title: 'Cap-gap end', meta: g.endText, source: g.outcome === 'denied' ? 'capGapOutcome' : 'capGap' }));
      if (g.f1Ends) rows.push(C.row({ title: 'F-1 status ends', meta: D.fmtY(g.f1Ends) + ', the day H-1B starts', source: 'capGapStart' }));
      if (g.outcome !== 'denied') rows.push(C.row({ title: 'Days without work keep counting through cap-gap.', source: 'capGapUnemployment' }));
    });
    return C.list(rows, { accordion: false, label: 'H-1B petition' }) +
      docsLink({ label: 'USCIS status', href: '#/uscis' });
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
      tripsContent() +
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
          meta: noEad ? jobMeta(u) : [jobMeta(u), cardMeta()].filter(Boolean).join(' · '),
          below: noEad ? '' : '<div class="tl-bar">' + C.bar(p.bar, 'Days used on your card') + '</div>',
          content: optContent(p, u, noEad),
        }));
      }
      /* STEM OPT: title and window date only. Without the EAD card the date is unknown. */
      if (p.key === 'stem') {
        return C.row({ key: p.key, title: p.title, meta: noEad ? 'Needs your EAD card' : p.meta, lead: base.lead });
      }
      /* After OPT: once a petition is saved, its filing day in the meta and
         the cap-gap rows inside. */
      const ps = p.key === 'after' ? petitions() : [];
      if (ps.length) {
        const last = ps[ps.length - 1];
        return C.row(Object.assign(base, { meta: 'H-1B petition filed ' + App.dates.fmtY(last.filed), content: afterContent(ps) }));
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
