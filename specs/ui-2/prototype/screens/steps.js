/* Next steps (#/steps): the path the student is on (STEM OPT), its key dates
   and short tasks, in one page (Round 3, notes 2 and 4). Replaces What's next
   and Checklists; #/next and #/checklists redirect here with their params.

   Only the current path shows. Past and later paths (CPT, OPT, H-1B) live on
   the Timeline, so #/steps/cpt, #/steps/opt and #/steps/h1b go to #/timeline
   in place.

   Round 5, note 3: the page comes alive.
     title, with the why behind its ⓘ
     the intent, answered right here (data-answer="stemIntent", shared with
       Home, Timeline and Your profile); once answered, one quiet line + Change
     C.timeline(App.stemTimeline()): a stepper, Today and the three dates
       evenly spaced on one line, with one sentence above ("Window opens in
       46 days"). Its line fills once (its own key, so Home's strip never
       uses up the motion) and is at rest on every redraw.
     Steps: federal and "Your school" steps together, in order (App.steps).
       The current step (App.currentStep) has a quiet tint. Each step opens
       in place, from its chevron or a tap on its row, to its one plain line
       and the rule behind it (the source mark sits inside the detail, so a
       row carries one mark). Ticking a step draws its check, settles the
       row, fills the bar beside the count, gives a light tap and moves the
       tint to the next open step (app.js setTask, advanceCurrent). The list
       carries data-current, so unticking brings the tint back too.
       When every step is done: the bar settles, the confetti plays the first
       time only (App.complete), and one quiet line says what comes next.
       The E-Verify step carries the Employer check's fact as its meta and
       keeps See, to #/employer. School steps keep Open, to the school page.
     "Add your school's page": one control. It opens to a link or a PDF,
       shows the steps found, and they are confirmed once (C.schoolImport).
     The DSO email opens only on request, from the school step that needs it.

   VALUE-2 on this page (every date from app/record.js, nothing worked out here):
     Feature 1, file-by date: once the school's recommendation date is known,
       the timeline's one line reads the file-by date (App.fileBy('stem')),
       the "Last day to file" point moves to it, and its source mark lists
       each limit with the one that sets the day. The I-765 step's dates
       follow. Until then the line and points are as before.
     Feature 4, Reports you owe: the next one or two open reports, each with
       to whom and by when, and Mark made (wired in app/sheets.js). A report
       marked today stays in place with Undo. More than two: "Show n more",
       in place. Nothing open: the standing 10-day rule, one quiet row.
     Feature 8, cap-gap: for each petition on the record, its cap-gap end
       row; when the card ends before the filing day, the DSO question with
       Copy. Nothing when no petition is entered.

   Review links: #/steps/school (steps found, waiting to confirm),
   #/steps/school-added (confirmed), #/steps/2026-12-01 (the timeline as it
   reads on that day: inside the window, the last day emphasized),
   #/steps/rec-2026-12-01 (a recommendation date, shown, never saved),
   #/steps/reports-sample (reports on the sample STEM card),
   #/steps/petition-sample (the sample petition's cap-gap row, never saved).
   They combine: #/steps/rec-2026-12-01/reports-sample/petition-sample. */
(function () {
  'use strict';

  /* Layout only. Sizes are the system's three (big, medium, small). */
  const STYLE = '<style>' +
    '.screen-steps .st-head { margin-bottom: var(--s-32); }' +
    '.screen-steps .st-ask { margin-top: var(--s-24); display: flex; flex-direction: column; align-items: flex-start; gap: var(--s-16); }' +
    '.screen-steps .st-intent { margin-top: var(--s-12); display: flex; align-items: center; gap: var(--s-12); }' +
    '.screen-steps .st-intent .btn { padding: 0; }' +
    '.screen-steps .st-big { display: flex; align-items: center; gap: var(--s-8); }' +
    '.screen-steps .st-big .inline-src { margin-left: 0; }' +
    '.screen-steps .st-when { margin-bottom: 0; }' +
    /* The count and its bar, at the right of the Steps heading. */
    '.screen-steps .st-steps .section-head { align-items: center; }' +
    '.screen-steps .st-progress { gap: var(--s-12); min-width: 0; }' +
    '.screen-steps .st-progress .bar { width: 96px; flex: none; }' +
    '.screen-steps .st-progress [data-progress-label] { white-space: nowrap; }' +
    /* A step's detail: its plain line, then the rule in a quieter voice. */
    '.screen-steps .task-detail p { margin: 0; }' +
    '.screen-steps .task-detail .st-rule { color: var(--ink-3); }' +
    '.screen-steps .task-detail .st-rule .inline-src { vertical-align: -3px; }' +
    /* The current step, open: the tint runs on under its detail. */
    '.screen-steps .task.is-current.is-open > .row { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }' +
    '.screen-steps .task.is-current > .task-detail { background: var(--accent-tint); border-radius: 0 0 var(--r-field) var(--r-field); transition: background .3s ease; }' +
    '.screen-steps .task-detail { transition: background .3s ease; }' +
    '.screen-steps .st-add { display: flex; align-items: center; gap: var(--s-8); }' +
    '.screen-steps .st-add .btn { padding: var(--s-12) 0; }' +
    '.screen-steps .st-complete { margin-top: var(--s-16); color: var(--ink-2); }' +
    '.screen-steps .st-steps .rules-line { margin-top: var(--s-24); }' +
    '.screen-steps .st-done-list .row-lead { height: var(--lh-small); }' +
    /* VALUE-2: Reports you owe and the cap-gap rows, quiet, under the steps. */
    '.screen-steps .st-more { padding-top: var(--s-12); }' +
    '.screen-steps .st-more .btn { padding: 0; }' +
    '.screen-steps .st-ask-dso { margin-top: var(--s-16); }' +
    '</style>';

  const OPEN = 'steps:schoolOpen';
  const e = (s) => C.esc(s);
  const ISO = /^\d{4}-\d{2}-\d{2}$/;

  /* Old path views now live on the Timeline. The hash is swapped before the
     router reads it: once at load, and on each hashchange in the capture
     phase, which runs ahead of the router's own listener. */
  const OLD_PATH = /^#\/?(?:steps|next|checklists)\/(?:cpt|opt|h1b)(?:\/|$)/;
  function toTimeline() {
    if (!OLD_PATH.test(location.hash || '')) return false;
    try { history.replaceState(history.state, '', '#/timeline'); } catch (err) { location.replace('#/timeline'); }
    return true;
  }
  toTimeline();
  window.addEventListener('hashchange', toTimeline, true);

  function parse(params) {
    let demo = null, today = null, rec = null, sampleCard = false, petition = false;
    (params || []).forEach((x) => {
      if (x === 'school' || x === 'school-added') demo = x;
      else if (x === 'reports-sample') sampleCard = true;
      else if (x === 'petition-sample') petition = true;
      else if (/^rec-/.test(x) && ISO.test(x.slice(4)) && !isNaN(Date.parse(x.slice(4)))) rec = x.slice(4);
      else if (ISO.test(x) && !isNaN(Date.parse(x))) today = x;
    });
    return { demo: demo, today: today, rec: rec, sampleCard: sampleCard, petition: petition };
  }

  /* A review link forces the school import state once per visit, so the
     student's own clicks afterwards are never overridden by a redraw. */
  let demoApplied = null;
  function applyDemo(demo) {
    if (!demo || demoApplied === location.hash) return;
    demoApplied = location.hash;
    App.setSchoolImport('stem', demo === 'school' ? 'found' : 'confirmed',
      { href: App.data.schoolImport.href, label: App.data.schoolImport.label });
  }
  window.addEventListener('hashchange', () => { if (location.hash !== demoApplied) demoApplied = null; });

  function answerBtn(label, value, cls) {
    return '<button type="button" class="' + cls + '" data-answer="stemIntent" data-value="' + e(value) + '">' + e(label) + '</button>';
  }

  /* The rule with one more sentence of its own, so a line keeps one mark. */
  function withPlain(key, extra) {
    const rule = C.getRule(key) || {};
    return Object.assign({}, rule, { plain: [rule.plain, extra].filter(Boolean).join(' ') });
  }

  function sentence(t) { return t ? String(t).replace(/\.?$/, '.') : null; }

  /* A step's detail, opened in place: its own plain line, then the rule it
     comes from with the source mark. Nothing when there is neither. */
  function detailOf(line, ruleKey) {
    const rule = ruleKey ? C.getRule(ruleKey) : null;
    const parts = [];
    if (line) parts.push('<p>' + C.escText(line) + '</p>');
    if (rule) {
      parts.push('<p class="st-rule">' + (rule.plain ? C.escText(rule.plain) : C.escText(rule.name || '')) +
        ' ' + C.source(ruleKey, { inline: true }) + '</p>');
    }
    return parts.length ? parts.join('') : null;
  }

  /* The E-Verify step: the Employer check's fact as its meta, so the page
     never says it twice. Never a verdict, only what the search shows. */
  function everifyMeta() {
    const emp = App.employer ? App.employer() : null;
    const ev = emp && emp.everify;
    if (!ev || !ev.value) return null;
    return ev.label + ': ' + String(ev.value).toLowerCase() + (ev.checked ? ', checked ' + ev.checked : '');
  }

  function fedRow(entry, current) {
    const s = entry.step;
    const isEv = entry.key === 'everify';
    const detail = detailOf(s.info, s.source);
    return C.task({
      key: entry.key, title: s.title, done: entry.done,
      meta: isEv ? (everifyMeta() || s.meta || null) : (s.meta || null),
      open: isEv && s.open ? s.open : null,
      /* Without a detail the explanation stays behind an ⓘ, as before. */
      info: detail ? null : (s.info || null),
      updated: s.updated || null,
      onDone: s.onDone ? C.unknown(s.onDone) : null,
      current: current,
      detail: detail,
    });
  }

  function schoolRow(entry, data, current) {
    const s = entry.step;
    const line = s.info || sentence(s.meta);
    const plain = Object.assign({}, entry, { step: Object.assign({}, s, { meta: null, info: null }) });
    return C.schoolStep(plain, {
      email: Object.assign({}, data.email, { openLabel: 'Email your DSO' }),
      current: current,
      detail: detailOf(line, null),
    });
  }

  function schoolAdd(data) {
    const imp = App.schoolImport('stem');
    if (imp.state !== 'empty' || App.state[OPEN]) return C.schoolImport({ path: 'stem' });
    /* Collapsed: one quiet action. A PDF dropped on it works too. */
    return '<div class="school-import" data-school-import-wrap="stem" data-state="empty">' +
      '<div class="st-add" data-school-import-zone>' +
      '<button type="button" class="btn btn-text" data-steps-school="open">Add your school\'s page</button>' +
      C.info(data.schoolImport.info, { label: "About your school's page" }) +
      '</div></div>';
  }

  /* The line under a finished list. */
  const COMPLETE_LINE = 'All steps done. Your receipt number goes in ';
  function completeLine(allDone) {
    return '<p class="st-complete t-meta" data-steps-complete' + (allDone ? '' : ' hidden') + '>' +
      e(COMPLETE_LINE) + '<a class="link" href="#/uscis">USCIS status</a>.</p>';
  }

  /* The real timeline. Its own key, so the draw-in plays here once even
     after Home has shown its small strip. */
  function timelineFor(r, f) {
    const props = App.stemTimeline(r.today ? { today: r.today } : undefined);
    if (f) withFileBy(props, f);
    return '<section class="st-when" aria-label="' + e(props.label || 'Key dates') + '">' +
      C.timeline(Object.assign({}, props, { key: 'steps:stem' })) + '</section>';
  }

  /* ---------------- feature 1: the file-by date ---------------- */

  /* App.fileBy('stem') once the recommendation date is known: on the record,
     or from a review link (shown only, never saved). Null until then.
       Priya today: no recommendation date, so null and the timeline is as
       before (last day Feb 13, 2027, the card end).
       rec-2026-12-01: 2026-12-01 + 60 = 2027-01-30, earlier than 2027-02-13,
       so it sets the day. Opens 2027-02-13 - 90 = 2026-11-15.
       (python3, engine/dates.py, 2026-09-30) */
  function fileByFor(r) {
    if (!App.fileBy) return null;
    const f = App.fileBy('stem', r.rec ? { recommended: r.rec } : undefined);
    return f && !f.needs ? f : null;
  }

  const stemDate = (key) => (((App.data.stem || {}).dates) || []).filter((d) => d.key === key)[0] || null;

  /* The timeline's one line, read against the timeline's own today.
       today 2026-09-30, before 2026-11-15:
         "File your I-765 between Nov 15, 2026 and Jan 30, 2027"
       inside the window: "File your I-765 by Jan 30, 2027"
       on the last day, or after it: the date only, never a verdict.
       A receipt stops the clock: "You filed Dec 5, 2026". */
  function fileByCaption(f, today) {
    const caps = (((App.data.stem || {}).timeline) || {}).captions || {};
    if (f.stopped) return 'You filed ' + f.filedText;
    if (today < f.opens) return 'File your I-765 between ' + f.opensText + ' and ' + f.lastText;
    if (today < f.last) return f.line;
    if (today === f.last) return caps.last || 'Today is the last day to file';
    return String(caps.after || 'The last day to file was {date}').replace('{date}', f.lastText);
  }

  /* The "Last day to file" point moves to the file-by date; its source mark
     carries each limit, the one that sets the day marked (f.info). Only the
     date that matters now is emphasized: the opening until it opens, then
     the last day until it passes. */
  function withFileBy(props, f) {
    const opens = stemDate('opens'), closes = stemDate('closes');
    const today = props.today;
    const setter = f.candidates.filter((x) => x.sets)[0] || f.candidates[0];
    const emph = today < f.opens ? 'opens' : (today <= f.last && !f.stopped ? 'closes' : null);
    props.marks = (props.marks || []).map((m) => {
      if (opens && m.label === opens.label && m.date === opens.iso) return Object.assign({}, m, { emphasis: emph === 'opens' });
      if (closes && m.label === closes.label && m.date === closes.iso) {
        return Object.assign({}, m, { date: f.last, display: null, emphasis: emph === 'closes',
          source: App.ruleWith ? App.ruleWith(setter.source, [f.info]) : setter.source });
      }
      return m;
    });
    props.caption = fileByCaption(f, today);
    return props;
  }

  /* ---------------- feature 4: Reports you owe ---------------- */

  const REPORTS_ALL = 'steps:reportsAll';
  const byDue = (a, b) => (a.due < b.due ? -1 : (a.due > b.due ? 1 : 0));

  /* Priya, today 2026-09-30: her job start (made Feb 27) and address (made
     Mar 4) are marked made and nothing else is owed, so the one row is the
     standing rule: "Report a change of name, address or job", within 10
     days. With the sample STEM card (from 2027-02-14), the next two are:
       6-month validation  2027-08-14 + 10 business days = 2027-08-27
       12-month evaluation 2028-02-14 + 10 days          = 2028-02-24
     then the 12-month validation, 2028-02-14 + 10 business days =
     2028-02-29 (Washington's Birthday, 2028-02-21, left out), behind
     "Show 3 more". (python3, engine/dates.py, 2026-09-30) */
  function reportsSection(r) {
    if (!App.reportsOwed || !C.reports) return '';
    const sample = (window.DULY_SAMPLE.records || {}).sampleStemCard;
    const all = App.reportsOwed(r.sampleCard && sample ? { stemCard: sample } : undefined);
    if (!all) return '';
    const t = App.data.today.iso;
    const many = !!App.state[REPORTS_ALL];
    const open = all.open || [];
    const shownOpen = many ? open : open.slice(0, 2);
    /* Marked made today: stays where it was, with Undo, until she leaves. */
    const justMade = (all.done || []).filter((x) => x.made === t);
    let rows = shownOpen.concat(justMade).sort(byDue);
    if (!rows.length) rows = (all.rows || []).filter((x) => x.standing);
    const rest = open.length - 2;
    const more = rest > 0
      ? '<p class="st-more"><button type="button" class="btn btn-text is-small" data-steps-reports="' + (many ? 'fewer' : 'more') + '" aria-expanded="' + many + '">' +
        e(many ? 'Show fewer' : 'Show ' + rest + ' more') + '</button></p>'
      : '';
    return C.section({ cls: 'st-reports', eyebrow: all.title || 'Reports you owe', info: all.info,
      content: C.reports(Object.assign({}, all, { rows: rows })) + more });
  }

  /* ---------------- feature 8: cap-gap ---------------- */

  /* Each petition on the record; a review link adds the sample one (the Try
     a change defaults), shown only. Sample petition, filed 2027-04-01 for a
     start of 2027-10-01: a start on or after Oct 1 is in fiscal year 2028,
     so April 1 of it is 2028-04-01 (filed on or after 2025-01-17, so the
     April 1 row). Pending: "Apr 1, 2028, or the H-1B start if earlier".
     Her card ends 2027-02-13, before 2027-04-01, so whether cap-gap covers
     her goes to the DSO. (python3, 2026-09-30) */
  function petitionsFor(r) {
    const rec = App.record ? App.record() : {};
    const list = (rec.petitions || []).map((p) => ({ p: p, sample: false }));
    if (r.petition) {
      const pre = (((App.data.change || {}).presets) || []).filter((x) => x.key === 'petition')[0];
      const d = (pre && pre.defaults) || null;
      if (d) list.push({ p: { id: 'sample', filed: d.filed, start: d.start, outcome: 'pending' }, sample: true });
    }
    return list;
  }

  function capGapSection(r) {
    if (!App.capGap) return '';
    const F = App.dates.fmtY;
    const rows = [];
    const questions = [];
    petitionsFor(r).forEach((x) => {
      const p = x.p;
      const g = App.capGap(p);
      if (!g) return;
      const mark = x.sample ? ' <span class="marks">' + C.sampleMark() + '</span>' : '';
      const key = g.outcome === 'denied' ? 'capGapOutcome' : 'capGap';
      const base = C.getRule(key) || {};
      const counted = g.outcome === 'denied' ? (base.counted || [])
        : ['Filed ' + F(p.filed) + ' for an H-1B start of ' + F(p.start) + ', in fiscal year ' + g.fiscalYear + '. April 1 of it is ' + F(g.limit) + '.'].concat(base.counted || []);
      const row = (title, meta, src) => '<div class="item" data-key="capgap:' + e(p.id) + ':' + e(title) + '"><div class="row is-static"><span class="row-text">' +
        '<span class="row-title">' + C.escText(title) + mark + '</span><span class="row-meta num">' + C.escText(meta) + '</span></span>' +
        '<span class="row-trail">' + C.source(src) + '</span></div></div>';
      rows.push(row('Cap-gap end', g.endText, App.ruleWith ? App.ruleWith(key, counted) : key));
      if (g.f1Ends) rows.push(row('F-1 status ends', F(g.f1Ends) + ', the day H-1B starts', 'capGapStart'));
      if (g.cardEndsBeforeFiling) {
        questions.push('My H-1B petition was filed ' + F(p.filed) + ' for a start of ' + F(p.start) + ', and my EAD card ends ' + F(g.cardEnd) + '. Does cap-gap cover me?');
      }
    });
    if (!rows.length) return '';
    const ask = questions.length
      ? '<div class="change-ask st-ask-dso"><div class="change-ask-head"><p class="t-eyebrow">Ask your DSO</p>' +
        '<button type="button" class="btn btn-text is-small" data-steps-copy="' + e(questions.join('\n')) + '">Copy</button></div>' +
        '<ul>' + questions.map((q) => '<li>' + C.escText(q) + '</li>').join('') + '</ul></div>'
      : '';
    return C.section({ cls: 'st-capgap', eyebrow: 'H-1B petition', content: C.list(rows, { accordion: false, label: 'Cap-gap' }) + ask });
  }

  /* The quiet sections under the steps, on either answer. */
  function recordSections(r) { return reportsSection(r) + capGapSection(r); }

  function stemView(data, r) {
    const stem = data.stem;
    const intent = App.stemIntent();
    const head = (inner) => '<header class="page-header st-head">' +
      C.titleWith('<h1 class="t-big" tabindex="-1">STEM OPT extension</h1>', stem.askInfo) + inner + '</header>';

    if (intent === 'no') {
      return head('<p class="st-intent t-meta"><span>Not applying this time</span>' + answerBtn('Change', '', 'btn btn-text is-small') + '</p>') +
        '<p class="st-big t-medium"><span>' + C.escText(stem.noTitle) + '</span>' + C.source(withPlain('eadEnds', stem.noInfo), { inline: true }) + '</p>' +
        recordSections(r) + C.footer();
    }

    let ask;
    if (intent === 'yes') {
      ask = '<p class="st-intent t-meta"><span>You plan to apply</span>' + answerBtn('Change', '', 'btn btn-text is-small') + '</p>';
    } else {
      ask = '<div class="st-ask">' +
        '<p class="t-medium">' + e(stem.askTitle) + '</p>' +
        '<div class="btn-group">' +
        answerBtn('Yes, I plan to', 'yes', 'btn btn-primary') +
        answerBtn('No, not this time', 'no', 'btn btn-pill') +
        (intent === 'unsure' ? '' : answerBtn('Not sure yet', 'unsure', 'btn btn-text is-quiet')) +
        '</div></div>';
    }

    const entries = App.steps('stem');
    const now = App.currentStep('stem');
    const f = fileByFor(r);
    /* With a file-by date, the I-765 step reads the window to it:
       rec-2026-12-01 gives "Nov 15, 2026 to Jan 30, 2027". */
    const fileStep = (en) => (f && !f.stopped && en.key === 'i765'
      ? Object.assign({}, en, { step: Object.assign({}, en.step, { meta: f.opensText + ' to ' + f.lastText }) }) : en);
    const rows = entries.map((en) => (en.type === 'school' ? schoolRow(en, data, en.key === now) : fedRow(fileStep(en), en.key === now)));
    const visible = entries.filter((en) => !(en.afterOf && !en.afterOf.done));
    const done = visible.filter((en) => en.done).length;
    const total = visible.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const label = done + ' of ' + total + ' done';

    /* data-current on the list: app.js keeps one step current in it, even
       after every step was done and one is unticked again. */
    const list = C.list(rows, { accordion: false, label: 'STEM OPT steps' }).replace('<div class="list"', '<div class="list" data-current');

    const steps = '<section class="section st-steps" aria-labelledby="st-steps-h">' +
      '<div class="section-head"><h2 class="sh-label t-eyebrow" id="st-steps-h">Steps</h2>' +
      '<div class="progress st-progress" data-progress>' + '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Steps done"><i style="width:' + pct + '%"></i></div>' +
      '<span class="t-meta num" data-progress-label>' + e(label) + '</span></div></div>' +
      list +
      completeLine(total > 0 && done === total) +
      schoolAdd(data) +
      C.rulesLine(data.rules) +
      '</section>';

    return head(ask) + timelineFor(r, f) + steps + recordSections(r) + C.footer();
  }

  window.SCREENS.steps = {
    title: 'Next steps',
    paramsInPlace: true,
    titleFor() { return 'Next steps'; },
    render(data, params) {
      /* Fallback if the hash got past the swap: redraw as the Timeline. */
      if (toTimeline()) setTimeout(App.rerender, 0);
      const r = parse(params);
      applyDemo(r.demo);
      return STYLE + stemView(data, r);
    },
    mount(root) {
      root.classList.add('screen-steps');
      root.addEventListener('click', (ev) => {
        const more = ev.target.closest('[data-steps-reports]');
        if (more) {
          App.state[REPORTS_ALL] = more.dataset.stepsReports === 'more';
          App.rerender();
          const again = document.querySelector('main#main [data-steps-reports]');
          if (again) again.focus({ preventScroll: true });
          return;
        }
        const cp = ev.target.closest('[data-steps-copy]');
        if (cp) {
          const text = cp.dataset.stepsCopy || '';
          const done = () => App.toast('Questions copied');
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done); else done();
          return;
        }
        const b = ev.target.closest('[data-steps-school="open"]');
        if (!b) return;
        App.state[OPEN] = true;
        App.rerender();
        const input = document.querySelector('main#main [data-school-import-url]');
        if (input) input.focus({ preventScroll: true });
      });
      wire();
    },
  };

  /* ---------------- behaviour, wired once ---------------- */

  /* The finished line shows and hides in place as steps are ticked. It sits
     under the list, so nothing above it moves. */
  function syncComplete() {
    const main = document.querySelector('main#main.screen-steps');
    if (!main) return;
    const line = main.querySelector('[data-steps-complete]');
    if (!line) return;
    const checks = Array.from(main.querySelectorAll('.st-steps .list [role="checkbox"][data-task]')).filter((c) => !c.closest('[hidden]'));
    const all = checks.length > 0 && checks.every((c) => c.getAttribute('aria-checked') === 'true');
    if (all === !line.hidden) return;
    line.hidden = !all;
    if (all) App.play(line, 'is-arriving');
  }

  let wired = false;
  function wire() {
    if (wired) return;
    wired = true;
    document.addEventListener('duly:change', (ev) => {
      const d = ev.detail || {};
      if (App.route !== 'steps') return;
      if (d.kind === 'task') { syncComplete(); return; }
      if (d.kind === 'school-import' && d.value === 'empty') {
        /* Not now folds it away; Change keeps the box open for a new link. */
        App.state[OPEN] = !(d.el && d.el.dataset && d.el.dataset.schoolImport === 'dismiss');
        return;
      }
      if (d.kind !== 'answer' || d.key !== 'stemIntent') return;
      App.rerender();
      const first = document.querySelector('main#main [data-answer="stemIntent"]');
      if (first) first.focus({ preventScroll: true });
      const v = App.stemIntent();
      App.toast(v === 'yes' ? 'Saved. Your steps are below' : v === 'no' ? 'Saved. Not this time' : v === 'unsure' ? 'Saved. Decide any time' : 'Answer cleared');
    });
  }
})();
