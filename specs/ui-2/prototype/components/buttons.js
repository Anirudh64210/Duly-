/* components/buttons.js: Buttons, button rows, links, the destructive confirm. */

(function () {
  'use strict';

  const C = window.C;
  const { esc, cls, attrs, uid } = C;
  const { hrefAttrs } = C._;

  /* ---------------------------------------------------------------- */
  /* Buttons and links                                                  */
  /* ---------------------------------------------------------------- */

  /* button({ label, kind: 'primary'|'pill'|'text'|'back', href?, key?, disabled?, full?, attrs? }) */
  function button(p) {
    const kind = p.kind || 'pill';
    const c = cls('btn',
      kind === 'primary' && 'btn-primary',
      kind === 'pill' && 'btn-pill',
      (kind === 'text' || kind === 'back') && 'btn-text',
      kind === 'back' && 'is-quiet',
      p.small && 'is-small',
      p.full && 'is-full', p.cls);
    const extra = Object.assign({}, p.attrs || {}, p.key ? { 'data-action': p.key } : {});
    if (p.href && !p.disabled) return '<a class="' + c + '"' + attrs(Object.assign(hrefAttrs(p.href), extra)) + '>' + esc(p.label) + '</a>';
    return '<button type="' + (p.type || 'button') + '" class="' + c + '"' + attrs(extra) + (p.disabled ? ' disabled' : '') + '>' + esc(p.label) + '</button>';
  }
  /* buttonRow({ back? (html or html[]), primary? (html) }) : the one placement rule
     (system.css): a right-aligned group, the quiet actions (Back, Cancel, Fix one)
     first on the left, the primary last on the right, 24 above. */
  function buttonRow(p) {
    const quiet = Array.isArray(p.back) ? p.back.join('') : (p.back || '');
    return '<div class="btn-row">' + quiet + (p.primary || '') + '</div>';
  }
  function btnGroup(html) { return '<div class="btn-group">' + (Array.isArray(html) ? html.join('') : html) + '</div>'; }

  /* link({ label, href, quiet? }) */
  function link(p) {
    return '<a class="' + cls('link', p.quiet && 'is-quiet') + '"' + attrs(hrefAttrs(p.href || '#')) + '>' + esc(p.label) + '</a>';
  }

  /* danger({ label, confirm, confirmLabel, keepLabel, key }) : quiet pill, inline confirm, no red */
  function danger(p) {
    const id = uid('danger');
    return '<div class="danger" data-danger="' + esc(p.key || '') + '">' +
      '<button type="button" class="btn btn-pill" data-confirm="' + id + '">' + esc(p.label) + '</button>' +
      '<div class="danger-confirm" id="' + id + '" hidden role="group" aria-label="' + esc(p.label) + '">' +
      '<p>' + esc(p.confirm) + '</p>' +
      buttonRow({
        back: '<button type="button" class="btn btn-text is-quiet" data-keep="' + id + '">' + esc(p.keepLabel || 'Keep') + '</button>',
        primary: '<button type="button" class="btn btn-pill" data-confirmed="' + esc(p.key || '') + '">' + esc(p.confirmLabel || p.label) + '</button>',
      }) +
      '</div></div>';
  }

  Object.assign(C, { button, buttonRow, btnGroup, link, danger });
})();
