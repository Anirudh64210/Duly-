/* Your case: what Duly knows about the student. Each answer sits beside its
   question and is edited in place (app.js wires data-edit). Open questions sit
   at the top of their section as "Waiting for you" rows. Internships can be
   added from a CPT I-20 (read on this device, simulated) or typed. */
(function () {
  'use strict';

  const STYLE = '<style>' +
    '.screen-case{display:flex;flex-direction:column;flex:1 0 auto;min-width:0}' +
    '.screen-case>.page-header{margin-bottom:var(--s-48)}' +
    '.screen-case .section-head{padding-bottom:var(--s-12)}' +
    '.screen-case .case-named .v-label{color:var(--ink);font-weight:500}' +
    '.screen-case .vrow.is-title .v-value{flex:1 1 auto;text-align:left}' +
    '.screen-case .case-wait{display:flex;align-items:center;gap:var(--s-8);margin-bottom:var(--s-8)}' +
    '.screen-case .case-after{align-self:flex-start;margin-top:var(--s-4)}' +
    '.screen-case .case-panel{margin-top:var(--s-16);display:flex;flex-direction:column;gap:var(--s-24)}' +
    '.screen-case .case-stage{display:flex;flex-direction:column;gap:var(--s-24)}' +
    '.screen-case .case-stage-head{display:flex;flex-direction:column;gap:var(--s-4)}' +
    '.screen-case .btn-group{gap:var(--s-12)}' +
    '.screen-case .footer{margin-top:var(--s-64)}' +
    '</style>';

  const SAMPLE_READ = { employer: 'Harbor Analytics', start: 'Jun 2, 2025', end: 'Aug 22, 2025' };

  /* ---------------- state ---------------- */

  function edited(key, value) {
    const v = App.state['edit:' + key];
    return v != null && v !== '' ? v : value;
  }
  function sevpState() {
    const v = App.state.sevp;
    if (v == null) return null;
    return v === 'unsure' ? 'unsure' : 'done';
  }
  function intentState(data) {
    const v = App.state.stemIntent != null ? App.state.stemIntent : data.stem.intent;
    if (!v) return null;
    const s = String(v).toLowerCase();
    if (s === 'unsure' || s.indexOf('not sure') !== -1) return 'unsure';
    if (s.charAt(0) === 'y') return 'yes';
    if (s.charAt(0) === 'n') return 'no';
    return null;
  }
  function syncWaitingDot(data) {
    const intent = intentState(data);
    const stillWaiting = sevpState() !== 'done' || intent === null || intent === 'unsure';
    const list = data.waitingIn || (data.waitingIn = []);
    const i = list.indexOf('case');
    if (stillWaiting && i === -1) list.push('case');
    if (!stillWaiting && i !== -1) list.splice(i, 1);
  }
  function fmtRange(start, end) {
    const s = (start || '').trim();
    const e = (end || '').trim();
    if (!s || !e) return s || e;
    const ys = s.match(/, (\d{4})$/);
    const ye = e.match(/, (\d{4})$/);
    const from = ys && ye && ys[1] === ye[1] ? s.replace(/, \d{4}$/, '') : s;
    return from + ' to ' + e;
  }

  /* ---------------- rows ---------------- */

  function vrow(r) {
    const key = 'case-' + r.key;
    /* Values Duly works out (STEM from the major, unemployment days) are not typed over. */
    const derived = r.readonly || r.key === 'stem';
    return C.valueRow({ label: r.label, value: edited(key, r.value), key: key, source: r.source, editable: !derived, num: r.num });
  }
  /* A row whose answer is its own title, e.g. a job: "Software Engineer, Northwind Systems". */
  function titleRow(r) {
    const key = 'case-' + r.key;
    const v = edited(key, r.value);
    return '<div class="item vrow is-title" data-key="' + C.esc(key) + '"><div class="row is-static">' +
      '<span class="v-label sr-only">' + C.esc(r.label) + '</span>' +
      '<button type="button" class="v-value" data-edit="' + C.esc(key) + '" aria-label="' + C.esc(r.label + ': ' + v + '. Change') + '">' + C.esc(v) + '</button>' +
      '</div></div>';
  }
  /* A "Waiting for you" ask: the label sits above the question inside the row. */
  function waitAsk(ask, afterFirst) {
    let html = C.ask(ask);
    html = html.replace('<span class="row-title">',
      '<span class="t-eyebrow case-wait"><span class="wait-dot" aria-hidden="true"></span>Waiting for you</span><span class="row-title">');
    if (afterFirst) html = html.replace('</button>', '</button>' + afterFirst);
    return html;
  }
  function list(items) { return C.list(items, { accordion: false }); }

  /* ---------------- sections ---------------- */

  function cptSection(sec) {
    const added = (App.state.caseCpt || []).map((c, i) => ({ key: 'cpt-added-' + i, label: c.employer, value: c.dates }));
    const rows = sec.rows.concat(added).map(vrow);
    return C.section({
      eyebrow: sec.eyebrow,
      content: '<div class="case-named">' + list(rows) + '</div>' +
        C.button({ label: sec.add || 'Add another internship', kind: 'text', small: true, cls: 'case-after', attrs: { 'data-case-add': '' } }) +
        '<div class="case-panel" data-case-panel hidden>' +
        C.choices({
          key: 'case-cpt-how', layout: 'pair', label: 'How to add the internship',
          options: [
            { value: 'file', title: 'Add its I-20', meta: 'Fastest. Read on this device.' },
            { value: 'type', title: 'Type the dates' },
          ],
        }) +
        '<input type="file" accept="image/*,.pdf" hidden data-case-file aria-label="CPT I-20">' +
        '<div class="case-stage" data-case-stage>' + actions('') + '</div>' +
        '</div>',
    });
  }

  function optSection(sec, data) {
    const state = sevpState();
    const items = [];
    if (state !== 'done') {
      const w = sec.waiting[0];
      const portal = (data.home.nextMoves[0] && data.home.nextMoves[0].primary && data.home.nextMoves[0].primary.href) || 'https://sevp.ice.gov/opt/';
      items.push(waitAsk({
        key: 'sevp', title: w.title,
        choices: [{ label: w.choices[0], value: 'done' }],
        notSure: w.notSure,
        note: state === 'unsure' ? "We'll ask again later." : null,
      }, C.button({ label: w.choices[1], kind: 'pill', href: portal })));
    }
    sec.rows.forEach((r) => items.push(vrow(Object.assign({ num: r.key === 'application' || r.key === 'unemployment' }, r))));
    if (state === 'done') {
      items.push(vrow({ key: 'sevp-on', label: 'Details confirmed with school', value: App.state.caseSevpOn || data.today.short, readonly: true }));
    }
    return C.section({ eyebrow: sec.eyebrow, content: list(items) });
  }

  function jobSection(sec) {
    const rows = sec.rows.map((r, i) => (i === 0 ? titleRow(r) : vrow(r)));
    return C.section({ eyebrow: sec.eyebrow, content: list(rows) });
  }

  function plansSection(sec, data) {
    const intent = intentState(data);
    if (intent === null || intent === 'unsure') {
      const w = sec.waiting[0];
      return C.section({
        eyebrow: sec.eyebrow,
        content: list([waitAsk({
          key: 'stemIntent', title: w.title,
          choices: [{ label: w.choices[0], value: 'yes' }, { label: w.choices[1], value: 'no' }],
          notSure: w.notSure,
          note: intent === 'unsure' ? "We'll ask again later." : null,
        })]),
      });
    }
    const row = intent === 'yes'
      ? C.row({ title: 'STEM OPT extension', meta: 'Planning to apply · start preparing by Oct 15', source: 'startPreparing', trailing: '<a class="link" href="#/next">See the plan</a>' })
      : C.row({ title: 'STEM OPT extension', meta: 'Not this time' });
    return C.section({
      eyebrow: sec.eyebrow,
      content: list([row]) +
        C.button({ label: 'Change my answer', kind: 'back', small: true, cls: 'case-after', attrs: { 'data-case-reset-intent': '' } }),
    });
  }

  /* ---------------- add-internship stages ---------------- */

  function actions(primary, extra) {
    return '<div class="btn-group">' + (primary || '') + (extra || '') +
      C.button({ label: 'Cancel', kind: 'back', attrs: { 'data-case-cancel': '' } }) + '</div>';
  }
  function pickStage() {
    return '<div class="case-stage-head"><p class="t-row">Choose a photo or PDF of the I-20</p>' +
      '<p class="t-meta">Duly reads it on this device. Nothing is uploaded anywhere.</p></div>' +
      actions(C.button({ label: 'Choose a file', kind: 'pill', attrs: { 'data-case-pick': '' } }));
  }
  function readingStage(name) {
    return '<div class="case-stage-head" role="status"><p class="t-row">' + C.esc(name || 'Your I-20') + '</p>' +
      '<p class="t-meta">Reading on this device</p></div>';
  }
  function foundStage(f) {
    return '<div class="case-stage-head" role="status"><p class="t-row">We read your CPT I-20.</p>' +
      '<p class="t-meta">Read on this device. Nothing left it.</p></div>' +
      C.found([['Kind', 'CPT I-20'], ['Employer', f.employer], ['Dates', fmtRange(f.start, f.end)]]) +
      actions(C.button({ label: 'Looks right', kind: 'primary', attrs: { 'data-case-confirm': '' } }),
        C.button({ label: 'Fix one', kind: 'back', attrs: { 'data-case-fix': '' } }));
  }
  function typeStage(pre) {
    const p = pre || {};
    return '<div class="fields">' +
      C.field({ label: 'Employer', key: 'case-cpt-employer', value: p.employer, placeholder: 'Company name' }) +
      C.dateRange({
        from: { label: 'Start', key: 'case-cpt-start', value: p.start, placeholder: 'Jun 1, 2025' },
        to: { label: 'End', key: 'case-cpt-end', value: p.end, placeholder: 'Aug 15, 2025' },
      }) + '</div>' +
      actions(C.button({ label: 'Add internship', kind: 'primary', disabled: !p.employer, attrs: { 'data-case-save-cpt': '' } }));
  }

  /* ---------------- screen ---------------- */

  window.SCREENS['case'] = {
    title: 'Your case',

    render(data) {
      syncWaitingDot(data);
      const body = data.caseFile.sections.map((sec) => {
        if (sec.key === 'cpt') return cptSection(sec);
        if (sec.key === 'opt') return optSection(sec, data);
        if (sec.key === 'job') return jobSection(sec);
        if (sec.key === 'plans') return plansSection(sec, data);
        return C.section({ eyebrow: sec.eyebrow, content: list(sec.rows.map(vrow)) });
      }).join('');
      return '<div class="screen-case">' + STYLE +
        C.pageHeader({ title: 'Your case', subline: 'What Duly knows about you. Tap any answer to change it.' }) +
        body +
        C.footer('Records and dates from your documents, not legal advice.') +
        '</div>';
    },

    mount(root, data) {
      const panel = root.querySelector('[data-case-panel]');
      const addBtn = root.querySelector('[data-case-add]');
      const fileInput = root.querySelector('[data-case-file]');
      const stage = root.querySelector('[data-case-stage]');
      const howGroup = root.querySelector('[data-choices="case-cpt-how"]');
      let found = null;
      let readTimer = null;

      function setStage(html, focusSel) {
        stage.innerHTML = html;
        const f = focusSel && stage.querySelector(focusSel);
        if (f) f.focus();
      }
      function resetHow() {
        howGroup.hidden = false;
        howGroup.querySelectorAll('[role="radio"]').forEach((r, i) => {
          r.setAttribute('aria-checked', 'false');
          r.tabIndex = i === 0 ? 0 : -1;
        });
      }
      function openPanel() {
        addBtn.hidden = true;
        panel.hidden = false;
        resetHow();
        setStage(actions(''));
        const first = howGroup.querySelector('[role="radio"]');
        if (first) first.focus();
      }
      function closePanel() {
        clearTimeout(readTimer);
        found = null;
        panel.hidden = true;
        addBtn.hidden = false;
        fileInput.value = '';
        addBtn.focus();
      }
      function showType(pre) {
        howGroup.hidden = false;
        const t = howGroup.querySelector('[data-value="type"]');
        if (t) { howGroup.querySelectorAll('[role="radio"]').forEach((r) => r.setAttribute('aria-checked', r === t ? 'true' : 'false')); }
        setStage(typeStage(pre), 'input');
      }
      function addCpt(employer, dates) {
        App.state.caseCpt = (App.state.caseCpt || []).concat({ employer: employer, dates: dates });
        App.rerender();
        App.toast('Internship added');
      }
      function onAnswer(key, value) {
        if (value === 'unsure') {
          if (key === 'stemIntent') data.stem.intent = 'unsure';
          return;
        }
        if (key === 'sevp') App.state.caseSevpOn = data.today.short;
        if (key === 'stemIntent') data.stem.intent = value;
        setTimeout(() => {
          App.rerender();
          if (key === 'sevp') App.toast('Marked as done');
          else if (value === 'yes') App.toast('Saved', { action: 'See the plan', onAction: () => App.go('next') });
          else App.toast('Saved');
        }, 320);
      }

      root.addEventListener('click', (e) => {
        const t = e.target;
        if (t.closest('[data-case-add]')) { openPanel(); return; }
        if (t.closest('[data-case-cancel]')) { closePanel(); return; }
        const how = t.closest('[data-choices="case-cpt-how"] [role="radio"]');
        if (how) {
          if (how.dataset.value === 'file') { setStage(pickStage()); fileInput.click(); }
          else showType(null);
          return;
        }
        if (t.closest('[data-case-pick]')) { fileInput.click(); return; }
        if (t.closest('[data-case-confirm]') && found) {
          addCpt(found.employer, fmtRange(found.start, found.end));
          return;
        }
        if (t.closest('[data-case-fix]') && found) { showType(found); return; }
        if (t.closest('[data-case-save-cpt]')) {
          const v = (k) => ((root.querySelector('[data-field="' + k + '"]') || {}).value || '').trim();
          const employer = v('case-cpt-employer');
          if (!employer) return;
          addCpt(employer, fmtRange(v('case-cpt-start'), v('case-cpt-end')) || 'Dates not added');
          return;
        }
        if (t.closest('[data-case-reset-intent]')) {
          delete App.state.stemIntent;
          data.stem.intent = null;
          App.rerender();
          const ask = document.querySelector('.screen-case [data-key="stemIntent"] .btn');
          if (ask) ask.focus();
          return;
        }
        const ans = t.closest('[data-answer]');
        if (ans && (ans.dataset.answer === 'sevp' || ans.dataset.answer === 'stemIntent')) {
          onAnswer(ans.dataset.answer, ans.dataset.value);
        }
      });

      fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        howGroup.hidden = true;
        setStage(readingStage(file.name));
        clearTimeout(readTimer);
        readTimer = setTimeout(() => {
          found = Object.assign({}, SAMPLE_READ);
          setStage(foundStage(found), '[data-case-confirm]');
        }, 1200);
      });

      root.addEventListener('input', (e) => {
        if (e.target.dataset && e.target.dataset.field === 'case-cpt-employer') {
          const save = root.querySelector('[data-case-save-cpt]');
          if (save) save.disabled = !e.target.value.trim();
        }
      });
      root.addEventListener('keydown', (e) => {
        /* arrow keys move the choice in app.js; follow it here after that runs */
        if (/^Arrow/.test(e.key) && e.target.closest && e.target.closest('[data-choices="case-cpt-how"]')) {
          setTimeout(() => {
            const on = howGroup.querySelector('[aria-checked="true"]');
            if (!on) return;
            if (on.dataset.value === 'file') setStage(pickStage());
            else setStage(typeStage(null));
          }, 0);
          return;
        }
        if (e.key !== 'Enter' || !e.target.dataset || !/^case-cpt-/.test(e.target.dataset.field || '')) return;
        const save = root.querySelector('[data-case-save-cpt]');
        if (save && !save.disabled) { e.preventDefault(); save.click(); }
      });
    },
  };
})();
