/* Feedback. Title, one line that doubles as the field's label, a five line
   field, one meta line, and Send. After sending, the field gives way to a
   short thank you. No footer: this screen gives no dates.
   Routes:
     #/feedback          the form
     #/feedback/offline  the form as it behaves with no connection
   Draft text is kept in App.state.feedback (app.js stores every data-field),
   so leaving and coming back keeps what was typed. */
window.SCREENS['feedback'] = {
  title: 'Feedback',

  render(data, params) {
    const offline = params[0] === 'offline' || (typeof navigator !== 'undefined' && navigator.onLine === false);
    const sent = App.state.feedbackSent === true;
    const S = window.SCREENS.feedback;

    const style = '<style>' +
      '.screen-feedback { display: flex; flex-direction: column; }' +
      '.col.is-entering > .screen-feedback { animation: none; }' +
      '.col.is-entering > .screen-feedback > * { animation: rise .55s var(--ease-rise) backwards; }' +
      '.col.is-entering > .screen-feedback > :nth-child(2) { animation-delay: .06s; }' +
      '.col.is-entering > .screen-feedback > :nth-child(3) { animation-delay: .16s; }' +
      /* title, 8, subline, 16, field */
      '.screen-feedback .page-header { margin-bottom: var(--s-16); }' +
      /* field, 8, meta (field-help), 24, Send */
      '.screen-feedback .fb-form .btn-row { margin-top: var(--s-24); }' +
      '.screen-feedback .fb-offline { margin-top: var(--s-12); }' +
      '.screen-feedback .fb-thanks { display: flex; flex-direction: column; align-items: flex-start; padding-top: var(--s-16); }' +
      '.screen-feedback .fb-thanks .t-lead { margin-top: var(--s-8); }' +
      /* the link keeps a 44 tall hit box; 12 margin plus 12 padding reads as 24 */
      '.screen-feedback .fb-thanks .link { margin-top: var(--s-12); padding: var(--s-12) 0; }' +
      '.screen-feedback [data-fb-thanks]:focus-visible { box-shadow: none; }' +
      '.screen-feedback .fb-thanks, .screen-feedback .fb-form.is-back { animation: fade .28s ease both; }' +
      '@media (prefers-reduced-motion: reduce) { .screen-feedback .fb-thanks, .screen-feedback .fb-form.is-back { animation: none; } }' +
      '</style>';

    const header = C.pageHeader({
      title: 'Feedback',
      subline: 'What should Duly do better? A sentence is plenty.',
    });

    return '<div class="screen-feedback">' + style + header +
      '<div class="fb-body" data-fb-body aria-live="polite">' +
      (sent ? S.thanksHtml(offline) : S.formHtml(offline)) +
      '</div></div>';
  },

  formHtml(offline, returning) {
    const draft = App.state.feedback || '';
    const hasText = draft.trim().length > 0;
    return '<form class="' + C.cls('fb-form', returning && 'is-back') + '" data-fb-form novalidate>' +
      C.textarea({
        key: 'feedback',
        rows: 5,
        value: draft,
        placeholder: 'Tell us what you noticed',
        ariaLabel: 'What should Duly do better?',
        help: 'Nothing from your records is attached.',
      }) +
      '<div class="btn-row is-start">' +
      C.button({ label: 'Send', kind: 'primary', type: 'submit', disabled: !hasText, attrs: { 'data-fb-send': '' } }) +
      '</div>' +
      (offline ? '<p class="t-meta fb-offline">You\'re offline. Duly will send this when you\'re back.</p>' : '') +
      '</form>';
  },

  thanksHtml(offline) {
    return '<div class="fb-thanks">' +
      '<h2 class="t-sub" tabindex="-1" data-fb-thanks>Thank you.</h2>' +
      '<p class="t-lead">' + (offline ? 'You\'re offline. Duly will send this when you\'re back.' : 'We read every note.') + '</p>' +
      '<button type="button" class="link" data-fb-again>Write another</button>' +
      '</div>';
  },

  mount(root, data, params) {
    const S = window.SCREENS.feedback;
    const body = root.querySelector('[data-fb-body]');
    if (!body) return;
    const offline = () => params[0] === 'offline' || navigator.onLine === false;

    function syncSend() {
      const ta = body.querySelector('textarea');
      const btn = body.querySelector('[data-fb-send]');
      if (ta && btn) btn.disabled = ta.value.trim().length === 0;
    }

    function send() {
      const ta = body.querySelector('textarea');
      if (!ta || !ta.value.trim()) return;
      App.state.feedbackSent = true;
      App.state.feedback = '';
      App.emit('field', 'feedback-sent', true, ta);
      body.innerHTML = S.thanksHtml(offline());
      const h = body.querySelector('[data-fb-thanks]');
      if (h) h.focus({ preventScroll: true });
    }

    function again() {
      App.state.feedbackSent = false;
      App.state.feedback = '';
      body.innerHTML = S.formHtml(offline(), true);
      const ta = body.querySelector('textarea');
      if (ta) ta.focus();
    }

    body.addEventListener('input', (e) => { if (e.target.matches('textarea')) syncSend(); });
    body.addEventListener('submit', (e) => { e.preventDefault(); send(); });
    body.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && e.target.matches('textarea')) { e.preventDefault(); send(); }
    });
    body.addEventListener('click', (e) => { if (e.target.closest('[data-fb-again]')) again(); });
    syncSend();
  },
};
