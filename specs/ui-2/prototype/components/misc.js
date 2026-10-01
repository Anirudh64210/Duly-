/* components/misc.js: Notes, cautions, dates, tracker, found fields, footer. */

(function () {
  'use strict';

  const C = window.C;
  const { esc, cls, shield, valueRow, source } = C;

  /* note({ title, text?, source?, actions? (html), icon = 'shield' }) : inline finding, e.g. STEM detected */
  function note(p) {
    return '<div class="note">' + (p.icon === null ? '' : shield()) + '<div class="note-text">' +
      '<p class="note-title"><span>' + esc(p.title) + '</span>' + (p.source ? source(p.source, { inline: true }) : '') + '</p>' +
      (p.text ? '<p class="note-line">' + esc(p.text) + '</p>' : '') +
      (p.actions ? '<div class="btn-group">' + p.actions + '</div>' : '') +
      '</div></div>';
  }

  function caution(text) { return '<p class="caution">' + esc(text) + '</p>'; }

  /* dates({ points: [{ date, label, source?, end?, today? }], today? { label, pct } })
     A point with today: true is today as its own first point, drawn as a
     small quiet dot, so it never sits over a dated milestone. */
  function dates(p) {
    const today = p.today ? '<span class="dates-today" style="left:' + Number(p.today.pct) + '%"><span>' + esc(p.today.label) + '</span><i></i></span>' : '';
    return '<div class="' + cls('dates', p.today && 'has-today') + '" style="--n:' + p.points.length + '">' + today +
      p.points.map((d) => '<div class="' + cls('date-pt', d.end && 'is-end', d.today && 'is-today') + '">' +
        '<span class="dp-date">' + esc(d.date) + '</span><span class="dp-label">' + esc(d.label) + '</span>' +
        (d.source ? source(d.source) : '') + '</div>').join('') + '</div>';
  }

  /* tracker({ steps: string[], current: index|null }) */
  function tracker(p) {
    return '<ol class="tracker" aria-label="Application status">' + p.steps.map((s, i) => {
      const reached = p.current != null && i <= p.current;
      return '<li class="' + cls(reached && 'is-reached', i === p.current && 'is-current') + '"' + (i === p.current ? ' aria-current="step"' : '') + '>' +
        '<div class="bar"><i></i></div><span class="t-step">' + esc(s) + '</span></li>';
    }).join('') + '</ol>';
  }

  /* found({ rows: [[label, value]] }) : fields read from a document, label left and value right */
  function found(rows) {
    return '<div class="list found">' + rows.map((r) => valueRow({ label: r[0], value: r[1], editable: false })).join('') + '</div>';
  }

  /* footer(text) : pushes to the bottom of the column. Only on screens that show dates. */
  function footer(text) {
    return '<div class="col-spacer"></div><footer class="footer">' + esc(text || 'Records and dates from your documents, not legal advice.') + '</footer>';
  }

  Object.assign(C, { note, caution, dates, tracker, found, footer });
})();
