/* Feedback. The title (what the page does sits behind its ⓘ), then the
   field with its label, then Send on the right under the field
   (the one button placement rule in system.css). After sending, the field
   gives way to a short thank you, in place: no page redraw, no scroll jump.
   No footer: this screen gives no dates. The product name is not used in the
   screen text (the sidebar wordmark is the one mention).
   Routes:
     #/feedback          the form
     #/feedback/offline  the form as it behaves with no connection
   Draft text is kept in App.state.feedback (app.js stores every data-field),
   so leaving and coming back keeps what was typed. */
window.SCREENS['feedback'] = {
  title: 'Feedback',

  OFFLINE_FORM: 'You\'re offline. It will send when you\'re back.',
  OFFLINE_SENT: 'You\'re offline, so it will send when you\'re back.',

  render(data, params) {
    const S = window.SCREENS.feedback;
    const offline = S.isOffline(params);
    const sent = App.state.feedbackSent === true;

    /* Layout only. Type sizes come from the shared classes. */
    const style = '<style>' +
      '.screen-feedback .fb-offline { margin-top: var(--s-12); }' +
      '.screen-feedback .fb-offline[hidden] { display: none; }' +
      '.screen-feedback .fb-thanks { display: flex; flex-direction: column; align-items: flex-start; }' +
      '.screen-feedback .fb-thanks .t-lead { margin-top: var(--s-8); }' +
      '.screen-feedback .fb-thanks .btn-text { margin-top: var(--s-12); }' +
      '.screen-feedback [data-fb-thanks]:focus-visible { box-shadow: none; outline: none; }' +
      '.screen-feedback .fb-thanks, .screen-feedback .fb-form.is-back { animation: fade .28s ease both; }' +
      '@media (prefers-reduced-motion: reduce) { .screen-feedback .fb-thanks, .screen-feedback .fb-form.is-back { animation: none; } }' +
      '</style>';

    const header = C.pageHeader({
      title: 'Feedback',
      info: 'Tell us what helped and what got in the way. Nothing from your records is attached.',
    });

    return '<div class="screen-feedback">' + style + header +
      '<div class="fb-body" data-fb-body aria-live="polite">' +
      (sent ? S.thanksHtml(offline) : S.formHtml(offline)) +
      '</div></div>';
  },

  isOffline(params) {
    return (params && params[0] === 'offline') || (typeof navigator !== 'undefined' && navigator.onLine === false);
  },

  formHtml(offline, returning) {
    const S = window.SCREENS.feedback;
    const draft = App.state.feedback || '';
    const hasText = draft.trim().length > 0;
    return '<form class="' + C.cls('fb-form', returning && 'is-back') + '" data-fb-form novalidate>' +
      C.textarea({
        key: 'feedback',
        rows: 5,
        value: draft,
        label: 'What should Duly do better?',
        placeholder: 'The dates on Home were clear, but',
      }) +
      '<div class="btn-row">' +
      C.button({ label: 'Send', kind: 'primary', type: 'submit', disabled: !hasText, attrs: { 'data-fb-send': '' } }) +
      '</div>' +
      '<p class="t-meta fb-offline" data-fb-offline' + (offline ? '' : ' hidden') + '>' + S.OFFLINE_FORM + '</p>' +
      '</form>';
  },

  thanksHtml(offline) {
    const S = window.SCREENS.feedback;
    return '<div class="fb-thanks">' +
      '<h2 class="t-medium" tabindex="-1" data-fb-thanks>Thank you.</h2>' +
      '<p class="t-lead" data-fb-thanks-line>' + (offline ? S.OFFLINE_SENT : 'We read every note.') + '</p>' +
      C.button({ label: 'Write another', kind: 'text', attrs: { 'data-fb-again': '' } }) +
      '</div>';
  },

  mount(root, data, params) {
    const S = window.SCREENS.feedback;
    const body = root.querySelector('[data-fb-body]');
    if (!body) return;
    const offline = () => S.isOffline(params);

    function syncSend() {
      const ta = body.querySelector('textarea');
      const btn = body.querySelector('[data-fb-send]');
      if (ta && btn) btn.disabled = ta.value.trim().length === 0;
    }

    function send() {
      const ta = body.querySelector('textarea');
      if (!ta || !ta.value.trim()) return;
      App.state.feedbackSent = true;
      App.state.feedbackQueued = offline();
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
      if (ta) ta.focus({ preventScroll: true });
    }

    body.addEventListener('input', (e) => { if (e.target.matches('textarea')) syncSend(); });
    body.addEventListener('submit', (e) => { e.preventDefault(); send(); });
    body.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && e.target.matches('textarea')) { e.preventDefault(); send(); }
    });
    body.addEventListener('click', (e) => { if (e.target.closest('[data-fb-again]')) again(); });
    syncSend();

    /* The connection can come and go while the page is open. The listeners
       are added once for the whole session and act on whatever feedback page
       is on screen, so they never pile up across visits. */
    if (!S.netBound && typeof window !== 'undefined') {
      S.netBound = true;
      const onNet = () => {
        if (App.route !== 'feedback') return;
        const live = document.querySelector('#main [data-fb-body]');
        if (!live) return;
        const off = S.isOffline(App.params);
        const note = live.querySelector('[data-fb-offline]');
        if (note) note.hidden = !off;
        const line = live.querySelector('[data-fb-thanks-line]');
        if (line && App.state.feedbackQueued) {
          line.textContent = off ? S.OFFLINE_SENT : 'Sent. We read every note.';
          if (!off) App.state.feedbackQueued = false;
        }
      };
      window.addEventListener('online', onNet);
      window.addEventListener('offline', onNet);
    }
  },
};
