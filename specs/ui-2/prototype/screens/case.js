/* Your profile (route #/case): the facts the student's dates are counted
   from, in three plain groups:
     1. You and your degree
     2. Work on OPT (the job has its own title and employer rows)
     3. Internships (CPT), with "Add another internship"
     4. Travel and address (D74): passport, visa (sample values), the travel
        signature, the address, saved trips, and "Check a trip" (VALUE-2
        feature 3): pick the days, see the papers' dates, the days away, what
        the trip adds to the count, DSO questions and "Carry these".
   Try a change (feature 2, D72): one entry by the title, and "My job ends"
   on the job card. Both open the shared sheet (app/sheets.js).
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
    '.screen-case .trip-result{display:flex;flex-direction:column;gap:var(--s-24)}' +
    '.screen-case .trip-carry{display:flex;flex-direction:column;gap:var(--s-8)}' +
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

  /* The every job line carries the same as-of day as the count under it:
     App.countAsOf() is the last confirmed day while a job check-in waits,
     else today. Northwind confirmed 2026-08-28; 2026-09-30 minus
     2026-08-28 is 33 days, at least 30 (checked with python3), so it reads
     "as of Aug 28", matching "13 of 90 used, as of Aug 28". */
  function jobsLine() {
    const u = App.unemployment();
    const on = App.dates.fmt(App.countAsOf());
    return C.jobsAsk(Object.assign({}, u, { everyLine: "That's every job, as of " + on + '.', noneLine: 'No job yet, as of ' + on + '.' }));
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
    const items = jobRows.concat(jobRecordRows(), [jobsLine(), C.employerRow()].filter(Boolean), after);
    /* Feature 2 on the job card (D72): "My job ends" opens Try a change on
       the job presets. Shown while a job is open on the record. */
    const open = openJob();
    const jobEnd = (((data.change || {}).presets) || []).filter((p) => p.key === 'jobEnd')[0];
    const ends = open ? '<div class="case-after">' + C.tryChange({ preset: 'jobEnd', label: (jobEnd && jobEnd.label) || 'My job ends', presets: ['jobEnd', 'newEmployer', 'fewerHours'] }) + '</div>' : '';
    return C.section({ id: 'case-work', eyebrow: 'Work on OPT', content: list(items) + ends });
  }

  /* The job as the record holds it now: its hours this week and, once a
     last day is saved through Try a change, that day. Hours change through
     Try a change (Fewer hours), so they are not typed over here. */
  function openJob() {
    const rec = App.record();
    const t = data0().today.iso;
    return (rec.jobs || []).filter((j) => j.start <= t && (!j.end || t <= j.end))[0] || null;
  }
  function jobRecordRows() {
    const rec = App.record();
    const D = App.dates;
    const t = data0().today.iso;
    const job = (rec.jobs || []).filter((j) => j.start <= t && (!j.end || t <= j.end))[0] ||
      (rec.jobs || []).filter((j) => D.okIso(j.end))[0];
    if (!job) return [];
    /* Hours on today: the last hours change on or before today, else the
       hours the job started with (Northwind: 40, no changes). */
    let hours = job.hours;
    (job.hoursChanges || []).slice().sort((a, b) => (a.on < b.on ? -1 : 1)).forEach((c) => { if (c.on <= t) hours = c.hours; });
    const rows = [{ key: 'job-hours', label: 'Hours a week', value: String(hours), num: true, readonly: true, source: 'optHours' }];
    if (D.okIso(job.end)) rows.push({ key: 'job-end', label: 'Last day', value: D.fmtY(job.end), num: true, readonly: true });
    return rows.map(vrow);
  }
  function data0() { return window.DULY_SAMPLE || App.data || {}; }

  /* ---------------- travel and address (D74, feature 3) ---------------- */

  /* "Jul 9, 2031" or "Valid until Jul 9, 2031" back to ISO, so a date the
     student changes in place is the one the trip check reads. */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function isoFrom(text) {
    const m = /([A-Z][a-z]{2})[a-z]*\.? (\d{1,2}), (\d{4})/.exec(String(text || ''));
    if (!m || MON.indexOf(m[1]) === -1) return null;
    const iso = m[3] + '-' + String(MON.indexOf(m[1]) + 1).padStart(2, '0') + '-' + String(+m[2]).padStart(2, '0');
    return App.dates.okIso(iso) ? iso : null;
  }
  /* The passport and visa ends: the record's, or the date typed over it. */
  function paperEnd(editKey, paper) {
    if (!paper) return null;
    return isoFrom(App.state['edit:' + editKey]) || paper.expires;
  }
  /* The travel signature covers returns for six months from the day the
     DSO signed (travel.opt_signature_months):
       2026-03-02 + 6 months = 2026-09-02 (engine add_months, checked). */
  function signatureUntil(rec) {
    const s = rec.travelSignature;
    return s && App.dates.okIso(s.signed) ? App.dates.addMonths(s.signed, App.RULE.signatureMonths) : null;
  }

  /* A row with the Sample mark after its answer: passport, visa and
     address are sample values in the prototype (no ids are kept). */
  function sampled(html) {
    return html.replace(/(<\/button>|<\/span>)(?=(<button type="button" class="src|<\/span><\/div><\/div>$))/, '$1 <span class="marks">' + C.sampleMark() + '</span>');
  }

  /* The signature line in the tense the date calls for: a day before today
     (data0().today.iso, 2026-09-30) has passed, so it reads "Covered". */
  function coversLine(sig) {
    return (sig < data0().today.iso ? 'Covered' : 'Covers') + ' returns until ' + App.dates.fmtY(sig);
  }

  function travelGroup() {
    const rec = App.record();
    const D = App.dates;
    const rows = [];
    /* Passport 2031-07-09 and F-1 visa 2028-08-01: read off the record
       (sample values), shown as dates only. */
    if (rec.passport) rows.push(sampled(vrow({ key: 'passport', label: 'Passport', value: 'Valid until ' + D.fmtY(rec.passport.expires), num: true })));
    if (rec.visa) rows.push(sampled(vrow({ key: 'f1-visa', label: rec.visa.title || 'Visa', value: 'Valid until ' + D.fmtY(rec.visa.expires), num: true })));
    const sig = signatureUntil(rec);
    /* 2026-03-02 + 6 months = 2026-09-02, before today 2026-09-30
       (checked with python3), so it reads "Covered returns until". */
    if (sig) rows.push(vrow({ key: 'travel-signature', label: 'Travel signature', value: coversLine(sig), num: true, readonly: true, source: 'travelSignature' }));
    if (rec.address) rows.push(sampled(vrow({ key: 'address', label: 'Address', value: (rec.address.lines || []).join(', '), source: 'reportChanges' })));
    /* Trips saved from the trip check or Try a change. */
    (rec.trips || []).forEach((tr, i) => rows.push(vrow({ key: 'trip-' + i, label: i ? 'Trip' : 'Trips', value: D.fmtY(tr.leave) + ' to ' + D.fmtY(tr.back), num: true, readonly: true })));
    const open = !!App.state.caseTripOpen;
    return C.section({
      id: 'case-travel',
      eyebrow: 'Travel and address',
      content: list(rows) +
        C.button({ label: 'Check a trip', kind: 'text', small: true, cls: 'case-after', attrs: { 'data-trip-open': '', hidden: open ? '' : null } }) +
        '<div class="case-panel" data-trip-panel' + (open ? '' : ' hidden') + '>' + (open ? tripPanel() : '') + '</div>',
    });
  }

  /* The trip's own state: the two days and why the student is away. The
     sheet's sample dates are the starting point (data.change, trip). */
  function tripState() {
    const pre = ((((data0().change || {}).presets) || []).filter((p) => p.key === 'trip')[0] || {}).defaults || {};
    const s = App.state;
    return {
      leave: s['case-trip:leave'] != null ? s['case-trip:leave'] : pre.leave,
      back: s['case-trip:back'] != null ? s['case-trip:back'] : pre.back,
      purpose: s['case-trip:purpose'] || null,
    };
  }

  function tripPanel() {
    const t = tripState();
    const dateIn = (label, name, v) => '<div class="field"><label class="field-label" for="case-trip-' + name + '">' + C.esc(label) + '</label>' +
      '<input class="input" type="date" id="case-trip-' + name + '" data-field="case-trip:' + name + '" value="' + C.esc(v || '') + '"></div>';
    const purposes = (data0().change || {}).purposes || [];
    const pick = openJob() && purposes.length ? '<div class="field"><p class="field-label">While you are away from ' + C.esc(openJob().employer) + '</p>' +
      C.chips({ key: 'case-trip:purpose', label: 'While you are away', inline: true, items: purposes.map((p) => ({ value: p.value, label: p.label, selected: p.value === t.purpose })) }) + '</div>' : '';
    return '<div class="case-stage-head"><p class="t-row">Check a trip' + C.info('Pick the days you leave and return. You see the dates your documents cover and what the trip adds to your count. Nothing is saved unless you add the trip.') + '</p></div>' +
      '<div class="change-inputs"><div class="change-pair">' + dateIn('Leave', 'leave', t.leave) + dateIn('Return', 'back', t.back) + '</div>' + pick + '</div>' +
      '<div class="trip-result" data-trip-result aria-live="polite">' + tripResult(t) + '</div>' +
      C.buttonRow({
        back: C.button({ label: 'Cancel', kind: 'back', attrs: { 'data-trip-cancel': '' } }),
        primary: C.button({ label: 'Add this trip', kind: 'pill', disabled: !tripOk(t), attrs: { 'data-trip-save': '' } }),
      });
  }

  function tripOk(t) {
    const D = App.dates;
    return D.okIso(t.leave) && D.okIso(t.back) && t.back > t.leave;
  }

  /* What the trip check shows, worked out by App.whatIf on a copy of the
     record (it never saves). For the sample trip, leave 2026-12-19 and
     return 2027-01-09 (all checked with python3 and engine.dates):
       travel signature  2026-03-02 + 6 months = 2026-09-02, before the return
       EAD card ends     2027-02-13 (record), after the return
       days away         2027-01-09 - 2026-12-19 = 21 days
       five months       2026-12-19 + 5 months = 2027-05-19
       days without work by 2027-02-13: now 2026-02-14..2026-02-26 = 13;
         away for another reason, 2026-12-19..2027-01-08 adds 21, so 34 of 90;
         on approved leave or travel for the job, adds none, 13 of 90;
         not sure, unknown from Dec 19, 2026. */
  function tripResult(t) {
    const D = App.dates;
    if (!D.okIso(t.leave) || !D.okIso(t.back)) return '<p class="t-meta">Add both days to check the trip.</p>';
    const res = App.whatIf({ kind: 'trip', leave: t.leave, back: t.back, purpose: t.purpose || 'unsure' });
    if (!res.ok) return '<p class="t-meta">' + C.esc(res.problem || 'Add both days to check the trip.') + '</p>';
    const rec = App.record();
    const back = D.fmtY(t.back);
    const rows = [];
    const sig = signatureUntil(rec);
    if (sig) rows.push(vrow({ key: 'trip-signature', label: 'Travel signature', readonly: true, num: true, source: 'travelSignature',
      value: coversLine(sig) + (t.back > sig ? '. You return ' + back + '.' : '') }));
    const card = (rec.stem && rec.stem.card) || rec.opt;
    if (card && D.okIso(card.until)) rows.push(vrow({ key: 'trip-ead', label: 'EAD card', readonly: true, num: true, source: 'eadEnds',
      value: 'Ends ' + D.fmtY(card.until) + (t.back > card.until ? '. You return ' + back + '.' : '') }));
    const away = D.daysBetween(t.leave, t.back);
    rows.push(vrow({ key: 'trip-away', label: 'Days away', readonly: true, num: true, source: 'travelAbsence',
      value: away + (away === 1 ? ' day' : ' days') + '. Five months from ' + D.fmtY(t.leave) + ' is ' + D.fmtY(D.addMonths(t.leave, App.RULE.absenceMonths)) + '.' }));
    const u = unemploymentAdded(rec, res.record, t);
    if (u) rows.push(vrow({ key: 'trip-unemployment', label: 'Days without work', readonly: true, num: true, source: 'unemploymentAbroad', value: u }));
    const pp = paperEnd('case-passport', rec.passport);
    if (pp) rows.push(sampled(vrow({ key: 'trip-passport', label: 'Passport', readonly: true, num: true, value: 'Valid until ' + D.fmtY(pp) })));
    const vi = paperEnd('case-f1-visa', rec.visa);
    if (vi) rows.push(sampled(vrow({ key: 'trip-visa', label: (rec.visa && rec.visa.title) || 'Visa', readonly: true, num: true, value: 'Valid until ' + D.fmtY(vi) })));
    const qs = (res.questions || []).filter((q) => t.purpose || !/count as days without work/.test(q));
    const ask = qs.length ? '<div class="change-ask"><div class="change-ask-head"><p class="t-eyebrow">' + C.esc((data0().change || {}).ask || 'Ask your DSO') + '</p>' +
      '<button type="button" class="btn btn-text is-small" data-trip-copy>Copy</button></div>' +
      '<ul>' + qs.map((q) => '<li>' + C.escText(q) + '</li>').join('') + '</ul></div>' : '';
    return list(rows) + ask + carryList(rec, sig);
  }

  /* The count on the card with and without the trip. A day away counts as
     a day without work unless on approved leave or travel for the job
     (opt.unemployment_abroad, guidance); App.compute does the counting. */
  function unemploymentAdded(rec, next, t) {
    if (!rec.opt) return null;
    if (!t.purpose && openJob()) return 'Choose why you are away to count them';
    const a = App.compute(rec), b = App.compute(next);
    if (b['unemployment.unknown']) return b['unemployment.unknown'].text;
    if (b['unemployment.day90']) return 'Day 90 is ' + D_().fmtY(b['unemployment.day90'].iso);
    const x = a['unemployment.byEnd'], y = b['unemployment.byEnd'];
    if (!y) return null;
    const added = x && x.n != null ? y.n - x.n : null;
    const lead = added == null ? '' : (added > 0 ? 'Adds ' + added + (added === 1 ? ' day' : ' days') + '. ' : 'Adds none. ');
    return lead + y.text + ' by ' + D_().fmtY(rec.opt.until);
  }
  function D_() { return App.dates; }

  /* Carry these: the newest papers for the trip, each opening its own page. */
  function carryList(rec, sig) {
    const D = App.dates;
    const docs = data0().documents || {};
    const all = {};
    (docs.i20Groups || []).forEach((g) => (g.items || []).forEach((i) => { all[i.id] = i.name || i.title; }));
    ['work', 'identity', 'school'].forEach((k) => (docs[k] || []).forEach((i) => { all[i.id] = i.title; }));
    const job = openJob();
    const pp = paperEnd('case-passport', rec.passport);
    const vi = paperEnd('case-f1-visa', rec.visa);
    const items = [
      rec.passport && { id: rec.passport.doc, meta: 'Valid until ' + D.fmtY(pp), sample: rec.passport.sample },
      rec.visa && { id: rec.visa.doc, meta: 'Valid until ' + D.fmtY(vi), sample: rec.visa.sample },
      rec.travelSignature && { id: rec.travelSignature.doc, meta: 'Travel signature dated ' + D.fmtY(rec.travelSignature.signed) },
      rec.opt && { id: rec.opt.doc, meta: 'Valid until ' + D.fmtY(rec.opt.until) },
      job && job.doc && { id: job.doc, meta: 'Job from ' + D.fmtY(job.start) },
    ].filter((i) => i && i.id && all[i.id]);
    if (!items.length) return '';
    return '<div class="trip-carry"><p class="t-eyebrow">Carry these</p>' +
      list(items.map((i) => C.row({ key: 'carry-' + i.id, title: all[i.id], meta: i.meta, href: '#/documents/' + i.id,
        trailing: i.sample ? '<span class="marks">' + C.sampleMark() + '</span>' : '' })), { accordion: false, label: 'Carry these' }) + '</div>';
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

  /* The trip check redraws its result as a day or a reason changes. The
     shared handlers set App.state['case-trip:*'] and announce it; the
     page's mount points tripHook at its own panel. */
  const tripHook = { redraw: null };
  if (!window.__caseTripHook) {
    window.__caseTripHook = true;
    document.addEventListener('duly:change', (e) => {
      const d = e.detail || {};
      if (String(d.key || '').indexOf('case-trip:') !== 0 || !tripHook.redraw) return;
      tripHook.redraw();
    });
  }

  window.SCREENS['case'] = {
    title: 'Your profile',

    render(data, params) {
      App.state.caseAwardedDemo = (params || [])[0] === 'no-degree';
      const by = rowsByKey(data);
      return '<div class="screen-case">' + STYLE +
        /* Feature 2 (D72): the one Try a change entry on this page. */
        C.pageHeader({ title: 'Your profile', info: 'The facts your dates are counted from. Tap any answer to change it.', aside: C.tryChange({}) + ' ' + C.sharePackButton({ kind: 'text' }) }) +
        waitingHtml(data) +
        youGroup(data, by) +
        workGroup(data, by) +
        cptGroup(data) +
        travelGroup() +
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

      /* ---- the trip check ---- */
      const tripBtn = root.querySelector('[data-trip-open]');
      const tripBox = root.querySelector('[data-trip-panel]');
      function redrawTrip() {
        const box = tripBox && tripBox.isConnected && tripBox.querySelector('[data-trip-result]');
        if (!box) return;
        const t = tripState();
        box.innerHTML = tripResult(t);
        const save = tripBox.querySelector('[data-trip-save]');
        if (save) save.disabled = !tripOk(t);
      }
      tripHook.redraw = redrawTrip;
      function openTrip() {
        App.state.caseTripOpen = true;
        tripBox.innerHTML = tripPanel();
        tripBox.hidden = false;
        tripBtn.hidden = true;
        App.play(tripBox, 'is-arriving');
        const first = tripBox.querySelector('input');
        if (first) first.focus();
      }
      function resetTrip() {
        App.state.caseTripOpen = false;
        ['case-trip:leave', 'case-trip:back', 'case-trip:purpose'].forEach((k) => { delete App.state[k]; });
      }
      function closeTrip() {
        resetTrip();
        tripBox.hidden = true;
        tripBox.innerHTML = '';
        tripBtn.hidden = false;
        tripBtn.focus();
      }

      root.addEventListener('click', (e) => {
        const t = e.target;
        if (t.closest('[data-trip-open]')) { openTrip(); return; }
        if (t.closest('[data-trip-cancel]')) { closeTrip(); return; }
        if (t.closest('[data-trip-copy]')) {
          const text = Array.from(tripBox.querySelectorAll('.change-ask li')).map((li) => li.textContent).join('\n');
          const done = () => App.toast('Questions copied');
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done); else done();
          return;
        }
        if (t.closest('[data-trip-save]')) {
          const tr = tripState();
          if (!tripOk(tr)) return;
          resetTrip();
          App.applyChange({ kind: 'trip', leave: tr.leave, back: tr.back, purpose: tr.purpose || 'unsure' });
          return;
        }
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
