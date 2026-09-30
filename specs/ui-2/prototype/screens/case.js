/* Your case: what Duly knows about the student. Each answer sits beside its
   question and is edited in place (app.js wires data-edit). Open questions
   sit once at the top of the page in C.waiting (never an eyebrow inside a
   row). Today the only one is "Was your degree awarded?", asked when no
   document shows it (#/case/no-degree forces it for review).
   The STEM OPT question is owned by What's next; Plans shows the answer as
   a quiet line with a link. Internships can be added from a CPT I-20 (read
   on this device, simulated) or typed. */
(function () {
  'use strict';

  const STYLE = '<style>' +
    '.screen-case{display:flex;flex-direction:column;flex:1 0 auto;min-width:0}' +
    '.screen-case .case-after{align-self:flex-start;margin-top:var(--s-4)}' +
    '.screen-case .case-line{margin-top:var(--s-8)}' +
    '.screen-case .case-panel{margin-top:var(--s-16);display:flex;flex-direction:column;gap:var(--s-24)}' +
    '.screen-case .case-stage{display:flex;flex-direction:column;gap:var(--s-24)}' +
    '.screen-case .case-stage-head{display:flex;flex-direction:column;gap:var(--s-4)}' +
    /* the stage spaces its children with its gap, so its button row adds no margin */
    '.screen-case .case-stage > .btn-row{margin-top:0}' +
    '</style>';

  /* The same illustrative read as Documents (data.documents.sampleRead). */
  const SAMPLE_READ = { employer: 'Harbor Analytics', start: 'Jun 2, 2025', end: 'Aug 22, 2025' };

  /* ---------------- state ---------------- */

  function edited(key, value) {
    const v = App.state['edit:' + key];
    return v != null && v !== '' ? v : value;
  }
  function intentState() { return App.stemIntent(); }
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
  function list(items) { return C.list(items, { accordion: false }); }

  /* ---------------- sections ---------------- */

  function cptSection(sec) {
    const added = (App.state.caseCpt || []).map((c, i) => ({ key: 'cpt-added-' + i, label: c.employer, value: c.dates }));
    const rows = sec.rows.concat(added).map(vrow);
    return C.section({
      eyebrow: sec.eyebrow,
      content: '<div class="vrows-named">' + list(rows) + '</div>' +
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

  function optSection(sec) {
    const items = sec.rows.map((r) => vrow(Object.assign({ num: r.key === 'application' || r.key === 'unemployment' }, r)));
    return C.section({ eyebrow: sec.eyebrow, content: list(items) });
  }

  /* Study: the awarded row shows the answer once there is one; while the
     question waits (top of page) the row is left out. */
  function studySection(sec, data) {
    const waitingAwarded = App.awardedWaiting();
    const answered = App.state.caseAwarded;
    const rows = sec.rows.filter((r) => r.key !== 'awarded' || !waitingAwarded).map((r) => {
      if (r.key !== 'awarded' || !answered) return r;
      const v = answered === 'no' ? 'Not yet' : answered === 'unsure' ? 'Not sure yet'
        : answered === 'other' ? 'Tap to add the date' : r.value;
      return Object.assign({}, r, { value: v });
    });
    return C.section({ eyebrow: sec.eyebrow, content: list(rows.map(vrow)) });
  }

  function waitingHtml(data) {
    if (!App.awardedWaiting()) return '';
    const a = data.awardedAsk;
    return C.waiting({
      items: [Object.assign({}, a, { note: App.state.caseAwarded === 'unsure' ? 'Duly will ask again later.' : null })],
    });
  }

  /* The STEM OPT answer, never the question: that lives on What's next. */
  function plansSection(sec) {
    const intent = intentState();
    if (intent === null || intent === 'unsure') {
      const u = sec.undecided;
      return C.section({
        eyebrow: sec.eyebrow,
        content: '<p class="t-meta case-line">' + C.esc(u.text) + ' ' + C.link(u.link) + '</p>',
      });
    }
    const row = intent === 'yes'
      ? C.row({ title: 'STEM OPT extension', meta: 'Planning to apply · start preparing by Oct 15', href: '#/next' })
      : C.row({ title: 'STEM OPT extension', meta: "Not this time · change in What's next", href: '#/next' });
    return C.section({ eyebrow: sec.eyebrow, content: list([row]) });
  }

  /* ---------------- add-internship stages ---------------- */

  /* The one placement rule (system.css): Cancel and any other quiet action
     on the left, the primary on the right, in a right-aligned row. */
  function actions(primary, quiet) {
    return C.buttonRow({
      back: [C.button({ label: 'Cancel', kind: 'back', attrs: { 'data-case-cancel': '' } }), quiet || ''],
      primary: primary || '',
    });
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
    return '<div class="case-stage-head" role="status"><p class="t-row">Duly read your CPT I-20.</p>' +
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

    render(data, params) {
      App.state.caseAwardedDemo = (params || [])[0] === 'no-degree';
      const body = data.caseFile.sections.map((sec) => {
        if (sec.key === 'study') return studySection(sec, data);
        if (sec.key === 'cpt') return cptSection(sec);
        if (sec.key === 'opt') return optSection(sec);
        if (sec.key === 'plans') return plansSection(sec);
        return C.section({ eyebrow: sec.eyebrow, content: list(sec.rows.map(vrow)) });
      }).join('');
      return '<div class="screen-case">' + STYLE +
        C.pageHeader({ title: 'Your case', subline: 'What Duly knows about you. Tap any answer to change it.' }) +
        waitingHtml(data) +
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
        App.state.caseAwarded = value;
        if (value === 'unsure') return;
        App.state.caseAwardedDemo = false;
        setTimeout(() => {
          if (App.params && App.params.length) App.go('case'); else App.rerender();
          App.toast('Saved');
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
        const ans = t.closest('[data-answer]');
        if (ans && ans.dataset.answer === 'awarded') onAnswer('awarded', ans.dataset.value);
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
