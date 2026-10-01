/* components/rows.js: Sections, lists, rows, disclosures, value and setting rows. */

(function () {
  'use strict';

  const C = window.C;
  const { esc, escText, cls, attrs, uid, icon } = C;
  const { hrefAttrs } = C._;
  /* Defined in a file loaded later; looked up when called. */
  const nowTag = (...a) => C.nowTag(...a);
  const link = (...a) => C.link(...a);
  const source = (...a) => C.source(...a);
  const info = (...a) => C.info(...a);

  /* ---------------------------------------------------------------- */
  /* Sections, lists, rows                                              */
  /* ---------------------------------------------------------------- */

  /* section({ eyebrow, info?, content (html), link? {label, href}, waiting?, id?, label? })
     info: a short explanation behind an ⓘ beside the eyebrow. */
  function section(p) {
    const headId = uid('sh');
    const h2 = '<h2 class="sh-label t-eyebrow" id="' + headId + '">' +
      (p.waiting ? '<span class="wait-dot" aria-hidden="true"></span>' : '') + esc(p.eyebrow) + '</h2>';
    return '<section class="' + cls('section', p.waiting && 'waiting', p.cls) + '"' + (p.id ? ' id="' + esc(p.id) + '"' : '') +
      (p.eyebrow ? ' aria-labelledby="' + headId + '"' : '') + '>' +
      (p.eyebrow ? '<div class="section-head">' + (p.info ? '<div class="sh-start">' + h2 + info(p.info) + '</div>' : h2) +
        (p.link ? link(p.link) : '') + '</div>' : '') +
      (p.content || '') + '</section>';
  }

  /* list(items: html[], { accordion = true, label? }) */
  function list(items, o) {
    const opt = o || {};
    const acc = opt.accordion === false ? '' : ' data-accordion';
    return '<div class="list"' + acc + (opt.label ? ' aria-label="' + esc(opt.label) + '"' : '') + '>' + items.join('') + '</div>';
  }

  /* row({ title, meta?, metaAct?, value?, source?, info?, lead? (html), content? (html, makes a disclosure),
           open?, href?, trailing? (html), key?, cls?, nowTag? })
     info: a short explanation behind an ⓘ in the trailing column. Not on a
     link row (the whole row is the link); put it on the page it opens.
     With content: the whole row is the button, chevron right, one open per list.
     With href: the row is a link with a chevron.
     Otherwise: a static row. */
  function row(p) {
    const isDisc = !!p.content;
    const isLink = !isDisc && !!p.href;
    const discId = isDisc ? uid('disc') : '';
    const chevron = (isDisc || isLink) && p.chevron !== false ? icon('chevron', { cls: 'chev' }) : '';
    const trail = [
      p.value ? '<span class="row-value">' + esc(p.value) + '</span>' : '',
      p.trailing || '',
      p.source ? source(p.source) : '',
      p.info && !isLink ? info(p.info, { inline: false }) : '',
      chevron,
    ].join('');
    const inner = (p.lead ? '<span class="row-lead">' + p.lead + '</span>' : '') +
      '<span class="row-text">' +
      '<span class="row-title">' + (p.nowTag ? nowTag() : '') + escText(p.title) + '</span>' +
      (p.meta ? '<span class="' + cls('row-meta', p.metaAct && 'is-act') + '">' + escText(p.meta) + '</span>' : '') +
      (p.below || '') +
      '</span>' +
      (trail ? '<span class="row-trail">' + trail + '</span>' : '');
    let head;
    if (isDisc) {
      head = '<div class="row" role="button" tabindex="0" data-disclosure aria-expanded="' + (p.open ? 'true' : 'false') + '" aria-controls="' + discId + '">' + inner + '</div>';
    } else if (isLink) {
      head = '<a class="row"' + attrs(hrefAttrs(p.href)) + '>' + inner + '</a>';
    } else {
      head = '<div class="row is-static">' + inner + '</div>';
    }
    return '<div class="' + cls('item', p.lead && 'has-lead', p.open && 'is-open', p.cls) + '"' + (p.key ? ' data-key="' + esc(p.key) + '"' : '') + '>' +
      head +
      (isDisc ? '<div class="disc" id="' + discId + '"' + (p.open ? '' : ' hidden') + '>' + p.content + '</div>' : '') +
      '</div>';
  }

  /* disclosure({ text?: string|string[], content? (html), actions? (html), link? {label, href} }) */
  function disclosure(p) {
    const paras = p.text == null ? [] : (Array.isArray(p.text) ? p.text : [p.text]);
    return paras.map((t) => '<p>' + escText(t) + '</p>').join('') +
      (p.content || '') +
      (p.actions ? '<div class="btn-group">' + p.actions + '</div>' : '') +
      (p.link ? '<a class="disc-link"' + attrs(hrefAttrs(p.link.href)) + '>' + esc(p.link.label) + '</a>' : '');
  }

  /* valueRow({ label, value, key?, editable = true, source?, num? })
     The question in a 200px column, the answer beside it (left-aligned), and
     the source mark trailing the answer text, so every answer shares one edge. */
  function valueRow(p) {
    const editable = p.editable !== false;
    const val = editable
      ? '<button type="button" class="' + cls('v-value', p.num && 'num') + '" data-edit="' + esc(p.key || '') + '" aria-label="' + esc(p.label + ': ' + p.value + '. Change') + '">' + esc(p.value) + '</button>'
      : '<span class="' + cls('v-value', p.num && 'num') + '">' + esc(p.value) + '</span>';
    return '<div class="item vrow"' + (p.key ? ' data-key="' + esc(p.key) + '"' : '') + '><div class="row is-static">' +
      '<span class="v-label">' + esc(p.label) + '</span>' +
      '<span class="v-cell">' + val + (p.source ? source(p.source) : '') + '</span>' +
      '</div></div>';
  }

  /* settingRow({ title, meta?, control (html), wide? }) */
  function settingRow(p) {
    return '<div class="' + cls('item srow', p.wide && 'is-wide') + '"><div class="row is-static">' +
      '<span class="row-text"><span class="row-title">' + esc(p.title) + '</span>' +
      (p.meta ? '<span class="row-meta">' + esc(p.meta) + '</span>' : '') + '</span>' +
      (p.control ? '<span class="s-control">' + p.control + '</span>' : '') +
      '</div></div>';
  }

  Object.assign(C, { section, list, row, disclosure, valueRow, settingRow });
})();
