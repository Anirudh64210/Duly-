/* components/headers.js: Back link, page header, hero, metrics, bars and progress. */

(function () {
  'use strict';

  const C = window.C;
  const { esc, escText, cls, icon } = C;
  /* Defined in a file loaded later; looked up when called. */
  const unknown = (...a) => C.unknown(...a);
  const source = (...a) => C.source(...a);
  const info = (...a) => C.info(...a);

  /* ---------------------------------------------------------------- */
  /* Headers and hero                                                   */
  /* ---------------------------------------------------------------- */

  /* backLink({ label?, href? }) : the quiet link at the top of a drilled-in
     page (an update, an application, a document). It points to the page the
     student came from (App.from, kept by the router); label and href are the
     fallback when the page was opened directly. app.js turns a click into
     history.back() when that returns to the same place, so the scroll
     position comes back too. */
  function backLink(p) {
    const o = p || {};
    const from = window.App && window.App.from;
    const href = from && from.hash ? from.hash : (o.href || '#/home');
    const label = from && from.title ? from.title : (o.label || 'Home');
    return '<a class="back-link" href="' + esc(href) + '" data-back>' + icon('chevron', { cls: 'back-chev' }) + '<span>' + esc(label) + '</span></a>';
  }

  /* titleWith(h1Html, infoText) : the h1 with its ⓘ beside it, outside the
     heading so the heading's name stays the title alone. */
  function titleWith(h1, text) {
    return text ? '<div class="title-row">' + h1 + info(text) + '</div>' : h1;
  }

  /* pageHeader({ title, info?, subline?, meta?, eyebrow?, aside? (html), progress? {pct, label},
                  back? (true or backLink props) })
     info: what the page does, behind an ⓘ beside the title (Round 3). Prefer it
     to subline; keep subline for a fact the student must see (a date). */
  function pageHeader(p) {
    const hasMeta = !!p.meta;
    return (p.back ? backLink(p.back === true ? null : p.back) : '') +
      '<header class="page-header">' +
      (p.eyebrow ? '<p class="ph-eyebrow t-eyebrow-hero">' + escText(p.eyebrow) + '</p>' : '') +
      '<div class="' + cls('ph-top', hasMeta && 'has-meta') + '">' +
      titleWith('<h1 class="t-big" tabindex="-1">' + escText(p.title) + '</h1>', p.info) +
      (hasMeta ? '<span class="ph-meta">' + esc(p.meta) + '</span>' : '') +
      (p.aside ? '<div class="ph-aside">' + p.aside + '</div>' : '') +
      '</div>' +
      (p.subline ? '<p class="ph-sub t-lead">' + escText(p.subline) + '</p>' : '') +
      (p.progress ? progress(p.progress) : '') +
      '</header>';
  }

  function dateLine(text) { return '<p class="date-line num">' + esc(text) + '</p>'; }

  /* hero({ eyebrow, title, info?, subline?, meta?, icon: 'shield'|null, halo?, source?, date?, actions? (html) })
     The one hero per screen. Where a screen has a hero, the hero is its h1
     and the screen has no pageHeader. info: the explanation, behind an ⓘ
     beside the title. meta is a quiet line under the subline, e.g.
     'Rules checked Sep 30'. */
  function hero(p) {
    const iconHtml = p.icon === null ? '' : shield({ halo: p.halo });
    return (p.back ? backLink(p.back === true ? null : p.back) : '') +
      (p.date ? dateLine(p.date) : '') +
      '<section class="hero" aria-labelledby="hero-title">' +
      (p.eyebrow ? '<p class="hero-eyebrow">' + iconHtml + '<span class="t-eyebrow-hero">' + esc(p.eyebrow) + '</span></p>' : '') +
      titleWith('<h1 class="hero-title t-big" id="hero-title" tabindex="-1">' + escText(p.title) + '</h1>', p.info) +
      (p.subline ? '<p class="hero-sub t-lead"><span>' + escText(p.subline) + '</span>' + (p.source ? source(p.source, { inline: true }) : '') + '</p>' : '') +
      (p.meta ? '<p class="hero-meta">' + esc(p.meta) + '</p>' : '') +
      (p.actions ? '<div class="hero-actions">' + p.actions + '</div>' : '') +
      '</section>';
  }

  function shield(o) {
    return '<span class="shield" aria-hidden="true">' + (o && o.halo ? '<span class="halo"></span>' : '') + icon('shield') + '</span>';
  }

  /* metrics([{ eyebrow, value?, unit?, bar? (0..100), source?, info?, asOf?, add? {action, rest, href} }])
     Every value, a count or a date, is set at the one metric figure size.
     info: a short explanation behind an ⓘ, used when there is no source.
     asOf: a quiet line under the value (and its bar), e.g. 'As of Sep 30'. */
  function metrics(cells) {
    const out = [];
    cells.forEach((m, i) => {
      if (i > 0) out.push('<div class="metric-divider" aria-hidden="true"></div>');
      let body;
      if (m.add) {
        body = '<p class="metric-add">' + unknown(m.add) + '</p>';
      } else {
        body = '<div class="metric-value-row">' +
          '<span class="metric-value">' + esc(m.value) + '</span>' +
          (m.unit ? '<span class="metric-unit">' + esc(m.unit) + '</span>' : '') +
          (m.source ? source(m.source, { inline: true }) : (m.info ? info(m.info) : '')) + '</div>' +
          (m.bar != null ? bar(m.bar) : '') +
          (m.asOf ? '<p class="metric-asof num">' + esc(m.asOf) + '</p>' : '');
      }
      out.push('<div class="metric"><p class="t-eyebrow">' + esc(m.eyebrow) + '</p>' + body + '</div>');
    });
    return '<section class="metrics" aria-label="Your numbers">' + out.join('') + '</section>';
  }

  function bar(pct, label) {
    const v = Math.max(0, Math.min(100, Number(pct) || 0));
    return '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + v + '"' +
      (label ? ' aria-label="' + esc(label) + '"' : '') + '><i style="width:' + v + '%"></i></div>';
  }
  /* progress({ pct, label, suffix? }) : 180px bar, 16, meta. With suffix, app.js rewrites the
     label as "N of M done · suffix" when a task is checked. */
  function progress(p) {
    return '<div class="progress" data-progress>' + bar(p.pct, p.label) + '<span class="t-meta num" data-progress-label' +
      (p.suffix ? ' data-suffix="' + esc(p.suffix) + '"' : '') + '>' + esc(p.label) + '</span></div>';
  }

  Object.assign(C, { backLink, titleWith, pageHeader, dateLine, hero, shield, metrics, bar, progress });
})();
