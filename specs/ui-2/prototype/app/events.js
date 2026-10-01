/* app/events.js: Events: duly:change, and the one click, key and input handler. */

(function () {
  'use strict';

  const App = window.App;
  const _ = App._;
  const { trackCaseAct, share, addDocument, render, updateNav } = App._;
  /* Defined in a file loaded later; looked up when called. */
  const toggleDisclosure = (...a) => _.toggleDisclosure(...a);
  const selectRadio = (...a) => _.selectRadio(...a);
  const answer = (...a) => _.answer(...a);
  const startEdit = (...a) => _.startEdit(...a);
  const finishEdit = (...a) => _.finishEdit(...a);
  const setTask = (...a) => _.setTask(...a);
  const draftAction = (...a) => _.draftAction(...a);
  const copyEmail = (...a) => _.copyEmail(...a);
  const schoolImportFound = (...a) => _.schoolImportFound(...a);
  const schoolImportAct = (...a) => _.schoolImportAct(...a);
  const togglePopover = (...a) => _.togglePopover(...a);
  const closePopover = (...a) => _.closePopover(...a);
  const toggleMenu = (...a) => _.toggleMenu(...a);
  const closeMenu = (...a) => _.closeMenu(...a);
  const toast = (...a) => _.toast(...a);

  /* ---------------- events ---------------- */
  function emit(kind, key, value, el) {
    document.dispatchEvent(new CustomEvent('duly:change', { detail: { kind: kind, key: key, value: value, el: el } }));
    updateNav();
  }

  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onInput);

  function onClick(e) {
    const t = e.target;

    /* source mark */
    const src = t.closest('[data-source]');
    if (src) { e.preventDefault(); e.stopPropagation(); togglePopover(src); return; }
    const pop = t.closest('.pop');
    if (pop) {
      if (t.closest('[data-show-all]')) {
        const q = pop.querySelector('.pop-quote');
        if (q) q.classList.add('is-all');
        t.closest('[data-show-all]').remove();
      }
      return;
    }
    if (_.openPop && !t.closest('.pop')) closePopover(false);

    /* menu */
    if (t.closest('[data-menu]')) { toggleMenu(); return; }
    if (_.menuOpen && !t.closest('.menu')) closeMenu();

    /* back link: return through history when it leads to the same place */
    const back = t.closest('[data-back]');
    if (back && !e.metaKey && !e.ctrlKey && App.from && back.getAttribute('href') === App.from.hash) {
      e.preventDefault(); history.back(); return;
    }

    /* round 4: share a document, add dates to a calendar, confirm the STEM
       field, change the job-list answer */
    const sh = t.closest('[data-share]');
    if (sh) { e.preventDefault(); share({ title: sh.dataset.share }); return; }
    if (t.closest('[data-calendar]')) { e.preventDefault(); App.addToCalendar(); return; }
    const sf = t.closest('[data-stem-field]');
    if (sf) {
      App.state.stemField = sf.dataset.stemField === 'confirm' ? 'confirmed' : 'found';
      emit('stem-field', 'stemField', App.state.stemField, sf);
      render('inplace');
      if (App.state.stemField === 'confirmed') toast('Field code confirmed');
      return;
    }
    if (t.closest('[data-jobs="change"]')) { App.setJobs(null); return; }

    /* round 5: track another case */
    const ca = t.closest('[data-case-act]');
    if (ca) { e.preventDefault(); trackCaseAct(ca); return; }

    /* disclosure rows: one open per list. A step with detail opens from its
       chevron button or a tap anywhere on its row that is not a control. */
    const head = t.closest('[data-disclosure]');
    const ctl = t.closest('a, button, input, textarea, select, [contenteditable]');
    if (head && (!ctl || ctl === head)) { toggleDisclosure(head); return; }
    const drow = t.closest('.task.has-detail > .row');
    if (drow && !ctl) {
      const h = drow.querySelector('[data-disclosure]');
      if (h) { toggleDisclosure(h); return; }
    }

    /* checkbox tasks */
    const check = t.closest('[role="checkbox"][data-task]');
    if (check) { setTask(check, check.getAttribute('aria-checked') !== 'true'); return; }

    /* the email draft */
    const dact = t.closest('[data-draft-act]');
    if (dact) { draftAction(dact); return; }

    /* your school's steps, from its page */
    const si = t.closest('[data-school-import]');
    if (si) { schoolImportAct(si); return; }

    /* radios: choice cards and chips */
    const radio = t.closest('[role="radiogroup"] [role="radio"]');
    if (radio) { selectRadio(radio); return; }

    /* switches */
    const sw = t.closest('[role="switch"]');
    if (sw) {
      const on = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', on ? 'true' : 'false');
      App.state[sw.dataset.toggle] = on;
      emit('toggle', sw.dataset.toggle, on, sw);
      return;
    }

    /* inline asks and "I'm not sure" */
    const ans = t.closest('[data-answer]');
    if (ans) { answer(ans); return; }

    /* destructive confirm */
    const conf = t.closest('[data-confirm]');
    if (conf) {
      const box = document.getElementById(conf.dataset.confirm);
      conf.hidden = true; box.hidden = false;
      const first = box.querySelector('button'); if (first) first.focus();
      return;
    }
    const keep = t.closest('[data-keep]');
    if (keep) {
      const box = document.getElementById(keep.dataset.keep);
      box.hidden = true;
      const trigger = document.querySelector('[data-confirm="' + keep.dataset.keep + '"]');
      if (trigger) { trigger.hidden = false; trigger.focus(); }
      return;
    }
    const confirmed = t.closest('[data-confirmed]');
    if (confirmed) { emit('confirm', confirmed.dataset.confirmed, true, confirmed); return; }

    /* copy email (the older always-open panel, C.email) */
    const copy = t.closest('[data-copy]');
    if (copy) { copyEmail(copy); return; }

    /* edit in place */
    const edit = t.closest('[data-edit]');
    if (edit) { startEdit(edit); return; }
    const save = t.closest('[data-edit-save]');
    if (save) { finishEdit(save.closest('.vrow'), true); return; }
    const cancel = t.closest('[data-edit-cancel]');
    if (cancel) { finishEdit(cancel.closest('.vrow'), false); return; }

    /* focus a field (date "Change") */
    const f = t.closest('[data-focus]');
    if (f) { const el = document.getElementById(f.dataset.focus); if (el) el.focus(); return; }

    /* onboarding step list */
    const step = t.closest('[data-step]');
    if (step) { emit('step', 'step', Number(step.dataset.step), step); return; }

    /* generic toast trigger */
    const tt = t.closest('[data-toast]');
    if (tt) { toast(tt.dataset.toast); }
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      if (_.openPop) { closePopover(true); return; }
      if (_.menuOpen) { closeMenu(); const m = document.querySelector('[data-menu]'); if (m) m.focus(); return; }
      const editing = document.querySelector('.vrow.is-editing');
      if (editing) { finishEdit(editing, false); return; }
    }
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t.matches && t.matches('[data-disclosure]') && t.tagName !== 'BUTTON') {
      e.preventDefault(); toggleDisclosure(t); return;
    }
    if (e.key === 'Enter' && t.closest && t.closest('.vrow.is-editing') && t.matches('input')) {
      e.preventDefault(); finishEdit(t.closest('.vrow'), true); return;
    }
    if (e.key === 'Enter' && t.matches && t.matches('[data-field^="trackCase:"]')) {
      const save = t.closest('.track-case') && t.closest('.track-case').querySelector('[data-case-act="save"]');
      if (save) { e.preventDefault(); trackCaseAct(save); return; }
    }
    if (e.key === 'Enter' && t.matches && t.matches('[data-school-import-url]')) {
      e.preventDefault(); schoolImportAct(t.closest('.school-import').querySelector('[data-school-import="fetch"]')); return;
    }
    /* arrow keys inside a radiogroup */
    if (/^Arrow(Up|Down|Left|Right)$/.test(e.key) && t.matches && t.matches('[role="radio"]')) {
      const group = t.closest('[role="radiogroup"]');
      const items = Array.from(group.querySelectorAll('[role="radio"]'));
      const i = items.indexOf(t);
      const d = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
      const next = items[(i + d + items.length) % items.length];
      e.preventDefault(); next.focus(); selectRadio(next);
      return;
    }
    /* Cmd or Ctrl + O adds a document from anywhere */
    if ((e.metaKey || e.ctrlKey) && (e.key === 'o' || e.key === 'O')) {
      e.preventDefault(); addDocument();
    }
  }

  function onInput(e) {
    const el = e.target;
    if (e.type === 'change' && el.matches && el.matches('[data-school-import-pdf]')) {
      const f = el.files && el.files[0];
      if (f) schoolImportFound(el.closest('.school-import'), { label: f.name, href: null });
      return;
    }
    const body = el.closest && el.closest('.draft .email-body');
    if (body) { App.state['draftHtml:' + body.closest('[data-draft]').dataset.draft] = body.innerHTML; return; }
    if (!el.dataset || !el.dataset.field) return;
    if (el.dataset.auto) el.dataset.auto = '';
    App.state[el.dataset.field] = el.value;
    emit('field', el.dataset.field, el.value, el);
  }

  App.emit = emit;
  Object.assign(App._, { emit });
})();
