/* components/change.js: VALUE-2 pieces. Try a change, the check-in, Share
   with a summary, Reports you owe, Document watch, From your paper.

   Every number here comes from app/record.js (App.whatIf, App.reportsOwed,
   App.documentWatch, App.summary, App.fromPaper); nothing is worked out in
   a component. Behaviour is wired in app/sheets.js by data attributes:
     data-change-open="<preset>"  opens Try a change on that preset
     data-change-act              cancel | save | copy
     data-checkin-act             yes | update | undo
     data-share-open="<who>"      opens Share (who optional)
     data-share-act               cancel | share | pdf
     data-share-doc="<id>"        a paper's checkbox
     data-report-act              done | undo   (data-report="<id>")
     data-sheet-close             closes the open sheet
   Public:
     C.tryChange({ preset?, label? })      the quiet "Try a change" button
     C.change(state)                       the sheet's inside (App.openChange draws it)
     C.beforeAfter(rows)                   the moved items, Now and With this change
     C.askDso(questions)                   "Ask your DSO" with Copy (data-ask-copy)
     C.checkin(c?, { done? })              one fact to confirm: Yes or Update, then Undo
     C.sharePack(state)                    the sheet's inside (App.openSharePack draws it)
     C.summaryPage(summary)                the one-page summary, as previewed and printed
     C.shareButton is in employer.js; C.sharePackButton({ who?, label? }) opens this one
     C.reports(r?)                         the rows of Reports you owe (wrap in C.section)
     C.docWatch(w?)                        Next to run out, then one line per paper
     C.fromPaper(rows)                     "From your paper" rows for the source sheet */

(function () {
  'use strict';

  const C = window.C;
  const { esc, escText, cls, attrs, icon } = C;
  /* Defined in a file loaded earlier or later; looked up when called. */
  const source = (...a) => C.source(...a);
  const info = (...a) => C.info(...a);
  const sampleMark = (...a) => C.sampleMark(...a);
  const chips = (...a) => C.chips(...a);
  const buttonRow = (...a) => C.buttonRow(...a);
  const unknown = (...a) => C.unknown(...a);
  const SAMPLE = () => window.DULY_SAMPLE || {};
  const APP = () => window.App || {};

  /* ---------------- shared sheet top ---------------- */
  function sheetTop(p) {
    return '<div class="sheet-top">' +
      '<div class="title-row"><h2 class="t-medium" id="sheet-title" tabindex="-1">' + escText(p.title) + '</h2>' + (p.info ? info(p.info) : '') + '</div>' +
      '<button type="button" class="sheet-x" data-sheet-close aria-label="Close">' + icon('close') + '</button></div>';
  }

  /* ---------------- Try a change ---------------- */

  /* tryChange({ preset?, label = 'Try a change', presets? }) : the one quiet
     entry, on the card the change touches and once in Your profile (D72).
     presets: limit the choices, e.g. ['jobEnd', 'newEmployer', 'fewerHours']. */
  function tryChange(p) {
    const o = p || {};
    return '<button type="button" class="btn btn-text is-small try-change"' + attrs({
      'data-change-open': o.preset || '', 'data-change-presets': o.presets ? o.presets.join(',') : null,
    }) + '>' + esc(o.label || (SAMPLE().change || {}).title || 'Try a change') + '</button>';
  }

  const dateIn = (label, name, v) => '<div class="field"><label class="field-label" for="chg-' + esc(name) + '">' + esc(label) + '</label>' +
    '<input class="input" type="date" id="chg-' + esc(name) + '"' + attrs({ 'data-field': 'change:' + name, value: v || '' }) + '></div>';
  const numIn = (label, name, v) => '<div class="field"><label class="field-label" for="chg-' + esc(name) + '">' + esc(label) + '</label>' +
    '<input class="input" type="number" min="0" max="80" step="1" inputmode="numeric" id="chg-' + esc(name) + '"' + attrs({ 'data-field': 'change:' + name, value: v == null ? '' : String(v) }) + '></div>';
  const textIn = (label, name, v, ph) => '<div class="field"><label class="field-label" for="chg-' + esc(name) + '">' + esc(label) + '</label>' +
    '<input class="input" type="text" autocomplete="off" id="chg-' + esc(name) + '"' + attrs({ 'data-field': 'change:' + name, value: v || '', placeholder: ph }) + '></div>';
  const pick = (label, name, items, v) => '<div class="field"><p class="field-label">' + esc(label) + '</p>' +
    chips({ key: 'change:' + name, label: label, inline: true, items: items.map((i) => ({ value: i.value, label: i.label, selected: String(v) === String(i.value) })) }) + '</div>';

  /* The inputs for one preset. Dates are the student's own entries. */
  function changeInputs(key, v, job) {
    const ch = SAMPLE().change || {};
    const jobName = job ? job.employer : 'your job';
    switch (key) {
      case 'jobEnd':
        return dateIn('Last day at ' + jobName, 'on', v.on);
      case 'newEmployer':
        return textIn('Employer', 'employer', v.employer, 'Employer name') +
          '<div class="change-pair">' + dateIn('First day', 'start', v.start) + numIn('Hours a week', 'hours', v.hours) + '</div>' +
          (job ? pick('Your job at ' + jobName, 'instead', [{ value: 'instead', label: 'Ends the day before' }, { value: 'alongside', label: 'Goes on alongside' }], v.instead) : '');
      case 'fewerHours':
        return '<div class="change-pair">' + dateIn('From', 'on', v.on) + numIn('Hours a week at ' + jobName, 'hours', v.hours) + '</div>';
      case 'cpt':
        return '<div class="change-pair">' + dateIn('Start', 'start', v.start) + dateIn('End', 'end', v.end) + '</div>' +
          pick('Hours', 'fullTime', [{ value: 'full', label: 'Full time' }, { value: 'part', label: 'Part time' }], v.fullTime);
      case 'trip':
        return '<div class="change-pair">' + dateIn('Leave', 'leave', v.leave) + dateIn('Return', 'back', v.back) + '</div>' +
          (job ? pick('While you are away', 'purpose', ch.purposes || [], v.purpose) : '');
      case 'petition':
        return '<div class="change-pair">' + dateIn('Filed', 'filed', v.filed) + dateIn('H-1B start asked for', 'start', v.start) + '</div>' +
          pick('Outcome', 'outcome', ch.outcomes || [], v.outcome) +
          (v.outcome && v.outcome !== 'pending' ? dateIn('Day of the outcome', 'decided', v.decided) : '');
      default: return '';
    }
  }

  /* beforeAfter(rows) : the moved items. A row: its name with the source
     mark, then Now and With this change. Two columns on a wide screen, one
     under the other on a phone. */
  function beforeAfter(rows) {
    const ch = SAMPLE().change || {};
    if (!rows || !rows.length) return '';
    return '<div class="ba" role="table" aria-label="What moves">' +
      '<div class="ba-head" role="row"><span role="columnheader" class="ba-label t-eyebrow"></span>' +
      '<span role="columnheader" class="t-eyebrow">' + esc(ch.before || 'Now') + '</span>' +
      '<span role="columnheader" class="t-eyebrow">' + esc(ch.after || 'With this change') + '</span></div>' +
      rows.map((r) => '<div class="ba-row" role="row" data-key="' + esc(r.id) + '">' +
        '<span class="ba-label" role="rowheader"><span class="row-title">' + escText(r.label) + '</span>' +
        (r.sample ? ' <span class="marks">' + sampleMark() + '</span>' : '') + (r.rule || r.source ? source(r.rule || r.source, { inline: true }) : '') + '</span>' +
        '<span class="ba-before" role="cell"><span class="ba-tag">' + esc(ch.before || 'Now') + '</span>' + escText(r.before) + '</span>' +
        '<span class="ba-after" role="cell"><span class="ba-tag">' + esc(ch.after || 'With this change') + '</span>' + escText(r.after) + '</span>' +
        '</div>').join('') + '</div>';
  }

  /* The result: the rows, the dated facts, and every judgement as a DSO
     question in the student's words. Redrawn in place as the inputs change. */
  function changeResult(res) {
    const ch = SAMPLE().change || {};
    if (!res || !res.ok) {
      const msg = res && res.problem ? res.problem : (ch.incomplete || 'Add the date to see what moves.');
      return '<p class="t-meta change-empty">' + esc(msg) + '</p>';
    }
    const facts = (res.facts || []).length ? '<ul class="change-facts">' + res.facts.map((f) => '<li>' + escText(f.text) +
      (f.sample ? ' <span class="marks">' + sampleMark() + '</span>' : '') + (f.source ? source(f.source, { inline: true }) : '') + '</li>').join('') + '</ul>' : '';
    const qs = (res.questions || []).length ? '<div class="change-ask"><div class="change-ask-head"><p class="t-eyebrow">' + esc(ch.ask || 'Ask your DSO') + '</p>' +
      '<button type="button" class="btn btn-text is-small" data-change-act="copy">Copy</button></div>' +
      '<ul>' + res.questions.map((q) => '<li>' + escText(q) + '</li>').join('') + '</ul></div>' : '';
    const none = !res.rows.length ? '<p class="t-meta change-empty">' + esc(ch.nothing || 'Nothing on your record moves.') + '</p>' : '';
    return none + beforeAfter(res.rows) + facts + qs;
  }

  /* askDso(questions) : "Ask your DSO" with Copy, every judgement in the
     student's words. Copy is wired in app/sheets.js (data-ask-copy). */
  function askDso(questions) {
    const ch = SAMPLE().change || {};
    const qs = (questions || []).filter(Boolean);
    if (!qs.length) return '';
    return '<div class="change-ask"><div class="change-ask-head"><p class="t-eyebrow">' + esc(ch.ask || 'Ask your DSO') + '</p>' +
      '<button type="button" class="btn btn-text is-small"' + attrs({ 'data-ask-copy': qs.join('\n') }) + '>Copy</button></div>' +
      '<ul>' + qs.map((q) => '<li>' + escText(q) + '</li>').join('') + '</ul></div>';
  }

  /* change({ preset, presets, values, result, job }) : the inside of the
     Try a change sheet. app/sheets.js keeps the state and redraws only the
     result while a field is typed in. */
  function change(st) {
    const ch = SAMPLE().change || {};
    const s = st || {};
    const all = ch.presets || [];
    const list = s.presets && s.presets.length ? all.filter((p) => s.presets.indexOf(p.key) !== -1) : all;
    const res = s.result;
    return sheetTop({ title: ch.title || 'Try a change', info: ch.info }) +
      '<div class="sheet-body change">' +
      '<div class="field"><p class="field-label">What changes?</p>' +
      chips({ key: 'change:preset', label: 'What changes?', inline: true, items: list.map((p) => ({ value: p.key, label: p.label, selected: p.key === s.preset })) }) + '</div>' +
      (s.preset ? '<div class="change-inputs">' + changeInputs(s.preset, s.values || {}, s.job) + '</div>' +
        '<div class="change-result" data-change-result aria-live="polite">' + changeResult(res) + '</div>' : '') +
      '</div>' +
      '<div class="sheet-foot">' + buttonRow({
        back: '<button type="button" class="btn btn-text is-quiet" data-change-act="cancel">' + esc(ch.cancel || 'Cancel') + '</button>',
        primary: '<button type="button" class="btn btn-primary" data-change-act="save"' + (res && res.ok && res.rows.length ? '' : ' disabled') + '>' + esc(ch.save || 'This happened') + '</button>',
      }) + '</div>';
  }

  /* ---------------- the check-in ---------------- */

  /* checkin(c = App.checkin(), { done? }) : one card, only when a fact a
     running clock reads has gone stale. Yes confirms it for today; Update
     opens Try a change on the job changes; both can be undone. With no
     check-in due and none just answered, nothing is drawn. */
  function checkin(cIn, o) {
    const A = APP();
    const cfg = SAMPLE().checkin || {};
    const c = cIn === undefined ? (A.checkin ? A.checkin() : null) : cIn;
    const lastId = (o && o.done) || (A.state && A.state['checkin:last']);
    if (!c && lastId) {
      const day = A.dates ? A.dates.fmt(SAMPLE().today.iso) : '';
      return '<div class="item checkin is-done" data-checkin="' + esc(lastId) + '"><div class="row is-static"><span class="row-text">' +
        '<span class="row-title">' + esc(String(cfg.done || 'Confirmed {date}.').replace('{date}', day)) + '</span></span>' +
        '<span class="row-trail"><button type="button" class="btn btn-text is-small" data-checkin-act="undo">' + esc(cfg.undo || 'Undo') + '</button></span></div></div>';
    }
    if (!c) return '';
    return '<div class="item ask checkin" data-checkin="' + esc(c.id) + '"><div class="row is-static"><span class="row-text">' +
      '<span class="row-title">' + escText(c.title) + '</span>' +
      '<span class="row-meta">' + escText(c.meta) + '</span>' +
      '<span class="ask-actions">' +
      '<button type="button" class="btn btn-pill" data-checkin-act="yes">' + esc(c.yes || 'Yes') + '</button>' +
      '<button type="button" class="btn btn-text" data-checkin-act="update">' + esc(c.update || 'Update') + '</button>' +
      '</span></span><span class="row-trail">' + info(c.info, { inline: false }) + '</span></div></div>';
  }

  /* ---------------- share, with a one-page summary ---------------- */

  /* sharePackButton({ who?, label = 'Share', kind = 'pill' }) : the one
     Share action, in Documents and in Your profile. */
  function sharePackButton(p) {
    const o = p || {};
    return '<button type="button" class="' + cls('btn share-btn', o.kind === 'text' ? 'btn-text' : 'btn-pill') + '"' + attrs({ 'data-share-open': o.who || '' }) + '>' +
      icon('share') + '<span>' + esc(o.label || 'Share') + '</span></button>';
  }

  /* summaryPage(s = App.summary(who, { show })) : the fixed template, as the
     preview and as the printed page. */
  function summaryPage(s) {
    if (!s) return '';
    return '<article class="summary-page" aria-label="One-page summary">' +
      '<h3 class="summary-title">' + esc(s.title) + '</h3><p class="t-meta">' + esc(s.meta) + '</p>' +
      s.sections.map((x) => '<section class="summary-part"><p class="t-eyebrow">' + esc(x.label) + '</p>' +
        x.lines.map((l) => '<p>' + escText(l) + '</p>').join('') + '</section>').join('') +
      '<p class="t-meta summary-foot">' + esc(s.footer || '') + '</p></article>';
  }

  /* sharePack({ who, docs: { id: true }, summary, show, papers: [{ id, title, meta, sample? }] })
     The inside of the Share sheet. Who first; then the papers, picked for
     that reader; then the summary, previewed, names and numbers hidden
     until shown; then what the text holds; Cancel, Save as PDF, Share. */
  function sharePack(st) {
    const cfg = SAMPLE().sharePack || {};
    const s = st || {};
    const A = APP();
    const sum = s.who && s.summary !== false && A.summary ? A.summary(s.who, { show: !!s.show }) : null;
    const papers = s.who ? (s.papers || []).map((d) => {
      const on = !!(s.docs && s.docs[d.id]);
      return '<div class="item share-doc"><div class="row is-static">' +
        '<button type="button" class="check" role="checkbox" aria-checked="' + (on ? 'true' : 'false') + '" data-share-doc="' + esc(d.id) + '" aria-label="' + esc(d.title) + '">' + icon('tick', { size: 12 }) + '</button>' +
        '<span class="row-text"><span class="row-title">' + escText(d.title) + (d.sample ? ' <span class="marks">' + sampleMark() + '</span>' : '') + '</span>' + (d.meta ? '<span class="row-meta">' + escText(d.meta) + '</span>' : '') + '</span>' +
        '</div></div>';
    }).join('') : '';
    const count = s.who ? Object.keys(s.docs || {}).filter((k) => s.docs[k]).length : 0;
    const ready = !!s.who && (count > 0 || !!sum);
    return sheetTop({ title: cfg.title || 'Share your papers', info: cfg.info }) +
      '<div class="sheet-body share-pack">' +
      '<div class="field"><p class="field-label">Who is it for?</p>' +
      chips({ key: 'share:who', label: 'Who is it for?', inline: true, items: (cfg.for || []).map((f) => ({ value: f.value, label: f.label, selected: f.value === s.who })) }) + '</div>' +
      (s.who ? '<div class="share-block"><p class="t-eyebrow">Papers · ' + count + '</p><div class="list">' + papers + '</div></div>' +
        '<div class="list share-switches">' +
        C.settingRow({ title: cfg.summaryLabel || 'One-page summary', control: C.toggle({ key: 'share:summary', on: s.summary !== false, label: cfg.summaryLabel || 'One-page summary' }) }) +
        (s.summary !== false ? C.settingRow({ title: cfg.showLabel || 'Show names and numbers', control: C.toggle({ key: 'share:show', on: !!s.show, label: cfg.showLabel || 'Show names and numbers' }) }) : '') +
        '</div>' +
        (sum ? summaryPage(sum) + '<p class="t-meta share-holds">' + esc(sum.holds) + '</p>' : '') : '') +
      '</div>' +
      '<div class="sheet-foot">' + buttonRow({
        back: ['<button type="button" class="btn btn-text is-quiet" data-share-act="cancel">' + esc(cfg.cancel || 'Cancel') + '</button>',
          '<button type="button" class="btn btn-pill" data-share-act="pdf"' + (sum ? '' : ' disabled') + '>' + esc(cfg.pdf || 'Save as PDF') + '</button>'],
        primary: '<button type="button" class="btn btn-primary" data-share-act="share"' + (ready ? '' : ' disabled') + '>' + esc(cfg.share || 'Share') + '</button>',
      }) + '</div>';
  }

  /* ---------------- reports you owe ---------------- */

  /* reports(r = App.reportsOwed(o)) : the rows, for C.section({ eyebrow:
     r.title, info: r.info, content: C.reports(r) }). What, to whom, by when,
     and Mark made; a made row reads "You marked this made on Mar 4" with
     Undo. A passed date is the date only. */
  function reports(rIn) {
    const A = APP();
    const r = rIn || (A.reportsOwed ? A.reportsOwed() : null);
    const cfg = SAMPLE().reports || {};
    if (!r) return '';
    const rows = r.rows.map((x) => {
      const sample = x.sample ? ' <span class="marks">' + sampleMark() + '</span>' : '';
      if (x.standing) {
        return '<div class="item ongoing report" data-key="' + esc(x.id) + '"><div class="row is-static"><span class="row-text">' +
          '<span class="row-title">' + escText(x.title) + '</span><span class="row-meta">' + escText(x.to + ' · ' + x.meta) + '</span></span>' +
          '<span class="row-trail">' + (x.source ? source(x.source) : '') + '</span></div></div>';
      }
      const meta = x.made ? x.madeText : x.to + ' · ' + x.dueText;
      const act = x.made
        ? '<button type="button" class="btn btn-text is-small is-quiet" data-report-act="undo" data-report="' + esc(x.id) + '">' + esc(cfg.undo || 'Undo') + '</button>'
        : '<button type="button" class="btn btn-text is-small" data-report-act="done" data-report="' + esc(x.id) + '">' + esc(cfg.markDone || 'Mark made') + '</button>';
      return '<div class="' + cls('item report', x.made && 'is-made') + '" data-key="' + esc(x.id) + '"><div class="row is-static"><span class="row-text">' +
        '<span class="row-title">' + escText(x.title) + sample + '</span><span class="row-meta num">' + escText(meta) + '</span></span>' +
        '<span class="row-trail">' + act + (x.rule || x.source ? source(x.rule || x.source) : '') + '</span></div></div>';
    });
    return '<div class="list reports" aria-label="' + esc(r.title || 'Reports you owe') + '">' + rows.join('') + '</div>' +
      (r.needsCard ? '<p class="reports-more">' + unknown(r.needsCard) + '</p>' : '');
  }

  /* ---------------- document watch ---------------- */

  /* docWatch(w = App.documentWatch()) : "Next to run out: EAD card, Feb 13,
     2027", then one line per paper, newest end last, passed ones after.
     Dates only; a date close by is set in the caution ink, never red. */
  function docWatch(wIn) {
    const A = APP();
    const w = wIn || (A.documentWatch ? A.documentWatch() : null);
    if (!w) return '';
    const top = w.next ? '<p class="watch-next"><span class="t-eyebrow">' + esc(w.title) + '</span>' +
      '<span class="' + cls('row-title', w.next.close && 'is-close') + '">' + escText(w.next.text) + '</span></p>' : '';
    return '<div class="doc-watch">' + top + '<div class="list">' + w.items.map((i) => {
      const marks = i.sample ? ' <span class="marks">' + sampleMark() + '</span>' : '';
      const inner = '<span class="row-text"><span class="row-title">' + escText(i.title) + marks + '</span>' +
        '<span class="' + cls('row-meta num', i.close && 'is-close') + '">' + escText(i.line) + '</span></span>' +
        '<span class="row-trail">' + (i.source ? source(i.source) : '') + (i.doc ? icon('chevron', { cls: 'chev' }) : '') + '</span>';
      return '<div class="' + cls('item watch', i.passed && 'is-passed') + '" data-key="' + esc(i.key) + '">' +
        (i.doc ? '<a class="row" href="#/documents/' + esc(i.doc) + '">' + inner + '</a>' : '<div class="row is-static">' + inner + '</div>') + '</div>';
    }).join('') + '</div></div>';
  }

  /* ---------------- from your paper (D74) ---------------- */

  /* fromPaper(rows = App.fromPaper(sourceKey)) : in the source sheet, each
     field read off a paper beside the date it fed. "EAD card · Card
     expires, Feb 13, 2027" then "Window opens, Nov 15, 2026". */
  function fromPaper(rows) {
    if (!rows || !rows.length) return '';
    return '<div class="from-paper"><h3>From your paper</h3>' + rows.map((r) =>
      '<div class="fp-row">' +
      '<span class="fp-cell"><span class="fp-name">' + escText(r.paper + ' · ' + r.field) + '</span><span class="fp-value num">' + escText(r.value) + '</span></span>' +
      icon('chevron', { cls: 'fp-arrow' }) +
      (r.fed ? '<span class="fp-cell"><span class="fp-name">' + escText(r.fed.label) + '</span><span class="fp-value num">' + escText(r.fed.text) + '</span></span>' : '') +
      '</div>').join('') + '</div>';
  }

  Object.assign(C, { tryChange, change, askDso, beforeAfter, checkin, sharePackButton, summaryPage, sharePack, reports, docWatch, fromPaper });
  Object.assign(C._, { changeResult, sheetTop });
})();
