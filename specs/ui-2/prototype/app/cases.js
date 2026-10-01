/* app/cases.js: Round 5: track another case. */

(function () {
  'use strict';

  const App = window.App;
  const data = App.data;
  const _ = App._;
  const { cssEsc, shortToday } = App._;
  /* Defined in a file loaded later; looked up when called. */
  const haptic = (...a) => _.haptic(...a);
  const play = (...a) => _.play(...a);
  const render = (...a) => _.render(...a);
  const emit = (...a) => _.emit(...a);
  const toast = (...a) => _.toast(...a);

  /* ---------------- round 5: track another case (note 2) ---------------- */

  const RECEIPT_RE = /^[A-Z]{3}\d{10}$/;
  App.normalizeReceipt = (v) => String(v || '').toUpperCase().replace(/[\s-]/g, '');
  App.isReceipt = (v) => RECEIPT_RE.test(App.normalizeReceipt(v));
  App.formTypes = () => ((data.applications || {}).formTypes || []).slice();
  App.formType = (key) => App.formTypes().filter((t) => t.key === key)[0] || null;

  /* App.addCase({ receipt, form, other?, title? }) : save a case to track.
     receipt is normalised (upper case, no spaces or dashes) and checked:
     three letters and ten digits, not already on the list. form is a
     formTypes key; 'other' needs `other`, the form in the student's words.
     The case joins DULY_SAMPLE.applications.items as
       { id: 'case-<receipt>', title, form, formType, receipt, status: 'Unknown',
         current: null, asOf: null, added: 'Sep 30', tracked: true, manual: true,
         dates: [{ label: 'Added', date }], next: { title, href }, processing: null }
     and stays Unknown until the student records a status after rechecking.
     Returns { ok: true, item } or { ok: false, errors: { receipt?, form?, other? } }
     with the copy to show under each field. */
  function addCase(o) {
    const opt = o || {};
    const apps = data.applications = data.applications || { items: [] };
    apps.items = apps.items || [];
    const add = apps.add || {};
    const E = add.errors || {};
    const receipt = App.normalizeReceipt(opt.receipt);
    const errors = {};
    if (!receipt) errors.receipt = E.empty || 'Add the receipt number.';
    else if (!RECEIPT_RE.test(receipt)) errors.receipt = E.format || 'Three letters and ten digits.';
    else if (apps.items.some((x) => App.normalizeReceipt(App.state['receipt:' + x.id] || x.receipt) === receipt)) errors.receipt = E.duplicate || 'Already on your list.';
    const type = App.formType(opt.form);
    const other = String(opt.other || '').trim();
    if (!type) errors.form = E.form || 'Choose what the case is for.';
    else if (type.key === 'other' && !other) errors.other = E.other || 'Name the form.';
    if (Object.keys(errors).length) return { ok: false, errors: errors };
    const tr = apps.tracking || {};
    const item = {
      id: 'case-' + receipt.toLowerCase(),
      title: opt.title || (type.key === 'other' ? other : type.label),
      form: type.key === 'other' ? other : type.form,
      formType: type.key,
      receipt: receipt,
      status: add.unknown || 'Unknown',
      current: null,
      asOf: null,
      added: shortToday(),
      manual: true,
      tracked: true,
      dates: [{ label: 'Added', date: data.today.short }],
      next: { title: add.unknownLine || 'Recheck on USCIS to see its status', href: (tr.caseStatus && tr.caseStatus.href) || (tr.recheck && tr.recheck.href) || null },
      processing: null,
      schoolSteps: [],
    };
    apps.items.push(item);
    emit('case', 'add', item.id, null);
    return { ok: true, item: item };
  }
  App.addCase = addCase;
  /* App.removeCase(id) : only a case the student added (tracked: true). */
  App.removeCase = (id) => {
    const apps = data.applications || {};
    const before = (apps.items || []).length;
    apps.items = (apps.items || []).filter((x) => !(x.id === id && x.tracked));
    const gone = apps.items.length !== before;
    if (gone) emit('case', 'remove', id, null);
    return gone;
  };

  /* C.trackCase in place: open, cancel, save, the form type, Enter to save. */
  function redrawTrackCase(el) {
    const box = el && el.closest ? el.closest('.track-case') : document.querySelector('main#main .track-case');
    if (!box) return null;
    const tmp = document.createElement('div');
    tmp.innerHTML = C.trackCase();
    const next = tmp.firstElementChild;
    box.replaceWith(next);
    return next;
  }
  function clearTrackCase() {
    ['open', 'receipt', 'form', 'other', 'error'].forEach((k) => { delete App.state['trackCase:' + k]; });
  }
  function trackCaseAct(btn) {
    const act = btn.dataset.caseAct;
    if (act === 'open') {
      App.state['trackCase:open'] = true;
      const box = redrawTrackCase(btn);
      if (box) { play(box, 'is-arriving'); const i = box.querySelector('input'); if (i) i.focus(); }
      return;
    }
    if (act === 'cancel') {
      clearTrackCase();
      const box = redrawTrackCase(btn);
      const b = box && box.querySelector('[data-case-act="open"]'); if (b) b.focus();
      return;
    }
    if (act === 'save') {
      const res = addCase({ receipt: App.state['trackCase:receipt'], form: App.state['trackCase:form'], other: App.state['trackCase:other'] });
      if (!res.ok) {
        App.state['trackCase:error'] = res.errors;
        const box = redrawTrackCase(btn);
        const k = res.errors.receipt ? 'receipt' : (res.errors.form ? 'form' : 'other');
        const f = box && (k === 'form' ? box.querySelector('[data-choices="trackCase:form"] [role="radio"]') : box.querySelector('[data-field="trackCase:' + k + '"]'));
        if (f) f.focus();
        return;
      }
      clearTrackCase();
      haptic('complete');
      toast(((data.applications || {}).add || {}).saved || 'Case added');
      render('inplace');
      const row = document.querySelector('main#main .item[data-key="' + cssEsc(res.item.id) + '"]');
      if (row) play(row, 'is-arriving');
    }
  }

  Object.assign(App._, { trackCaseAct });
})();
