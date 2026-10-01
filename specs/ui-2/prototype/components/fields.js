/* components/fields.js: Fields, text areas, dates, choices, chips, segments, toggles, selects. */

(function () {
  'use strict';

  const C = window.C;
  const { esc, cls, attrs, uid, icon } = C;

  /* ---------------------------------------------------------------- */
  /* Fields and choices                                                 */
  /* ---------------------------------------------------------------- */

  /* field({ label?, key, value?, placeholder?, help?, error?, type = 'text', inputmode?, autocomplete? }) */
  function field(p) {
    const id = uid('f');
    const helpId = p.help || p.error ? id + '-help' : '';
    return '<div class="field">' +
      (p.label ? '<label class="field-label" for="' + id + '">' + esc(p.label) + '</label>' : '') +
      '<input class="input" id="' + id + '"' + attrs({
        type: p.type || 'text', name: p.key, 'data-field': p.key, value: p.value, placeholder: p.placeholder,
        inputmode: p.inputmode, autocomplete: p.autocomplete || 'off', 'aria-describedby': helpId || null,
        'aria-label': p.label ? null : (p.ariaLabel || p.placeholder), 'aria-invalid': p.error ? 'true' : null,
      }) + '>' +
      (p.suggest ? '<div class="suggest" role="listbox" data-suggest="' + esc(p.key) + '" hidden></div>' : '') +
      (p.error ? '<p class="field-error" id="' + helpId + '">' + esc(p.error) + '</p>' : (p.help ? '<p class="field-help" id="' + helpId + '">' + esc(p.help) + '</p>' : '')) +
      '</div>';
  }

  /* textarea({ label?, key, value?, placeholder?, help?, rows = 5, ariaLabel? }) */
  function textarea(p) {
    const id = uid('f');
    return '<div class="field">' +
      (p.label ? '<label class="field-label" for="' + id + '">' + esc(p.label) + '</label>' : '') +
      '<textarea class="input" id="' + id + '" rows="' + (p.rows || 5) + '"' + attrs({
        name: p.key, 'data-field': p.key, placeholder: p.placeholder,
        'aria-label': p.label ? null : (p.ariaLabel || p.placeholder),
        'aria-describedby': p.help ? id + '-help' : null,
      }) + '>' + esc(p.value || '') + '</textarea>' +
      (p.help ? '<p class="field-help" id="' + id + '-help">' + esc(p.help) + '</p>' : '') +
      '</div>';
  }

  /* dateField({ label, key, value?, from? 'From your EAD card', notSure?, help? }) */
  function dateField(p) {
    const id = uid('d');
    return '<div class="field">' +
      (p.label ? '<label class="field-label" for="' + id + '">' + esc(p.label) + '</label>' : '') +
      '<div class="date-wrap"><div class="date-box">' +
      '<input class="input" id="' + id + '"' + attrs({ type: 'text', name: p.key, 'data-field': p.key, 'data-date': '', value: p.value, placeholder: p.placeholder || 'Feb 9, 2027', autocomplete: 'off', inputmode: 'text' }) + '>' +
      icon('calendar') + '</div>' +
      (p.notSure ? '<button type="button" class="link" data-answer="' + esc(p.key) + '" data-value="unsure">I\'m not sure</button>' : '') +
      '</div>' +
      (p.from ? '<p class="date-prov"><span>' + esc(p.from) + '</span><button type="button" class="link" data-focus="' + id + '">Change</button></p>' : '') +
      (p.help ? '<p class="field-help">' + esc(p.help) + '</p>' : '') +
      '</div>';
  }
  /* dateRange({ from: dateField props, to: dateField props }) */
  function dateRange(p) {
    return '<div class="date-range">' + dateField(p.from) + '<span class="to" aria-hidden="true">to</span>' + dateField(p.to) + '</div>';
  }

  /* choices({ key, options: [{ value, title, meta? }], selected?, notSure? (true or meta text), layout: 'stack'|'pair'|'row', cols?, label? }) */
  function choices(p) {
    const opts = (p.options || []).slice();
    if (p.notSure) opts.push({ value: 'unsure', title: "I'm not sure", meta: typeof p.notSure === 'string' ? p.notSure : null });
    const layout = p.layout || 'stack';
    const style = layout === 'row' ? ' style="--cols:' + (p.cols || opts.length) + '"' : '';
    return '<div class="' + cls('choices', layout === 'pair' && 'is-pair', layout === 'row' && 'is-row') + '" role="radiogroup" data-choices="' + esc(p.key) + '"' +
      (p.label ? ' aria-label="' + esc(p.label) + '"' : '') + style + '>' +
      opts.map((o, i) => {
        const on = p.selected != null && String(p.selected) === String(o.value);
        const tabbable = on || (p.selected == null && i === 0);
        return '<button type="button" class="choice" role="radio" aria-checked="' + (on ? 'true' : 'false') + '" tabindex="' + (tabbable ? '0' : '-1') + '" data-value="' + esc(o.value) + '">' +
          '<span class="choice-text"><span class="choice-title">' + esc(o.title) + '</span>' +
          (o.meta ? '<span class="choice-meta">' + esc(o.meta) + '</span>' : '') + '</span>' +
          '<span class="choice-mark">' + icon('checkFilled') + '</span></button>';
      }).join('') + '</div>';
  }

  /* chips({ key, items: [{ value, label, href?, selected?, done?, count? }], inline?, label? }) */
  function chips(p) {
    const asLinks = p.items.some((i) => i.href);
    const inner = p.items.map((it) => {
      const content = esc(it.label) + (it.count != null ? ' <span class="chip-count">' + esc(it.count) + '</span>' : '') + (it.done ? icon('tick', { cls: 'chip-check' }) : '');
      if (asLinks) return '<a class="chip" href="' + esc(it.href) + '"' + (it.selected ? ' aria-current="page"' : '') + '>' + content + '</a>';
      return '<button type="button" class="chip" role="radio" aria-checked="' + (it.selected ? 'true' : 'false') + '" data-value="' + esc(it.value) + '">' + content + '</button>';
    }).join('');
    const role = asLinks ? '<nav class="' + cls('chips', p.inline && 'is-inline') + '" aria-label="' + esc(p.label || 'Paths') + '">'
      : '<div class="' + cls('chips', p.inline && 'is-inline') + '" role="radiogroup" data-choices="' + esc(p.key) + '"' + (p.label ? ' aria-label="' + esc(p.label) + '"' : '') + '>';
    return role + inner + (asLinks ? '</nav>' : '</div>');
  }

  /* segment({ key, options: [{value, label}], selected, label }) : small chip group, e.g. Theme */
  function segment(p) {
    return chips({ key: p.key, label: p.label, inline: true, items: p.options.map((o) => ({ value: o.value, label: o.label, selected: String(o.value) === String(p.selected) })) });
  }

  /* toggle({ key, on, label }) */
  function toggle(p) {
    return '<button type="button" class="toggle" role="switch" aria-checked="' + (p.on ? 'true' : 'false') + '" data-toggle="' + esc(p.key) + '" aria-label="' + esc(p.label) + '"></button>';
  }

  /* select({ key, options: string[], selected, label }) */
  function select(p) {
    return '<select class="select" data-field="' + esc(p.key) + '" aria-label="' + esc(p.label) + '">' +
      p.options.map((o) => '<option' + (o === p.selected ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>';
  }

  Object.assign(C, { field, textarea, dateField, dateRange, choices, chips, segment, toggle, select });
})();
