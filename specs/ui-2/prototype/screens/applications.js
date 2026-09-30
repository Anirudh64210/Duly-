/* Applications (Note 9). Its own page in the sidebar, after What's next.
   Each application shows its receipt number, its status as of a date, the
   key dates and the next step, and links to its checklist. Status is
   updated by the student for now; USCIS case status is parked (BACKLOG B8).
   Routes:
     #/applications        the list, open applications first, and "Add an application"
     #/applications/<id>   one application, with a back link
   Data: DULY_SAMPLE.applications.items. The next step of an application
   that is not filed yet is worked out live from App.steps(<path>), the same
   federal steps and school steps the checklist shows, so checking it here
   moves the application on to the next one. Forms open in place; saving
   changes the data and redraws in place (App.rerender), keeping the scroll. */
(function () {
  'use strict';

  const RECEIPT = /^[A-Z]{3}\d{10}$/;
  const PATHS = ['cpt', 'opt', 'stem', 'h1b'];
  /* What the student can set by hand, and where each sits on the tracker
     (DULY_SAMPLE.applications.steps: Filed, Received, Biometrics, Decision,
     Card mailed). */
  const STATUSES = [
    { value: 'filed', label: 'Filed', step: 0 },
    { value: 'received', label: 'Received', step: 1 },
    { value: 'biometrics', label: 'Biometrics', step: 2 },
    { value: 'evidence', label: 'Evidence requested', step: 2 },
    { value: 'approved', label: 'Approved', step: 3 },
    { value: 'mailed', label: 'Card mailed', step: 4 },
  ];
  const e = (s) => C.esc(s);
  const STYLE = '<style>' +
    '.screen-applications .ap-block { display: flex; flex-direction: column; gap: var(--s-16); }' +
    '.screen-applications .ap-line { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--s-4) var(--s-12); margin: 0; }' +
    '.screen-applications .ap-form { display: flex; flex-direction: column; gap: var(--s-24); padding-top: var(--s-8); }' +
    '.screen-applications .ap-form[hidden] { display: none; }' +
    '.screen-applications .ap-form .btn-row { margin-top: 0; }' +
    '.screen-applications .ap-form .field { max-width: 360px; }' +
    '.screen-applications .ap-opener { align-self: flex-start; }' +
    '.screen-applications .ap-opener[hidden] { display: none; }' +
    '.screen-applications .ap-more { margin-top: var(--s-12); }' +
    '.screen-applications .ap-add { margin-top: var(--s-24); display: flex; flex-direction: column; gap: var(--s-16); }' +
    '@media (max-width: 640px) { .screen-applications .ap-form .field { max-width: none; } }' +
    '</style>';

  /* ---------------- helpers ---------------- */

  function today(data) { return data.today.short; }
  function todayDate(data) { return new Date(data.today.iso + 'T00:00:00'); }
  function fmt(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  function parseDate(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  function cleanReceipt(raw) { return String(raw || '').toUpperCase().replace(/[\s-]/g, ''); }

  /* The checklist an application belongs to, or null for one the student added. */
  function pathOf(a) { return PATHS.indexOf(a.path || a.id) !== -1 ? (a.path || a.id) : null; }
  function isFinal(a) { return a.current != null && a.current >= 3; }
  function isFiled(a) { return !!a.receipt || a.current != null; }
  function statusValue(a) {
    const byLabel = STATUSES.filter((s) => s.label === a.status)[0];
    if (byLabel) return byLabel.value;
    const byStep = STATUSES.filter((s) => s.step === a.current)[0];
    return byStep ? byStep.value : 'filed';
  }

  /* The next step. Not filed yet: the first open step of its checklist, live
     from App.steps(). Filed: wait for the next notice. Decided: nothing. */
  function nextOf(data, a) {
    const path = pathOf(a);
    if (isFinal(a)) {
      if (a.next && /^Nothing/.test(a.next.title) && a.status === 'Approved') return { row: a.next };
      return { row: { title: 'Nothing to do here', meta: 'Keep the notice from USCIS in Documents.', href: '#/documents/add' } };
    }
    if (isFiled(a)) {
      return { row: { title: 'Update the status when a notice comes', meta: 'Add each notice from USCIS to Documents so it stays with this application.', href: '#/documents/add' } };
    }
    if (path) {
      const all = App.steps(path);
      const open = all.filter((s) => !s.done && !(s.afterOf && !s.afterOf.done));
      if (open.length) return { entry: open[0], left: open.length, path: path };
      return { row: { title: 'Add your receipt number', meta: 'It is on the notice USCIS sends once you file.' }, receipt: true };
    }
    return { row: a.next || { title: 'Add your receipt number', meta: 'It is on the notice USCIS sends once you file.' }, receipt: !a.next };
  }
  function nextTitle(data, a) {
    const n = nextOf(data, a);
    return n.entry ? n.entry.step.title : n.row.title;
  }

  /* ---------------- the list ---------------- */

  function list(data) {
    const st = App.state;
    const items = data.applications.items.slice().sort((x, y) => Number(isFinal(x)) - Number(isFinal(y)));
    const rows = items.map((a) => C.row({
      key: 'ap-' + a.id,
      title: a.title,
      meta: (a.receipt ? a.receipt + ' · ' : '') + C.statusLine(a),
      below: '<span class="row-meta">Next: ' + e(nextTitle(data, a)) + '</span>',
      href: '#/applications/' + encodeURIComponent(a.id),
    }));
    const addOpen = !!st['apAddOpen'];
    const add = '<div class="ap-add" data-key="ap-add">' +
      C.button({ label: 'Add an application', kind: 'text', key: 'ap:add-open', cls: 'ap-opener', attrs: addOpen ? { hidden: '', 'aria-expanded': 'true' } : { 'aria-expanded': 'false' } }) +
      '<div class="ap-form" data-ap-form="add"' + (addOpen ? '' : ' hidden') + '>' +
      '<p class="t-meta">Anything you filed with USCIS, such as a travel document. You keep its status up to date here.</p>' +
      C.field({ label: 'What you filed', key: 'apNew:title', value: st['apNew:title'] || '', placeholder: 'Travel document, Form I-131', error: st['apNewError:title'] || null }) +
      C.field({ label: 'Receipt number, if you have it', key: 'apNew:receipt', value: st['apNew:receipt'] || '', placeholder: 'IOE0123456789', error: st['apNewError:receipt'] || null, help: st['apNewError:receipt'] ? null : 'Three letters and ten digits.' }) +
      C.buttonRow({
        back: C.button({ label: 'Cancel', kind: 'back', key: 'ap:add-cancel' }),
        primary: C.button({ label: 'Add application', kind: 'pill', key: 'ap:add-save' }),
      }) +
      '</div></div>';
    return C.pageHeader({ title: 'Applications', subline: 'What you filed, where each one stands, and what comes next.' }) +
      C.section({ content: '<div class="ap-rows">' + C.list(rows, { accordion: false, label: 'Applications' }) + '</div>' + add });
  }

  /* ---------------- one application ---------------- */

  function statusSection(data, a) {
    const st = App.state;
    const id = a.id;
    const receiptOpen = !!st['apReceiptOpen:' + id];
    const statusOpen = !!st['apStatusOpen:' + id];

    const receiptLine = a.receipt
      ? '<p class="ap-line"><span class="t-meta">Receipt number</span><span class="t-row num">' + e(a.receipt) + '</span>' +
        (receiptOpen ? '' : '<button type="button" class="link" data-action="ap:receipt-open">Change</button>') + '</p>'
      : (receiptOpen ? '' : '<p class="unknown"><button type="button" class="link" data-action="ap:receipt-open">Add your receipt number</button> once you file. It is on the notice USCIS sends.</p>');
    const receiptForm = '<div class="ap-form" data-ap-form="receipt"' + (receiptOpen ? '' : ' hidden') + '>' +
      C.field({
        label: 'Receipt number', key: 'apReceipt:' + id, value: st['apReceipt:' + id] != null ? st['apReceipt:' + id] : (a.receipt || ''),
        placeholder: 'IOE0123456789', error: st['apReceiptError:' + id] || null,
        help: st['apReceiptError:' + id] ? null : data.applications.receiptPlaceholder + '.',
      }) +
      C.buttonRow({
        back: C.button({ label: 'Cancel', kind: 'back', key: 'ap:receipt-cancel' }),
        primary: C.button({ label: 'Save receipt number', kind: 'pill', key: 'ap:receipt-save' }),
      }) + '</div>';

    const selected = st['apStatus:' + id] || statusValue(a);
    const statusForm = '<div class="ap-form" data-ap-form="status"' + (statusOpen ? '' : ' hidden') + '>' +
      '<div class="field"><p class="field-label">Where it stands</p>' +
      C.segment({ key: 'apStatus:' + id, label: 'Where it stands', selected: selected, options: STATUSES.map((s) => ({ value: s.value, label: s.label })) }) + '</div>' +
      C.field({
        label: 'As of', key: 'apAsOf:' + id, value: st['apAsOf:' + id] != null ? st['apAsOf:' + id] : today(data),
        placeholder: today(data), error: st['apAsOfError:' + id] || null,
        help: st['apAsOfError:' + id] ? null : 'The date on the notice, or today.',
      }) +
      C.buttonRow({
        back: C.button({ label: 'Cancel', kind: 'back', key: 'ap:status-cancel' }),
        primary: C.button({ label: 'Save status', kind: 'pill', key: 'ap:status-save' }),
      }) + '</div>';
    const opener = C.button({
      label: 'Update status', kind: 'pill', key: 'ap:status-open', cls: 'ap-opener',
      attrs: statusOpen ? { hidden: '', 'aria-expanded': 'true' } : { 'aria-expanded': 'false' },
    });

    return C.section({
      eyebrow: 'Status',
      content: '<div class="ap-block" data-key="ap-status">' +
        (a.current != null ? C.tracker({ steps: data.applications.steps, current: a.current }) : '') +
        receiptLine + receiptForm + opener + statusForm + '</div>',
    });
  }

  function nextSection(data, a) {
    const n = nextOf(data, a);
    const path = pathOf(a);
    const href = path ? '#/checklists/' + path : null;
    let body;
    let shownKey = null;
    if (n.entry) {
      const en = n.entry;
      shownKey = en.key;
      body = en.type === 'school'
        ? C.schoolStep(en, { email: data.email })
        : C.task(Object.assign({}, en.step, { key: en.key, done: en.done, waitingOn: en.waitingOn }));
      body = C.list([body], { accordion: false }) +
        (n.left > 1 ? '<p class="ap-more t-meta">' + e((n.left - 1) + (n.left === 2 ? ' more step' : ' more steps') + ' after this one.') + '</p>' : '');
    } else if (n.receipt && !a.receipt && !App.state['apReceiptOpen:' + a.id]) {
      body = C.list([C.row({ title: n.row.title, meta: n.row.meta, trailing: '<button type="button" class="btn btn-text is-small" data-action="ap:receipt-open">Add</button>' })], { accordion: false });
    } else {
      body = C.list([C.row({ title: n.row.title, meta: n.row.meta, href: n.row.href })], { accordion: false });
    }
    return {
      shownKey: shownKey,
      html: C.section({ eyebrow: 'Next step', link: href ? { label: 'See the checklist', href: href } : null, content: '<div class="ap-next">' + body + '</div>' }),
    };
  }

  function schoolSection(data, a, shownKey) {
    const path = pathOf(a);
    let entries;
    if (path) entries = App.steps(path).filter((s) => s.type === 'school');
    else entries = (a.schoolSteps || []).map(App.findSchoolStep).filter(Boolean).map((s) => ({ type: 'school', key: 'school:' + s.id, step: s, done: App.isDone('school:' + s.id, s.done) }));
    entries = entries.filter((en) => en.key !== shownKey);
    if (!entries.length) return '';
    return C.section({
      eyebrow: "Your school's steps",
      content: C.list(entries.map((en) => C.schoolStep(en, { email: data.email })), { accordion: false }),
    });
  }

  function detail(data, a) {
    const dates = C.section({
      eyebrow: 'Key dates',
      content: a.dates && a.dates.length
        ? C.list(a.dates.map((d) => C.row({ title: d.label, value: d.date, source: d.source })), { accordion: false })
        : '<p class="t-meta">No dates yet. Each status you save adds its date here.</p>',
    });
    const next = nextSection(data, a);
    const docs = a.document ? C.section({
      eyebrow: 'Documents',
      content: C.list([C.row({ title: a.document.label, href: a.document.href })], { accordion: false }),
    }) : '';
    const eyebrow = [a.form, a.category].filter(Boolean).join(' · ');
    return C.pageHeader({
      back: { label: 'Applications', href: '#/applications' },
      eyebrow: eyebrow || null,
      title: a.title,
      subline: C.statusLine(a) + '.',
    }) +
      statusSection(data, a) + next.html + schoolSection(data, a, next.shownKey) + dates + docs;
  }

  /* ---------------- actions ---------------- */

  function openForm(root, name, on) {
    const form = root.querySelector('[data-ap-form="' + name + '"]');
    if (!form) return;
    form.hidden = !on;
    const opener = root.querySelector('[data-action="ap:' + name + '-open"].ap-opener');
    if (opener) { opener.hidden = on; opener.setAttribute('aria-expanded', on ? 'true' : 'false'); }
    if (on) {
      const first = form.querySelector('[role="radio"][aria-checked="true"], input');
      if (first) first.focus();
    } else if (opener) {
      opener.focus();
    }
  }

  function saveReceipt(data, a, root) {
    const st = App.state;
    const input = root.querySelector('[data-field="apReceipt:' + a.id + '"]');
    const v = cleanReceipt(input ? input.value : st['apReceipt:' + a.id]);
    if (!RECEIPT.test(v)) {
      st['apReceiptError:' + a.id] = v ? "That doesn't look like a receipt number. It has three letters and ten digits." : 'Add the number from your USCIS notice.';
      st['apReceipt:' + a.id] = input ? input.value : '';
      st['apReceiptOpen:' + a.id] = true;
      App.rerender();
      const again = document.querySelector('[data-field="apReceipt:' + a.id + '"]');
      if (again) again.focus();
      return;
    }
    const first = !a.receipt;
    a.receipt = v;
    if (first && a.current == null) {
      a.status = 'Filed'; a.current = 0; a.asOf = today(data);
      /* Filing is the last federal step: tick it on the checklist too. */
      const path = pathOf(a);
      const filing = path ? App.steps(path).filter((s) => s.type === 'federal' && s.key === 'i765')[0] : null;
      if (filing && !filing.done) App.setTask('i765', true);
    }
    delete st['apReceipt:' + a.id]; delete st['apReceiptError:' + a.id];
    st['apReceiptOpen:' + a.id] = false;
    App.rerender();
    App.toast(first ? 'Receipt number added' : 'Receipt number changed');
  }

  function saveStatus(data, a, root) {
    const st = App.state;
    const on = root.querySelector('[data-choices="apStatus:' + a.id + '"] [aria-checked="true"]');
    const s = STATUSES.filter((x) => x.value === (on ? on.dataset.value : statusValue(a)))[0] || STATUSES[0];
    const input = root.querySelector('[data-field="apAsOf:' + a.id + '"]');
    const raw = input ? input.value : '';
    const d = parseDate(raw);
    let err = null;
    if (!d) err = 'Write the date like ' + today(data) + '.';
    else if (d > todayDate(data)) err = 'Pick a date on or before ' + today(data) + '.';
    if (err) {
      st['apAsOfError:' + a.id] = err; st['apAsOf:' + a.id] = raw; st['apStatus:' + a.id] = s.value;
      st['apStatusOpen:' + a.id] = true;
      App.rerender();
      const again = document.querySelector('[data-field="apAsOf:' + a.id + '"]');
      if (again) again.focus();
      return;
    }
    const when = fmt(d);
    a.status = s.label; a.current = s.step; a.asOf = when;
    a.dates = a.dates || [];
    const same = a.dates.filter((x) => x.label === s.label)[0];
    if (same) same.date = when; else a.dates.push({ label: s.label, date: when });
    ['apStatus:', 'apAsOf:', 'apAsOfError:'].forEach((k) => { delete st[k + a.id]; });
    st['apStatusOpen:' + a.id] = false;
    App.rerender();
    App.toast('Status updated');
    if (s.value === 'approved') {
      const h1 = document.querySelector('#main h1');
      App.complete('application:' + a.id, h1);
    }
  }

  function addApplication(data, root) {
    const st = App.state;
    const tIn = root.querySelector('[data-field="apNew:title"]');
    const rIn = root.querySelector('[data-field="apNew:receipt"]');
    const title = (tIn ? tIn.value : '').trim();
    const receipt = cleanReceipt(rIn ? rIn.value : '');
    st['apNew:title'] = tIn ? tIn.value : ''; st['apNew:receipt'] = rIn ? rIn.value : '';
    st['apNewError:title'] = title ? null : 'Name what you filed.';
    st['apNewError:receipt'] = !receipt || RECEIPT.test(receipt) ? null : "That doesn't look like a receipt number. It has three letters and ten digits.";
    if (st['apNewError:title'] || st['apNewError:receipt']) {
      st['apAddOpen'] = true;
      App.rerender();
      const bad = document.querySelector('[data-field="' + (st['apNewError:title'] ? 'apNew:title' : 'apNew:receipt') + '"]');
      if (bad) bad.focus();
      return;
    }
    const id = 'mine-' + (data.applications.items.length + 1) + '-' + Date.now().toString(36);
    data.applications.items.push({
      id: id, title: title, form: null, category: null,
      receipt: receipt || null,
      status: receipt ? 'Filed' : 'Not filed yet',
      current: receipt ? 0 : null,
      asOf: today(data), manual: true, dates: [],
      next: null, schoolSteps: [],
    });
    ['apNew:title', 'apNew:receipt', 'apNewError:title', 'apNewError:receipt'].forEach((k) => { delete st[k]; });
    st['apAddOpen'] = false;
    App.toast('Application added');
    App.go('#/applications/' + id);
  }

  /* A step checked here, or anywhere, moves the next step on. One listener
     for the page's lifetime; it acts only while an application is open. */
  let redraw = null;
  document.addEventListener('duly:change', (ev) => {
    const d = ev.detail || {};
    if (App.route !== 'applications' || !App.params[0]) return;
    if (d.kind !== 'task' && d.kind !== 'school-step') return;
    const inNext = d.el && d.el.closest && d.el.closest('.ap-next');
    clearTimeout(redraw);
    redraw = setTimeout(() => {
      if (App.route !== 'applications' || !App.params[0]) return;
      App.rerender();
      if (inNext) {
        const c = document.querySelector('#main .ap-next [role="checkbox"], #main .ap-next a.row, #main .ap-next button');
        if (c) c.focus({ preventScroll: true });
      }
    }, 450);
  });

  window.SCREENS['applications'] = {
    title: 'Applications',
    titleFor(params) {
      const a = params[0] && App.findApplication(params[0]);
      return a ? a.title : 'Applications';
    },
    render(data, params) {
      const a = params[0] ? App.findApplication(params[0]) : null;
      return STYLE + (a ? detail(data, a) : list(data)) + C.footer('Status updated by you. Records and dates from your documents, not legal advice.');
    },
    mount(root, data, params) {
      root.classList.add('screen-applications');
      const a = params[0] ? App.findApplication(params[0]) : null;
      const st = App.state;

      root.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-action^="ap:"]');
        if (!btn) return;
        const act = btn.dataset.action.slice(3);
        if (act === 'add-open') { st['apAddOpen'] = true; openForm(root, 'add', true); return; }
        if (act === 'add-cancel') {
          st['apAddOpen'] = false;
          ['apNewError:title', 'apNewError:receipt'].forEach((k) => { delete st[k]; });
          openForm(root, 'add', false); return;
        }
        if (act === 'add-save') { addApplication(data, root); return; }
        if (!a) return;
        if (act === 'receipt-open') {
          st['apReceiptOpen:' + a.id] = true;
          const form = root.querySelector('[data-ap-form="receipt"]');
          if (form) {
            form.hidden = false;
            root.querySelectorAll('[data-action="ap:receipt-open"]').forEach((b) => { const p = b.closest('p.unknown, .ap-line'); if (p && p.classList.contains('unknown')) p.hidden = true; else b.hidden = true; });
            const input = form.querySelector('input'); if (input) input.focus();
          }
          return;
        }
        if (act === 'receipt-cancel') {
          st['apReceiptOpen:' + a.id] = false;
          delete st['apReceipt:' + a.id]; delete st['apReceiptError:' + a.id];
          App.rerender(); return;
        }
        if (act === 'receipt-save') { saveReceipt(data, a, root); return; }
        if (act === 'status-open') { st['apStatusOpen:' + a.id] = true; openForm(root, 'status', true); return; }
        if (act === 'status-cancel') {
          st['apStatusOpen:' + a.id] = false;
          ['apStatus:', 'apAsOf:', 'apAsOfError:'].forEach((k) => { delete st[k + a.id]; });
          if (root.querySelector('[data-ap-form="status"] .field-error')) App.rerender();
          else openForm(root, 'status', false);
          return;
        }
        if (act === 'status-save') { saveStatus(data, a, root); }
      });

      root.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' || !ev.target.matches || !ev.target.matches('input[data-field^="ap"]')) return;
        const form = ev.target.closest('[data-ap-form]');
        if (!form) return;
        ev.preventDefault();
        const save = form.querySelector('[data-action$="-save"]');
        if (save) save.click();
      });
    },
  };
})();
