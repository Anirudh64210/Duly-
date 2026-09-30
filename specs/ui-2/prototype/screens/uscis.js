/* USCIS status (#/uscis, #/uscis/<id>): each case with its receipt number
   and its status (Round 3, note 3). Replaces Applications; #/applications
   redirects here with its params.
   List: one row per case (receipt and status date, or "Not filed yet"),
   the recheck button that says you log in, and one short line with its ⓘ
   that live tracking comes once connected (BACKLOG B8).
   Case with a receipt: receipt, one status line with its date, any date the
   tracker does not show (Card valid), the tracker, then Recheck and an
   in-place Update status (a status choice, saved with today's date).
   Case not filed yet: one place to add the receipt number. Its preparation
   dates live on Next steps only. */
(function () {
  'use strict';

  /* Layout only. Type sizes come from system.css. */
  const STYLE =
    '<style>' +
    '.screen-uscis .us-foot { margin-top: var(--s-24); display: flex; flex-direction: column; align-items: flex-start; gap: var(--s-12); }' +
    '.screen-uscis .us-foot .inline-src { vertical-align: middle; }' +
    '.screen-uscis .us-nowrap { white-space: nowrap; }' +
    '.screen-uscis .tracker { margin-top: var(--s-24); }' +
    '.screen-uscis .us-update { margin-top: var(--s-24); display: flex; flex-direction: column; gap: var(--s-12); }' +
    '.screen-uscis .us-update .btn-row { margin-top: 0; }' +
    '.screen-uscis .us-receipt { margin-top: var(--s-24); display: flex; flex-direction: column; gap: var(--s-12); }' +
    '.screen-uscis .us-receipt .btn-row { margin-top: 0; }' +
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
  const RECEIPT = /^[A-Z]{3}\d{10}$/;

  function today() { return App.data.today.short; }

  /* The date of the current status: the one saved with it, else the dated
     row of the same name, else the date it was last seen. */
  function statusDate(a) {
    if (a.statusOn) return a.statusOn;
    const d = (a.dates || []).filter((x) => x.label === a.status)[0];
    return d ? d.date : a.asOf || null;
  }

  function liveLine(tr) {
    const text = tr.label + ' ' + tr.state.charAt(0).toLowerCase() + tr.state.slice(1);
    const cut = text.lastIndexOf(' ') + 1;
    return '<p class="t-meta">' + C.esc(text.slice(0, cut)) +
      '<span class="us-nowrap">' + C.esc(text.slice(cut)) +
      C.info(tr.info, { label: 'About live tracking', link: tr.caseStatus }) + '</span></p>';
  }

  function recheck(tr) {
    return C.button({ label: tr.recheck.label, kind: 'pill', href: tr.recheck.href });
  }

  function caseRow(a) {
    const when = a.receipt ? statusDate(a) : null;
    return C.row({
      key: a.id,
      title: a.title,
      meta: a.receipt ? a.receipt + (when ? ' · ' + when.replace(/ /g, ' ') : '') : null,
      value: a.status,
      href: '#/uscis/' + a.id,
    });
  }

  function listView(apps) {
    const tr = apps.tracking;
    return C.pageHeader({ title: 'USCIS status' }) +
      C.list(apps.items.map(caseRow), { accordion: false, label: 'Your cases' }) +
      '<div class="us-foot">' + recheck(tr) + liveLine(tr) + '</div>';
  }

  /* The Update status panel, hidden until asked for. */
  function updatePanel(a) {
    return '<div class="us-update" data-us-panel hidden>' +
      C.chips({
        key: 'us-status:' + a.id, inline: true, label: 'Status',
        items: STATUSES.map((s) => ({ value: s.label, label: s.label, selected: s.label === a.status })),
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
    const when = statusDate(a);
    const shown = apps.steps.concat(STATUSES.map((s) => s.label));
    const facts = [
      C.valueRow({ label: 'Receipt number', value: a.receipt, editable: false, num: true }),
      C.valueRow({ label: 'Status', value: a.status + (when ? ' ' + when : ''), editable: false }),
    ];
    if (a.asOf && a.asOf !== when) facts.push(C.valueRow({ label: 'Last checked', value: a.asOf, editable: false, num: true }));
    (a.dates || []).filter((d) => shown.indexOf(d.label) < 0).forEach((d) => {
      facts.push(C.valueRow({ label: d.label, value: d.date, editable: false, num: true, source: d.source }));
    });
    return C.list(facts, { accordion: false, label: 'Case' }) +
      C.tracker({ steps: apps.steps, current: a.current }) +
      '<div class="us-foot" data-us-foot>' +
        C.btnGroup([recheck(tr), C.button({ label: 'Update status', kind: 'pill', attrs: { 'data-us-open': '' } })]) +
        liveLine(tr) +
      '</div>' +
      updatePanel(a);
  }

  function receiptView(a, apps) {
    return '<div class="us-receipt">' +
      C.field({ label: 'Receipt number', key: 'us-receipt:' + a.id, placeholder: apps.receiptPlaceholder, autocomplete: 'off' }) +
      C.buttonRow({ primary: C.button({ label: 'Add receipt number', kind: 'pill', attrs: { 'data-us-receipt': a.id } }) }) +
      '</div>';
  }

  function caseView(a, apps) {
    const back = { label: 'USCIS status', href: '#/uscis' };
    const header = C.pageHeader({
      title: a.title,
      meta: a.receipt ? a.form : a.form + ' · ' + a.status,
      back: back,
    });
    return header + (a.receipt ? trackedView(a, apps) + C.footer() : receiptView(a, apps));
  }

  /* ---------------- in place: Update status and Add receipt number ---------------- */

  function showPanel(root, open) {
    const panel = root.querySelector('[data-us-panel]');
    const foot = root.querySelector('[data-us-foot]');
    if (!panel || !foot) return;
    panel.hidden = !open;
    foot.hidden = open;
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
    if (status !== a.status && s) a.current = App.data.applications.steps.indexOf(s.step);
    a.status = status;
    a.statusOn = today();
    a.asOf = today();
    App.emit('edit', 'us-status:' + id, status, pick);
    App.rerender();
    App.toast('Status saved');
  }

  function saveReceipt(root, id) {
    const a = App.findApplication(id);
    const input = root.querySelector('[data-field="us-receipt:' + id + '"]');
    if (!a || !input) return;
    const v = input.value.replace(/[\s-]/g, '').toUpperCase();
    if (!RECEIPT.test(v)) { input.focus(); App.toast('Three letters and ten digits'); return; }
    a.receipt = v;
    a.status = 'Received';
    a.current = App.data.applications.steps.indexOf('Received');
    a.statusOn = today();
    a.asOf = today();
    App.emit('edit', 'us-receipt:' + id, v, input);
    App.rerender();
    App.toast('Receipt number added');
  }

  window.SCREENS.uscis = {
    title: 'USCIS status',
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
        if (t.closest('[data-us-open]')) { showPanel(root, true); return; }
        if (t.closest('[data-us-cancel]')) { showPanel(root, false); return; }
        const save = t.closest('[data-us-save]');
        if (save) { saveStatus(root, save.dataset.usSave); return; }
        const add = t.closest('[data-us-receipt]');
        if (add) saveReceipt(root, add.dataset.usReceipt);
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
