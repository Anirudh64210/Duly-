/* app/sheets.js: VALUE-2. The small sheet, Try a change, Share documents, the check-in and report rows.

   One sheet at a time, laid over the page: a panel on the right on a wide
   window, a sheet from the bottom on a phone. Escape, the scrim, the close
   mark and Cancel all close it; focus returns to what opened it. Nothing in
   a sheet saves on its own.
     App.openChange(preset?, { presets?, stemCard? })   Try a change
     App.openSharePack(ids?)                            Share documents
     App.closeSheet()
   Wiring by data attributes (components/change.js lists them). The inputs
   use data-field="change:<name>" and the chips data-choices="change:<name>",
   so the shared handlers in events.js and controls.js set
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

  /* ---------------- Share documents ---------------- */
  /* Round 7: tick documents, then Share sends them together through the
     device's own share sheet, or Save keeps them as one file (a .zip when
     there are several). The files come from screens/documents.js
     (App.documentList, App.documentFile: the prototype's sample PDFs). */
  const SP = { docs: {} };
  function papers() {
    if (typeof App.documentList === 'function') return App.documentList();
    const d = data.documents || {};
    const out = [];
    (d.i20Groups || []).forEach((g) => (g.items || []).forEach((i) => out.push({ id: i.id, title: i.name || i.title, meta: i.meta })));
    ['work', 'identity', 'school'].forEach((k) => (d[k] || []).forEach((i) => out.push({ id: i.id, title: i.title, meta: i.meta })));
    return out;
  }
  function shareState() { return { docs: SP.docs, papers: papers() }; }
  /* App.openSharePack(ids?) : ids (an array, or "a,b") are ticked to start. */
  App.openSharePack = (ids) => {
    SP.docs = {};
    const pick = Array.isArray(ids) ? ids : String(ids || '').split(',').filter(Boolean);
    pick.forEach((id) => { SP.docs[id] = true; });
    openSheet('share', () => C.sharePack(shareState()));
    emit('sheet', 'share', null, null);
  };
  App.shareState = shareState;
  function picked() {
    return papers().filter((p) => SP.docs[p.id]).map((p) => (App.documentFile ? App.documentFile(p.id) : null)).filter(Boolean);
  }
  function shareAct(btn) {
    const act = btn.dataset.shareAct;
    if (act === 'cancel') { closeSheet(true); return; }
    const files = picked();
    if (!files.length) return;
    const title = ((data.sharePack || {}).bundle) || 'Documents';
    if (act === 'share' && navigator.share && navigator.canShare && navigator.canShare({ files: files })) {
      closeSheet(true);
      emit('share', title, true, null);
      navigator.share({ files: files, title: title }).catch(() => { /* closed */ });
      return;
    }
    /* Save, or Share where the browser cannot share files: one file. */
    closeSheet(true);
    saveBundle(files, title).then((name) => {
      emit('share', title, true, null);
      toast(act === 'share' ? 'Saved ' + name + '. Attach it from your downloads' : 'Saved ' + name);
    });
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  function saveBundle(files, title) {
    if (files.length === 1) { download(files[0], files[0].name); return Promise.resolve(files[0].name); }
    const name = title + '.zip';
    return zip(files).then((blob) => { download(blob, name); return name; });
  }
  /* A plain .zip (stored, no compression): every OS opens it. */
  const CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i += 1) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) {
    const enc = new TextEncoder();
    const seen = {};
    return Promise.all(files.map((f) => f.arrayBuffer())).then((bufs) => {
      const parts = [], central = [];
      let offset = 0;
      bufs.forEach((buf, i) => {
        let nm = files[i].name;
        if (seen[nm]) nm = nm.replace(/(\.\w+)$/, ' ' + (++seen[nm]) + '$1'); else seen[nm] = 1;
        const name = enc.encode(nm), body = new Uint8Array(buf), crc = crc32(body);
        const head = new DataView(new ArrayBuffer(30));
        head.setUint32(0, 0x04034b50, true); head.setUint16(4, 20, true); head.setUint16(6, 0x0800, true);
        head.setUint32(14, crc, true); head.setUint32(18, body.length, true); head.setUint32(22, body.length, true);
        head.setUint16(26, name.length, true);
        const cen = new DataView(new ArrayBuffer(46));
        cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
        cen.setUint32(16, crc, true); cen.setUint32(20, body.length, true); cen.setUint32(24, body.length, true);
        cen.setUint16(28, name.length, true); cen.setUint32(42, offset, true);
        parts.push(head, name, body);
        central.push(cen, name);
        offset += 30 + name.length + body.length;
      });
      const size = central.reduce((n, x) => n + x.byteLength, 0);
      const end = new DataView(new ArrayBuffer(22));
      end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
      end.setUint32(12, size, true); end.setUint32(16, offset, true);
      return new Blob(parts.concat(central, [end]), { type: 'application/zip' });
    });
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
    if (so && so.tagName === 'BUTTON') { e.preventDefault(); App.openSharePack(so.dataset.shareOpen || ''); return; }
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
