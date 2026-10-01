/* app/controls.js: Disclosures, radios, inline asks, edit in place. */

(function () {
  'use strict';

  const App = window.App;
  const _ = App._;
  const { reduced, setStemIntent, haptic, play, applyTheme, render, emit } = App._;
  /* Defined in a file loaded later; looked up when called. */
  const toast = (...a) => _.toast(...a);

  /* ---------------- disclosure ---------------- */
  function toggleDisclosure(head) {
    const item = head.closest('.item');
    const open = head.getAttribute('aria-expanded') !== 'true';
    const listEl = item.parentElement;
    if (open && listEl && listEl.hasAttribute('data-accordion')) {
      Array.from(listEl.children).forEach((sib) => { if (sib !== item) setOpen(sib, false); });
    }
    setOpen(item, open);
    /* The drop plays only here, when the student opens the row. */
    const disc = item.querySelector(':scope > .disc');
    if (open && disc && !reduced()) {
      disc.classList.remove('is-dropping');
      void disc.offsetWidth;
      disc.classList.add('is-dropping');
      disc.addEventListener('animationend', () => disc.classList.remove('is-dropping'), { once: true });
    }
  }
  function setOpen(item, open) {
    const head = item.querySelector(':scope > [data-disclosure], :scope > .row > .row-trail > [data-disclosure]');
    const disc = item.querySelector(':scope > .disc');
    if (!head || !disc) return;
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    item.classList.toggle('is-open', open);
    disc.hidden = !open;
  }
  App.setOpen = setOpen;

  /* ---------------- radios ---------------- */
  function selectRadio(radio) {
    const group = radio.closest('[role="radiogroup"]');
    group.querySelectorAll('[role="radio"]').forEach((r) => {
      const on = r === radio;
      r.setAttribute('aria-checked', on ? 'true' : 'false');
      r.tabIndex = on ? 0 : -1;
    });
    const key = group.dataset.choices;
    App.state[key] = radio.dataset.value;
    haptic('select');
    if (key === 'theme') applyTheme(radio.dataset.value);
    if (key === 'trackCase:form') {
      const box = group.closest('.track-case');
      const other = box && box.querySelector('.tc-other');
      if (other) {
        const show = radio.dataset.value === 'other';
        other.hidden = !show;
        if (show) { play(other, 'is-arriving'); const i = other.querySelector('input'); if (i) i.focus({ preventScroll: true }); }
      }
    }
    emit('choice', key, radio.dataset.value, radio);
  }

  /* ---------------- inline asks ---------------- */
  function answer(btn) {
    const key = btn.dataset.answer;
    const value = btn.dataset.value;
    /* The STEM OPT choice is answered in place wherever it is asked. */
    if (key === 'stemIntent' && btn.closest('[data-stem-decide]')) { setStemIntent(value, btn); return; }
    if (key === 'stemIntent') haptic('tick');
    App.state[key] = value;
    const item = btn.closest('.ask');
    if (item) {
      if (value === 'unsure') {
        const n = item.querySelector('[data-ask-note]');
        if (n) n.hidden = false;
      } else if (!reduced()) {
        item.classList.add('is-leaving');
        setTimeout(() => item.remove(), 280);
      } else {
        item.remove();
      }
    }
    emit('answer', key, value, btn);
    /* The job-list answer starts the count: every number on the page changes,
       so the column redraws in place once the ask has faded. */
    if (key === 'jobsComplete' && value !== 'unsure') setTimeout(() => render('inplace'), reduced() ? 0 : 300);
  }

  /* ---------------- edit in place ---------------- */
  function startEdit(btn) {
    const row = btn.closest('.vrow');
    if (!row || row.classList.contains('is-editing')) return;
    const current = document.querySelector('.vrow.is-editing');
    if (current) finishEdit(current, false);
    row.classList.add('is-editing');
    const label = row.querySelector('.v-label').textContent;
    const box = document.createElement('div');
    box.className = 'v-edit';
    /* The one placement rule: Cancel on the left, Save on the right. */
    box.innerHTML = '<input class="input" type="text" aria-label="' + C.esc(label) + '" value="' + C.esc(btn.textContent) + '">' +
      '<button type="button" class="btn btn-text is-quiet" data-edit-cancel>Cancel</button>' +
      '<button type="button" class="btn btn-pill" data-edit-save>Save</button>';
    btn.hidden = true;
    row.querySelector('.row').appendChild(box);
    row.querySelector('.row').style.flexWrap = 'wrap';
    const input = box.querySelector('input');
    input.focus(); input.select();
  }
  function finishEdit(row, keep) {
    if (!row) return;
    const btn = row.querySelector('[data-edit]');
    const box = row.querySelector('.v-edit');
    if (keep && box) {
      const v = box.querySelector('input').value.trim();
      if (v) {
        btn.textContent = v;
        App.state['edit:' + btn.dataset.edit] = v;
        emit('edit', btn.dataset.edit, v, btn);
        toast('Saved');
      }
    }
    if (box) box.remove();
    row.querySelector('.row').style.flexWrap = '';
    row.classList.remove('is-editing');
    btn.hidden = false;
    btn.focus();
  }

  Object.assign(App._, { toggleDisclosure, setOpen, selectRadio, answer, startEdit, finishEdit });
})();
