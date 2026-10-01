/* components/updates.js: News rows and application rows. */

(function () {
  'use strict';

  const C = window.C;
  const { esc, escText, cls, icon, row } = C;

  /* affectsFor(item, intent = App.stemIntent()) : the "for you" answer for this
     student, { short, line, todo }. The one place for Home, News and the
     article page, so they never disagree. byIntent overrides by the STEM OPT
     choice. */
  function affectsFor(item, intent) {
    const a = item && item.affects && typeof item.affects === 'object' ? item.affects : { short: item && item.affects, line: '' };
    const want = intent !== undefined ? intent : (window.App && window.App.stemIntent ? window.App.stemIntent() : null);
    const b = (a.byIntent && want && a.byIntent[want]) || {};
    return { short: b.short || a.short || '', line: b.line || a.line || '', todo: b.todo || (item && item.todo) || '' };
  }
  /* The first sentence of "anything to do", for a row. */
  function todoShort(t) {
    if (!t) return '';
    return String(t).split(/\.\s/)[0].replace(/\.$/, '');
  }
  /* updateRow(item, { meta?, line?, headline? }) : a News row for Home and News,
     like a news app: the headline (medium size with headline: true), then
     "Sep 14, 2026 · U.S. District Court", then one short line (item.dek, or the
     "for you" answer). No jump links. Opens the article at #/updates/<id>. */
  function updateRow(item, o) {
    const opt = o || {};
    const id = item.id || item.key;
    const meta = opt.meta != null ? opt.meta : [item.date, item.source && item.source.name].filter(Boolean).join(' · ');
    const line = opt.line !== undefined ? opt.line : (item.dek || affectsFor(item).short);
    return '<div class="' + cls('item news-row', opt.headline && 'is-headline') + '" data-key="' + esc(id) + '">' +
      '<a class="row" href="' + esc(item.href || ('#/updates/' + id)) + '"><span class="row-text">' +
      '<span class="' + (opt.headline ? 'news-title t-medium' : 'row-title') + '">' + escText(item.title) + '</span>' +
      (meta ? '<span class="row-meta num">' + escText(meta) + '</span>' : '') +
      (line ? '<span class="news-dek">' + escText(line) + '</span>' : '') +
      '</span><span class="row-trail">' + icon('chevron', { cls: 'chev' }) + '</span></a></div>';
  }

  /* applicationRow(app) : one application, from DULY_SAMPLE.applications.items.
     Opens #/uscis/<id>. Status is always shown with its "as of" date. */
  function applicationRow(a) {
    return row({
      key: a.id, title: a.title,
      meta: (a.receipt ? a.receipt + ' · ' : '') + statusLine(a),
      href: '#/uscis/' + a.id,
    });
  }
  /* statusLine(app) : "Approved, as of Dec 20, 2025" */
  function statusLine(a) {
    if (/^unknown$/i.test(a.status || '')) {
      const add = ((window.DULY_SAMPLE || {}).applications || {}).add || {};
      return (add.unknown || 'Unknown') + (a.added ? ', added ' + a.added : '');
    }
    return a.status + (a.asOf ? ', as of ' + a.asOf : '');
  }

  Object.assign(C, { affectsFor, todoShort, updateRow, applicationRow, statusLine });
})();
