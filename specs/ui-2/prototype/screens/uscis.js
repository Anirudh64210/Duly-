/* USCIS status (#/uscis, #/uscis/<id>): each case with its receipt number
   and its status (Round 3, note 3). Replaces Applications; #/applications
   redirects here with its params.
   List (Round 5, note 2): one row per case (receipt and the date its status
   was last seen, or "Not filed yet"), then Track another case (C.trackCase,
   wired in app.js: any receipt number with what it is for, saved as
   Unknown until rechecked), then the recheck button. The "live tracking
   once connected" line is gone: it did nothing.
   Case with a receipt: receipt, one status line with its date, any date the
   tracker does not show (Card valid, Added), the tracker once a status is
   known, then Recheck and an in-place Update status (a status choice,
   saved with today's date). A case the student added also has Stop
   tracking, with Undo in the toast.
   Case not filed yet: one place to add the receipt number. Its preparation
   dates live on Next steps only. Add your I-797C opens the add sheet
   (#/documents/add); once the notice is saved, the receipt number read from
   it waits in the field for one tap. Typing stays the fallback. Errors
   show under the field.
   Processing time (Round 4, analysis move 7.7): USCIS's own published figure
   for the case's form and category, quoted with its source and as-of date,
   for a filed application only: a receipt number and no decision. Never on
   a case not filed yet, never on a decided case. USCIS's figure, never a
   date for her case. */
(function () {
  'use strict';

  /* Layout only. Type sizes come from system.css. */
  const STYLE =
    '<style>' +
    '.screen-uscis .us-foot { margin-top: var(--s-24); display: flex; flex-direction: column; align-items: flex-start; gap: var(--s-12); }' +
    '.screen-uscis .tracker { margin-top: var(--s-24); }' +
    '.screen-uscis .us-update { margin-top: var(--s-24); display: flex; flex-direction: column; gap: var(--s-12); }' +
    '.screen-uscis .us-update .btn-row { margin-top: 0; }' +
    '.screen-uscis .us-receipt { margin-top: var(--s-24); display: flex; flex-direction: column; gap: var(--s-12); }' +
    '.screen-uscis .us-receipt .btn-row { margin-top: 0; }' +
    '.screen-uscis .us-pt { margin-top: var(--s-24); }' +
    '.screen-uscis .us-pt-line .mark { margin-left: var(--s-4); }' +
    '.screen-uscis .track-case + .us-foot { margin-top: var(--s-12); }' +
    '.screen-uscis .track-case { margin-top: var(--s-12); }' +
    '.screen-uscis .track-case.is-open { margin-top: var(--s-24); }' +
    '.screen-uscis .track-case.is-open + .us-foot { margin-top: var(--s-32); }' +
    '.screen-uscis .us-petition .list + .list { margin-top: var(--s-24); }' +
    '.screen-uscis .us-outcome { margin-top: var(--s-12); }' +
    '.screen-uscis .us-checked { margin-top: var(--s-12); }' +
    '</style>';

  /* The statuses a student can record after rechecking, and the tracker
     step each one reaches. */
  const STATUSES = [
    { label: 'Received', step: 'Received' },
    { label: 'Biometrics scheduled', step: 'Biometrics' },
    { label: 'Approved', step: 'Decision' },
    { label: 'Denied', step: 'Decision' },
    { label: 'Card mailed', step: 'Card mailed' },
  ];
  /* Petitions and stay requests end at the decision: no card is mailed. */
  const NO_CARD = ['i129', 'i140', 'i539'];
  const RECEIPT = /^[A-Z]{3}\d{10}$/;
  const NBSP = ' ';
  /* USCIS status lives in Plan now (BLUEPRINT 3.1): #/plan/status lists the
     cases, #/plan/status/<id> opens one. #/uscis and #/applications redirect
     there (screens/plan.js). */
  const BASE = '#/plan/status';

  /* The next check (BLUEPRINT 3.1, Status: receipt, last checked, next
     check). There is no USCIS connection in v1 (decision 14), so the next
     check is the follow-up of the loop that waits on this case: the STEM OPT
     filing loop, waiting on USCIS, asks "Any notice from USCIS?" 30 days
     after the day it was filed (its timer, app/loops.js). A receipt saved
     Sep 30, 2026 gives 2026-09-30 + 30 = 2026-10-30 (python3). No waiting
     loop, no next check: a decided case needs none. */
  const LOOP_OF = { stem: 'stem-filing' };
  function waitingLoop(a) {
    const kind = LOOP_OF[a.id];
    if (!kind || !App.loops) return null;
    return App.loops.list().filter((lp) => lp.kind === kind && lp.state === 'waiting' && lp.step === 'decision' && lp.timerAt)[0] || null;
  }
  function nextCheck(a) {
    const lp = waitingLoop(a);
    return lp ? App.dates.fmt(lp.timerAt, { year: true }) : null;
  }

  /* The check line on every case with a receipt (BLUEPRINT 3.1): "Checked
     {asOf} · next check {date}". asOf is the day the status was last seen
     on USCIS (saved with each status, data.js applications.items).
       OPT, Approved, asOf Dec 20, 2025, no waiting loop:
         "Checked Dec 20, 2025 · decided, no next check"
       STEM OPT once its receipt is saved Sep 30, 2026 (asOf today), loop
         waiting on USCIS, timer 2026-09-30 + 30 = 2026-10-30 (python3):
         "Checked Sep 30, 2026 · next check Oct 30, 2026"
       A case added to track, status Unknown, asOf null:
         "Added Sep 30 · not checked yet"
     Not filed yet (no receipt): nothing on USCIS to check, no line. */
  const DECIDED = ['Approved', 'Denied', 'Card mailed'];
  function checkLine(a) {
    if (!a.receipt) return null;
    const next = nextCheck(a);
    if (isUnknown(a) || !a.asOf) {
      return (a.added ? 'Added ' + a.added + ' · ' : '') + 'not checked yet' + (next ? ' · next check ' + next : '');
    }
    const tail = next ? 'next check ' + next : (DECIDED.indexOf(a.status) >= 0 ? 'decided, no next check' : 'no next check set');
    return 'Checked ' + a.asOf + ' · ' + tail;
  }
  const keepDates = (s) => s.replace(/(\w{3}) (\d)/g, '$1' + NBSP + '$2').replace(/(\d), (\d{4})/g, '$1,' + NBSP + '$2');

  function today() { return App.data.today.short; }
  function noCard(a) { return NO_CARD.indexOf(a.formType) >= 0; }
  function stepsFor(a) {
    const all = App.data.applications.steps;
    return noCard(a) ? all.filter((s) => s !== 'Card mailed') : all;
  }
  function statusesFor(a) {
    return noCard(a) ? STATUSES.filter((s) => s.step !== 'Card mailed') : STATUSES;
  }
  function isUnknown(a) { return /^unknown$/i.test(a.status || ''); }

  /* The date of the current status: the one saved with it, else the dated
     row of the same name, else the date it was last seen. */
  function statusDate(a) {
    if (a.statusOn) return a.statusOn;
    const d = (a.dates || []).filter((x) => x.label === a.status)[0];
    return d ? d.date : a.asOf || null;
  }

  /* Where to recheck: the student's USCIS account for her own filings; the
     public case status page (any receipt number, no login) for a case she
     added to track. */
  function recheck(tr, a) {
    const to = a && a.tracked && tr.caseStatus ? tr.caseStatus : tr.recheck;
    return C.button({ label: to.label, kind: 'pill', href: to.href });
  }

  /* USCIS's processing time for this case's form and category, only while
     it is filed and undecided (App.processingFor). Null before a receipt
     number and once decided. */
  function processingOf(a) {
    return App.processingFor(a);
  }

  /* The quoted figure under a case row: USCIS's words, its date, Sample. */
  function processingLine(pt) {
    if (!pt) return '';
    return '<span class="row-meta us-pt-line">' +
      C.esc(pt.line.replace(/\.$/, '') + ' · as of ' + pt.asOf.replace(/ /g, NBSP)) +
      (pt.sample ? ' ' + C.sampleMark() : '') + '</span>';
  }

  /* The full fact on a case: the figure, form, category, office and as-of
     date, and the source mark (which says it is not a date for her case). */
  function processingFact(pt) {
    if (!pt) return '';
    return '<div class="us-pt">' + C.list([
      C.processingTime(pt),
    ], { accordion: false, label: pt.label }) + '</div>';
  }

  /* The list row: the receipt and its check line (checkLine). A case added
     to track and not yet rechecked reads "Added Sep 30 · not checked yet". */
  function caseRow(a) {
    const line = checkLine(a);
    return C.row({
      key: a.id,
      title: a.title,
      meta: a.receipt ? a.receipt + (line ? ' · ' + keepDates(line) : '') : null,
      below: processingLine(processingOf(a)),
      value: a.status,
      href: BASE + '/' + a.id,
    });
  }

  /* o.embedded: drawn inside Plan, under its h1 and its view chips. */
  function listView(apps, o) {
    return (o && o.embedded ? '' : C.pageHeader({ title: 'USCIS status' })) +
      C.list(apps.items.map(caseRow), { accordion: false, label: 'Your cases' }) +
      C.trackCase() +
      '<div class="us-foot">' + recheck(apps.tracking) + '</div>' +
      petitionSection();
  }

  /* ---------------- H-1B petition: cap-gap (VALUE-2 feature 8) ---------------- */
  /* Every date here comes from App.capGap over the record; nothing is worked
     out on this page. Priya's record has no petition (data.js records.petitions
     is empty), so the section first says where the cap-gap end will show,
     with the rule behind an ⓘ, and offers Try an outcome (feature 2, the
     petition preset only). The sheet's save button puts the petition on
     the record and the rows below appear.
     With the sheet's sample inputs (data.js change.presets petition), checked
     with python3 on 2026-09-30:
       filed 2027-04-01, start 2027-10-01: a start on or after Oct 1 is in the
         next fiscal year, so fiscal year 2028; filed on or after 2025-01-17,
         so the end is April 1 of it, 2028-04-01.
       pending   end 2028-04-01, "or the H-1B start if earlier"
       approved  end min(2028-04-01, 2027-10-01) = 2027-10-01; F-1 ends 2027-10-01
       denied    end the day of the outcome, 2027-07-15; no later date
       EAD card ends 2027-02-13, before the filing day 2027-04-01: the
         cover question goes to the DSO (asked in the sheet, with Copy). */
  const fmtY = (iso) => App.dates.fmt(iso, { year: true });
  function outcomeLabel(v) {
    const o = (((App.data.change || {}).outcomes) || []).filter((x) => x.value === v)[0];
    return o ? o.label : v;
  }
  function petitionRows(p) {
    const g = App.capGap(p);
    if (!g) return [];
    const rows = [
      C.valueRow({ label: 'Filed', value: fmtY(p.filed), editable: false, num: true }),
      C.valueRow({ label: 'H-1B start asked for', value: fmtY(p.start), editable: false, num: true }),
      C.valueRow({ label: 'Outcome', value: outcomeLabel(g.outcome) + (g.outcome !== 'pending' && App.dates.okIso(p.decided) ? ', ' + fmtY(p.decided) : ''), editable: false }),
      C.valueRow({ label: 'Cap-gap end', key: 'capgap:' + p.id, value: g.endText, editable: false, num: true, source: g.outcome === 'denied' ? 'capGapOutcome' : 'capGap' }),
    ];
    if (g.f1Ends) rows.push(C.valueRow({ label: 'F-1 status ends', value: fmtY(g.f1Ends), editable: false, num: true, source: 'capGapStart' }));
    if (g.outcome !== 'denied') rows.push(C.row({ title: 'Days without work keep counting through cap-gap.', source: 'capGapUnemployment' }));
    if (g.cardEndsBeforeFiling) {
      rows.push(C.row({
        title: 'Your EAD card ends ' + fmtY(g.cardEnd) + ', before the filing day.',
        source: 'eadEnds',
      }));
    }
    return rows;
  }
  /* The cover question, with Copy, as Next steps asks it (App.capGap). */
  const petitionAsk = (p) => { const g = App.capGap(p); return g && g.question ? C.askDso([g.question]) : ''; };
  function petitionSection() {
    const ps = (App.record().petitions || []).filter((p) => App.capGap(p));
    const empty = C.row({
      key: 'capgap-empty',
      title: 'Cap-gap end',
      meta: 'Shows here once your petition is on your record',
      info: 'April 1 of the fiscal year your H-1B would start in, or the H-1B start if earlier, for a petition filed on or after Jan 17, 2025. A fiscal year starts October 1. Try an outcome, then save the petition to your record from there.',
    });
    const body = ps.length
      ? ps.map((p) => C.list(petitionRows(p), { accordion: false, label: 'H-1B petition' }) + petitionAsk(p)).join('')
      : C.list([empty], { accordion: false, label: 'H-1B petition' });
    const last = ps.length ? ps[ps.length - 1] : null;
    const btn = '<button type="button" class="btn btn-text is-small try-change" data-us-outcome="' + C.esc(last ? last.id : '') + '">Try an outcome</button>';
    return C.section({
      eyebrow: 'H-1B petition',
      info: 'With an H-1B petition that asks for a change of status, your F-1 status and OPT work permission can run on while it is decided. That span is cap-gap. Whether it covers you is a question for your DSO.',
      cls: 'us-petition',
      content: body + '<div class="us-outcome">' + btn + '</div>',
    });
  }

  /* Try an outcome: Try a change on the petition preset only. From a
     petition already on the record, the sheet opens on its dates, Now reads
     that petition, and its save button replaces it (the old one comes back
     with Undo). App.openChange and App.whatIf do the replacing. */
  function tryOutcome(id) {
    const p = id ? (App.record().petitions || []).filter((x) => x.id === id)[0] : null;
    App.openChange('petition', { presets: ['petition'], replaces: p ? p.id : null });
  }

  /* The Update status panel, hidden until asked for. */
  function updatePanel(a) {
    return '<div class="us-update" data-us-panel hidden>' +
      C.chips({
        key: 'us-status:' + a.id, inline: true, label: 'Status',
        items: statusesFor(a).map((s) => ({ value: s.label, label: s.label, selected: s.label === a.status })),
      }) +
      '<p class="t-meta num">As of ' + C.esc(today()) + '</p>' +
      C.buttonRow({
        back: C.button({ label: 'Cancel', kind: 'back', attrs: { 'data-us-cancel': '' } }),
        primary: C.button({ label: 'Save status', kind: 'pill', attrs: { 'data-us-save': a.id } }),
      }) +
      '</div>';
  }

  function trackedView(a, apps) {
    const tr = apps.tracking;
    const unknown = isUnknown(a);
    const when = unknown ? null : statusDate(a);
    const steps = stepsFor(a);
    const shown = steps.concat(STATUSES.map((s) => s.label));
    const facts = [
      C.valueRow({ label: 'Receipt number', value: a.receipt, editable: false, num: true }),
      C.valueRow({ label: 'Status', key: 'us-status-row', value: a.status + (when ? ' ' + when : ''), editable: false }),
    ];
    (a.dates || []).filter((d) => shown.indexOf(d.label) < 0).forEach((d) => {
      facts.push(C.valueRow({ label: d.label, value: d.date, editable: false, num: true, source: d.source }));
    });
    const actions = [recheck(tr, a), C.button({ label: 'Update status', kind: 'pill', attrs: { 'data-us-open': '' } })];
    const line = checkLine(a);
    return C.list(facts, { accordion: false, label: 'Case' }) +
      (line ? '<p class="t-meta num us-checked">' + C.esc(keepDates(line)) + '</p>' : '') +
      processingFact(processingOf(a)) +
      /* No tracker while the status is unknown: every step would read as not reached. */
      (a.current == null ? '' : C.tracker({ steps: steps, current: a.current })) +
      '<div class="us-foot" data-us-foot>' +
        C.btnGroup(actions) +
        (a.tracked ? '<button type="button" class="btn btn-text is-quiet" data-us-remove="' + C.esc(a.id) + '">Stop tracking</button>' : '') +
      '</div>' +
      updatePanel(a) +
      /* A petition case: its cap-gap end, or where it will show. */
      (a.formType === 'i129' ? petitionSection() : '');
  }

  /* Another case that already has this receipt number, if any. */
  function caseWith(receipt, id) {
    return App.data.applications.items.filter((x) => x.id !== id && x.receipt === receipt)[0] || null;
  }

  /* Not filed yet: the receipt number, read from the I-797C when one was
     added (waiting in the field for one tap), else typed. A problem shows
     under the field. */
  function receiptView(a, apps) {
    const key = 'us-receipt:' + a.id;
    const read = App.state['us-notice:' + a.id] || null;
    const other = read ? caseWith(read, a.id) : null;
    const filled = read && !other;
    const typed = App.state[key];
    const error = App.state['us-receipt-error:' + a.id] || null;
    return '<div class="us-receipt">' +
      C.field({
        label: 'Receipt number', key: key, value: typed != null ? typed : (filled ? read : null),
        placeholder: apps.receiptPlaceholder, autocomplete: 'off', error: error,
        help: filled ? 'From your I-797C' : (other ? 'That notice is for your ' + other.title : null),
      }) +
      C.buttonRow({
        back: filled ? '' : C.button({ label: 'Add your I-797C', kind: 'back', href: '#/documents/add', attrs: { 'data-us-notice': a.id } }),
        primary: C.button({ label: 'Add receipt number', kind: 'pill', attrs: { 'data-us-receipt': a.id } }),
      }) +
      '</div>' +
      processingFact(processingOf(a));
  }

  function caseView(a, apps) {
    const back = { label: 'USCIS status', href: BASE };
    const form = a.form && a.form !== a.title ? a.form : null;
    const header = C.pageHeader({
      title: a.title,
      meta: a.receipt ? form : [form, a.status].filter(Boolean).join(' · '),
      back: back,
    });
    return header + (a.receipt ? trackedView(a, apps) + C.footer() : receiptView(a, apps));
  }

  /* ---------------- in place: Update status, Add receipt number, Stop tracking ---------------- */

  function showPanel(root, open) {
    const panel = root.querySelector('[data-us-panel]');
    const foot = root.querySelector('[data-us-foot]');
    if (!panel || !foot) return;
    panel.hidden = !open;
    foot.hidden = open;
    if (open) App.play(panel, 'is-arriving');
    const target = open
      ? panel.querySelector('[role="radio"][aria-checked="true"]') || panel.querySelector('[role="radio"]')
      : foot.querySelector('[data-us-open]');
    if (target) target.focus({ preventScroll: true });
  }

  function saveStatus(root, id) {
    const a = App.findApplication(id);
    const pick = root.querySelector('[data-us-panel] [role="radio"][aria-checked="true"]');
    if (!a || !pick) { App.toast('Choose a status'); return; }
    const status = pick.dataset.value;
    const s = STATUSES.filter((x) => x.label === status)[0];
    if (s && (status !== a.status || a.current == null)) a.current = stepsFor(a).indexOf(s.step);
    a.status = status;
    a.statusOn = today();
    a.asOf = today();
    App.emit('edit', 'us-status:' + id, status, pick);
    App.haptic('complete');
    App.rerender();
    const row = document.querySelector('main#main .item[data-key="us-status-row"]');
    if (row) App.play(row, 'is-arriving');
    const open = document.querySelector('main#main [data-us-open]');
    if (open) open.focus({ preventScroll: true });
    App.toast('Status saved');
  }

  function saveReceipt(root, id) {
    const a = App.findApplication(id);
    const input = root.querySelector('[data-field="us-receipt:' + id + '"]');
    if (!a || !input) return;
    const v = App.normalizeReceipt(input.value);
    const E = ((App.data.applications || {}).add || {}).errors || {};
    let error = null;
    if (!v) error = E.empty || 'Add the receipt number from your USCIS notice.';
    else if (!RECEIPT.test(v)) error = E.format || 'A receipt number is three letters and ten digits.';
    else if (caseWith(v, id)) error = 'That number is on your ' + caseWith(v, id).title + '.';
    if (error) {
      App.state['us-receipt:' + id] = input.value;
      App.state['us-receipt-error:' + id] = error;
      App.rerender();
      const again = document.querySelector('main#main [data-field="us-receipt:' + id + '"]');
      if (again) again.focus({ preventScroll: true });
      return;
    }
    delete App.state['us-notice:' + id];
    delete App.state['us-receipt:' + id];
    delete App.state['us-receipt-error:' + id];
    a.receipt = v;
    a.status = 'Received';
    a.current = stepsFor(a).indexOf('Received');
    a.statusOn = today();
    a.asOf = today();
    App.emit('edit', 'us-receipt:' + id, v, input);
    App.haptic('complete');
    App.rerender();
    App.toast('Receipt number added');
  }

  /* Stop tracking a case the student added: back to the list, with Undo. */
  function removeCase(id) {
    const items = App.data.applications.items;
    const at = items.findIndex((x) => x.id === id);
    const item = items[at];
    if (!item || !App.removeCase(id)) return;
    App.haptic('select');
    location.hash = BASE;
    App.toast('Stopped tracking ' + item.title, {
      action: 'Undo',
      onAction() {
        const list = App.data.applications.items;
        if (list.some((x) => x.id === item.id)) return;
        list.splice(Math.min(at, list.length), 0, item);
        App.emit('case', 'add', item.id, null);
        if (location.hash !== BASE) return;
        App.rerender();
        const row = document.querySelector('main#main .item[data-key="' + CSS.escape(item.id) + '"]');
        if (row) App.play(row, 'is-arriving');
      },
    });
  }

  /* ---------------- the I-797C, read on the device ---------------- */

  /* Add your I-797C leaves for the add sheet. When that sheet saves an I-797
     with "Looks right", the receipt number it shows (or the one fixed there)
     is kept for this case, to confirm in one tap back here. */
  let awaiting = null;
  function readReceipt(layer) {
    const title = layer.querySelector('#doc-sheet-title');
    if (!title || !/I-797/.test(title.textContent)) return null;
    let v = null;
    layer.querySelectorAll('.found .vrow').forEach((row) => {
      const label = row.querySelector('.v-label');
      if (!label || label.textContent.trim() !== 'Receipt number') return;
      const input = row.querySelector('.v-edit input');
      const shown = row.querySelector('.v-value');
      v = String(input ? input.value : (shown ? shown.textContent : '')).replace(/[\s-]/g, '').toUpperCase();
    });
    return v && RECEIPT.test(v) ? v : null;
  }
  document.addEventListener('click', (e) => {
    if (!awaiting || !e.target.closest) return;
    const save = e.target.closest('.doc-layer [data-doc-save]');
    if (!save) return;
    const v = readReceipt(save.closest('.doc-layer'));
    if (v) {
      App.state['us-notice:' + awaiting] = v;
      delete App.state['us-receipt:' + awaiting];
      delete App.state['us-receipt-error:' + awaiting];
    }
    awaiting = null;
  }, true);
  window.addEventListener('hashchange', () => {
    if (!/^#\/documents(\/|$)/.test(location.hash)) awaiting = null;
  });

  /* For Plan (screens/plan.js): the list or one case, as a view. */
  function view(data, params, o) {
    const apps = data.applications;
    const one = params && params[0] ? App.findApplication(params[0]) : null;
    return STYLE + (one ? caseView(one, apps) : listView(apps, o));
  }

  window.SCREENS.uscis = {
    title: 'USCIS status',
    view: view,
    titleFor(params) {
      const a = params && params[0] ? App.findApplication(params[0]) : null;
      return a ? a.title : 'USCIS status';
    },
    render(data, params) {
      const apps = data.applications;
      const one = params && params[0] ? App.findApplication(params[0]) : null;
      const body = one ? caseView(one, apps) : listView(apps) + C.footer();
      return STYLE + body;
    },
    mount(root) {
      root.classList.add('screen-uscis');
      root.addEventListener('click', (e) => {
        const t = e.target;
        const notice = t.closest('[data-us-notice]');
        if (notice) { awaiting = notice.dataset.usNotice; return; }
        if (t.closest('[data-us-open]')) { showPanel(root, true); return; }
        if (t.closest('[data-us-cancel]')) { showPanel(root, false); return; }
        const save = t.closest('[data-us-save]');
        if (save) { saveStatus(root, save.dataset.usSave); return; }
        const add = t.closest('[data-us-receipt]');
        if (add) { saveReceipt(root, add.dataset.usReceipt); return; }
        const oc = t.closest('[data-us-outcome]');
        if (oc) { tryOutcome(oc.dataset.usOutcome || null); return; }
        const rm = t.closest('[data-us-remove]');
        if (rm) removeCase(rm.dataset.usRemove);
      });
      root.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && root.querySelector('[data-us-panel]:not([hidden])')) { showPanel(root, false); return; }
        if (e.key !== 'Enter' || !e.target.matches('[data-field^="us-receipt:"]')) return;
        e.preventDefault();
        saveReceipt(root, e.target.dataset.field.slice('us-receipt:'.length));
      });
    },
  };
})();
