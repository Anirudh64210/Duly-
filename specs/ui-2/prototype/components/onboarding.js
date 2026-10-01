/* components/onboarding.js: Onboarding step list and page frame. */

(function () {
  'use strict';

  const C = window.C;
  const { esc, icon, wordmark, pageHeader, buttonRow } = C;

  /* ---------------------------------------------------------------- */
  /* Onboarding                                                         */
  /* ---------------------------------------------------------------- */

  /* steps({ steps: [{ key, label, answer? }], current: index, reached: index }) */
  function steps(p) {
    return '<nav class="steps" aria-label="Steps">' + p.steps.map((s, i) => {
      const state = i === p.current ? 'is-current' : (i <= (p.reached == null ? p.current - 1 : p.reached) ? 'is-done' : 'is-todo');
      const canOpen = state === 'is-done';
      return '<button type="button" class="step ' + state + '"' + (canOpen ? ' data-step="' + i + '" title="' + esc(s.answer || '') + '"' : ' disabled') +
        (i === p.current ? ' aria-current="step"' : '') + '>' +
        '<span class="pip"></span><span class="step-label">' + (canOpen ? icon('tick', { size: 12 }) : '') + esc(s.label) + '</span></button>';
    }).join('') + '<span class="sr-only">Step ' + (p.current + 1) + ' of ' + p.steps.length + '</span></nav>';
  }

  /* onboarding({ steps? (html from C.steps), title, why?, content? (html), notSure? (html), back? (html), primary? (html) }) */
  function onboarding(p) {
    return '<div class="onb">' + wordmark({ large: true, link: false }) + (p.steps || '') +
      '<div class="onb-body">' +
      pageHeader({ title: p.title, subline: p.why }) +
      (p.content ? '<div class="onb-content">' + p.content + '</div>' : '') +
      (p.notSure ? '<div class="onb-unsure">' + p.notSure + '</div>' : '') +
      ((p.back || p.primary) ? buttonRow({ back: p.back, primary: p.primary }) : '') +
      '</div></div>';
  }

  Object.assign(C, { steps, onboarding });
})();
