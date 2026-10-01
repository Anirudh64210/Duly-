/* app/record.js: VALUE-2. The record, and every date and count worked out from it.

   A small stand-in for engine/ in the browser prototype: the same calendar
   arithmetic as engine/dates.py (add_months clamps to the month's last day;
   business days start the day after and skip weekends and the holidays of
   5 U.S.C. 6103(a) on the days the law lists), the same pack values, and
   nothing read from a clock but DULY_SAMPLE.today. Every derived value for
   Priya below has its arithmetic in a comment, checked with python3 against
   engine/dates.py on 2026-09-30.

   Public:
     App.record()                 the working record (a copy of DULY_SAMPLE.records)
     App.compute(rec?, o?)        items by id: { id, label, text, iso?, n?, source, none? }
     App.whatIf(change, o?)       { ok, kind, rows: [{ id, label, before, after, source }],
                                    facts: [{ text, source?, sample? }], questions: [string],
                                    record, missing? }  Never saves. The petition
                                    preset takes replaces: <id> to stand in for one
                                    already on the record.
     App.applyChange(change)      "This happened": saves, toast with Undo
     App.undoRecord()             puts the record back as it was before the last save
     App.fileBy(path, o?)         feature 1: { opens, last, candidates, filed, needs }
     App.reportsOwed(o?)          feature 4: the rows, open first
     App.markReport(id, on)       mark one made (true) or undo (false)
     App.checkin()                feature 5: the one stale fact, or null
     App.answerCheckin(id, ans)   'yes' | 'undo'
     App.documentWatch()          feature 6: { next, items }
     App.capGap(petition)         feature 8: { fiscalYear, end, endText, ... }
     App.summary(who, { show })   feature 7: the one-page summary, a fixed template
     App.fromPaper(sourceKey)     D74: [{ paper, field, value, fed: { label, text }, href }]
     App.fedValue(key)            the computed value a paper field fed
     App.recordEvents()           the event log, append only (see "the event log")
     App.recordLines()            the log as Your record lines for screens/record.js
     App.dates                    { addDays, addMonths, addBusinessDays, daysBetween,
                                    holidays, fmt, monthsReading }
   o.stemCard: a STEM card to use in place of the record's (the sample card,
   for review links). 'duly:change' kinds added: 'record', 'report', 'checkin'. */

(function () {
  'use strict';

  const App = window.App;
  const data = App.data;
  const _ = App._;
  /* Defined in a file loaded later; looked up when called. */
  const emit = (...a) => _.emit(...a);
  const render = (...a) => _.render(...a);
  const toast = (...a) => _.toast(...a);

  /* ---------------- pack values (rulepacks/f1-us/v2026.09/parameters.yaml) ---------------- */
  const RULE = {
    unemploymentLimit: 90,      /* opt.unemployment_limit_days, settled */
    stemUnemploymentLimit: 150, /* stem.unemployment_limit_days, settled */
    minHours: 20,               /* opt.min_hours_per_week (guidance), stem.min_hours_per_week */
    reportWithin: 10,           /* opt.report_employer_within_days (guidance), stem.report_change_within_days */
    optFileAfterRec: 30,        /* opt.file_within_days_of_recommendation */
    optBefore: 90,              /* opt.apply_before_days */
    optAfter: 60,               /* opt.apply_after_days, the row in force (the 30-day row is paused) */
    stemFileAfterRec: 60,       /* stem.file_within_days_of_recommendation */
    stemBefore: 90,             /* stem.apply_before_expiry_days */
    stemMonths: 24,             /* stem.extension_months */
    validationMonths: 6,        /* stem.validation_interval_months */
    validationBusinessDays: 10, /* stem.validation_due_business_days */
    evaluationMonths: 12,       /* stem.evaluation_interval_months */
    evaluationDays: 10,         /* stem.evaluation_due_days */
    newPlanDays: 10,            /* stem.new_plan_due_days */
    cptBarDays: 365,            /* cpt.full_time_bar_days (a reading) */
    cptBarMonths: 12,           /* cpt.full_time_months_bar (a reading) */
    signatureMonths: 6,         /* travel.opt_signature_months */
    absenceMonths: 5,           /* travel.absence_months */
    capGapNewRuleFrom: '2025-01-17', /* capgap.end_month_day: 04-01 from this filing day, 10-01 before */
  };
  App.RULE = RULE;

  /* ---------------- dates ---------------- */
  const DAY = 86400000;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const okIso = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v + 'T00:00:00Z'));
  const T = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  const ISO = (t) => new Date(t).toISOString().slice(0, 10);
  const addDays = (iso, n) => ISO(T(iso) + n * DAY);
  const daysBetween = (a, b) => Math.round((T(b) - T(a)) / DAY);
  const daysIn = (y, m0) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
  /* engine.dates.add_months: the same day n months on, clamped to the month's end. */
  function addMonths(iso, n) {
    const y = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1, d = +iso.slice(8, 10);
    const tot = y * 12 + m + n;
    const Y = Math.floor(tot / 12), M = tot - Y * 12;
    return ISO(Date.UTC(Y, M, Math.min(d, daysIn(Y, M))));
  }
  const minIso = (a, b) => (!a ? b : (!b ? a : (a < b ? a : b)));
  const today = () => data.today.iso;
  /* fmt('2027-01-16') : 'Jan 16, 2027'; the year is left off in today's year
     unless year: true. */
  function fmt(iso, o) {
    if (!okIso(iso)) return '';
    const t = new Date(T(iso));
    const withYear = (o && o.year) || t.getUTCFullYear() !== +today().slice(0, 4);
    return MONTHS[t.getUTCMonth()] + ' ' + t.getUTCDate() + (withYear ? ', ' + t.getUTCFullYear() : '');
  }
  const fmtY = (iso) => fmt(iso, { year: true });

  /* engine.dates._holidays_of: 5 U.S.C. 6103(a), on the days the law lists
     (an observed day is not listed). Juneteenth is listed from 2021-06-17
     (calendar.federal_holidays_law). */
  const nthWeekday = (y, m0, wd, n) => { const f = new Date(Date.UTC(y, m0, 1)).getUTCDay(); return ISO(Date.UTC(y, m0, 1 + ((wd - f + 7) % 7) + 7 * (n - 1))); };
  const lastWeekday = (y, m0, wd) => { const l = daysIn(y, m0); const f = new Date(Date.UTC(y, m0, l)).getUTCDay(); return ISO(Date.UTC(y, m0, l - ((f - wd + 7) % 7))); };
  const holidayCache = {};
  function holidays(y) {
    if (holidayCache[y]) return holidayCache[y];
    const p = (m0, d) => ISO(Date.UTC(y, m0, d));
    const list = [
      [p(0, 1), "New Year's Day"],
      [nthWeekday(y, 0, 1, 3), 'Birthday of Martin Luther King, Jr.'],
      [nthWeekday(y, 1, 1, 3), "Washington's Birthday"],
      [lastWeekday(y, 4, 1), 'Memorial Day'],
      [p(5, 19), 'Juneteenth National Independence Day'],
      [p(6, 4), 'Independence Day'],
      [nthWeekday(y, 8, 1, 1), 'Labor Day'],
      [nthWeekday(y, 9, 1, 2), 'Columbus Day'],
      [p(10, 11), 'Veterans Day'],
      [nthWeekday(y, 10, 4, 4), 'Thanksgiving Day'],
      [p(11, 25), 'Christmas Day'],
    ].filter((h) => h[1].indexOf('Juneteenth') !== 0 || h[0] >= '2021-06-17')
      .map((h) => ({ iso: h[0], name: h[1] }));
    holidayCache[y] = list;
    return list;
  }
  const holidayOn = (iso) => holidays(+iso.slice(0, 4)).filter((h) => h.iso === iso)[0] || null;
  const weekend = (iso) => { const d = new Date(T(iso)).getUTCDay(); return d === 0 || d === 6; };
  /* engine.dates.add_business_days: the n-th business day after d. skipped
     lists the holidays on weekdays that were left out on the way. */
  function addBusinessDays(iso, n) {
    let day = iso, left = n;
    const skipped = [];
    while (left > 0) {
      day = addDays(day, 1);
      if (weekend(day)) continue;
      const h = holidayOn(day);
      if (h) { skipped.push(h); continue; }
      left -= 1;
    }
    return { iso: day, skipped: skipped };
  }
  /* The month reading of a span, both days counted: whole months from the
     start, then the days left. Jun 1 to Aug 15, 2024: Jun 1 to Aug 1 is 2
     months, Aug 1 to Aug 16 is 15 days. */
  function monthsReading(start, end) {
    const stop = addDays(end, 1);
    let m = 0;
    while (addMonths(start, m + 1) <= stop) m += 1;
    return { months: m, days: daysBetween(addMonths(start, m), stop) };
  }
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : (many || one + 's'));
  const monthsText = (r) => plural(r.months, 'month') + (r.days ? ' ' + plural(r.days, 'day') : '');

  App.dates = { addDays, addMonths, addBusinessDays, daysBetween, holidays, fmt, fmtY, monthsReading, okIso };

  /* ---------------- the record ---------------- */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let REC = null;
  const undoStack = [];
  function record() { if (!REC) { REC = clone(data.records || {}); sync(REC); } return REC; }
  App.record = record;
  function getPath(obj, path) {
    return String(path).split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  }

  /* ---------------- the event log (Your record) ---------------- */
  /* rec.events: what happened, in the order it was saved. Only appended:
     a new address is a new event and the earlier one stays. Undo (a loop's
     or App.undoRecord) puts the record back as it was before the save,
     events included, so an undone save leaves no line.
       jobStart    { jobId, employer, title, doc, on: first day }
       jobEnd      { jobId, employer, on: last day }
       hours       { jobId, employer, on, hours }
       checkinYes  { jobId, employer, on, hoursText }  only when the
                   student said "Still at" (a check-in's checkinYes save or
                   App.answerCheckin yes), or the confirmedOn in data.js,
                   read once when the record is first made. A job end or a
                   new job also stamps confirmedOn, and that is no event.
       address     { on: since, lines, sample }
     Sample, Priya: Northwind from Feb 27, Still at Northwind on Aug 28
     (jobs[0].confirmedOn), address from Mar 1. After the job ends walk
     (last day Oct 31, a new job at At least 20): the job end and the new
     job's start are added, and no Still at line for either job. After a
     move on Oct 5: a second address event; Mar 1 stays, with its report
     made Mar 4 (2026-03-01 + 10 = 2026-03-11), and the Oct 5 report is
     due 2026-10-05 + 10 = 2026-10-15. Checked with python3 on 2026-10-01. */
  const sameLines = (a, b) => (a || []).join('|') === (b || []).join('|');
  function hoursText(j, iso) {
    const changed = (j.hoursChanges || []).some((c) => c.on <= iso);
    if (!changed && j.hoursBand === 'full') return 'At least ' + RULE.minHours + ' hours a week';
    if (!changed && j.hoursBand === 'part') return 'Fewer than ' + RULE.minHours + ' hours a week';
    const h = hoursOn(j, iso);
    return h != null && h !== '' ? h + ' hours a week' : '';
  }
  function sync(rec) {
    if (!rec) return [];
    const first = !Array.isArray(rec.events);
    const ev = first ? (rec.events = []) : rec.events;
    const ids = {};
    ev.forEach((x) => { ids[x.id] = true; });
    const push = (x) => { if (!ids[x.id]) { ids[x.id] = true; ev.push(Object.assign({ logged: today() }, x)); } };
    const yes = (j, on) => push({ id: 'checkin-yes:' + j.id + ':' + on, kind: 'checkinYes', on: on, jobId: j.id, employer: j.employer, hoursText: hoursText(j, on) });
    (rec.jobs || []).forEach((j) => {
      if (okIso(j.start)) push({ id: 'job-start:' + j.id, kind: 'jobStart', on: j.start, jobId: j.id, employer: j.employer, title: j.title || '', doc: j.doc || null });
      if (okIso(j.end)) push({ id: 'job-end:' + j.id + ':' + j.end, kind: 'jobEnd', on: j.end, jobId: j.id, employer: j.employer });
      (j.hoursChanges || []).forEach((h) => {
        if (okIso(h.on)) push({ id: 'hours:' + j.id + ':' + h.on, kind: 'hours', on: h.on, jobId: j.id, employer: j.employer, hours: h.hours });
      });
      /* data.js only: the day the student last confirmed the job. */
      if (first && okIso(j.confirmedOn) && j.confirmedOn !== j.start) yes(j, j.confirmedOn);
    });
    /* A check-in answered Still at, read from the loop store without
       starting any loop. */
    if (rec === REC) {
      (((App.state || {}).loops || {}).list || []).forEach((lp) => {
        const on = lp && lp.kind === 'checkin' && lp.saved ? lp.saved.checkinYes : null;
        const j = on && (rec.jobs || []).filter((x) => x.id === (lp.context || {}).jobId)[0];
        if (j && okIso(on)) yes(j, on);
      });
    }
    const a = rec.address;
    if (a && okIso(a.since)) {
      const last = ev.filter((x) => x.kind === 'address').pop();
      if (!last || last.on !== a.since || !sameLines(last.lines, a.lines)) {
        const n = ev.filter((x) => x.kind === 'address').length;
        push({ id: 'address:' + a.since + ':' + n, kind: 'address', on: a.since, lines: (a.lines || []).slice(), sample: !!a.sample });
      }
    }
    return ev;
  }
  /* Every address on the log, one per day moved (a later fix to the lines
     of the same day replaces that day's lines), oldest first. */
  function addresses(rec) {
    const by = {};
    sync(rec).filter((x) => x.kind === 'address').forEach((x) => { by[x.on] = x; });
    return Object.keys(by).sort().map((k) => by[k]);
  }
  App.recordEvents = () => sync(record()).slice();
  /* App.recordLines() : the event log as Your record lines,
     { key, iso, cat, title, meta, doc?, sample? }, keys as screens/record.js
     already uses them (so an erased line stays erased). */
  App.recordLines = () => sync(record()).map((x) => {
    switch (x.kind) {
      case 'jobStart': return { key: 'work:job-start:' + x.jobId, iso: x.on, cat: 'work', title: 'Started at ' + x.employer, meta: x.title || '', doc: x.doc || undefined };
      case 'jobEnd': return { key: 'work:job-end:' + x.jobId + ':' + x.on, iso: x.on, cat: 'work', title: 'Job at ' + x.employer + ' ended', meta: 'Last day ' + fmtY(x.on) };
      case 'hours': return { key: 'work:hours:' + x.jobId + ':' + x.on, iso: x.on, cat: 'work', title: 'New hours at ' + x.employer, meta: x.hours != null ? x.hours + ' hours a week' : '' };
      case 'checkinYes': return { key: 'work:confirmed:' + x.jobId + ':' + x.on, iso: x.on, cat: 'work', title: 'Confirmed: still at ' + x.employer, meta: x.hoursText || '' };
      case 'address': return { key: 'status:address:' + x.on, iso: x.on, cat: 'status', title: 'Moved to a new address', meta: (x.lines || [])[(x.lines || []).length - 1] || '', sample: !!x.sample };
      default: return null;
    }
  }).filter(Boolean);

  const openJobs = (rec, iso) => (rec.jobs || []).filter((j) => j.start <= iso && (!j.end || iso <= j.end));
  function hoursOn(job, iso) {
    let h = job.hours;
    (job.hoursChanges || []).slice().sort((a, b) => (a.on < b.on ? -1 : 1)).forEach((c) => { if (c.on <= iso) h = c.hours; });
    return h;
  }
  const stemCardOf = (rec, o) => (o && o.stemCard) || (rec.stem && rec.stem.card) || null;
  /* Which card a day falls in: 'stem' wins on its own days. */
  function cardOn(rec, iso, o) {
    const s = stemCardOf(rec, o);
    if (s && s.from <= iso && iso <= s.until) return 'stem';
    if (rec.opt && rec.opt.from <= iso && iso <= rec.opt.until) return 'opt';
    return null;
  }

  /* One day on a card: 'work', 'none' (a day without work) or 'unknown'.
     A job of 20 hours a week or more is work (opt.min_hours_per_week).
     Jobs that reach 20 only together give 'unknown': the DSO decides.
     A day away counts as a day without work unless on leave the employer
     approved or travel for the job (opt.unemployment_abroad, guidance);
     'not sure' gives 'unknown'. A trip covers the day it leaves up to the
     day before it returns (a reading). */
  function dayState(rec, iso) {
    const jobs = openJobs(rec, iso);
    const hrs = jobs.map((j) => Number(hoursOn(j, iso)) || 0);
    let st = 'none';
    if (hrs.some((h) => h >= RULE.minHours)) st = 'work';
    else if (jobs.length > 1 && hrs.reduce((a, b) => a + b, 0) >= RULE.minHours) st = 'unknown';
    const trip = (rec.trips || []).filter((t) => t.leave <= iso && iso < t.back)[0];
    if (trip && st === 'work') {
      if (trip.purpose === 'other') st = 'none';
      else if (trip.purpose === 'unsure') st = 'unknown';
    }
    return st;
  }

  /* The count over the OPT card, from its first day through `through`
     (both counted). Stops at the first unknown day: a number with a missing
     fact is not shown. */
  function countDays(rec, through) {
    const c = rec.opt;
    if (!c || !okIso(c.from)) return { used: null };
    const last = minIso(through, c.until);
    let used = 0;
    for (let d = c.from; d <= last; d = addDays(d, 1)) {
      const st = dayState(rec, d);
      if (st === 'unknown') return { used: null, unknownFrom: d };
      if (st === 'none') used += 1;
    }
    return { used: used };
  }
  /* Forward from the card start with the record as entered (an open job
     runs on): the day the count reaches 90, or the count at the card's end.
     Nothing is said about any day after day 90. */
  function projectDays(rec) {
    const c = rec.opt;
    if (!c || !okIso(c.from)) return {};
    let used = 0, usedToday = null, firstAfter = null;
    const t = today();
    for (let d = c.from; d <= c.until; d = addDays(d, 1)) {
      const st = dayState(rec, d);
      if (d === t || (usedToday === null && d > t)) usedToday = used + (d === t && st === 'none' ? 1 : 0);
      if (st === 'none' && d > t && !firstAfter) firstAfter = d;
      if (st === 'unknown') return { unknownFrom: d, usedBefore: used, cause: (rec.trips || []).some((t) => t.leave <= d && d < t.back) ? 'trip' : 'hours' };
      if (st === 'none') {
        used += 1;
        if (used === RULE.unemploymentLimit) return { day90: d, usedToday: usedToday, firstAfter: firstAfter };
      }
    }
    return { byEnd: used };
  }

  /* ---------------- check-in hold (feature 5) ---------------- */
  function checkins(rec) {
    const r = rec || record();
    const cfg = data.checkin || {};
    const t = today();
    const out = [];
    /* A job's clock runs while today is on a card. */
    if (cardOn(r, t)) {
      openJobs(r, t).forEach((j) => {
        if (!okIso(j.confirmedOn)) return;
        const since = daysBetween(j.confirmedOn, t);
        /* Northwind: 2026-08-28 to 2026-09-30 is 33 days, at least 30, so due
           (due since 2026-09-27). */
        if (since >= (cfg.jobDays || 30)) {
          out.push({
            id: 'job:' + j.id, kind: 'job', jobId: j.id, confirmedOn: j.confirmedOn, since: since,
            title: fill((cfg.job || {}).title, { employer: j.employer, hours: hoursOn(j, t) }),
            meta: fill(cfg.meta, { date: fmt(j.confirmedOn) }),
            yes: (cfg.job || {}).yes, update: (cfg.job || {}).update, info: cfg.info,
          });
        }
      });
    }
    (r.petitions || []).filter((p) => p.outcome === 'pending' && okIso(p.confirmedOn)).forEach((p) => {
      if (daysBetween(p.confirmedOn, t) >= (cfg.petitionDays || 30)) {
        out.push({ id: 'petition:' + p.id, kind: 'petition', petitionId: p.id, confirmedOn: p.confirmedOn,
          title: (cfg.petition || {}).title, meta: fill(cfg.meta, { date: fmt(p.confirmedOn) }),
          yes: (cfg.petition || {}).yes, update: (cfg.petition || {}).update, info: cfg.info });
      }
    });
    return out;
  }
  /* The day the count is good through: today, or the last day the student
     confirmed a running job while that check-in waits. Never a count
     carried past its last confirmed day. */
  function countAsOf(rec) {
    const due = checkins(rec).filter((c) => c.kind === 'job');
    return due.length ? due.map((c) => c.confirmedOn).sort()[0] : today();
  }

  function fill(tpl, v) { return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)); }

  /* ---------------- reports (feature 4) ---------------- */
  const REPORT_SOURCE = { opt: 'reportChanges', stem: 'stemReportChange' };
  function reportItems(rec, o) {
    const out = [];
    const made = rec.made || {};
    /* Each row carries its own arithmetic for its source sheet. */
    const push = (it) => {
      it.made = made[it.id] || null;
      if (!it.counted && it.from) it.counted = [fmtY(it.from) + ', plus ' + plural(RULE.reportWithin, 'day') + ', is ' + fmtY(it.due) + '.'];
      out.push(it);
    };
    (rec.jobs || []).forEach((j) => {
      const startCard = cardOn(rec, j.start, o);
      if (startCard) {
        /* Northwind: 2026-02-27 + 10 = 2026-03-09 (made 2026-02-27). */
        push({ id: 'report:job-start:' + j.id, kind: 'change', what: 'Job at ' + j.employer, title: 'Report your job at ' + j.employer, from: j.start, due: addDays(j.start, RULE.reportWithin), source: REPORT_SOURCE[startCard] });
        if (startCard === 'stem') {
          push({ id: 'report:new-plan:' + j.id, kind: 'plan', title: 'New Form I-983 for ' + j.employer, from: j.start, due: addDays(j.start, RULE.newPlanDays), source: 'stemNewPlan' });
        }
      }
      if (okIso(j.end) && cardOn(rec, j.end, o)) {
        const c = cardOn(rec, j.end, o);
        /* Try a change, job ends 2026-10-31: 2026-10-31 + 10 = 2026-11-10. */
        push({ id: 'report:job-end:' + j.id, kind: 'change', what: 'End of the job at ' + j.employer, title: 'Report the end of your job at ' + j.employer, from: j.end, due: addDays(j.end, RULE.reportWithin), source: REPORT_SOURCE[c] });
        const s = stemCardOf(rec, o);
        if (c === 'stem' && s && j.end < s.until) {
          push({ id: 'report:eval-final:' + j.id, kind: 'evaluation', title: 'Final evaluation for ' + j.employer, from: j.end, due: addDays(j.end, RULE.evaluationDays), source: 'stemEvaluation' });
        }
      }
      (j.hoursChanges || []).forEach((h) => {
        const c = cardOn(rec, h.on, o);
        /* Try a change, fewer hours from 2026-11-01: + 10 = 2026-11-11. */
        if (c) push({ id: 'report:job-hours:' + j.id + ':' + h.on, kind: 'change', what: 'New hours at ' + j.employer, title: 'Report your new hours at ' + j.employer, from: h.on, due: addDays(h.on, RULE.reportWithin), source: REPORT_SOURCE[c] });
      });
    });
    /* Every address on the log, so a report made for an earlier one stays.
       2026-03-01 + 10 = 2026-03-11 (made 2026-03-04). */
    addresses(rec).forEach((a) => {
      const c = cardOn(rec, a.on, o);
      if (c) push({ id: 'report:address:' + a.on, kind: 'change', what: 'New address', title: 'Report your new address', from: a.on, due: addDays(a.on, RULE.reportWithin), source: REPORT_SOURCE[c] });
    });
    const s = stemCardOf(rec, o);
    if (s && okIso(s.from) && okIso(s.until)) {
      /* Sample card 2027-02-14 to 2029-02-13 (engine _add_stem_items):
           6 months  2027-08-14 (Sat) + 10 business days = 2027-08-27
           12 months 2028-02-14 (Mon) + 10 business days = 2028-02-29,
                     Washington's Birthday 2028-02-21 left out
           18 months 2028-08-14 (Mon) + 10 business days = 2028-08-28
           24 months 2029-02-14 + 10 business days = 2029-03-01, after the
                     card's end, so not given
           12-month evaluation 2028-02-14 + 10 days = 2028-02-24
           final evaluation 2029-02-13 + 10 days = 2029-02-23 */
      const n = Math.floor(RULE.stemMonths / RULE.validationMonths);
      for (let k = 1; k <= n; k += 1) {
        const reached = addMonths(s.from, RULE.validationMonths * k);
        const due = addBusinessDays(reached, RULE.validationBusinessDays);
        if (due.iso > s.until) continue;
        push({ id: 'report:validation:' + s.from + ':' + k, kind: 'validation', title: 'Validation report, ' + (RULE.validationMonths * k) + ' months',
          due: due.iso, reached: reached, skipped: due.skipped, business: true, source: 'stemValidation', sample: !!s.sample,
          counted: [fmtY(reached) + ', plus ' + RULE.validationBusinessDays + ' business days, is ' + fmtY(due.iso) + '.'].concat(due.skipped.length
            ? ['Weekends and ' + due.skipped.map((h) => h.name + ' on ' + fmtY(h.iso)).join(' and ') + ' are left out.'] : ['Weekends are left out.']) });
      }
      const eval12 = addDays(addMonths(s.from, RULE.evaluationMonths), RULE.evaluationDays);
      if (eval12 <= s.until) push({ id: 'report:eval-12:' + s.from, kind: 'evaluation', title: '12-month evaluation', due: eval12, source: 'stemEvaluation', doc: 'i983', sample: !!s.sample,
        counted: [fmtY(s.from) + ', plus 12 months, is ' + fmtY(addMonths(s.from, RULE.evaluationMonths)) + '; plus ' + RULE.evaluationDays + ' days, is ' + fmtY(eval12) + '.'] });
      push({ id: 'report:eval-final:' + s.from, kind: 'evaluation', title: 'Final evaluation', from: s.until, due: addDays(s.until, RULE.evaluationDays), source: 'stemEvaluation', doc: 'i983', sample: !!s.sample });
    }
    out.sort((x, y) => (x.due < y.due ? -1 : (x.due > y.due ? 1 : 0)));
    return out;
  }

  /* A source rule with this row's own arithmetic as How it was counted. */
  function ruleWith(key, counted) {
    const base = ((data.sources || {})[key]) || null;
    if (!base || !counted || !counted.length) return key || null;
    return Object.assign({}, base, { counted: counted });
  }
  App.ruleWith = ruleWith;

  /* App.reportsOwed({ stemCard? }) : rows for Next steps, open first by
     date, then those marked made (newest first). The standing rule leads
     while a card runs. Never "late" or "submitted": a passed date is the
     date only. */
  function reportsOwed(o) {
    const r = data.reports || {};
    const rec = record();
    const t = today();
    const items = reportItems(rec, o).map((it) => {
      const holidaysLeft = (it.skipped || []).map((h) => h.name + ' on ' + fmt(h.iso));
      return Object.assign({}, it, {
        to: r.to || 'Your DSO',
        dueText: 'By ' + fmt(it.due),
        madeText: it.made ? fill(r.made, { date: fmt(it.made) }) : null,
        passed: it.due < t,
        info: it.business ? (holidaysLeft.length === 0 ? r.weekendLine
          : fill(holidaysLeft.length === 1 ? r.holidayLine : r.holidaysLine, { list: holidaysLeft.slice(0, -1).join(', ') + (holidaysLeft.length > 1 ? ' and ' : '') + holidaysLeft[holidaysLeft.length - 1] })) : null,
        rule: ruleWith(it.source, it.counted),
      });
    });
    const open = items.filter((i) => !i.made);
    const done = items.filter((i) => i.made).sort((a, b) => (a.made < b.made ? 1 : -1));
    const standing = cardOn(rec, t, o) ? [{ id: 'report:standing', standing: true, title: (r.standing || {}).title, meta: (r.standing || {}).meta, source: REPORT_SOURCE[cardOn(rec, t, o)], to: r.to }] : [];
    const needsCard = !stemCardOf(rec, o) && App.stemIntent && App.stemIntent() === 'yes' ? r.noCard : null;
    return { title: r.title, info: r.info, rows: standing.concat(open, done), open: open, done: done, needsCard: needsCard };
  }
  App.reportsOwed = reportsOwed;
  /* App.markReport(id, true|false) : "You marked this made on Sep 30", or undo. */
  App.markReport = (id, on) => {
    const rec = record();
    rec.made = rec.made || {};
    if (on === false) delete rec.made[id]; else rec.made[id] = today();
    emit('report', id, on !== false, null);
  };

  /* ---------------- items, the shared output (feature 2 diffs these) ---------------- */
  function compute(recIn, o) {
    const rec = recIn || record();
    const items = {};
    const put = (it) => { items[it.id] = it; };
    const opt = rec.opt;
    const t = today();
    if (opt && okIso(opt.from)) {
      const asOf = countAsOf(rec);
      const now = countDays(rec, asOf);
      /* With Northwind from 2026-02-27: 2026-02-14 to 2026-02-26 is 13 days. */
      put({ id: 'unemployment.used', label: 'Days without work, as of ' + fmt(asOf), source: 'unemployment',
        n: now.used, text: now.used == null ? 'Unknown from ' + fmt(now.unknownFrom) : now.used + ' of ' + RULE.unemploymentLimit, asOf: asOf });
      const p = projectDays(rec);
      /* Job ends 2026-10-31: 13 days used, 77 left; day 14 is 2026-11-01,
         day 90 is 2026-11-01 + 76 = 2027-01-16. */
      if (p.day90) put({ id: 'unemployment.day90', label: 'Day 90 without work', source: 'unemployment', iso: p.day90, text: fmt(p.day90), none: 'None while you work',
        counted: p.usedToday != null && p.firstAfter && p.firstAfter <= p.day90 ? [p.usedToday + ' used as of ' + fmtY(today()) + '. Counting each day without work from ' + fmtY(p.firstAfter) + ', day ' + RULE.unemploymentLimit + ' is ' + fmtY(p.day90) + '.'] : null });
      if (p.byEnd != null) put({ id: 'unemployment.byEnd', label: 'Days without work by ' + fmt(opt.until), source: 'unemployment', n: p.byEnd, text: p.byEnd + ' of ' + RULE.unemploymentLimit });
      /* No `none` text: whatIf fills the other side with the count up to
         and including that day (in diff), never a word like "Counted". */
      if (p.unknownFrom) put({ id: 'unemployment.unknown', label: 'Days without work', source: p.cause === 'trip' ? 'unemploymentAbroad' : 'optHours', iso: p.unknownFrom, text: 'Unknown from ' + fmt(p.unknownFrom) });
    }
    /* One row per trip, so a trip always shows and can be saved.
       Sample trip 2026-12-19 to 2027-01-09: "Dec 19 to Jan 9, 2027". */
    (rec.trips || []).forEach((x) => {
      if (!okIso(x.leave) || !okIso(x.back)) return;
      put({ id: 'trip.' + x.id, label: 'Trip', source: 'travelAbsence', text: fmt(x.leave) + ' to ' + fmt(x.back), none: 'Not on your record' });
    });
    (rec.jobs || []).forEach((j) => {
      const ch = (j.hoursChanges || []).slice().sort((a, b) => (a.on < b.on ? -1 : 1));
      put({ id: 'job.' + j.id, label: 'Job at ' + j.employer, text: 'From ' + fmt(j.start) + (okIso(j.end) ? ' to ' + fmt(j.end) : ''), none: 'Not on your record' });
      put({ id: 'job.' + j.id + '.hours', label: 'Hours a week at ' + j.employer, source: 'optHours',
        text: [j.hoursBand === 'full' ? 'At least ' + RULE.minHours : (j.hoursBand === 'part' ? 'Fewer than ' + RULE.minHours : String(j.hours))].concat(ch.map((c) => c.hours + ' from ' + fmt(c.on))).join(', then ') });
    });
    reportItems(rec, o).forEach((it) => put({ id: it.id, label: it.title, source: it.source, iso: it.due, counted: it.counted,
      text: it.made ? 'Made ' + fmt(it.made) : 'By ' + fmt(it.due), none: 'Nothing to report', sample: it.sample }));
    /* Full-time CPT, day and month readings side by side. Part-time CPT is
       not counted. Acme alone: 76 days, 2 months 15 days.
       Two or more spans: whole months add up, and the days left over are
       carried 30 to a month (a reading, said in the source sheet). Acme
       2024-06-01 to 2024-08-15 is 2 months 15 days (76 days); a planned
       2027-01-11 to 2027-05-07 is 3 months 27 days (117 days). Whole months
       2 + 3 = 5; days 15 + 27 = 42, one 30 carried, so 6 months 12 days;
       76 + 117 = 193 days. Checked with python3 on 2026-09-30. */
    const ft = (rec.cpt || []).filter((c) => c.fullTime && okIso(c.start) && okIso(c.end));
    if (ft.length) {
      const days = ft.map((c) => daysBetween(c.start, c.end) + 1);
      const mons = ft.map((c) => monthsReading(c.start, c.end));
      const totalDays = days.reduce((a, b) => a + b, 0);
      const raw = mons.reduce((a, b) => ({ months: a.months + b.months, days: a.days + b.days }), { months: 0, days: 0 });
      const carry = Math.floor(raw.days / 30);
      const total = { months: raw.months + carry, days: raw.days - carry * 30, wholeMonths: raw.months, leftoverDays: raw.days };
      put({ id: 'cpt.days', label: 'Full-time CPT, in days', source: 'cptDays', n: totalDays,
        text: days.length > 1 ? days.join(' plus ') + ' is ' + plural(totalDays, 'day') : plural(totalDays, 'day') });
      put({ id: 'cpt.months', label: 'Full-time CPT, in months', source: 'cptDays', months: total,
        text: mons.length > 1 ? mons.map(monthsText).join(' plus ') + ' is ' + monthsText(total) : monthsText(total),
        counted: mons.length > 1 ? ['Whole months: ' + mons.map((m) => m.months).join(' plus ') + ' is ' + raw.months + '. Days left over: ' +
          mons.map((m) => m.days).join(' plus ') + ' is ' + raw.days + (carry ? ', and each 30 of them is carried as one month, so ' + monthsText(total) + '.' : '.'),
        'Months differ in length, so a month of 30 days is a reading. Your DSO may count it another way.'] : null });
    }
    (rec.petitions || []).forEach((pt) => {
      const g = capGap(pt, rec);
      if (!g) return;
      /* The petition itself, so an outcome always shows as a row even when
         every date beside it is a DSO question. */
      put({ id: 'petition.' + pt.id, label: 'H-1B petition', text: 'Filed ' + fmt(pt.filed) + ', ' + (g.outcome === 'pending' ? 'pending'
        : (g.outcome === 'approved' ? 'approved' : 'denied or withdrawn') + (okIso(pt.decided) ? ' ' + fmt(pt.decided) : '')), none: 'Not on your record' });
      put({ id: 'petition.' + pt.id + '.capgap', label: 'Cap-gap end', source: g.outcome === 'denied' ? 'capGapOutcome' : 'capGap', iso: g.end, text: g.endText, none: 'None' });
      if (g.f1Ends) put({ id: 'petition.' + pt.id + '.f1', label: 'F-1 status ends', source: 'capGapStart', iso: g.f1Ends, text: fmt(g.f1Ends) + ', the day H-1B starts', none: 'No date' });
    });
    if (t) items._today = t;
    return items;
  }
  App.compute = compute;

  /* Two outputs, by item id: only what moves. A count by the card's end is
     left out once a day 90 appears (nothing is said past day 90). */
  function diff(a, b, ctx) {
    const ids = [];
    Object.keys(b).concat(Object.keys(a)).forEach((k) => { if (k.charAt(0) !== '_' && ids.indexOf(k) === -1) ids.push(k); });
    const rows = [];
    ids.forEach((id) => {
      const x = a[id], y = b[id];
      if (id === 'unemployment.byEnd' && !y && b['unemployment.day90']) return;
      if (id === 'unemployment.byEnd' && !y && b['unemployment.unknown']) return;
      /* A new job carries its hours on its own row. */
      const jobId = /^job\.(.+)\.hours$/.exec(id);
      if (jobId && !x && !a['job.' + jobId[1]]) return;
      /* While a side's count is unknown, a day 90 or a count by the card's
         end that is missing on that side is unknown too, never "None while
         you work". */
      const gone = (side, it) => (/^unemployment\.(day90|byEnd)$/.test(id) && side['unemployment.unknown'] ? 'Unknown' : ((it && it.none) || 'None'));
      let before = x ? x.text : gone(a, y);
      let after = y ? y.text : gone(b, x);
      if (/^job\.[^.]+$/.test(id) && !x && b[id + '.hours']) after += ', ' + b[id + '.hours'].text + ' hours a week';
      /* The side with no unknown day reads its own count through the first
         unknown day of the other side. Walked: Northwind 12 hours from
         2026-11-01, then Kite 10 hours alongside from 2026-11-16 (22 a week
         together, neither 20): 2026-02-14 to 02-26 is 13 days, 2026-11-01
         to 11-16 is 16 more, so "29 of 90 through Nov 16" before, and
         "Unknown from Nov 16" with the change. Checked with python3. */
      if (id === 'unemployment.unknown' && ctx && (!x || !y)) {
        const known = x ? ctx.next : ctx.base;
        const other = x ? b : a;
        const d = (x || y).iso;
        const c = known && okIso(d) ? countDays(known, d) : { used: null };
        const reached = other['unemployment.day90'];
        const said = c.used == null ? null : (c.used >= RULE.unemploymentLimit && reached ? 'Day ' + RULE.unemploymentLimit + ' on ' + reached.text : c.used + ' of ' + RULE.unemploymentLimit + ' through ' + fmt(d));
        const fall = (other['unemployment.used'] || {}).text;
        if (said || fall) { if (x) after = said || fall; else before = said || fall; }
      }
      if (before === after) return;
      const it = y || x;
      rows.push({ id: id, label: it.label, before: before, after: after, source: it.source || null, rule: ruleWith(it.source, y && y.counted), sample: !!it.sample });
    });
    /* Reports and the day-90 line first, as a student reads them. */
    const rank = (r) => (r.id.indexOf('report:') === 0 ? 0 : (r.id.indexOf('unemployment') === 0 ? 1 : 2));
    return rows.sort((p, q) => rank(p) - rank(q));
  }

  /* ---------------- cap-gap (feature 8) ---------------- */
  /* capGap({ filed, start, outcome, decided }) : the span's end from the
     row in force on the filing day. A start on or after October 1 is in the
     fiscal year that ends the next calendar year (31 U.S.C. 1102).
     Filed 2027-04-01, start 2027-10-01: fiscal year 2028, April 1 of it is
     2028-04-01; approved, the end is the earlier of that and the start,
     2027-10-01. Denied: the day of the outcome, and no date after it. */
  function capGap(p, recIn) {
    if (!p || !okIso(p.filed) || !okIso(p.start)) return null;
    const rec = recIn || record();
    const fy = +p.start.slice(0, 4) + (p.start.slice(5) >= '10-01' ? 1 : 0);
    const newRule = p.filed >= RULE.capGapNewRuleFrom;
    const limit = newRule ? fy + '-04-01' : (fy - 1) + '-10-01';
    const out = { fiscalYear: fy, limit: limit, outcome: p.outcome || 'pending', filed: p.filed, start: p.start };
    if (out.outcome === 'approved') {
      out.end = minIso(limit, p.start);
      out.f1Ends = p.start;
      out.endText = fmt(out.end) + (out.end === p.start ? ', when H-1B starts' : '');
    } else if (out.outcome === 'denied') {
      out.end = okIso(p.decided) ? p.decided : null;
      out.endText = out.end ? 'Ends ' + fmt(out.end) + ', with the outcome' : 'Ends with the outcome';
    } else {
      out.end = limit;
      out.endText = fmt(limit) + ', or the H-1B start if earlier';
    }
    const cardEnd = (stemCardOf(rec) || {}).until || (rec.opt || {}).until;
    out.cardEnd = cardEnd || null;
    out.cardEndsBeforeFiling = !!(cardEnd && cardEnd < p.filed);
    /* Card ends before the filing day: whether cap-gap covers the student
       is the DSO's question, so no end date is shown (the fiscal-year
       arithmetic stays in the source sheet, from fiscalYear and limit).
       Sample: card ends 2027-02-13, filed 2027-04-01. */
    if (out.cardEndsBeforeFiling) {
      out.end = null;
      out.endText = 'Ask your DSO';
      out.question = 'My H-1B petition was filed ' + fmtY(p.filed) + ' for a start of ' + fmtY(p.start) + ', and my EAD card ends ' + fmtY(cardEnd) + '. Does cap-gap cover me?';
    }
    return out;
  }
  App.capGap = capGap;

  /* ---------------- Try a change (feature 2) ---------------- */
  const firstOpenJob = (rec) => openJobs(rec, today())[0] || (rec.jobs || []).filter((j) => !j.end)[0] || null;
  let seq = 0;
  const PRESETS = {
    jobEnd: {
      need: ['on'],
      check(rec, c) { const j = firstOpenJob(rec); if (!j) return 'Add your job first.'; if (c.on < j.start) return 'The last day is before the job started.'; return null; },
      apply(rec, c) { const j = firstOpenJob(rec); if (j) j.end = c.on; },
    },
    newEmployer: {
      need: ['start', 'hours'],
      check(rec, c) { return Number(c.hours) > 0 ? null : 'Add the hours a week.'; },
      apply(rec, c) {
        /* Instead of the job now: it ends the day before the new one starts. */
        if (c.instead !== 'alongside') {
          (rec.jobs || []).forEach((j) => { if (j.start < c.start && (!j.end || j.end >= c.start)) j.end = addDays(c.start, -1); });
        }
        seq += 1;
        rec.jobs.push({ id: 'new' + seq, title: '', employer: (c.employer || '').trim() || 'your new employer', start: c.start, end: null,
          hours: Number(c.hours), hoursChanges: [], confirmedOn: today() });
      },
    },
    fewerHours: {
      need: ['on', 'hours'],
      check(rec, c) { const j = firstOpenJob(rec); if (!j) return 'Add your job first.'; return Number(c.hours) >= 0 && c.hours !== '' ? null : 'Add the hours a week.'; },
      apply(rec, c) { const j = firstOpenJob(rec); if (j) { j.hoursChanges = (j.hoursChanges || []).concat([{ on: c.on, hours: Number(c.hours) }]); } },
    },
    cpt: {
      need: ['start', 'end'],
      check(rec, c) { return c.end < c.start ? 'The end is before the start.' : null; },
      apply(rec, c) { seq += 1; rec.cpt.push({ id: 'planned' + seq, employer: 'Planned internship', start: c.start, end: c.end, fullTime: c.fullTime !== 'part', planned: true }); },
    },
    trip: {
      need: ['leave', 'back'],
      check(rec, c) { return c.back <= c.leave ? 'The return is on or before the day you leave.' : null; },
      apply(rec, c) { seq += 1; rec.trips.push({ id: 'trip' + seq, leave: c.leave, back: c.back, purpose: c.purpose || 'unsure' }); },
    },
    petition: {
      need: ['filed', 'start'],
      check(rec, c) {
        if (c.start <= c.filed) return 'The H-1B start is on or before the filing day.';
        if (c.outcome === 'denied' && !okIso(c.decided)) return 'Add the day of the outcome.';
        return null;
      },
      /* c.replaces: the id of a petition on the record this one takes the
         place of (Try an outcome on it), so Now reads that petition's dates
         and This happened saves what was previewed. */
      apply(rec, c) {
        const had = c.replaces && rec.petitions.some((x) => x.id === c.replaces);
        if (had) rec.petitions = rec.petitions.filter((x) => x.id !== c.replaces);
        else seq += 1;
        const outcome = c.outcome || 'pending';
        /* The same id, so each row compares this petition with itself. */
        rec.petitions.push({ id: had ? c.replaces : 'petition' + seq, filed: c.filed, start: c.start, outcome: outcome, decided: outcome === 'pending' ? null : (c.decided || null), changeOfStatus: true, confirmedOn: today() });
      },
    },
  };

  /* Facts and DSO questions that are not a moved item: dates only, and
     every judgement as a question in the student's words. */
  function extras(kind, base, next, c, o) {
    const facts = [], questions = [];
    const rec = base;
    if (kind === 'trip') {
      const sig = rec.travelSignature && okIso(rec.travelSignature.signed) ? addMonths(rec.travelSignature.signed, RULE.signatureMonths) : null;
      /* 2026-03-02 + 6 months = 2026-09-02. */
      /* Ran out 2026-09-02, before today 2026-09-30: "covered", as Documents says. */
      if (sig) facts.push({ text: 'Your travel signature ' + (sig < today() ? 'covered' : 'covers') + ' returns until ' + fmt(sig) + '. You return ' + fmt(c.back) + '.', source: 'travelSignature' });
      const card = stemCardOf(rec, o) || rec.opt;
      /* EAD ends 2027-02-13; the sample return is 2027-01-09. */
      if (card && okIso(card.until)) facts.push({ text: 'Your EAD card ends ' + fmt(card.until) + '. You return ' + fmt(c.back) + '.', source: 'eadEnds' });
      /* 2026-12-19 to 2027-01-09 is 21 days; 2026-12-19 + 5 months = 2027-05-19. */
      facts.push({ text: plural(daysBetween(c.leave, c.back), 'day') + ' away. Five months from ' + fmt(c.leave) + ' is ' + fmt(addMonths(c.leave, RULE.absenceMonths)) + '.', source: 'travelAbsence' });
      const pp = rec.passport, vi = rec.visa;
      if (pp && okIso(pp.expires)) facts.push({ text: 'Passport valid until ' + fmt(pp.expires) + '.', sample: !!pp.sample });
      if (vi && okIso(vi.expires)) facts.push({ text: 'F-1 visa valid until ' + fmt(vi.expires) + '.', sample: !!vi.sample });
      if (c.purpose === 'unsure') questions.push('I plan to be away from ' + fmtY(c.leave) + ' to ' + fmtY(c.back) + '. Do those days count as days without work?');
      if (sig && c.back > sig) questions.push('My travel signature is dated ' + fmtY(rec.travelSignature.signed) + '. Can I get a new one before I leave on ' + fmtY(c.leave) + '?');
      if ((rec.petitions || []).some((p) => p.outcome === 'pending' && p.changeOfStatus)) questions.push('My H-1B petition with a change of status is pending. What happens if I travel while it is pending?');
      questions.push('I plan to travel from ' + fmtY(c.leave) + ' to ' + fmtY(c.back) + '. Is there anything I should check or carry before I go?');
    }
    if (kind === 'petition') {
      const g = capGap({ filed: c.filed, start: c.start, outcome: c.outcome, decided: c.decided }, rec);
      if (g) {
        facts.push({ text: 'Days without work keep counting through cap-gap.', source: 'capGapUnemployment' });
        if (g.cardEndsBeforeFiling) facts.push({ text: 'Your EAD card ends ' + fmt(g.cardEnd) + ', before the filing day, ' + fmt(c.filed) + '.', source: 'eadEnds' });
        if (g.outcome === 'denied') facts.push({ text: 'No later date is worked out after the outcome.', source: 'capGapOutcome' });
        questions.push('My H-1B petition was filed ' + fmtY(c.filed) + ' for a start of ' + fmtY(c.start) + (g.cardEnd ? ', and my EAD card ends ' + fmtY(g.cardEnd) : '') + '. Does cap-gap cover me?');
        if (g.outcome === 'denied') questions.push('My H-1B petition ended with a denial or withdrawal on ' + fmtY(c.decided) + '. What are my dates now?');
      }
    }
    if (kind === 'cpt') {
      if (c.fullTime === 'part') facts.push({ text: 'Part-time CPT is not counted toward the year.', source: 'cptDays' });
      const n = compute(next, o);
      const days = n['cpt.days'], mons = n['cpt.months'];
      if (days && mons) {
        const dayReach = days.n >= RULE.cptBarDays;
        const monReach = mons.months.months >= RULE.cptBarMonths;
        /* Leftover days could add a month on one reading and not another. */
        const unclear = !monReach && mons.months.months + Math.floor(mons.months.days / 28) >= RULE.cptBarMonths;
        if (dayReach !== monReach || unclear) {
          questions.push('My full-time CPT comes to ' + days.text.replace(/^.* is /, '') + ' counted in days, or ' + mons.text.replace(/^.* is /, '') + ' counted in months. Does that reach one year?');
        }
      }
      if (rec.program && okIso(rec.program.end) && c.start > rec.program.end) {
        questions.push('My program ended ' + fmtY(rec.program.end) + '. Can I take an internship starting ' + fmtY(c.start) + ' as CPT?');
      }
    }
    if (kind === 'newEmployer' || kind === 'fewerHours' || kind === 'jobEnd') {
      const n = compute(next, o);
      if (n['unemployment.unknown']) {
        questions.push('From ' + n['unemployment.unknown'].text.replace('Unknown from ', '') + ' my jobs add up to 20 hours a week or more, but no one job does. Do those days count as days without work?');
      }
    }
    return { facts: facts, questions: questions };
  }

  /* App.whatIf({ kind, ...inputs }, { stemCard? }) : copy the record, add
     the one change, work everything out again with the same today and the
     same rules, and keep only what moves. Never saves. */
  function whatIf(change, o) {
    const c = Object.assign({}, change || {});
    const p = PRESETS[c.kind];
    if (!p) return { ok: false, kind: c.kind, missing: ['kind'], rows: [], facts: [], questions: [] };
    const missing = p.need.filter((k) => (k === 'hours' ? c[k] === '' || c[k] == null || isNaN(Number(c[k])) : !okIso(c[k])));
    if (c.kind === 'trip' && !c.purpose) c.purpose = 'unsure';
    if (missing.length) return { ok: false, kind: c.kind, missing: missing, rows: [], facts: [], questions: [] };
    const base = record();
    const problem = p.check(base, c);
    if (problem) return { ok: false, kind: c.kind, problem: problem, rows: [], facts: [], questions: [] };
    const next = clone(base);
    next.jobs = next.jobs || []; next.cpt = next.cpt || []; next.trips = next.trips || []; next.petitions = next.petitions || [];
    p.apply(next, c);
    const rows = diff(compute(base, o), compute(next, o), { base: base, next: next });
    const ex = extras(c.kind, base, next, c, o);
    return { ok: true, kind: c.kind, change: c, rows: rows, facts: ex.facts, questions: ex.questions, record: next };
  }
  App.whatIf = whatIf;

  /* "This happened": the change goes on the record, with Undo. */
  function applyChange(change, o) {
    const res = whatIf(change, o);
    if (!res.ok) return res;
    undoStack.push(clone(record()));
    REC = res.record;
    emit('record', change.kind, change, null);
    render('inplace');
    toast((data.change || {}).saved || 'Saved to your record', { action: 'Undo', onAction: undoRecord });
    return res;
  }
  function undoRecord() {
    if (!undoStack.length) return false;
    REC = undoStack.pop();
    emit('record', 'undo', null, null);
    render('inplace');
    return true;
  }
  App.applyChange = applyChange;
  App.undoRecord = undoRecord;

  /* ---------------- check-in answers ---------------- */
  App.checkin = () => checkins()[0] || null;
  App.checkins = () => checkins();
  App.countAsOf = () => countAsOf(record());
  const checkinUndo = {};
  App.answerCheckin = (id, ans) => {
    const rec = record();
    const [kind, key] = String(id).split(':');
    const list = kind === 'job' ? rec.jobs : rec.petitions;
    const it = (list || []).filter((x) => x.id === key)[0];
    if (!it) return;
    const evId = 'checkin-yes:' + key + ':' + today();
    if (ans === 'undo') {
      if (checkinUndo[id]) it.confirmedOn = checkinUndo[id];
      delete checkinUndo[id];
      /* Undo takes back the Still at event this answer added. */
      if (kind === 'job' && Array.isArray(rec.events)) rec.events = rec.events.filter((x) => x.id !== evId || x.via !== 'answer');
    } else {
      checkinUndo[id] = it.confirmedOn;
      it.confirmedOn = today();
      if (kind === 'job') {
        const ev = sync(rec);
        if (!ev.some((x) => x.id === evId)) ev.push({ id: evId, kind: 'checkinYes', on: today(), jobId: it.id, employer: it.employer, hoursText: hoursText(it, today()), logged: today(), via: 'answer' });
      }
    }
    emit('checkin', id, ans, null);
  };
  App.checkinAnswered = (id) => !!checkinUndo[id];

  /* ---------------- file-by date (feature 1) ---------------- */
  /* App.fileBy('opt' | 'stem', { recommended? }) : the last day is the
     earliest of each limit; the opening day is never a candidate for it.
     A filed application (a receipt) stops the clock.
       opt   opens 2025-12-18 - 90 = 2025-09-19
             recommended 2025-10-03 + 30 = 2025-11-02   sets the day
             program end 2025-12-18 + 60 = 2026-02-16
             filed 2025-10-10
       stem  opens 2027-02-13 - 90 = 2026-11-15
             card end 2027-02-13; recommendation + 60 once it is added */
  function fileBy(path, o) {
    const rec = record();
    const opt = o || {};
    let opens, cands = [], filed = null, needs = null;
    if (path === 'opt') {
      const end = rec.program && rec.program.end;
      if (!okIso(end)) return null;
      opens = addDays(end, -RULE.optBefore);
      const recd = opt.recommended || (rec.opt || {}).recommended;
      if (okIso(recd)) cands.push({ key: 'recommendation', label: 'Within 30 days of your recommendation', iso: addDays(recd, RULE.optFileAfterRec), source: 'optFileBy' });
      else needs = { action: 'Add the date your school recommends you', rest: 'to see your exact last day to file.', href: '#/case/recommended' };
      cands.push({ key: 'program', label: 'Within 60 days of your program end', iso: addDays(end, RULE.optAfter), source: 'optFileBy' });
      filed = (rec.opt || {}).filed || null;
    } else if (path === 'stem') {
      const until = rec.opt && rec.opt.until;
      if (!okIso(until)) return null;
      opens = addDays(until, -RULE.stemBefore);
      cands.push({ key: 'card', label: 'Before your EAD card ends', iso: until, source: 'stemCloses' });
      const recd = opt.recommended || (rec.stem || {}).recommended;
      /* For example, recommended 2026-12-01: + 60 = 2027-01-30, earlier than
         2027-02-13, so it would set the day. */
      if (okIso(recd)) cands.push({ key: 'recommendation', label: 'Within 60 days of your recommendation', iso: addDays(recd, RULE.stemFileAfterRec), source: 'within60' });
      else needs = { action: 'Add the date your school recommends you', rest: 'to see your exact last day to file.', href: '#/case/recommended' };
      filed = (rec.stem || {}).filed || null;
    } else return null;
    const last = cands.map((x) => x.iso).sort()[0];
    /* Dates across two years all carry their year. */
    const F = [opens].concat(cands.map((x) => x.iso), filed ? [filed] : []).some((d) => d.slice(0, 4) !== today().slice(0, 4)) ? fmtY : fmt;
    cands.forEach((x) => { x.sets = x.iso === last; x.text = F(x.iso); });
    /* The ⓘ: each limit, the one that sets the day marked. */
    const info = ['Window opens ' + F(opens) + '.'].concat(cands.map((x) => x.label + ': ' + x.text + (x.sets ? ', which sets the day.' : '.')))
      .concat(needs ? ['Within ' + (path === 'opt' ? RULE.optFileAfterRec : RULE.stemFileAfterRec) + ' days of your recommendation: add its date to see it.'] : [])
      .concat(filed ? ['You filed ' + F(filed) + '. Your receipt stopped the clock.'] : []).join(' ');
    return {
      info: info,
      path: path, opens: opens, opensText: F(opens), last: last, lastText: F(last),
      line: 'File your I-765 by ' + F(last), candidates: cands,
      filed: filed, filedText: filed ? F(filed) : null, stopped: !!filed,
      passed: last < today(), needs: needs,
    };
  }
  App.fileBy = fileBy;

  /* ---------------- document watch (feature 6) ---------------- */
  /* Today 2026-09-30:
       travel signature 2026-03-02 + 6 months = 2026-09-02, passed
       EAD card 2027-02-13, 136 days on: next to run out
       F-1 visa 2028-08-01 (sample), passport 2031-07-09 (sample)
       program ended 2025-12-18 */
  function documentWatch() {
    const rec = record();
    const t = today();
    const close = (data.watch || {}).closeDays || 30;
    const items = [];
    const add = (it) => {
      if (!okIso(it.iso)) return;
      const left = daysBetween(t, it.iso);
      items.push(Object.assign(it, { daysLeft: left, passed: left < 0, close: left >= 0 && left <= close }));
    };
    const ts = rec.travelSignature;
    if (ts && okIso(ts.signed)) {
      const until = addMonths(ts.signed, RULE.signatureMonths);
      add({ key: 'travelSignature', title: 'Travel signature', iso: until, doc: ts.doc, source: 'travelSignature',
        line: (until < t ? 'Covered returns until ' : 'Covers returns until ') + fmt(until) });
    }
    const s = rec.stem && rec.stem.card;
    if (s) add({ key: 'stemCard', title: 'STEM OPT card', iso: s.until, source: 'eadEnds', line: 'Valid until ' + fmt(s.until) });
    if (rec.opt) add({ key: 'ead', title: 'EAD card', iso: rec.opt.until, doc: rec.opt.doc, source: 'eadEnds', line: (rec.opt.until < t ? 'Ended ' : 'Valid until ') + fmt(rec.opt.until) });
    if (rec.visa) add({ key: 'visa', title: rec.visa.title || 'Visa', iso: rec.visa.expires, doc: rec.visa.doc, sample: !!rec.visa.sample, line: 'Valid until ' + fmt(rec.visa.expires) });
    if (rec.passport) add({ key: 'passport', title: 'Passport', iso: rec.passport.expires, doc: rec.passport.doc, sample: !!rec.passport.sample, line: 'Valid until ' + fmt(rec.passport.expires) });
    if (rec.program) add({ key: 'program', title: 'Program', iso: rec.program.end, doc: rec.program.doc, line: (rec.program.end < t ? 'Ended ' : 'Ends ') + fmt(rec.program.end) });
    items.sort((a, b) => (a.iso < b.iso ? -1 : 1));
    const nx = items.filter((i) => !i.passed)[0] || null;
    return {
      title: (data.watch || {}).title || 'Next to run out',
      next: nx ? { key: nx.key, title: nx.title, iso: nx.iso, daysLeft: nx.daysLeft, close: nx.close, text: nx.title + ', ' + fmt(nx.iso), sample: nx.sample } : null,
      items: items.filter((i) => !i.passed).concat(items.filter((i) => i.passed).reverse()),
    };
  }
  App.documentWatch = documentWatch;

  /* ---------------- from your paper (D74) ---------------- */
  /* App.fedValue(key) : the computed value a paper field fed.
       eadEnds          2027-02-13
       stemOpens        2027-02-13 - 90 = 2026-11-15
       stemCloses       2027-02-13
       startPreparing   2026-11-15 - 1 month = 2026-10-15 (a planning date)
       unemployment     13 of 90
       optFileBy        2025-10-03 + 30 = 2025-11-02
       optFileByLatest  2025-12-18 + 60 = 2026-02-16
       travelSignature  2026-03-02 + 6 months = 2026-09-02
       cptDays          76 days */
  function fedValue(key) {
    const rec = record();
    const until = rec.opt && rec.opt.until;
    switch (key) {
      case 'eadEnds': return { label: 'EAD valid until', text: fmtY(until) };
      case 'stemOpens': return { label: 'Window opens', text: fmtY(addDays(until, -RULE.stemBefore)) };
      case 'stemCloses': return { label: 'Last day to file', text: fmtY(until) };
      case 'startPreparing': return { label: 'Start preparing', text: fmtY(addMonths(addDays(until, -RULE.stemBefore), -1)) };
      case 'unemployment': { const u = compute(rec)['unemployment.used']; return { label: 'Days without work', text: u ? u.text : '' }; }
      case 'optFileBy': { const f = fileBy('opt'); const c = f && f.candidates.filter((x) => x.key === 'recommendation')[0]; return { label: 'File by', text: c ? fmtY(c.iso) : '' }; }
      case 'optFileByLatest': { const f = fileBy('opt'); const c = f && f.candidates.filter((x) => x.key === 'program')[0]; return { label: 'Latest day to file', text: c ? fmtY(c.iso) : '' }; }
      case 'travelSignature': { const s = rec.travelSignature; return { label: 'Covers returns until', text: s ? fmtY(addMonths(s.signed, RULE.signatureMonths)) : '' }; }
      case 'cptDays': { const c = compute(rec)['cpt.days']; return { label: 'Full-time CPT', text: c ? plural(c.n, 'day') : '' }; }
      default: return null;
    }
  }
  App.fedValue = fedValue;
  App.fromPaper = (sourceKey) => (((data.paperFields || {})[sourceKey]) || []).map((f) => {
    const rec = record();
    const v = getPath(rec, f.path);
    const e = f.pathEnd ? getPath(rec, f.pathEnd) : null;
    return {
      paper: f.paper, field: f.field,
      value: okIso(v) ? (okIso(e) ? fmt(v, { year: true }).replace(/, \d{4}$/, '') + ' to ' + fmtY(e) : fmtY(v)) : String(v == null ? '' : v),
      fed: fedValue(f.fed), href: f.doc ? '#/documents/' + f.doc : null,
    };
  });

  /* ---------------- the one-page summary (feature 7) ---------------- */
  /* App.summary('employer' | 'dso' | 'attorney', { show }) : a fixed
     template over the record and the computed items. Names and numbers
     read "Hidden" until show is true. No conclusion; judgement items are
     open questions. The employer page makes no I-9 claim. */
  function summary(who, o) {
    const cfg = data.sharePack || {};
    const pick = (cfg.for || []).filter((f) => f.value === who)[0] || (cfg.for || [])[0];
    if (!pick) return null;
    const show = !!(o && o.show);
    const hidden = cfg.hidden || 'Hidden';
    const rec = record();
    const st = data.student || {};
    const t = today();
    const items = compute(rec);
    const onStem = cardOn(rec, t) === 'stem';
    const P = {
      status: { label: 'Status', lines: [
        'Name: ' + (show ? st.name : hidden),
        'SEVIS ID: ' + (show ? st.sevisId : hidden),
        'F-1, on ' + (onStem ? 'STEM OPT' : (rec.opt ? rec.opt.category.charAt(0).toLowerCase() + rec.opt.category.slice(1) : 'a program')),
      ] },
      program: { label: 'Program', lines: rec.program ? [rec.program.level + ' in ' + rec.program.major + ', ' + rec.program.school + ', ' + fmtY(rec.program.start) + ' to ' + fmtY(rec.program.end)] : [] },
      cpt: { label: 'Internships (CPT)', lines: (rec.cpt || []).map((c) => c.employer + ', ' + fmtY(c.start) + ' to ' + fmtY(c.end) + ', ' + (c.fullTime ? 'full time' : 'part time')) },
      card: { label: 'Work permit', lines: rec.opt ? [
        rec.opt.category + ', category ' + rec.opt.code + ', ' + fmtY(rec.opt.from) + ' to ' + fmtY(rec.opt.until),
        'Receipt number: ' + (show ? rec.opt.receipt : hidden),
      ] : [] },
      job: { label: 'Job', lines: (rec.jobs || []).map((j) => [j.title, j.employer].filter(Boolean).join(', ') + ', ' + (j.end ? fmtY(j.start) + ' to ' + fmtY(j.end) : 'since ' + fmtY(j.start)) + (hoursText(j, t) ? ', ' + hoursText(j, t) : '')) },
      travel: { label: 'Travel documents', lines: [
        /* Sample values say so on the shared page too. */
        rec.passport ? 'Passport valid until ' + fmtY(rec.passport.expires) + (rec.passport.sample ? ' (sample)' : '') : null,
        rec.visa ? (rec.visa.title || 'Visa') + ' valid until ' + fmtY(rec.visa.expires) + (rec.visa.sample ? ' (sample)' : '') : null,
        rec.travelSignature ? 'Travel signature dated ' + fmtY(rec.travelSignature.signed) : null,
      ].filter(Boolean) },
      trips: { label: 'Trips', lines: (rec.trips || []).length ? rec.trips.map((x) => fmtY(x.leave) + ' to ' + fmtY(x.back)) : ['None on record'] },
      petitions: { label: 'Petitions', lines: (rec.petitions || []).length ? rec.petitions.map((p) => 'H-1B, filed ' + fmtY(p.filed) + ', start ' + fmtY(p.start) + ', ' + p.outcome) : ['None on record'] },
      reports: { label: 'Reports made', lines: reportItems(rec).filter((r) => r.made).map((r) => (r.what || r.title) + ', marked made ' + fmtY(r.made)) },
      counts: { label: 'Counts', lines: items['unemployment.used'] ? ['Days without work: ' + items['unemployment.used'].text + ', as of ' + fmtY(items['unemployment.used'].asOf)] : [] },
      questions: { label: 'Open questions', lines: (function () {
        const q = [];
        (rec.trips || []).forEach((x) => { const r = extras('trip', rec, rec, x); r.questions.forEach((s) => q.push(s)); });
        (rec.petitions || []).forEach((p) => { const r = extras('petition', rec, rec, p); r.questions.forEach((s) => q.push(s)); });
        return q.length ? q : ['None open'];
      })() },
    };
    const sections = pick.parts.map((k) => P[k]).filter((s) => s && s.lines.length);
    const title = 'Summary of my F-1 record';
    const meta = 'Prepared ' + fmtY(t) + ' for my ' + (pick.value === 'dso' ? 'DSO' : pick.label.toLowerCase());
    const text = [title, meta, ''].concat(sections.map((s) => s.label + '\n' + s.lines.map((l) => '  ' + l).join('\n'))).join('\n') + '\n\n' + (cfg.footer || '');
    const partNames = sections.map((s) => s.label.toLowerCase());
    const holds = fill(cfg.holds, {
      parts: partNames.length > 1 ? partNames.slice(0, -1).join(', ') + ' and ' + partNames[partNames.length - 1] : partNames[0] || '',
      names: show ? cfg.namesShown : cfg.namesHidden,
    });
    return { who: pick.value, label: pick.label, title: title, meta: meta, sections: sections, footer: cfg.footer, text: text, holds: holds, docs: pick.docs.slice(), show: show };
  }
  App.summary = summary;

  Object.assign(App._, { fmtIso: fmt, record: record, compute: compute });
})();
