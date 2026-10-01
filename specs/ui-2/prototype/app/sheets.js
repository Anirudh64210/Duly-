/* app/sheets.js: VALUE-2. The small sheet, Try a change, Share, the check-in and report rows.

   One sheet at a time, laid over the page: a panel on the right on a wide
   window, a sheet from the bottom on a phone. Escape, the scrim, the close
   mark and Cancel all close it; focus returns to what opened it. Nothing in
   a sheet saves on its own.
     App.openChange(preset?, { presets?, stemCard? })   Try a change
     App.openSharePack(who?)                            Share, with a summary
     App.closeSheet()
   Wiring by data attributes (components/change.js lists them). The inputs
   use data-field="change:<name>" and the chips data-choices="change:<name>"
   or "share:who", so the shared handlers in events.js and controls.js set
   App.state and announce them; this file listens for those and redraws the
   sheet, or only its result while a field is typed in. */

(function () {
  'use strict';

  const App = window.App;
  const data = App.data;
  const _ = App._;
  const render = (...a) => _.render(...a);
  const toast = (...a) => _.toast(...a);
  const emit = (...a) => _.emit(...a);
  const haptic = (...a) => _.haptic(...a);
  const play = (...a) => _.play(...a);

  /* ---------------- the sheet ---------------- */
  let open = null; /* { kind, layer, sheet, returnTo, draw } */

  function openSheet(kind, draw) {
    closeSheet(false);
    const layer = document.createElement('div');
    layer.className = 'sheet-layer';
    layer.innerHTML = '<div class="scrim" data-sheet-close></div>' +
      '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabindex="-1"></div>';
    document.body.appendChild(layer);
    const sheet = layer.querySelector('.sheet');
    open = { kind: kind, layer: layer, sheet: sheet, returnTo: document.activeElement, draw: draw };
    sheet.innerHTML = draw();
    sheet.addEventListener('keydown', trap);
    document.documentElement.classList.add('has-sheet');
    const h = sheet.querySelector('#sheet-title');
    (h || sheet).focus({ preventScroll: true });
  }
  /* Redraw the inside, keeping focus on the control that had it. */
  function redraw() {
    if (!open) return;
    const a = document.activeElement;
    const sel = a && open.sheet.contains(a) ? focusKey(a) : null;
    const top = open.sheet.scrollTop;
    open.sheet.innerHTML = open.draw();
    open.sheet.scrollTop = top;
    if (sel) { const el = open.sheet.querySelector(sel); if (el) el.focus({ preventScroll: true }); }
  }
  function focusKey(el) {
    const C_ = (window.CSS && CSS.escape) ? CSS.escape : (v) => v;
    if (el.dataset.field) return '[data-field="' + C_(el.dataset.field) + '"]';
    if (el.matches('[role="radio"]')) { const g = el.closest('[data-choices]'); return '[data-choices="' + C_(g.dataset.choices) + '"] [data-value="' + C_(el.dataset.value) + '"]'; }
    if (el.dataset.toggle) return '[data-toggle="' + C_(el.dataset.toggle) + '"]';
    if (el.dataset.shareDoc) return '[data-share-doc="' + C_(el.dataset.shareDoc) + '"]';
    return null;
  }
  function closeSheet(returnFocus) {
    if (!open) return;
    const o = open;
    open = null;
    o.layer.remove();
    document.documentElement.classList.remove('has-sheet');
    if (returnFocus !== false && o.returnTo && document.contains(o.returnTo)) o.returnTo.focus({ preventScroll: true });
  }
  function trap(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSheet(true); return; }
    if (e.key !== 'Tab') return;
    const f = Array.from(this.querySelectorAll('a[href], button:not([disabled]), input, [tabindex="0"]')).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === this)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  App.closeSheet = () => closeSheet(true);
  /* Escape closes the sheet from anywhere, after an open source sheet. */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !open || _.openPop || (e.target.closest && e.target.closest('.pop'))) return;
    if (open.sheet.contains(e.target)) return;
    closeSheet(true);
  });

  /* ---------------- Try a change ---------------- */
  const CS = { preset: null, presets: null, values: {}, opts: {} };
  function presetDefaults(key) {
    const p = ((data.change || {}).presets || []).filter((x) => x.key === key)[0];
    return Object.assign({}, (p && p.defaults) || {});
  }
  function changeNow() {
    if (!CS.preset) return null;
    return Object.assign({ kind: CS.preset }, CS.values[CS.preset] || {});
  }
  function changeState() {
    const rec = App.record();
    const job = (rec.jobs || []).filter((j) => !j.end || j.end >= data.today.iso)[0] || null;
    const c = changeNow();
    return { preset: CS.preset, presets: CS.presets, values: CS.values[CS.preset] || {}, job: job, result: c ? App.whatIf(c, CS.opts) : null };
  }
  function setPreset(key) {
    CS.preset = key || null;
    if (key && !CS.values[key]) CS.values[key] = presetDefaults(key);
  }
  /* App.openChange('jobEnd', { presets?, stemCard?, replaces? }) : opens on
     that preset with its sample dates filled in. Never saves.
     replaces: the id of a petition on the record. The sheet opens on its
     dates, Now reads it, and This happened puts the new outcome in its
     place (App.whatIf's petition preset). */
  App.openChange = (preset, o) => {
    const opt = o || {};
    CS.presets = opt.presets || null;
    CS.opts = opt.stemCard ? { stemCard: opt.stemCard } : {};
    CS.values = {};
    const first = preset || (CS.presets ? CS.presets[0] : null);
    setPreset(first || null);
    const was = first === 'petition' && opt.replaces ? (App.record().petitions || []).filter((x) => x.id === opt.replaces)[0] : null;
    if (was) {
      Object.assign(CS.values.petition, { filed: was.filed, start: was.start, outcome: was.outcome || 'pending', replaces: was.id });
      if (was.decided) CS.values.petition.decided = was.decided;
    }
    openSheet('change', () => C.change(changeState()));
    emit('sheet', 'change', CS.preset, null);
  };
  App.changeState = changeState;
  function redrawResult() {
    if (!open || open.kind !== 'change') return;
    const st = changeState();
    const box = open.sheet.querySelector('[data-change-result]');
    if (box) box.innerHTML = C._.changeResult(st.result);
    const save = open.sheet.querySelector('[data-change-act="save"]');
    if (save) save.disabled = !(st.result && st.result.ok && st.result.rows.length);
  }
  function changeAct(btn) {
    const act = btn.dataset.changeAct;
    if (act === 'cancel') { closeSheet(true); return; }
    if (act === 'copy') {
      const st = changeState();
      const text = ((st.result && st.result.questions) || []).join('\n');
      const done = () => toast('Questions copied');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done); else done();
      return;
    }
    if (act === 'save') {
      const c = changeNow();
      if (!c) return;
      closeSheet(true);
      haptic('tick');
      App.applyChange(c, CS.opts);
    }
  }

  /* ---------------- Share, with a summary ---------------- */
  const SP = { who: null, docs: {}, summary: true, show: false };
  /* Each paper, with sample: true when a record that came from it holds
     sample values (records.passport and records.visa today), so the Share
     rows carry the Sample mark as Documents does. */
  function allPapers() {
    const d = data.documents || {};
    const rec = App.record();
    const sampleDocs = {};
    Object.keys(rec).forEach((k) => { const r = rec[k]; if (r && !Array.isArray(r) && typeof r === 'object' && r.doc && r.sample) sampleDocs[r.doc] = true; });
    const out = {};
    const put = (i, title) => { out[i.id] = { id: i.id, title: title, meta: i.meta, sample: !!(i.sample || sampleDocs[i.id]) }; };
    (d.i20Groups || []).forEach((g) => (g.items || []).forEach((i) => put(i, i.name || i.title)));
    ['work', 'identity', 'school'].forEach((k) => (d[k] || []).forEach((i) => put(i, i.title)));
    return out;
  }
  function shareState() {
    const cfg = data.sharePack || {};
    const pick = (cfg.for || []).filter((f) => f.value === SP.who)[0];
    const all = allPapers();
    const papers = pick ? pick.docs.map((id) => all[id]).filter(Boolean) : [];
    return { who: SP.who, docs: SP.docs, summary: SP.summary, show: SP.show, papers: papers };
  }
  function setWho(who) {
    SP.who = who || null;
    const pick = ((data.sharePack || {}).for || []).filter((f) => f.value === who)[0];
    SP.docs = {};
    if (pick) pick.docs.forEach((id) => { SP.docs[id] = true; });
  }
  /* App.openSharePack('employer' | 'dso' | 'attorney' | undefined) */
  App.openSharePack = (who) => {
    SP.summary = true; SP.show = false;
    App.state['share:summary'] = true; App.state['share:show'] = false;
    setWho(who || null);
    openSheet('share', () => C.sharePack(shareState()));
    emit('sheet', 'share', SP.who, null);
  };
  App.shareState = shareState;
  function shareAct(btn) {
    const act = btn.dataset.shareAct;
    if (act === 'cancel') { closeSheet(true); return; }
    const st = shareState();
    const sum = SP.summary ? App.summary(SP.who, { show: SP.show }) : null;
    const names = st.papers.filter((p) => SP.docs[p.id]).map((p) => p.title + (p.sample ? ' (sample)' : ''));
    if (act === 'pdf') { printSummary(sum, names); return; }
    if (act === 'share') {
      const text = (sum ? sum.text + '\n\n' : '') + (names.length ? 'Papers: ' + names.join(', ') : '');
      closeSheet(true);
      App.share({ title: sum ? sum.title : 'My papers', text: text });
    }
  }
  /* Save as PDF: the summary on its own page, through the browser's print
     dialog (Save as PDF there). */
  function printSummary(sum, names) {
    if (!sum) return;
    const w = window.open('', '_blank', 'noopener=no');
    if (!w) { toast('Allow pop-ups to save the PDF'); return; }
    const css = 'body{font:15px/24px "Instrument Sans",system-ui,sans-serif;color:#1A1917;margin:48px;max-width:640px}' +
      'h3{font-size:20px;line-height:28px;margin:0}.t-meta{color:#6B6862;margin:0 0 16px}.t-eyebrow{font-weight:600;font-variant-caps:all-small-caps;letter-spacing:.06em;color:#6B6862;margin:16px 0 4px}p{margin:0}' +
      '.summary-foot{margin-top:24px}';
    w.document.write('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + C.esc(sum.title) + '</title><style>' + css + '</style></head><body>' +
      C.summaryPage(sum) + (names.length ? '<p class="t-eyebrow">Papers</p><p>' + C.esc(names.join(', ')) + '</p>' : '') + '</body></html>');
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch (e) { /* closed */ } }, 200);
  }

  /* ---------------- clicks ---------------- */
  document.addEventListener('click', (e) => {
    const t = e.target;
    const opener = t.closest('[data-change-open]');
    if (opener && opener.tagName === 'BUTTON') {
      e.preventDefault();
      const ps = opener.dataset.changePresets ? opener.dataset.changePresets.split(',') : null;
      App.openChange(opener.dataset.changeOpen || null, { presets: ps });
      return;
    }
    const so = t.closest('[data-share-open]');
    if (so && so.tagName === 'BUTTON') { e.preventDefault(); App.openSharePack(so.dataset.shareOpen || null); return; }
    if (t.closest('[data-sheet-close]')) { e.preventDefault(); closeSheet(true); return; }
    const ca = t.closest('[data-change-act]');
    if (ca) { e.preventDefault(); changeAct(ca); return; }
    const sa = t.closest('[data-share-act]');
    if (sa) { e.preventDefault(); shareAct(sa); return; }
    const sd = t.closest('[data-share-doc]');
    if (sd) {
      e.preventDefault();
      SP.docs[sd.dataset.shareDoc] = sd.getAttribute('aria-checked') !== 'true';
      haptic('select');
      redraw();
      return;
    }
    const ask = t.closest('[data-ask-copy]');
    if (ask) {
      e.preventDefault();
      const done = () => toast('Questions copied');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ask.dataset.askCopy || '').then(done, done); else done();
      return;
    }
    const ci = t.closest('[data-checkin-act]');
    if (ci) { e.preventDefault(); checkinAct(ci); return; }
    const ra = t.closest('[data-report-act]');
    if (ra) { e.preventDefault(); reportAct(ra); }
  });

  /* The shared handlers set App.state and announce the change; a sheet's
     own keys redraw it. */
  document.addEventListener('duly:change', (e) => {
    const d = e.detail || {};
    const key = String(d.key || '');
    if (!open) return;
    if (open.kind === 'change' && key.indexOf('change:') === 0) {
      const name = key.slice(7);
      if (name === 'preset') { setPreset(d.value); redraw(); play(open.sheet.querySelector('.change-inputs'), 'is-arriving'); return; }
      if (!CS.preset) return;
      CS.values[CS.preset] = CS.values[CS.preset] || {};
      CS.values[CS.preset][name] = d.value;
      /* A chip can add or remove a field (the outcome's day): redraw all. */
      if (d.kind === 'choice') redraw(); else redrawResult();
      return;
    }
    if (open.kind === 'share') {
      if (key === 'share:who') { setWho(d.value); redraw(); return; }
      if (key === 'share:summary') { SP.summary = !!d.value; redraw(); return; }
      if (key === 'share:show') { SP.show = !!d.value; redraw(); }
    }
  });

  /* ---------------- the check-in ---------------- */
  function checkinAct(btn) {
    const card = btn.closest('[data-checkin]');
    const id = card ? card.dataset.checkin : null;
    const act = btn.dataset.checkinAct;
    if (!id) return;
    if (act === 'yes') {
      App.answerCheckin(id, 'yes');
      App.state['checkin:last'] = id;
      haptic('tick');
      render('inplace');
      return;
    }
    if (act === 'undo') {
      App.answerCheckin(id, 'undo');
      App.state['checkin:last'] = null;
      render('inplace');
      return;
    }
    if (act === 'update') {
      const kind = id.split(':')[0];
      /* A petition check-in opens on that petition, to be replaced. */
      App.openChange(kind === 'petition' ? 'petition' : 'jobEnd', { presets: kind === 'petition' ? ['petition'] : ['jobEnd', 'newEmployer', 'fewerHours'],
        replaces: kind === 'petition' ? id.split(':')[1] : null });
    }
  }
  /* A confirmation line lasts until the student leaves the page. */
  window.addEventListener('hashchange', () => { App.state['checkin:last'] = null; closeSheet(false); });

  /* ---------------- report rows ---------------- */
  function reportAct(btn) {
    const id = btn.dataset.report;
    const done = btn.dataset.reportAct === 'done';
    App.markReport(id, done);
    if (done) haptic('tick');
    render('inplace');
    if (done) toast('Marked made', { action: 'Undo', onAction: () => { App.markReport(id, false); render('inplace'); } });
  }

  Object.assign(App._, { openSheet, closeSheet, redrawSheet: redraw });
})();
