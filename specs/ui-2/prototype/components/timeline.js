/* components/timeline.js: Round 5: date formatting and the timeline stepper. */

(function () {
  'use strict';

  const C = window.C;
  const { esc, cls, source } = C;

  /* ---------------------------------------------------------------- */
  /* Round 5: the timeline, the STEM OPT choice in place, track a case  */
  /* ---------------------------------------------------------------- */

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function isoTime(iso) { return Date.parse(String(iso).slice(0, 10) + 'T12:00:00Z'); }
  /* fmtDate('2027-02-13', { year: true|false|'auto', ref: '2026-09-30' }) : 'Feb 13, 2027'.
     'auto' (the default) adds the year only when it differs from ref's. */
  function fmtDate(iso, o) {
    const opt = o || {};
    const t = new Date(isoTime(iso));
    if (isNaN(t.getTime())) return String(iso || '');
    const ref = opt.ref ? new Date(isoTime(opt.ref)) : null;
    const withYear = opt.year === true || (opt.year !== false && (!ref || ref.getUTCFullYear() !== t.getUTCFullYear()));
    return MONTHS[t.getUTCMonth()] + ' ' + t.getUTCDate() + (withYear ? ', ' + t.getUTCFullYear() : '');
  }

  /* timeline({ today, marks: [{ label, date, display?, source? }], caption?, label?, key?, compact?,
                from?, to?, spans?, todayLabel? })
     A stepper, like order tracking. Today and each mark are points evenly
     spaced on one straight line, in date order: the first and last sit at
     the edges, every label centred under its point (the first and last
     aligned to the edges). Under each point the date in ink, its name quiet
     on the next line, a source mark beside the date. Passed points and
     Today are filled, the next point is ringed in accent, the rest are
     open; the line is accent up to Today. caption is the one sentence above
     ("Window opens in 46 days"). compact (Home): smaller points, dates only.
     app.js wraps a name, or stacks the steps, only where a phone needs it.
     The line fills once per key; off under reduced motion. from, to and
     spans are accepted and unused. */
  function timeline(p) {
    const today = p.today;
    const tT = isoTime(today);
    const key = p.key || p.label || 'timeline';
    const todayLabel = p.todayLabel || 'Today';
    const pts = (p.marks || []).map((m) => ({ m: m, t: isoTime(m.date) })).sort((a, b) => a.t - b.t);
    /* Today sits in date order. On a mark's own date the mark is Today. */
    const same = pts.find((x) => x.t === tT);
    if (same) same.today = true;
    else {
      const at = pts.findIndex((x) => x.t > tT);
      pts.splice(at < 0 ? pts.length : at, 0, { today: true, t: tT, m: null });
    }
    const n = pts.length;
    const ti = pts.findIndex((x) => x.today);
    /* In the small strip a year can drop to a quiet second line when a
       phone has no room for it beside the day (app.js, .is-tight). */
    const dateHtml = (d) => {
      const yr = p.compact && String(d).match(/^(.*), (\d{4})$/);
      return yr ? esc(yr[1]) + '<span class="tl-y"><span class="tl-c">, </span>' + esc(yr[2]) + '</span>' : esc(d);
    };
    const pos = (i) => (n > 1 ? Number(((i / (n - 1)) * 100).toFixed(3)) : 0);
    const items = pts.map((x, i) => {
      const m = x.m;
      const state = x.today ? 'is-today' : (i < ti ? 'is-past' : (i === ti + 1 ? 'is-next' : 'is-ahead'));
      /* Today reads as a date with its name under it, like the rest; the
         small strip has no names, so there it reads "Today". On a mark's
         own date the date line reads "Today". */
      const date = m ? (x.today ? todayLabel : (m.display || fmtDate(m.date, { ref: today })))
        : (p.compact ? todayLabel : fmtDate(today, { ref: today }));
      const name = m ? m.label : todayLabel;
      const src = m && m.source && !p.compact ? source(m.source, { inline: true }) : '';
      const edge = i === 0 ? 'is-first' : (i === n - 1 ? 'is-last' : '');
      const sr = p.compact ? ', ' + (x.today ? fmtDate(today, { year: true }) : name) : '';
      return '<li class="' + cls('tl-step', state, edge) + '" style="--x:' + pos(i) + '%;--x-f:' + (pos(i) / 100) + '"' + (x.today ? ' aria-current="date"' : '') + '>' +
        '<span class="tl-date num"><span class="tl-d">' + dateHtml(date) + '</span>' + (sr ? '<span class="sr-only">' + esc(sr) + '</span>' : '') + src + '</span>' +
        (p.compact ? '' : '<span class="tl-name">' + esc(name) + '</span>') +
        '</li>';
    }).join('');
    const dots = pts.map((x, i) => {
      const state = x.today ? 'is-today' : (i < ti ? 'is-past' : (i === ti + 1 ? 'is-next' : 'is-ahead'));
      return '<i class="' + cls('tl-dot', state) + '" style="--x:' + pos(i) + '%;--x-f:' + (pos(i) / 100) + '"></i>';
    }).join('');
    return '<figure class="' + cls('tl', p.compact && 'is-compact') + '" data-timeline="' + esc(key) + '" style="--fill:' + pos(ti) + '%;--n:' + n + '"' +
      (p.label ? ' aria-label="' + esc(p.label) + '"' : '') + '>' +
      (p.caption ? '<figcaption class="tl-now">' + esc(p.caption) + '</figcaption>' : '') +
      '<div class="tl-rail" aria-hidden="true"><span class="tl-line"></span><span class="tl-fill"></span>' + dots + '</div>' +
      '<ol class="tl-steps">' + items + '</ol>' +
      '</figure>';
  }

  Object.assign(C, { fmtDate, timeline });
})();
