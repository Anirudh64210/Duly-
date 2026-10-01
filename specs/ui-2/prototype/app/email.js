/* app/email.js: The email draft (C.emailDraft) and copy email (C.email). */

(function () {
  'use strict';

  const App = window.App;
  const _ = App._;
  const { reduced, cssEsc, isDone, emit } = App._;
  /* Defined in a file loaded later; looked up when called. */
  const toast = (...a) => _.toast(...a);

  /* ---------------- the email draft (C.emailDraft) ---------------- */
  function setDraft(box, state) {
    const key = box.dataset.draft;
    App.state['draft:' + key] = state;
    document.querySelectorAll('[data-draft="' + cssEsc(key) + '"]').forEach((b) => { b.dataset.state = state; });
    const part = box.querySelector('[data-part="' + state + '"]');
    const target = part && (state === 'open' ? part.querySelector('.email-body') : part.querySelector('button'));
    if (target) target.focus({ preventScroll: true });
    if (state === 'open' && part && part.scrollIntoView && !reduced()) part.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    emit('draft', key, state, box);
  }
  function draftText(box) {
    const subject = (box.querySelector('[data-subject]') || {}).textContent || '';
    const body = box.querySelector('.email-body');
    return { subject: subject, body: body ? body.innerText.trim() : '' };
  }
  function draftAction(btn) {
    const box = btn.closest('[data-draft]');
    if (!box) return;
    const act = btn.dataset.draftAct;
    if (act === 'open') { setDraft(box, 'open'); return; }
    if (act === 'close') { setDraft(box, App.state['draftLeft:' + box.dataset.draft] ? 'left' : 'closed'); return; }
    if (act === 'copy' || act === 'mail') {
      const m = draftText(box);
      App.state['draftLeft:' + box.dataset.draft] = true;
      if (act === 'copy') {
        const text = (m.subject ? 'Subject: ' + m.subject + '\n\n' : '') + m.body;
        const done = () => toast('Email copied');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done); else done();
        setDraft(box, 'left');
      } else {
        setDraft(box, 'left');
        window.location.href = 'mailto:?subject=' + encodeURIComponent(m.subject) + '&body=' + encodeURIComponent(m.body);
      }
      return;
    }
    if (act === 'done') {
      const step = box.dataset.draftStep;
      setDraft(box, 'done');
      if (step && !isDone(step)) App.setTask(step, true);
      toast('Marked done');
    }
  }

  /* ---------------- copy email (C.email) ---------------- */
  function copyEmail(btn) {
    const body = document.getElementById(btn.dataset.copy);
    /* Copy may sit in the panel's header or under it (email({ copyBelow: true })). */
    const panel = (body && body.closest('.email')) || btn.closest('.email');
    const subject = panel ? (panel.querySelector('[data-subject]') || {}).textContent || '' : '';
    const text = (subject ? 'Subject: ' + subject + '\n\n' : '') + (body ? body.innerText.trim() : '');
    const done = () => toast('Email copied');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      done();
    }
  }

  Object.assign(App._, { draftAction, copyEmail });
})();
