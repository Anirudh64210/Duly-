/* app/school.js: Your school's steps, from its page (C.schoolImport). */

(function () {
  'use strict';

  const App = window.App;
  const data = App.data;
  const _ = App._;
  const { schoolImportOf, setSchoolImport, render, emit } = App._;
  /* Defined in a file loaded later; looked up when called. */
  const toast = (...a) => _.toast(...a);

  /* ---------------- your school's steps, from its page (C.schoolImport) ---------------- */
  function schoolImportFound(wrap, src) {
    if (!wrap) return;
    const path = wrap.dataset.schoolImportWrap || 'stem';
    setSchoolImport(path, 'found', src);
    emit('school-import', path, 'found', wrap);
    render('inplace');
    const btn = document.querySelector('[data-school-import="confirm"]');
    if (btn) btn.focus({ preventScroll: true });
  }
  function schoolImportAct(btn) {
    if (!btn) return;
    const wrap = btn.closest('.school-import');
    const path = (wrap && wrap.dataset.schoolImportWrap) || 'stem';
    const act = btn.dataset.schoolImport;
    if (act === 'fetch') {
      const input = wrap.querySelector('[data-school-import-url]');
      const v = input ? input.value.trim() : '';
      if (!v) { if (input) input.focus(); toast('Paste the link first'); return; }
      const href = /^https?:/.test(v) ? v : 'https://' + v;
      const d = data.schoolImport || {};
      schoolImportFound(wrap, { href: href, label: d.label || href.replace(/^https?:\/\//, '').split('/')[0] });
      return;
    }
    if (act === 'confirm') {
      const n = schoolImportOf(path).steps.length;
      setSchoolImport(path, 'confirmed');
      emit('school-import', path, 'confirmed', btn);
      render('inplace');
      toast(n + ' steps added');
      return;
    }
    if (act === 'dismiss' || act === 'reset') {
      setSchoolImport(path, 'empty', null);
      emit('school-import', path, 'empty', btn);
      render('inplace');
      const input = document.querySelector('[data-school-import-url]');
      if (input) input.focus({ preventScroll: true });
    }
  }

  Object.assign(App._, { schoolImportFound, schoolImportAct });
})();
