/* What's next: the student's next step after OPT (STEM OPT extension).
   States, from App.state.stemIntent (shared with Home, Timeline and Your case):
     null      A. ask intent first (hero with Yes / No / I'm not sure yet)
     'unsure'  A plus the dates and what you'll need
     'yes'     B. the plan: dates, tasks, school step, DSO email, application tracker
     'no'      C. a short line and "Change my answer"
   #/next/ask, #/next/yes, #/next/no and #/next/unsure force a state for review. */
(function () {
  'use strict';

  const STYLE = '<style>' +
    '.screen-next .hero-note { margin-top: var(--s-12); }' +
    '.screen-next .hero-sub { display: block; }' +
    '.screen-next .hero-sub .src { margin-left: var(--s-4); vertical-align: baseline; }' +
    '.screen-next .next-after { margin-top: var(--s-24); display: flex; flex-direction: column; gap: var(--s-8); }' +
    '.screen-next .next-line { display: flex; flex-wrap: wrap; align-items: baseline; column-gap: var(--s-8); }' +
    '.screen-next .section > .progress { margin: var(--s-4) 0 var(--s-16); }' +
    '.screen-next .row-text > .caution { margin-top: var(--s-8); }' +
    '.screen-next .row-text > .next-line { margin-top: var(--s-8); }' +
    '.screen-next .email-head { display: none; }' +
    '.screen-next .next-actions { margin-top: var(--s-24); gap: var(--s-12); }' +
    '.screen-next .next-receipt { display: flex; align-items: flex-end; gap: var(--s-12); }' +
    '.screen-next .next-receipt .field { flex: 1 1 auto; }' +
    '.screen-next .next-gap { margin-top: var(--s-24); }' +
    '.screen-next .next-track { margin-top: var(--s-16); display: flex; flex-direction: column; gap: var(--s-12); }' +
    '.screen-next .next-track .chips { margin-bottom: 0; }' +
    '.screen-next .disc .tracker { margin-top: var(--s-8); }' +
    '@media (min-width: 641px) {' +
    '  .screen-next .dates.has-today { padding-left: var(--s-32); }' +
    '  .screen-next .dates-today { transform: none; align-items: flex-start; }' +
    '}' +
    '@media (max-width: 640px) { .screen-next .next-receipt { flex-wrap: wrap; } .screen-next .next-receipt .btn { width: 100%; } }' +
    '</style>';

  const FORCED = { ask: null, yes: 'yes', no: 'no', unsure: 'unsure' };
  const RECEIPT = /^[A-Z]{3}\d{10}$/;

  /* Home sends 'Yes, I plan to', Timeline 'Yes', inline asks 'unsure'. */
  function intentOf(v) {
    if (v == null || v === '') return null;
    const s = String(v).toLowerCase();
    if (s === 'unsure' || s.indexOf('not sure') !== -1) return 'unsure';
    if (s.indexOf('yes') === 0) return 'yes';
    if (s.indexOf('no') === 0) return 'no';
    return null;
  }
  function currentIntent(data, params) {
    const p = params && params[0];
    if (p && Object.prototype.hasOwnProperty.call(FORCED, p)) return FORCED[p];
    const st = App.state;
    return intentOf('stemIntent' in st ? st.stemIntent : data.stem.intent);
  }
  const isDone = (key) => App.state['task:' + key] === true;
  const e = (s) => C.esc(s);

  /* ---------------- hero ---------------- */

  function heroAsk(stem, unsure) {
    const actions =
      C.button({ label: 'Yes, I plan to', kind: 'primary', attrs: { 'data-answer': 'stemIntent', 'data-value': 'yes' } }) +
      C.button({ label: 'No, not this time', kind: 'pill', attrs: { 'data-answer': 'stemIntent', 'data-value': 'no' } }) +
      (unsure ? '' : C.button({ label: "I'm not sure yet", kind: 'text', cls: 'is-quiet is-small', attrs: { 'data-answer': 'stemIntent', 'data-value': 'unsure' } }));
    return C.hero({ eyebrow: stem.eyebrow, title: stem.askTitle, subline: stem.askLine, icon: null, source: 'stemList', actions: actions }) +
      (unsure ? '<p class="t-lead hero-note">' + e(stem.unsureLine) + '</p>' : '');
  }
  function heroYes(stem) {
    return C.hero({ eyebrow: stem.eyebrow, title: stem.yesTitle, subline: stem.yesLine, icon: null, source: 'stemOpens' });
  }
  function heroNo(stem) {
    return C.hero({
      eyebrow: 'After OPT', title: stem.noTitle, subline: stem.noLine, icon: null, source: 'eadEnds',
      actions: C.button({ label: 'Change my answer', kind: 'text', attrs: { 'data-next': 'change' } }),
    });
  }

  /* ---------------- 1. dates ---------------- */

  function datesSection(stem) {
    return C.section({
      eyebrow: 'Your dates',
      content: C.dates({ points: stem.dates, today: { label: stem.today.label, pct: 0 } }) +
        '<div class="next-after">' +
        '<p class="t-small">' + e(stem.within60) + '</p>' +
        '<p class="next-line">' + C.unknown(stem.recUnknown) + C.source(stem.recUnknown.source, { inline: true }) + '</p>' +
        '</div>',
    });
  }

  /* ---------------- 2. what you'll need ---------------- */

  function tasksSection(data, planned) {
    const stem = data.stem;
    const suffix = data.checklists.stem.progressMeta;
    const done = stem.tasks.filter((t) => isDone(t.key)).length;
    const pct = Math.round((done / stem.tasks.length) * 100);
    const rows = stem.tasks.map((t) => C.task({
      key: t.key, title: t.title, meta: t.meta, source: t.source, done: isDone(t.key),
      open: planned && t.key === 'receipt' && !App.state.nextReceiptSaved ? { label: 'Add', href: '#next-track' } : null,
    }));
    return C.section({
      eyebrow: "What you'll need",
      content: C.progress({ pct: pct, label: done + ' of ' + stem.tasks.length + ' done · ' + suffix, suffix: suffix }) +
        C.list(rows, { accordion: false }),
    });
  }

  /* ---------------- 3. at the school ---------------- */

  function schoolSection(data) {
    const s = data.stem.school;
    return C.section({
      eyebrow: 'At ' + data.student.school,
      content: C.list([C.row({
        title: s.title, meta: s.meta,
        below: '<span class="caution">' + e(s.caution) + '</span>' +
          '<span class="next-line">' + C.unknown(s.unknown) + '</span>',
      })], { accordion: false }),
    });
  }

  /* ---------------- 4. email your DSO ---------------- */

  function emailSection(data) {
    const panel = C.email(data.email);
    const m = panel.match(/data-copy="([^"]+)"/);
    const bodyId = m ? m[1] : '';
    return C.section({
      eyebrow: 'Email your DSO',
      content: panel +
        '<div class="btn-group next-actions">' +
        '<button type="button" class="btn btn-pill" data-copy="' + e(bodyId) + '">Copy email</button>' +
        C.button({ label: 'Open in Mail', kind: 'text', attrs: { 'data-next': 'mail', 'data-body': bodyId } }) +
        '</div>',
    });
  }

  /* ---------------- 5. your application ---------------- */

  function trackSection(data) {
    const app = data.application;
    const st = App.state;
    const saved = st.nextReceiptSaved;
    let top;
    if (!saved) {
      top = '<div class="next-receipt">' +
        C.field({ label: 'Receipt number', key: 'nextReceipt', value: st.nextReceipt || '', placeholder: app.receiptPlaceholder, autocomplete: 'off' }) +
        C.button({ label: 'Add', kind: 'primary', attrs: { 'data-next': 'add-receipt' } }) +
        '</div>' +
        (st.nextReceiptError ? '<p class="field-error" role="alert">' + e(st.nextReceiptError) + '</p>' : '');
    } else {
      const cur = st.nextAppCurrent == null ? 0 : st.nextAppCurrent;
      const picker = st.nextStatusOpen ? C.segment({
        key: 'nextAppStep', label: 'Application status', selected: String(cur),
        options: app.steps.map((s, i) => ({ value: String(i), label: s })),
      }) : '';
      top = C.list([C.row({
        title: 'STEM OPT work permit',
        meta: saved + ' · ' + app.steps[cur],
        below: '<span class="next-track">' + C.tracker({ steps: app.steps, current: cur }) + picker +
          '<span class="btn-group">' +
          C.button({ label: st.nextStatusOpen ? 'Done' : 'Update status', kind: 'pill', attrs: { 'data-next': 'status', 'aria-expanded': st.nextStatusOpen ? 'true' : 'false' } }) +
          C.button({ label: 'USCIS case status', kind: 'text', href: 'https://egov.uscis.gov/' }) +
          C.button({ label: 'Change number', kind: 'text', cls: 'is-quiet', attrs: { 'data-next': 'change-receipt' } }) +
          '</span></span>',
      })], { accordion: false });
    }
    const past = C.list([C.row({
      title: app.past.title,
      meta: app.past.receipt + ' · Approved ' + data.opt.approved,
      content: C.disclosure({ text: app.past.meta, content: C.tracker({ steps: app.steps, current: app.steps.length - 1 }) }),
    })]);
    return C.section({
      id: 'next-track',
      eyebrow: 'Your application',
      content: top + '<div class="next-gap">' + past + '</div>',
    });
  }

  /* ---------------- screen ---------------- */

  window.SCREENS['next'] = {
    title: "What's next",
    render(data, params) {
      const stem = data.stem;
      const intent = currentIntent(data, params);
      const out = [STYLE, C.pageHeader({ title: "What's next", subline: 'Your next step after OPT, with its dates and what it needs.' })];
      if (intent === 'yes') {
        out.push(heroYes(stem), datesSection(stem), tasksSection(data, true), schoolSection(data), emailSection(data), trackSection(data));
      } else if (intent === 'no') {
        out.push(heroNo(stem));
      } else {
        out.push(heroAsk(stem, intent === 'unsure'));
        if (intent === 'unsure') out.push(datesSection(stem), tasksSection(data, false));
      }
      out.push(C.footer());
      return out.join('');
    },
    mount(root) {
      root.classList.add('screen-next');
      const saved = App.state.nextEmailHtml;
      const body = root.querySelector('.email-body');
      if (saved && body) body.innerHTML = saved;
      wire();
    },
  };

  /* ---------------- behaviour, wired once ---------------- */

  let wired = false;
  function here() { return App.route === 'next' && document.querySelector('main.screen-next'); }
  function refresh() { if (App.params && App.params.length) App.go('next'); else App.rerender(); }

  function addReceipt() {
    const input = document.querySelector('.screen-next [data-field="nextReceipt"]');
    const raw = input ? input.value : '';
    const v = raw.toUpperCase().replace(/[\s-]/g, '');
    const st = App.state;
    if (!RECEIPT.test(v)) {
      st.nextReceipt = raw;
      st.nextReceiptError = v ? "That doesn't look like a receipt number. It has three letters and ten digits." : 'Add the number from your USCIS notice.';
      App.rerender();
      const again = document.querySelector('.screen-next [data-field="nextReceipt"]');
      if (again) { again.setAttribute('aria-invalid', 'true'); again.focus(); }
      return;
    }
    st.nextReceiptSaved = v;
    st.nextReceipt = '';
    st.nextReceiptError = null;
    st.nextAppCurrent = 0;
    st['task:receipt'] = true;
    App.emit('task', 'receipt', true, null);
    App.rerender();
    App.toast('Receipt number added');
  }

  function openMail(btn) {
    const body = document.getElementById(btn.dataset.body);
    const subject = document.querySelector('.screen-next [data-subject]');
    const href = 'mailto:?subject=' + encodeURIComponent(subject ? subject.textContent : '') +
      '&body=' + encodeURIComponent(body ? body.innerText.trim() : '');
    window.location.href = href;
  }

  function wire() {
    if (wired) return;
    wired = true;

    document.addEventListener('duly:change', (ev) => {
      if (!here()) return;
      const d = ev.detail || {};
      if (d.kind === 'answer' && d.key === 'stemIntent') { refresh(); return; }
      if (d.kind === 'choice' && d.key === 'nextAppStep') {
        App.state.nextAppCurrent = Number(d.value);
        App.state.nextStatusOpen = false;
        App.rerender();
        App.toast('Status updated');
      }
    });

    document.addEventListener('click', (ev) => {
      if (!here()) return;
      const t = ev.target;
      const jump = t.closest('a.task-open[href="#next-track"]');
      if (jump) {
        ev.preventDefault();
        const sec = document.getElementById('next-track');
        if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const input = document.querySelector('.screen-next [data-field="nextReceipt"]');
        if (input) input.focus({ preventScroll: true });
        return;
      }
      const act = t.closest('[data-next]');
      if (!act) return;
      const what = act.dataset.next;
      if (what === 'add-receipt') { addReceipt(); return; }
      if (what === 'status') { App.state.nextStatusOpen = !App.state.nextStatusOpen; App.rerender(); return; }
      if (what === 'change-receipt') {
        App.state.nextReceipt = App.state.nextReceiptSaved || '';
        App.state.nextReceiptSaved = null;
        App.state['task:receipt'] = false;
        App.rerender();
        return;
      }
      if (what === 'change') { App.state.stemIntent = null; refresh(); return; }
      if (what === 'mail') { openMail(act); }
    });

    document.addEventListener('keydown', (ev) => {
      if (!here() || ev.key !== 'Enter') return;
      if (ev.target.matches && ev.target.matches('[data-field="nextReceipt"]')) { ev.preventDefault(); addReceipt(); }
    });

    document.addEventListener('input', (ev) => {
      if (!here()) return;
      const b = ev.target.closest && ev.target.closest('.email-body');
      if (b) App.state.nextEmailHtml = b.innerHTML;
    });
  }
})();
