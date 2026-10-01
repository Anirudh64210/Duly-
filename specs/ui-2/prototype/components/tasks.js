/* components/tasks.js: Tasks, ongoing rules, done groups, inline asks, waiting, unknown, empty. */

(function () {
  'use strict';

  const C = window.C;
  const { esc, escText, cls, attrs, uid, icon, section, list, row } = C;
  const { hrefAttrs } = C._;
  /* Defined in a file loaded later; looked up when called. */
  const link = (...a) => C.link(...a);
  const source = (...a) => C.source(...a);
  const info = (...a) => C.info(...a);
  const schoolMark = (...a) => C.schoolMark(...a);
  const updatedMark = (...a) => C.updatedMark(...a);

  /* ---------------------------------------------------------------- */
  /* Tasks                                                              */
  /* ---------------------------------------------------------------- */

  function checkbox(p) {
    return '<button type="button" class="check" role="checkbox" aria-checked="' + (p.checked ? 'true' : 'false') + '"' +
      (p.key ? ' data-task="' + esc(p.key) + '"' : '') +
      ' aria-label="' + esc(p.label || 'Done') + '">' + icon('tick', { size: 12 }) + '</button>';
  }

  /* task({ key, title, meta?, info?, done?, doneMeta?, source?, open? {label, href}, caution?, cautionSource?,
             below? (html), action? (html), onDone? (html) })
     meta: a date or a fact, short. info: any explanation, behind an ⓘ.
     caution: a quiet line under the meta (e.g. a fee change), with its own
     source mark when cautionSource is given. below: extra html under the
     meta (e.g. C.unknown). onDone: html shown only while the task is
     checked; app.js shows and hides it when the checkbox changes. */
  /* task(... also:
       school?     true: a quiet "Your school" mark beside the title
       updated?    { date, href }: a rule change touched this step, "Updated Sep 30"
       waitingOn?  { key, title, done }: a Before school step. Shows
                   "Waiting on: <title>" until that step is done; app.js hides
                   and shows it in place when the school step is checked.
       afterOf?    { key, done }: an After school step. The row stays hidden
                   until the federal step <key> is done; app.js reveals it in place.
     Round 5 (note 3):
       current?    true: the step that is now. A quiet tinted row. When the
                   student ticks it, app.js moves "current" to the next open
                   step in the same list, with a short highlight
                   (App.advanceCurrent). Mark one step per list.
       detail?     html: the step expands in place. A chevron at the end of the
                   row (and a tap on the title) opens it, the same as any
                   disclosure row; expanded? true starts it open. */
  function task(p) {
    const openLink = p.open ? '<a class="task-open"' + attrs(hrefAttrs(p.open.href)) + '>' + esc(p.open.label) + '</a>' : '';
    const w = p.waitingOn;
    const below = (w ? '<span class="task-waiting" data-waits="' + esc(w.key) + '"' + (w.done ? ' hidden' : '') + '>Waiting on: ' + esc(w.title) + '</span>' : '') +
      (p.caution ? '<span class="caution">' + escText(p.caution) + (p.cautionSource ? source(p.cautionSource, { inline: true }) : '') + '</span>' : '') +
      (p.below ? '<span class="task-below">' + p.below + '</span>' : '') +
      (p.onDone ? '<span class="task-on-done" data-on-done' + (p.done ? '' : ' hidden') + '>' + p.onDone + '</span>' : '') +
      (p.action ? '<span class="task-action">' + p.action + '</span>' : '');
    const marks = (p.school ? schoolMark() : '') + (p.updated ? updatedMark(p.updated) : '');
    const after = p.afterOf ? ' data-after="' + esc(p.afterOf.key) + '"' + (p.afterOf.done ? '' : ' hidden') : '';
    const metaText = p.done && p.doneMeta ? p.doneMeta : p.meta;
    const discId = p.detail ? uid('disc') : '';
    const more = p.detail ? '<button type="button" class="task-more" data-disclosure aria-expanded="' + (p.expanded ? 'true' : 'false') + '" aria-controls="' + discId + '" aria-label="' + esc('Details: ' + p.title) + '">' + icon('chevron', { cls: 'chev' }) + '</button>' : '';
    const trail = openLink + (p.source ? source(p.source) : '') + (p.info ? info(p.info, { inline: false }) : '') + more;
    return '<div class="' + cls('item task', p.done && 'is-done', p.school && 'is-school', p.current && 'is-current', p.detail && 'has-detail', p.detail && p.expanded && 'is-open') + '" data-key="' + esc(p.key || '') + '"' + after +
      (p.current ? ' aria-current="step"' : '') + '><div class="row is-static">' +
      checkbox({ checked: p.done, key: p.key, label: p.title }) +
      '<span class="row-text"><span class="row-title">' + escText(p.title) + (marks ? ' <span class="marks">' + marks + '</span>' : '') + '</span>' +
      '<span class="row-meta" data-meta="' + escText(p.meta || '') + '"' + (p.doneMeta ? ' data-done-meta="' + escText(p.doneMeta) + '"' : '') +
      (metaText ? '' : ' hidden') + '>' +
      escText(metaText) + '</span>' + below + '</span>' +
      (trail ? '<span class="row-trail">' + trail + '</span>' : '') +
      '</div>' +
      (p.detail ? '<div class="disc task-detail" id="' + discId + '"' + (p.expanded ? '' : ' hidden') + '>' + p.detail + '</div>' : '') +
      '</div>';
  }

  /* ongoing({ key?, title, meta?, source?, info? }) : a standing rule, e.g. "Report any job change
     within 10 days". A plain row with no checkbox, since it is never done. */
  function ongoing(p) {
    const trail = (p.source ? source(p.source) : '') + (p.info ? info(p.info, { inline: false }) : '');
    return '<div class="item ongoing"' + (p.key ? ' data-key="' + esc(p.key) + '"' : '') + '><div class="row is-static">' +
      '<span class="row-text"><span class="row-title">' + escText(p.title) + '</span>' +
      (p.meta ? '<span class="row-meta">' + escText(p.meta) + '</span>' : '') + '</span>' +
      (trail ? '<span class="row-trail">' + trail + '</span>' : '') +
      '</div></div>';
  }

  /* doneGroup({ count, content (html), title = 'You did this' }) : done steps folded into one row */
  function doneGroup(p) {
    return row({ title: p.title || 'You did this', meta: p.count + ' done', content: p.content, key: 'done-group' });
  }

  function phaseMark(state) {
    if (state === 'done') return '<span class="phase-mark is-done" role="img" aria-label="Done">' + icon('tick', { size: 10 }) + '</span>';
    if (state === 'now') return '<span class="phase-mark is-now" role="img" aria-label="Now"></span>';
    return '<span class="phase-mark is-next" role="img" aria-label="Later"></span>';
  }
  function nowTag() { return '<span class="now-tag">NOW</span>'; }

  /* ---------------------------------------------------------------- */
  /* Waiting for you and inline asks                                    */
  /* ---------------------------------------------------------------- */

  /* ask({ key, title, meta?, choices: string[] | [{label, value}], notSure?, note? }) */
  function ask(p) {
    const choices = (p.choices || []).map((c) => {
      const o = typeof c === 'string' ? { label: c, value: c } : c;
      return '<button type="button" class="btn btn-pill" data-answer="' + esc(p.key) + '" data-value="' + esc(o.value) + '">' + esc(o.label) + '</button>';
    }).join('');
    const unsure = p.notSure ? '<button type="button" class="btn btn-text is-quiet is-small" data-answer="' + esc(p.key) + '" data-value="unsure">' + esc(p.notSure) + '</button>' : '';
    return '<div class="item ask" data-key="' + esc(p.key) + '"><div class="row is-static"><span class="row-text">' +
      '<span class="row-title">' + esc(p.title) + '</span>' +
      (p.meta ? '<span class="row-meta">' + esc(p.meta) + '</span>' : '') +
      '<span class="ask-actions">' + choices + unsure + '</span>' +
      '<span class="ask-note" data-ask-note' + (p.note ? '' : ' hidden') + '>' + esc(p.note || "You'll be asked again later.") + '</span>' +
      '</span></div></div>';
  }

  /* waiting({ items: [{ title, meta?, add? {label='Add', href} } | ask props with choices], max = 3, more? {label, href}, eyebrow?, id? })
     The one look for "Waiting for you": a section eyebrow with the dot, then
     plain rows. Use it on every screen that asks something; never put an
     eyebrow inside a row. Items that are asks render with C.ask. A row
     without add has no trailing action (e.g. onboarding's finish list). */
  function waiting(p) {
    const max = p.max || 3;
    const shown = p.items.slice(0, max).map((it) => {
      if (it.choices) return ask(it);
      const add = it.add;
      return row({
        title: it.title, meta: it.meta, key: it.key,
        trailing: add ? '<a class="btn btn-text is-small"' + attrs(hrefAttrs(add.href || '#')) + '>' + esc(add.label || 'Add') + '</a>' : '',
      });
    });
    const rest = p.items.length - max;
    const more = rest > 0 ? '<div class="waiting-more">' + link({ label: (p.more && p.more.label) || ('See ' + rest + ' more'), href: (p.more && p.more.href) || '#' }) + '</div>' : '';
    return section({ eyebrow: p.eyebrow || 'Waiting for you', waiting: true, id: p.id, content: list(shown, { accordion: false }) + more });
  }

  /* unknown({ action, rest?, href }) : "Add your EAD card to see this date." with the action as the link */
  function unknown(p) {
    return '<span class="unknown"><a' + attrs(hrefAttrs(p.href || '#')) + '>' + esc(p.action) + '</a>' + (p.rest ? ' ' + esc(p.rest) : '') + '</span>';
  }

  /* empty({ text, action? (html) }) */
  function empty(p) {
    return '<div class="empty"><p class="t-lead">' + esc(p.text) + '</p>' + (p.action || '') + '</div>';
  }

  Object.assign(C, { checkbox, task, ongoing, doneGroup, phaseMark, nowTag, ask, waiting, unknown, empty });
})();
