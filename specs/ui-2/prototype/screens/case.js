/* Your profile (route #/case): the facts the student's dates are counted
   from, in three plain groups:
     1. You and your degree
     2. Work on OPT (the job has its own title and employer rows)
     3. Internships (CPT), with "Add another internship"
   The OPT application lives in USCIS status and the STEM OPT choice on Next
   steps, so neither is repeated here.
   Round 3: no subtext. What the page is for sits behind the ⓘ by the title.
   Each answer sits beside its question and is edited in place (app.js wires
   data-edit; values live in App.state['edit:case-<key>']). The only open
   question, "Was your degree awarded?", sits once at the top in C.waiting,
   asked when no document shows it (#/case/no-degree forces it for review).
   Internships are added from a CPT I-20 (read on the device,
   simulated) or typed. The product name is not used in this screen's text. */
(function () {
  'use strict';

  /* Layout only. Type sizes come from the shared classes. */
  const STYLE = '<style>' +
    '.screen-case{display:flex;flex-direction:column;flex:1 0 auto;min-width:0}' +
    '.screen-case .case-after{align-self:flex-start;margin-top:var(--s-8)}' +
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
  function fmtRange(start, end) {
    const s = (start || '').trim();
    const e = (end || '').trim();
    if (!s || !e) return s || e;
    const ys = s.match(/, (\d{4})$/);
    const ye = e.match(/, (\d{4})$/);
    const from = ys && ye && ys[1] === ye[1] ? s.replace(/, \d{4}$/, '') : s;
    return from + ' to ' + e;
  }

  /* Every row in data.caseFile, by key, whatever section it sits in. */
  function rowsByKey(data) {
    const out = {};
    data.caseFile.sections.forEach((sec) => (sec.rows || []).forEach((r) => { out[r.key] = r; }));
    return out;
  }
  function sectionOf(data, key) { return data.caseFile.sections.filter((s) => s.key === key)[0] || {}; }

  /* ---------------- rows ---------------- */

  function vrow(r) {
    const key = 'case-' + r.key;
    /* Values worked out from other answers (STEM from the major, unemployment
       days from the card and the job) are not typed over. */
    const derived = r.readonly || r.key === 'stem';
    return C.valueRow({ label: r.label, value: edited(key, r.value), key: key, source: r.source, editable: !derived, num: r.num });
  }
  function list(items) { return C.list(items, { accordion: false }); }

  /* ---------------- groups ---------------- */

  /* 1. You and your degree. The awarded row shows the answer once there is
     one; while the question waits (top of page) the row is left out. */
  function youGroup(data, by) {
    const waitingAwarded = App.awardedWaiting();
    const answered = App.state.caseAwarded;
    const keys = ['name', 'visa', 'school', 'degree', 'stem', 'dates', 'awarded', 'earlier'];
    const rows = keys.map((k) => by[k]).filter(Boolean)
      .filter((r) => r.key !== 'awarded' || !waitingAwarded)
      .map((r) => {
        if (r.key !== 'awarded' || !answered) return r;
        const v = answered === 'no' ? 'Not yet' : answered === 'unsure' ? 'Not sure yet'
          : answered === 'other' ? 'Tap to add the date' : r.value;
        return Object.assign({}, r, { value: v });
      });
    return C.section({ id: 'case-you', eyebrow: 'You and your degree', content: list(rows.map(vrow)) });
  }

  /* The new I-20 step (Next steps) sends the student to #/case/recommended to
     add this date once the I-20 is in hand; the 60 day filing limit counts
     from it. So the row shows whenever that step can send her: she plans to
     apply, or she has ticked the I-20 step. */
  function recommendedRow() {
    if (App.stemIntent() !== 'yes' && !App.isDone('i20')) return null;
    return { key: 'stem-recommended', label: "School's STEM OPT recommendation", value: 'Tap to add the date', source: 'within60', num: true };
  }

  /* The unemployment row reads App.unemployment(), as Home and Timeline do,
     so the count and its as-of date never disagree. Until the job list is
     confirmed it shows the add line instead of a number. */
  function unemploymentRow(by) {
    if (!by.unemployment) return null;
    const u = App.unemployment();
    const add = (u.metric && u.metric.add) || {};
    const value = u.line || [add.action, add.rest].filter(Boolean).join(' ');
    return Object.assign({}, by.unemployment, { value: value, num: !!u.line, readonly: true });
  }

  /* 2. Work on OPT. The job reads as a job: its title and its employer are
     two answers, each changed on its own. Under them, "Is that every job?"
     (the one place the count starts) and the employer check link. */
  function workGroup(data, by) {
    const job = String((by.job && by.job.value) || '');
    const cut = job.indexOf(', ');
    const title = cut === -1 ? job : job.slice(0, cut);
    const employer = cut === -1 ? '' : job.slice(cut + 2);
    const jobRows = [
      by.permit && Object.assign({}, by.permit, { num: true }),
      { key: 'job-title', label: 'Job title', value: title || 'Tap to add' },
      { key: 'job-employer', label: 'Employer', value: employer || 'Tap to add' },
      by.started && Object.assign({}, by.started, { num: true }),
      by.reported,
    ].filter(Boolean).map(vrow);
    const after = [unemploymentRow(by), recommendedRow()].filter(Boolean).map(vrow);
    const items = jobRows.concat([C.jobsAsk(), C.employerRow()].filter(Boolean), after);
    return C.section({ id: 'case-work', eyebrow: 'Work on OPT', content: list(items) });
  }

  /* 3. Internships (CPT): the employer beside its dates. */
  function cptGroup(data) {
    const sec = sectionOf(data, 'cpt');
    const added = (App.state.caseCpt || []).map((c, i) => ({ key: 'cpt-added-' + i, label: c.employer, value: c.dates, num: true }));
    const rows = (sec.rows || []).map((r) => Object.assign({ num: true }, r)).concat(added).map(vrow);
    return C.section({
      id: 'case-cpt',
      eyebrow: sec.eyebrow || 'Internships (CPT)',
      content: '<div class="vrows-named">' + list(rows) + '</div>' +
        C.button({ label: sec.add || 'Add another internship', kind: 'text', small: true, cls: 'case-after', attrs: { 'data-case-add': '' } }) +
        '<div class="case-panel" data-case-panel hidden>' +
        C.choices({
          key: 'case-cpt-how', layout: 'pair', label: 'How to add the internship',
          options: [
            { value: 'file', title: 'Add its I-20' },
            { value: 'type', title: 'Type the dates' },
          ],
        }) +
        '<input type="file" accept="image/*,.pdf" hidden data-case-file aria-label="CPT I-20">' +
        '<div class="case-stage" data-case-stage>' + actions('') + '</div>' +
        '</div>',
    });
  }

  function waitingHtml(data) {
    if (!App.awardedWaiting()) return '';
    /* The question and its answers say enough: no line under it. */
    return C.waiting({ items: [Object.assign({}, data.awardedAsk, { meta: null })] });
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
  /* "this device": Duly runs on web, phone and desktop. */
  function here() { const d = window.DULY_SAMPLE || {}; return (d.device && d.device.here) || 'this device'; }
  function pickStage() {
    return '<div class="case-stage-head"><p class="t-row">Choose a photo or PDF of the I-20' +
      C.info('It is read on ' + here() + '.') + '</p></div>' +
      actions(C.button({ label: 'Choose a file', kind: 'pill', attrs: { 'data-case-pick': '' } }));
  }
  function readingStage(name) {
    return '<div class="case-stage-head" role="status"><p class="t-row">' + C.esc(name || 'Your I-20') + '</p>' +
      '<p class="t-meta">Reading on ' + C.esc(here()) + '</p></div>';
  }
  function foundStage(f) {
    return '<div class="case-stage-head" role="status"><p class="t-row">Found in your CPT I-20</p></div>' +
      C.found([['Kind', 'CPT I-20'], ['Employer', f.employer], ['Dates', fmtRange(f.start, f.end)]]) +
      actions(C.button({ label: 'Add internship', kind: 'primary', attrs: { 'data-case-confirm': '' } }),
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

  /* Round 5 (note 4): a saved answer's line carries the same check a ticked
     step draws, with a light tap. Under reduced motion the check is simply
     there. */
  function confirmed(message) {
    App.toast(message);
    const line = document.querySelector('.toast > span');
    if (line) {
      line.style.cssText = 'display: inline-flex; align-items: center; gap: var(--s-8);';
      line.insertAdjacentHTML('afterbegin', '<span class="check" aria-checked="true" aria-hidden="true" style="margin-top: 0;">' + C.icon('tick', { size: 12 }) + '</span>');
      App.play(line.firstElementChild, 'is-ticking');
    }
    App.haptic('tick');
  }

  /* ---------------- screen ---------------- */

  /* After an edit in place, the button's spoken label follows the new answer.
     One listener for the life of the page, whatever the screen. */
  if (!window.__caseEditLabel) {
    window.__caseEditLabel = true;
    document.addEventListener('duly:change', (e) => {
      const d = e.detail || {};
      if (d.kind !== 'edit' || !d.el || !d.el.closest || !d.el.closest('.screen-case')) return;
      const row = d.el.closest('.vrow');
      const label = row && row.querySelector('.v-label');
      if (label) d.el.setAttribute('aria-label', label.textContent + ': ' + d.value + '. Change');
    });
  }

  window.SCREENS['case'] = {
    title: 'Your profile',

    render(data, params) {
      App.state.caseAwardedDemo = (params || [])[0] === 'no-degree';
      const by = rowsByKey(data);
      return '<div class="screen-case">' + STYLE +
        C.pageHeader({ title: 'Your profile', info: 'The facts your dates are counted from. Tap any answer to change it.' }) +
        waitingHtml(data) +
        youGroup(data, by) +
        workGroup(data, by) +
        cptGroup(data) +
        C.footer('Records and dates from your documents, not legal advice.') +
        '</div>';
    },

    mount(root, data, params) {
      /* #/case/recommended: sent from the new I-20 step. Land on the row that
         takes the date, with its answer ready to change. */
      if ((params || [])[0] === 'recommended') {
        const row = root.querySelector('.vrow[data-key="case-stem-recommended"]');
        if (row) {
          row.scrollIntoView({ block: 'center' });
          const b = row.querySelector('[data-edit]');
          if (b) b.focus({ preventScroll: true });
        }
      }
      /* #/case/jobs: sent from "Add your job" or "Confirm your jobs". Land on
         the job, with "Is that every job?" in view. */
      if ((params || [])[0] === 'jobs') {
        const ask = root.querySelector('[data-key="jobs-complete"]');
        const jobBtn = root.querySelector('.vrow[data-key="case-job-employer"] [data-edit]');
        if (ask) ask.scrollIntoView({ block: 'center' });
        if (jobBtn) jobBtn.focus({ preventScroll: true });
      }
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
        if (t) {
          howGroup.querySelectorAll('[role="radio"]').forEach((r) => {
            r.setAttribute('aria-checked', r === t ? 'true' : 'false');
            r.tabIndex = r === t ? 0 : -1;
          });
        }
        setStage(typeStage(pre), 'input');
      }
      function addCpt(employer, dates) {
        clearTimeout(readTimer);
        App.state.caseCpt = (App.state.caseCpt || []).concat({ employer: employer, dates: dates });
        App.rerender();
        confirmed('Internship added');
      }
      function onAnswer(value) {
        App.state.caseAwarded = value;
        if (value === 'unsure') return;
        App.state.caseAwardedDemo = false;
        setTimeout(() => {
          if (App.params && App.params.length) App.go('case', { replace: true }); else App.rerender();
          confirmed('Saved');
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
        const ans = t.closest('[data-answer="awarded"]');
        if (ans) onAnswer(ans.dataset.value);
      });

      fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        howGroup.hidden = true;
        setStage(readingStage(file.name));
        clearTimeout(readTimer);
        readTimer = setTimeout(() => {
          if (!stage.isConnected) return;
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
