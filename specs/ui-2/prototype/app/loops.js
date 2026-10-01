/* app/loops.js: the Loop, Duly's one building block (BLUEPRINT section 2, D75).

   Every question or life event is a loop carried to a confirmed outcome.
   The Playbooks are data (DULY_SAMPLE.loops); this file runs them. Nothing
   here writes a sentence: every word comes from a reviewed template in
   data.js, and every date and count in a hole comes from the engine stand-in
   (App.compute, App.fileBy, App.reportsOwed, App.dates in app/record.js).
   No AI model (D77): Ask is matched on the device by phrases.

   States (internal, never on screen): open, asking, planned, waiting
   (until a date, an event or a person), confirming, closed, dismissed.
   Reopened is an event. The student sees only "Needs you",
   "Waiting on X until <date>" or "Done <date>" (App.loops.seen).

   Public, App.loops:
     start(kind, context?)        open a loop (or return the open one for the
                                  same kind and context); logs "Opened"
     answer(id, key, value)       fill one field; no transition, nothing saved
     take(id, exitKey, values?)   take an exit by key: saves, moves, receipt
     plan(id, values?)            take the exit that leads to a planned step
     wait(id, values?)            take the exit that leads to a waiting step
     confirm(id, exitKey?, values?) take an exit the student confirms (by)
     close(id, { by, outcome, receipt })  refused without by 'student' or
                                  'fact': planned is not closed (rule 4)
     dismiss(id)                  refused when the playbook has a dated
                                  obligation not met (rule 5)
     reopen(id, reasonKey)        a closed loop back to its first step, with
                                  the stated reason in the record
     undo(id)                     a compensating event for the last action
     get(id), list(o?), defs(), def(kind), bind(loop), view(loop), seen(loop)
     schedule(o?)                 the follow-up scheduler (BLUEPRINT 2.4):
                                  { guaranteed, budgeted, cut, pending, digest }
     runTimers(asOf)              fire every due timer as of a date (the
                                  prototype's way to move time; tests)
     setClock(iso|null), now()    the loops' today; DULY_SAMPLE.today by default
     whatsNext(o?)                Today, slot 2: at most three open loops,
                                  earliest engine date first, and the overflow
     match(text)                  Ask in v1: crisis phrases first, then guides
     situations()                 the browsable library of loops
     footprint()                  Your record entries written by loops
   Every transition is written to App.record().footprint (not for a private
   loop: the crisis screen leaves nothing behind) and announced as
   'duly:change' kind 'loop' (key: loop id, value: the student-facing state). */

(function () {
  'use strict';

  const App = window.App;
  const data = App.data;
  const _ = App._;
  const L = data.loops || {};
  const S = L.settings || {};
  const RULE = () => App.RULE || {};
  const Dt = () => App.dates;
  const emit = (...a) => { if (typeof _.emit === 'function') _.emit(...a); else if (typeof App.emit === 'function') App.emit(...a); };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const okIso = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const FINAL = L.final || ['closed', 'dismissed'];

  /* ---------------- clock ---------------- */
  let clock = null;
  const now = () => clock || data.today.iso;
  const fmt = (iso) => (okIso(iso) ? Dt().fmt(iso) : '');
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const fmtLong = (iso) => (okIso(iso) ? MONTHS[+iso.slice(5, 7) - 1] + ' ' + (+iso.slice(8, 10)) + ', ' + iso.slice(0, 4) : '');
  const addDays = (iso, n) => Dt().addDays(iso, n);
  const addMonths = (iso, n) => Dt().addMonths(iso, n);
  const addBusinessDays = (iso, n) => Dt().addBusinessDays(iso, n).iso;
  const daysBetween = (a, b) => Dt().daysBetween(a, b);

  /* ---------------- definitions ---------------- */
  const defCache = {};
  function def(kind) {
    if (defCache[kind]) return defCache[kind];
    const pb = (L.playbooks || {})[kind];
    if (!pb) return null;
    const shared = (pb.uses || []).map((u) => ((L.shared || {})[u]) || {});
    const steps = Object.assign.apply(null, [{}].concat(shared, [pb.steps || {}]));
    defCache[kind] = Object.assign({ kind: kind }, pb, { steps: steps });
    return defCache[kind];
  }
  const defs = () => Object.keys(L.playbooks || {}).map(def);

  /* ---------------- templates ---------------- */
  /* pick(tpl, text): a template, or a list of them; the first whose holes
     are all filled. '' hides. null when none can be filled. */
  function fill1(t, text) {
    let missing = false;
    const out = String(t).replace(/\{(\w+)\}/g, (m, k) => {
      const v = text[k];
      if (v == null || v === '') { missing = true; return m; }
      return String(v);
    });
    return missing ? null : out;
  }
  function pick(tpl, text) {
    if (tpl == null) return null;
    const list = Array.isArray(tpl) ? tpl : [tpl];
    for (let i = 0; i < list.length; i += 1) {
      const r = fill1(list[i], text);
      if (r != null) return r;
    }
    return null;
  }
  const lowerFirst = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
  /* "I-20" and "SEVIS" keep their case. */
  const lowerName = (s) => (/^[A-Z][a-z]/.test(s || '') ? lowerFirst(s) : s);

  /* ---------------- the record ---------------- */
  const rec = () => App.record();
  function hoursOn(job, iso) {
    let h = job.hours;
    (job.hoursChanges || []).slice().sort((a, b) => (a.on < b.on ? -1 : 1)).forEach((c) => { if (c.on <= iso) h = c.hours; });
    return h;
  }
  function jobOf(lp, r) {
    const jobs = (r || rec()).jobs || [];
    return jobs.filter((j) => j.id === (lp.context || {}).jobId)[0] || jobs.filter((j) => !j.end)[0] || jobs[0] || null;
  }
  function docTitle(id) {
    const d = data.documents || {};
    const all = [].concat(...(d.i20Groups || []).map((g) => g.items || []), d.work || [], d.identity || [], d.school || []);
    return all.filter((x) => x.id === id)[0] || null;
  }

  /* ---------------- binders: the holes, from the engine ---------------- */
  /* Each returns { iso: {fact: date}, text: {hole: string}, flags: {name: bool} }.
     Sample values for Priya are worked out in the LOOPS comment in data.js. */
  function common(lp) {
    const r = rec();
    const st = data.student || {};
    const t = now();
    const cur = curStep(lp);
    const personWait = cur && cur.state === 'waiting' && cur.who === 'person' && lp.timerAt;
    const R = RULE();
    return {
      iso: { today: t },
      text: {
        today: fmt(t), name: st.name, sevisId: st.sevisId, school: st.school || (r.program || {}).school,
        /* 2026-09-30 + 5 business days = 2026-10-07 (no holiday between). */
        dsoReplyBy: fmt(personWait ? lp.timerAt : addBusinessDays(t, S.dsoReplyBusinessDays || 5)),
        /* 2026-09-30 + 14 = 2026-10-14. */
        nextCheck: fmt(addDays(t, S.checkinDays || 14)),
        limit: R.unemploymentLimit, minHours: R.minHours, withinDays: R.stemFileAfterRec,
        signatureMonths: R.signatureMonths, absenceMonths: R.absenceMonths,
        question: (lp.values || {}).question,
      },
      flags: {},
    };
  }

  const BIND = {
    'job-ends': function (lp, b) {
      const r = rec();
      const v = lp.values;
      const job = jobOf(lp, r);
      if (!job) return;
      const R = RULE();
      b.text.employer = job.employer;
      const lastDay = okIso(v.lastDay) ? v.lastDay : (okIso(job.end) ? job.end : null);
      /* The record as it would be with what the student has typed so far. */
      const hyp = clone(r);
      const hj = hyp.jobs.filter((j) => j.id === job.id)[0];
      if (lastDay) { hj.end = lastDay; b.iso.lastDay = lastDay; b.text.lastDay = fmt(lastDay); b.text.lastDayLong = fmtLong(lastDay); }
      /* Jobs still held on the last day, or today until a last day is
         picked: an ended job (Northwind, once a new job is reopened) is
         not "another job on your record". */
      const others = hyp.jobs.filter((j) => j.id !== job.id && (!j.end || j.end >= (lastDay || now())));
      if (others.length) b.text.otherJobs = others.map((j) => j.employer).join(', ');
      if (v.newEmployer) b.text.newEmployer = v.newEmployer;
      if (okIso(v.newStart)) b.text.newStart = fmt(v.newStart);
      const newJob = lp.context.newJobId ? null
        : (v.newEmployer && okIso(v.newStart) && v.newHours === 'full'
          ? { id: 'preview', employer: v.newEmployer, start: v.newStart, end: null, hours: R.minHours, hoursChanges: [], confirmedOn: now() } : null);
      if (newJob) hyp.jobs.push(newJob);
      const c = App.compute(hyp);
      /* Job ends 2026-10-31: report:job-end:northwind is 2026-10-31 + 10 = 2026-11-10. */
      const report = c['report:job-end:' + job.id];
      if (report && okIso(report.iso)) {
        b.iso.reportDue = report.iso;
        b.text.reportDue = fmt(report.iso);
        /* 2026-11-10 - 3 = 2026-11-07. */
        b.iso.reportLead = addDays(report.iso, -(S.deadlineLeadDays || 3));
        b.text.reportLead = fmt(b.iso.reportLead);
      }
      const used = c['unemployment.used'];
      if (used && used.n != null) { b.text.used = String(used.n); b.iso.asOf = used.asOf; b.text.asOf = fmt(used.asOf); }
      else if (used) { b.iso.asOf = used.asOf; b.text.asOf = fmt(used.asOf); }
      /* 13 used before Northwind; from 2026-11-01, day 90 is 2027-01-16. */
      const d90 = c['unemployment.day90'];
      if (d90 && okIso(d90.iso)) { b.iso.day90 = d90.iso; b.text.day90 = fmt(d90.iso); }
      const byEnd = c['unemployment.byEnd'];
      if (byEnd && byEnd.n != null) b.text.byEnd = String(byEnd.n);
      b.text.cardEnd = fmt((r.opt || {}).until);
      /* A new job from 2026-11-20 at 20 hours or more: 13 + 19 = 32. */
      if (v.newHours === 'full' && byEnd && byEnd.n != null && !d90) b.text.stoppedAt = String(byEnd.n);
      const nl = data.loops.playbooks['job-ends'].newJobLines || {};
      if (v.newHours === 'full') b.text.newJobLine = pick(nl.full, Object.assign({}, b.text)) || '';
      else if (v.newHours === 'part') b.text.newJobLine = pick(nl.part, b.text) || '';
      else if (v.newHours === 'unsure') b.text.newJobLine = pick(nl.unsure, b.text) || '';
      const made = (r.made || {})['report:job-end:' + job.id];
      if (made) { b.text.made = fmt(made); b.flags.made = true; }
      const school = (r.program || {}).careerPage;
      if (school) b.text.careerPage = school;
    },

    travel: function (lp, b) {
      const r = rec();
      const v = lp.values;
      const R = RULE();
      const d = def('travel');
      const leave = okIso(v.leave) ? v.leave : null;
      const back = okIso(v.returned) ? v.returned : (okIso(v.back) ? v.back : null);
      if (leave && back && back <= leave) b.invalid = { back: 'The return comes after the day you leave.' };
      if (leave) {
        b.iso.leave = leave; b.text.leave = fmt(leave); b.text.leaveLong = fmtLong(leave);
        /* 2026-12-19 + 5 months = 2027-05-19. */
        b.iso.fiveMonths = addMonths(leave, R.absenceMonths); b.text.fiveMonths = fmt(b.iso.fiveMonths);
        /* 2026-12-19 - 21 = 2026-11-28; - 2 = 2026-12-17. */
        b.iso.firstAsk = addDays(leave, -(S.travelFirstAskDays || 21)); b.text.firstAsk = fmt(b.iso.firstAsk);
        b.iso.lastAsk = addDays(leave, -(S.travelLastAskDays || 2)); b.text.lastAsk = fmt(b.iso.lastAsk);
      }
      if (back) { b.iso.back = back; b.text.back = fmt(back); b.text.backLong = fmtLong(back); }
      if (okIso(v.returned)) b.text.returned = fmt(v.returned);
      /* 2026-12-19 to 2027-01-09: 21 days away. */
      if (leave && back && back > leave) b.text.daysAway = String(daysBetween(leave, back));
      const sig = (r.travelSignature || {}).signed;
      if (okIso(sig)) {
        b.text.signed = fmt(sig); b.text.signedLong = fmtLong(sig);
        /* 2026-03-02 + 6 months = 2026-09-02, before a return on 2027-01-09. */
        b.iso.signatureUntil = addMonths(sig, R.signatureMonths); b.text.signatureUntil = fmt(b.iso.signatureUntil);
        b.flags.signatureCovers = !!back && back <= b.iso.signatureUntil;
      }
      const card = (r.stem && r.stem.card && r.stem.card.until) || (r.opt || {}).until;
      if (okIso(card)) { b.text.cardEnd = fmt(card); b.flags.cardCovers = !!back && back <= card; }
      if (r.passport) b.text.passportUntil = fmt(r.passport.expires);
      if (r.visa) b.text.visaUntil = fmt(r.visa.expires);
      const purposes = ((data.change || {}).purposes) || [];
      const p = purposes.filter((x) => x.value === v.purpose)[0];
      if (p) b.text.purposeLabel = p.label;
      b.flags.purposeCounts = v.purpose === 'other' || v.purpose === 'unsure';
      b.text.folderCount = String((d.carry || []).length);
    },

    'stem-filing': function (lp, b) {
      const r = rec();
      const v = lp.values;
      const recd = okIso(v.recommended) ? v.recommended : (r.stem || {}).recommended;
      const fb = App.fileBy('stem', { recommended: recd || undefined });
      if (fb) {
        b.iso.opens = fb.opens; b.text.opens = fmt(fb.opens);
        b.iso.last = fb.last; b.text.last = fmt(fb.last);
        /* 2027-02-13 - 3 = 2027-02-10; recommended 2026-12-01: 2027-01-30 - 3 = 2027-01-27. */
        b.iso.lastLead = addDays(fb.last, -(S.deadlineLeadDays || 3)); b.text.lastLead = fmt(b.iso.lastLead);
        /* Card end 2027-02-13 sets the day until a recommendation is added;
           recommended 2026-12-01 + 60 = 2027-01-30 then sets it. */
        const setter = (fb.candidates || []).filter((x) => x.sets)[0];
        const lb = data.loops.playbooks['stem-filing'].lastBy || {};
        if (setter) b.text.lastBy = pick(lb[setter.key], b.text);
        /* 2026-11-15 - 1 month = 2026-10-15 (a planning date, startPreparing). */
        b.iso.prepare = addMonths(fb.opens, -1); b.text.prepare = fmt(b.iso.prepare);
      }
      if (okIso(recd)) b.text.recommended = fmt(recd);
      const sf = App.stemField ? App.stemField() : (data.stemField || {});
      if (sf && sf.state === 'confirmed' && sf.onList) b.text.cip = sf.cip;
      const emp = App.employer ? App.employer() : data.employer;
      if (emp) {
        b.text.employer = emp.name;
        if (emp.everify && emp.everify.state === 'participates') b.text.everifyChecked = emp.everify.checked;
      }
      b.text.cardUntil = fmt((r.opt || {}).until);
      const rc = v.receipt || (r.stem || {}).receipt;
      if (rc) b.text.receipt = App.normalizeReceipt ? App.normalizeReceipt(rc) : rc;
      if (okIso((r.stem || {}).filed)) b.text.filed = fmt(r.stem.filed);
      /* The filing day is the one the student typed, never today by
         default. Before the window opens (2027-02-13 - 90 = 2026-11-15) it
         is said once, with the DSO draft beside it. */
      if (okIso(v.filedOn)) {
        b.text.filedOn = fmt(v.filedOn);
        b.flags.filedEarly = !!(fb && okIso(fb.opens) && v.filedOn < fb.opens);
      }
      if (okIso(v.newCardFrom)) b.text.newCardFrom = fmt(v.newCardFrom);
      if (okIso(v.newCardUntil)) b.text.newCardUntil = fmt(v.newCardUntil);
      if (okIso(v.newCardFrom) && okIso(v.newCardUntil) && v.newCardUntil <= v.newCardFrom) b.invalid = { newCardUntil: 'The end comes after the start.' };
      if (v.receipt && App.isReceipt && !App.isReceipt(v.receipt)) b.invalid = { receipt: 'A receipt number is three letters and ten digits.' };
    },

    address: function (lp, b) {
      const r = rec();
      const v = lp.values;
      b.text.oldAddress = lp.context.oldAddress || ((r.address || {}).lines || []).join(', ');
      if (v.address) b.text.address = v.address;
      const moved = okIso(v.moved) ? v.moved : null;
      if (moved) {
        b.text.moved = fmt(moved); b.text.movedLong = fmtLong(moved);
        const hyp = clone(r);
        hyp.address = { lines: [v.address || ''], since: moved };
        /* Moved 2026-10-05 on the OPT card: 2026-10-05 + 10 = 2026-10-15. */
        const it = App.compute(hyp)['report:address:' + moved];
        if (it && okIso(it.iso)) {
          b.iso.reportDue = it.iso; b.text.reportDue = fmt(it.iso);
          b.iso.reportLead = addDays(it.iso, -(S.deadlineLeadDays || 3)); b.text.reportLead = fmt(b.iso.reportLead);
        }
      }
      b.flags.told = !!(moved && (r.made || {})['report:address:' + moved]);
    },

    'lost-paper': function (lp, b) {
      const v = lp.values;
      const d = def('lost-paper');
      const p = (d.papers || []).filter((x) => x.value === v.paper)[0];
      if (p) {
        b.text.paper = p.label; b.text.paperLower = lowerName(p.label);
        b.text.copyHref = '#/documents/' + p.doc;
        const doc = docTitle(p.doc);
        /* The saved copy's date, as the paper shows it ("This version"). */
        const ver = doc && ((doc.dates || []).filter((x) => x[0] === 'This version')[0] || null);
        if (ver) b.text.copySaved = ver[1];
        else if (doc && doc.latest && doc.latest.date) b.text.copySaved = doc.latest.date;
      }
      const lw = d.whereLines || {};
      if (v.where) b.text.whereLine = lw[v.where];
      if (okIso(v.newUntil)) b.text.newUntil = fmt(v.newUntil);
    },

    crisis: function (lp, b) {
      const c = L.contacts || {};
      b.text.officeName = (c.schoolOffice || {}).name;
      b.flags.notice = !!(lp.context || {}).notice;
    },

    notice: function (lp, b) {
      const v = lp.values;
      const k = (def('notice').kinds || []).filter((x) => x.value === v.kind)[0];
      if (k) { b.text.kindLabel = k.label; b.text.kindLower = lowerName(k.label); }
      if (okIso(v.arrived)) { b.text.arrived = fmt(v.arrived); b.text.arrivedLong = fmtLong(v.arrived); }
    },

    checkin: function (lp, b) {
      const r = rec();
      const job = jobOf(lp, r);
      const v = lp.values;
      if (!job) return;
      b.text.employer = job.employer;
      b.text.hours = String(hoursOn(job, now()));
      b.text.confirmedOn = fmt(lp.context.confirmedOn || job.confirmedOn);
      /* A yes on 2026-09-30: + 30 (checkin.jobDays) = 2026-10-30. */
      b.text.nextCheckin = fmt(addDays(now(), (data.checkin || {}).jobDays || 30));
      if (v.newHours != null && v.newHours !== '' && Number(v.newHours) >= 0) b.text.newHours = String(Number(v.newHours));
      if (okIso(v.hoursFrom)) b.text.hoursFrom = fmt(v.hoursFrom);
    },

    'report-owed': function (lp, b) {
      const id = (lp.context || {}).reportId;
      const all = App.reportsOwed ? App.reportsOwed().rows : [];
      const row = all.filter((x) => x.id === id)[0];
      if (!row) return;
      b.text.reportTitle = row.title;
      b.report = row;
      if (okIso(row.due)) {
        b.iso.due = row.due; b.text.due = fmt(row.due);
        b.iso.reportLead = addDays(row.due, -(S.deadlineLeadDays || 3)); b.text.reportLead = fmt(b.iso.reportLead);
      }
      b.flags.made = !!row.made;
    },
  };

  function bind(lp) {
    const b = common(lp);
    const f = BIND[lp.kind];
    if (f) f(lp, b);
    return b;
  }

  /* ---------------- saves: what an exit writes to the record ---------------- */
  /* Each runs once, when the student takes the exit. */
  const SAVE = {
    jobEnd(lp, r) {
      const j = jobOf(lp, r);
      if (!j) return;
      lp.context.jobId = j.id;
      j.end = lp.values.lastDay;
      j.confirmedOn = now();
    },
    reportMade(lp, r) { const j = jobOf(lp, r); r.made = r.made || {}; if (j) r.made['report:job-end:' + j.id] = now(); },
    askedDso() {},
    dsoReplied() {},
    confirmNoJob() {},
    newJob(lp, r) {
      const v = lp.values;
      const id = String(v.newEmployer).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + v.newStart;
      /* "At least 20" is saved as the line itself (opt.min_hours_per_week);
         the student can edit the exact hours in WorkBook. */
      r.jobs.push({ id: id, title: '', employer: v.newEmployer, start: v.newStart, end: null,
        hours: v.newHours === 'full' ? RULE().minHours : null, hoursBand: v.newHours, hoursChanges: [], confirmedOn: now() });
      lp.context.newJobId = id;
    },
    tripPlan() {},
    signatureRequested() {},
    signatureAdded(lp, r) { r.travelSignature = { signed: now(), doc: 'i20-opt' }; },
    carryFolder(lp) { App.state.carry = (def('travel').carry || []).slice(); },
    tripDone(lp, r) { const v = lp.values; r.trips = r.trips || []; r.trips.push({ id: 'trip-' + v.leave, leave: v.leave, back: v.back, purpose: v.purpose }); },
    tripReturned(lp, r) { const v = lp.values; r.trips = r.trips || []; r.trips.push({ id: 'trip-' + v.leave, leave: v.leave, back: v.returned, purpose: v.purpose }); },
    recommended(lp, r) { r.stem = r.stem || {}; r.stem.recommended = lp.values.recommended; },
    i983Signed() {},
    /* The receipt number is the outside fact that meets the obligation. The
       filing day is saved only when typed: it is never assumed to be today.
       receiptOn is the day the receipt was added (the "as of" of the status
       line on Today), not a filing day. */
    filed(lp, r) {
      r.stem = r.stem || {};
      if (okIso(lp.values.filedOn)) r.stem.filed = lp.values.filedOn;
      r.stem.receiptOn = now();
      r.stem.receipt = App.normalizeReceipt ? App.normalizeReceipt(lp.values.receipt) : lp.values.receipt;
    },
    newCard(lp, r) { r.stem = r.stem || {}; r.stem.card = { from: lp.values.newCardFrom, until: lp.values.newCardUntil }; },
    rfe() {},
    rfeAnswered() {},
    denied() {},
    address(lp, r) { lp.context.oldAddress = lp.context.oldAddress || ((r.address || {}).lines || []).join(', '); r.address = { lines: [lp.values.address], since: lp.values.moved }; },
    addressTold(lp, r) { r.made = r.made || {}; r.made['report:address:' + lp.values.moved] = now(); },
    lost(lp, r) { const p = (def('lost-paper').papers || []).filter((x) => x.value === lp.values.paper)[0]; r.lost = r.lost || {}; if (p) r.lost[p.doc] = now(); },
    foundPaper(lp, r) { const p = (def('lost-paper').papers || []).filter((x) => x.value === lp.values.paper)[0]; if (p && r.lost) delete r.lost[p.doc]; },
    replaced(lp, r) {
      const p = (def('lost-paper').papers || []).filter((x) => x.value === lp.values.paper)[0];
      if (!p) return;
      r.replaced = r.replaced || {};
      r.replaced[p.doc] = { added: now(), until: lp.values.newUntil };
      if (p.value === 'passport' && r.passport) r.passport.expires = lp.values.newUntil;
      if (p.value === 'visa' && r.visa) r.visa.expires = lp.values.newUntil;
    },
    notice(lp, r) { r.notices = r.notices || []; r.notices.push({ kind: lp.values.kind, arrived: lp.values.arrived, saved: now() }); },
    spokeDso() {},
    spokeAttorney() {},
    checkinYes(lp, r) { const j = jobOf(lp, r); if (j) j.confirmedOn = now(); },
    hours(lp, r) {
      const j = jobOf(lp, r);
      if (!j) return;
      j.hoursChanges = j.hoursChanges || [];
      j.hoursChanges.push({ on: lp.values.hoursFrom, hours: Number(lp.values.newHours) });
      j.confirmedOn = now();
      lp.context.hoursOn = lp.values.hoursFrom;
    },
    reportOwedMade(lp, r) { r.made = r.made || {}; r.made[lp.context.reportId] = now(); },
  };

  /* ---------------- the loops ---------------- */
  function store() {
    if (!App.state.loops) App.state.loops = { list: [], seq: 0, seeded: false };
    return App.state.loops;
  }
  const get = (id) => store().list.filter((l) => l.id === id)[0] || null;
  const curStep = (lp) => (lp && !FINAL.includes(lp.state) ? def(lp.kind).steps[lp.step] : null);
  const isOpen = (lp) => lp && !FINAL.includes(lp.state);

  /* parent and notice say where a loop came from and what it offers, not
     which loop it is: they never make a second open loop of a kind. */
  const LOOSE = ['parent', 'notice'];
  function sameContext(a, b) {
    const ka = Object.keys(a || {}).filter((k) => LOOSE.indexOf(k) < 0).sort();
    const kb = Object.keys(b || {}).filter((k) => LOOSE.indexOf(k) < 0).sort();
    return ka.join() === kb.join() && ka.every((k) => a[k] === b[k]);
  }

  function start(kind, context) {
    const d = def(kind);
    if (!d) return null;
    const ctx = Object.assign({}, context || {});
    const same = store().list.filter((l) => l.kind === kind && isOpen(l) && sameContext(l.context, ctx))[0];
    if (same) {
      /* The open loop takes what the new start adds. A notice named after
         "Keep these on Today" puts the fixed screen back at its start, where
         "Save the notice and the day it arrived" is offered. */
      if (ctx.notice && !(same.context || {}).notice) {
        same.context = Object.assign({}, same.context, { notice: true });
        if (d.fixed && same.step !== d.start) enter(same, d.start, { by: 'trigger' });
        emit('loop', same.id, seen(same).kind, null);
      }
      return same;
    }
    const st = store();
    st.seq += 1;
    const lp = {
      id: 'loop-' + st.seq, kind: kind, version: d.version, context: ctx, values: {},
      step: null, state: 'open', opened: now(), timerAt: null, enteredOn: now(),
      saved: {}, history: [], back: [], resume: null, unanswered: 0, answeredSinceFire: true, firedOnce: false,
      backedOff: false, cantTell: null, lastAnsweredOn: null, receipt: null, closedOn: null, outcome: null,
      seenOnce: {}, undo: [],
    };
    if (kind === 'address') ctx.oldAddress = ((rec().address || {}).lines || []).join(', ');
    if (kind === 'checkin') { const j = jobOf(lp); if (j) { ctx.jobId = j.id; ctx.confirmedOn = j.confirmedOn; } }
    st.list.push(lp);
    enter(lp, d.start, { by: 'trigger' });
    log(lp, 'opened');
    emit('loop', lp.id, seen(lp).kind, null);
    return lp;
  }

  /* Move into a step and set its timer from the day it was entered. */
  function enter(lp, to, meta) {
    const d = def(lp.kind);
    const from = lp.step;
    if (to === '@back') to = lp.back.pop() || d.start;
    else if (to === '@resume') { to = lp.resume || d.start; lp.resume = null; }
    else if (from && to !== from) lp.back.push(from);
    const st = d.steps[to];
    if (!st) throw new Error('No step ' + to + ' in ' + lp.kind);
    if (/^dso-/.test(to) && from && !/^dso-/.test(from) && !lp.resume) lp.resume = from;
    lp.step = to;
    lp.state = st.state;
    lp.enteredOn = (meta && meta.on) || now();
    lp.timerAt = timerDate(lp, st, lp.enteredOn);
    /* "Not yet" snoozes to the engine's limit date, never past it (rule 5). */
    if (lp.timerOverride) { lp.timerAt = lp.timerOverride; lp.timerOverride = null; }
    lp.history.push({ on: now(), from: from, to: to, by: (meta && meta.by) || null, exit: (meta && meta.exit) || null });
  }

  /* The timer of a step, as a date. A fact that is missing falls back to
     the step's fallback timer. A date already passed fires at once, except
     a repeating check-in, which moves on by its interval. */
  function timerOf(lp, st) {
    const t = st.timer;
    if (!t) return null;
    if (t.at && t.at.fact && t.fallback) {
      const b = bind(lp);
      if (!b.iso[t.at.fact]) return Object.assign({}, t, t.fallback, { at: t.fallback.at, then: t.fallback.then || t.then, kind: t.fallback.kind || t.kind });
    }
    return t;
  }
  function timerDate(lp, st, base) {
    const t = timerOf(lp, st);
    if (!t || !t.at) return null;
    if (lp.backedOff && t.kind === 'checkin') return null;
    const at = t.at;
    let iso = null;
    if (at.fact) {
      const f = bind(lp).iso[at.fact];
      if (!okIso(f)) return null;
      const minus = at.minus === 'lead' ? (S.deadlineLeadDays || 3) : (at.minus || 0);
      iso = addDays(f, (at.plus || 0) - minus);
    } else if (at.setting) {
      const n = S[at.setting];
      iso = at.businessDays ? addBusinessDays(base, n) : addDays(base, n);
    } else if (at.days != null) {
      iso = addDays(base, at.days);
    }
    if (!iso) return null;
    if (iso <= base && (t.every || t.then === lp.step)) iso = addDays(base, S[t.every] || S.checkinDays || 14);
    return iso;
  }

  function exitsOf(lp, b) {
    const st = curStep(lp);
    if (!st) return [];
    const bb = b || bind(lp);
    return (st.exits || []).filter((e) => whenOk(e.when, bb));
  }
  function whenOk(w, b) {
    if (!w) return true;
    const neg = w.charAt(0) === '!';
    const v = !!b.flags[neg ? w.slice(1) : w];
    return neg ? !v : v;
  }
  function needsMet(lp, e, b) {
    const v = lp.values;
    const bb = b || bind(lp);
    if (bb.invalid && (e.needs || []).some((k) => bb.invalid[k])) return false;
    return (e.needs || []).every((k) => v[k] != null && v[k] !== '');
  }
  function obligationMet(lp) {
    const d = def(lp.kind);
    const ob = d.obligation;
    if (!ob) return true;
    if ((ob.metBy || []).some((k) => lp.saved[k])) return true;
    return false;
  }
  /* A dated obligation is one the engine has a date for and the student has
     not met. Such a loop cannot be dismissed (rule 5). */
  function datedObligation(lp, b) {
    const d = def(lp.kind);
    if (!d.obligation || obligationMet(lp)) return null;
    const bb = b || bind(lp);
    const iso = bb.iso[d.obligation.fact];
    if (!okIso(iso)) return null;
    return { iso: iso, title: pick(d.obligation.title, bb.text) || d.obligation.title, source: d.obligation.source === '@report' ? (bb.report || {}).source : d.obligation.source };
  }

  /* ---------------- transitions ---------------- */
  function snapshot(lp, action) {
    const r = rec();
    const copy = clone(Object.assign({}, lp, { undo: [] }));
    lp.undo.push({ loop: copy, record: clone(Object.assign({}, r, { footprint: undefined })), action: action, spawned: [] });
    if (lp.undo.length > 5) lp.undo.shift();
  }

  function take(id, key, values) {
    const lp = get(id);
    if (!isOpen(lp)) return { ok: false, error: 'closed' };
    if (values) Object.assign(lp.values, values);
    const b0 = bind(lp);
    const e = exitsOf(lp, b0).filter((x) => x.key === key)[0];
    if (!e) return { ok: false, error: 'no-exit' };
    if (!needsMet(lp, e, b0)) return { ok: false, error: 'needs', needs: e.needs, invalid: b0.invalid || null };
    if (e.to === 'dismissed') return dismiss(id);
    if (e.to === 'closed' && !(e.by === 'student' || e.by === 'fact')) return { ok: false, error: 'closing needs a confirmation' };
    /* An exit writes a receipt only when something changed: it saves, it
       closes, it opens a loop, it moves a reminder, or its words say what
       changed. Opening a step ("Add a new job or offer", "My hours
       changed", "I'm not sure yet", Back) changes nothing: no receipt, no
       Undo; the last receipt folds to its one line. */
    const closes = e.to === 'closed';
    const writes = !!e.saves || closes || !!e.receipt || !!e.snooze || !!(e.spawn && e.spawn.length);
    if (writes) snapshot(lp, key);
    const r = rec();
    if (e.saves && SAVE[e.saves]) { SAVE[e.saves](lp, r); lp.saved[e.saves] = now(); }
    lp.unanswered = 0; lp.answeredSinceFire = true; lp.backedOff = false; lp.cantTell = null; lp.lastAnsweredOn = now();
    const text = bind(lp).text;
    let receipt = '';
    if (closes) {
      receipt = pick(e.receipt, text) || '';
      finish(lp, 'closed', { by: e.by, outcome: e.outcome || key, exit: key });
    } else {
      if (e.snooze) {
        const lim = bind(lp).iso[e.snooze.limit];
        if (okIso(lim) && lim >= now()) lp.timerOverride = lim;
      }
      enter(lp, e.to, { by: e.by || 'student', exit: key });
      if (writes) {
        const wantsRemind = /\{remindReceipt\}/.test(JSON.stringify(e.receipt || '')) || (e.snooze && !e.receipt);
        const rr = wantsRemind ? remindReceipt(lp) : '';
        receipt = pick(e.receipt, Object.assign({}, bind(lp).text, { remindReceipt: rr })) || (e.snooze && !e.receipt ? rr : '') || '';
      }
    }
    /* Only loops this exit opened are its own; one already open stays
       when this exit is undone. */
    const before = store().list.map((l) => l.id);
    const kids = spawn(lp, e.spawn || []);
    if (writes) {
      lp.undo[lp.undo.length - 1].spawned = kids.filter((k) => before.indexOf(k.id) < 0).map((k) => k.id);
      lp.receipt = { text: composeReceipt(lp, receipt, kids), on: now(), exit: key, folded: false };
      if (lp.state === 'closed') lp.closeReceipt = lp.receipt.text;
    } else if (lp.receipt) {
      lp.receipt.folded = true;
    }
    log(lp, lp.state === 'closed' ? 'closed' : 'moved', { what: receipt || pick(e.label, text) });
    emit('record', 'loop:' + lp.kind, key, null);
    emit('loop', lp.id, seen(lp).kind, null);
    return { ok: true, loop: lp, receipt: writes ? lp.receipt.text : '', spawned: kids };
  }

  function finish(lp, state, meta) {
    lp.history.push({ on: now(), from: lp.step, to: state, by: meta.by, exit: meta.exit || null });
    lp.state = state;
    lp.outcome = meta.outcome || null;
    lp.closedOn = now();
    lp.timerAt = null;
  }

  /* Rule 4: planned is not closed. A loop closes only on the student's
     confirmation or an outside fact. */
  function close(id, o) {
    const lp = get(id);
    const opt = o || {};
    if (!isOpen(lp)) return { ok: false, error: 'closed' };
    if (!(opt.by === 'student' || opt.by === 'fact')) return { ok: false, error: 'closing needs a confirmation' };
    snapshot(lp, 'close');
    finish(lp, 'closed', { by: opt.by, outcome: opt.outcome || 'closed' });
    lp.receipt = { text: composeReceipt(lp, opt.receipt || '', []), on: now(), exit: 'close', folded: false };
    lp.closeReceipt = lp.receipt.text;
    log(lp, 'closed', {});
    emit('loop', lp.id, 'done', null);
    return { ok: true, loop: lp };
  }

  /* Rule 5: no dismissal while an engine-dated obligation is open. */
  function dismiss(id) {
    const lp = get(id);
    if (!isOpen(lp)) return { ok: false, error: 'closed' };
    const d = def(lp.kind);
    if (!d.dismiss) return { ok: false, error: 'this loop cannot be dropped' };
    if (datedObligation(lp)) return { ok: false, error: 'a dated obligation is open' };
    snapshot(lp, 'dismiss');
    finish(lp, 'dismissed', { by: 'student', outcome: 'dismissed' });
    lp.receipt = null;
    log(lp, 'dismissed', {});
    emit('loop', lp.id, 'dismissed', null);
    return { ok: true, loop: lp };
  }

  /* Reopened is an event: a closed loop back to its first step, with the
     stated reason in the record. */
  /* "Reopen: the new job ended" is about the job that was added, not the
     one this loop first asked about: the loop turns to the new job and
     starts from empty (Northwind's end stays on the record and in Your
     record). The job must still be on the record. */
  const REOPEN_NEW_JOB = 'newJobEnded';
  function newJobOf(lp) {
    const nj = (lp.context || {}).newJobId;
    return nj && (rec().jobs || []).some((j) => j.id === nj) ? nj : null;
  }
  function reopen(id, reasonKey) {
    const lp = get(id);
    if (!lp || lp.state !== 'closed') return { ok: false, error: 'not closed' };
    const d = def(lp.kind);
    const reason = (d.reopenOn || []).filter((x) => x.key === reasonKey)[0];
    const newJob = reasonKey === REOPEN_NEW_JOB ? newJobOf(lp) : null;
    if (reasonKey === REOPEN_NEW_JOB && !newJob) return { ok: false, error: 'no new job on the record' };
    snapshot(lp, 'reopen');
    lp.closedOn = null; lp.outcome = null; lp.receipt = null; lp.back = []; lp.resume = null; lp.closeReceipt = null;
    if (newJob) {
      lp.context = Object.assign({}, (lp.context || {}).parent ? { parent: lp.context.parent } : {}, { jobId: newJob });
      lp.values = {}; lp.saved = {}; lp.seenOnce = {};
      lp.cantTell = null; lp.backedOff = false; lp.unanswered = 0; lp.firedOnce = false; lp.answeredSinceFire = true; lp.timerOverride = null;
    }
    lp.history.push({ on: now(), from: 'closed', to: 'reopened', by: 'student', exit: reasonKey || null });
    enter(lp, d.reopenTo || d.start, { by: 'student', exit: 'reopen' });
    const why = reason ? reason.label.replace(/^Reopen: /, '') : '';
    /* The receipt states the reason, then the next date as a question. */
    const rc = L.receipts || {};
    const said = why ? (pick(rc.reopened || 'Reopened: {reason}.', { reason: why }) || '') : '';
    lp.receipt = { text: composeReceipt(lp, said, []), on: now(), exit: 'reopen', folded: false };
    log(lp, 'reopened', { reason: why });
    emit('record', 'loop:' + lp.kind, 'reopen', null);
    emit('loop', lp.id, seen(lp).kind, null);
    return { ok: true, loop: lp, receipt: lp.receipt.text };
  }

  /* Undo is one compensating event: the record and the loop go back to
     before the action, and every loop the action opened goes too, with
     the loops those opened in turn (a check-in's "My job ended" opened
     job-ends, whose new job opened "report your job at Acme"). */
  function undo(id) {
    const lp = get(id);
    if (!lp || !lp.undo.length) return { ok: false };
    const u = lp.undo.pop();
    const r = rec();
    const fp = r.footprint || [];
    Object.keys(r).forEach((k) => { delete r[k]; });
    Object.assign(r, u.record, { footprint: fp });
    const keep = lp.undo;
    Object.keys(lp).forEach((k) => { delete lp[k]; });
    Object.assign(lp, u.loop, { undo: keep, receipt: null });
    const drop = [];
    const queue = (u.spawned || []).slice();
    while (queue.length) {
      const x = queue.shift();
      if (x === lp.id || drop.indexOf(x) >= 0) continue;
      drop.push(x);
      store().list.forEach((l) => { if ((l.context || {}).parent === x) queue.push(l.id); });
    }
    store().list = store().list.filter((l) => drop.indexOf(l.id) < 0);
    drop.forEach((x) => { if (App.state) delete App.state['loopOpen:' + x]; });
    log(lp, 'moved', { what: (data.loops.receipts || {}).undo + ': ' + u.action });
    emit('record', 'loop:undo', lp.kind, null);
    emit('loop', lp.id, seen(lp).kind, null);
    return { ok: true, loop: lp };
  }

  /* Named transitions over take(), by where the exit leads. */
  function takeTo(id, state, values) {
    const lp = get(id);
    if (!isOpen(lp)) return { ok: false, error: 'closed' };
    if (values) Object.assign(lp.values, values);
    const d = def(lp.kind);
    const b = bind(lp);
    const e = exitsOf(lp, b).filter((x) => x.to !== 'closed' && x.to !== 'dismissed' && d.steps[x.to] && d.steps[x.to].state === state && needsMet(lp, x, b))[0];
    if (!e) return { ok: false, error: 'no exit to ' + state };
    return take(id, e.key);
  }
  const plan = (id, values) => takeTo(id, 'planned', values);
  const wait = (id, values) => takeTo(id, 'waiting', values);
  function confirm(id, key, values) {
    const lp = get(id);
    if (!isOpen(lp)) return { ok: false, error: 'closed' };
    if (values) Object.assign(lp.values, values);
    const e = exitsOf(lp).filter((x) => (key ? x.key === key : (x.by === 'student' || x.by === 'fact')))[0];
    if (!e) return { ok: false, error: 'no confirming exit' };
    return take(id, e.key);
  }
  function answer(id, key, value) {
    const lp = get(id);
    if (!isOpen(lp)) return null;
    if (value == null || value === '') delete lp.values[key]; else lp.values[key] = value;
    emit('loop-answer', lp.id, key, null);
    return lp;
  }

  /* Children: a new job's report, a new hours report, STEM OPT reports. */
  function spawn(lp, list) {
    const out = [];
    list.forEach((s) => {
      if (s.kind === 'job-ends') { const j = jobOf(lp); out.push(start('job-ends', { jobId: j ? j.id : undefined, parent: lp.id })); return; }
      if (s.kind !== 'report-owed') { out.push(start(s.kind, { parent: lp.id })); return; }
      const rows = App.reportsOwed ? App.reportsOwed().open : [];
      let ids = [];
      if (s.report === 'job-start' && lp.context.newJobId) ids = ['report:job-start:' + lp.context.newJobId];
      else if (s.report === 'job-hours' && lp.context.hoursOn) ids = ['report:job-hours:' + lp.context.jobId + ':' + lp.context.hoursOn];
      else if (s.report === 'stem') ids = rows.filter((x) => x.kind === 'validation' || x.kind === 'evaluation').map((x) => x.id);
      ids.filter((rid) => rows.some((x) => x.id === rid)).forEach((rid) => out.push(start('report-owed', { reportId: rid, parent: lp.id })));
    });
    return out.filter(Boolean);
  }

  /* ---------------- what the student sees ---------------- */
  /* The dated obligation as words, while its day has not passed. A day
     that passed is never shown as "on or before" it: the step says it in
     full once ("The report day was Nov 10. Today is Nov 12.") and its
     short line stands for it after. */
  function obligationLine(lp, b) {
    const ob = datedObligation(lp, b);
    return ob && ob.iso >= now() ? lowerFirst(ob.title) + ' on or before ' + fmt(ob.iso) : null;
  }
  /* What the student sees follows the state (BLUEPRINT 2.3): a waiting
     step reads "Waiting on [who] until [date]" first, and a dated
     obligation still owed follows it ("Waiting until Nov 7. Planned: report
     the end of your job on or before Nov 10"), so the day is never hidden
     behind the wait. A planned step reads "Planned: ...". A step with a
     short line (a passed day) uses that line. */
  function seen(lp) {
    const sn = L.seen || {};
    if (!lp) return { kind: 'none', line: '' };
    if (lp.state === 'closed') return { kind: 'done', line: pick(sn.done, { date: fmt(lp.closedOn) }) };
    if (lp.state === 'dismissed') return { kind: 'dismissed', line: '' };
    const d = def(lp.kind);
    const st = curStep(lp);
    const b = bind(lp);
    const ob = obligationLine(lp, b);
    const planned = ob ? pick(sn.planned, { next: ob }) : null;
    if (lp.cantTell) return { kind: 'needs', line: pick(sn.cantTell, { fact: d.cantTell || 'this', asOf: fmt(lp.cantTell.asOf) }), next: ob };
    const short = st.short ? pick(st.short, b.text) : null;
    if (short) return { kind: st.state === 'waiting' ? 'waiting' : 'needs', line: short, next: ob };
    if (st.state === 'waiting') {
      let line;
      if (st.who === 'date') {
        if (!lp.timerAt) return { kind: planned ? 'planned' : 'waiting', line: planned || sn.needs, next: ob };
        line = pick(sn.waitingDate, { until: fmt(lp.timerAt) });
      } else {
        const who = pick(st.person, b.text);
        line = lp.timerAt ? pick(sn.waitingWho, { who: who, until: fmt(lp.timerAt) }) : pick(sn.waitingEvent, { who: who });
      }
      return { kind: 'waiting', line: planned ? line + '. ' + planned : line, next: ob };
    }
    if (st.state === 'planned' && planned) return { kind: 'planned', line: planned, next: ob };
    return { kind: 'needs', line: sn.needs + (ob ? ': ' + ob : ''), next: ob };
  }

  /* "Nov 7", "Nov 7 and Nov 10", "Nov 27, Dec 16 and Jan 9, 2027". */
  function joinAnd(list) {
    if (list.length < 2) return list.join('');
    return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
  }
  /* Every date this loop will reach the student on, from the scheduler's
     real state across all loops (so a check-in the weekly budget moved
     shows on the day it moved to), and the ask the current check-in leads
     to (travel: the first ask, then the last ask before leaving). These
     are the dates a "Remind me" receipt and the calendar file name. */
  function loopDates(lp) {
    if (!isOpen(lp)) return [];
    const out = schedule().reminders.filter((x) => x.loopId === lp.id).map((x) => x.iso);
    const st = curStep(lp);
    const t = st && timerOf(lp, st);
    if (t && t.kind === 'checkin' && lp.timerAt && !lp.backedOff && t.then && t.then !== lp.step) {
      const nx = def(lp.kind).steps[t.then];
      const nt = nx && timerOf(lp, nx);
      if (nt && nt.kind === 'checkin') {
        const iso = timerDate(lp, nx, lp.timerAt);
        if (okIso(iso) && iso > lp.timerAt) out.push(iso);
      }
    }
    return out.filter((x) => x >= now()).filter((x, i, a) => a.indexOf(x) === i).sort();
  }
  function remindReceipt(lp) {
    const rc = L.receipts || {};
    if (!remindersOn()) return rc.remindOff;
    /* Today's reminder is the one being answered: only later days are set. */
    const dates = loopDates(lp).filter((x) => x > now()).map(fmt);
    if (!dates.length) return '';
    return pick(rc.remindOn, { dates: joinAnd(dates) });
  }
  function remindersOn() {
    const st = App.state || {};
    if (st['remind:phone'] === false) return false;
    const r = data.reminders || {};
    const ph = (r.channels || []).filter((c) => c.key === 'phone')[0];
    return r.on !== false && !(ph && ph.on === false);
  }

  /* The receipt: what changed (the exit's words), what Duly checked (in the
     exit's words where it checks), and the next date or "Nothing else". */
  function composeReceipt(lp, text, kids) {
    const rc = L.receipts || {};
    const parts = [text].filter(Boolean);
    if (lp.state === 'closed') {
      const k = (kids || []).filter(Boolean)[0];
      const kb = k ? obligationLine(k, bind(k)) : null;
      /* A loop this one opened still needs the student: never "Nothing
         else" over it ("Opened: job at Northwind Systems ended."). */
      if (kb) parts.push(pick(rc.next, { next: kb }));
      else if (!k) parts.push(rc.nothingElse);
    } else if (lp.state !== 'dismissed') {
      const ob = obligationLine(lp, bind(lp));
      const already = ob && text && text.indexOf(fmt(datedObligation(lp).iso)) >= 0;
      if (ob && !already) parts.push(pick(rc.next, { next: ob }));
      else if (!ob && lp.timerAt) {
        /* The timer's question stays a question: "Next check-in Oct 7: Do
           you know your last day at Northwind Systems now?" */
        const t = timerOf(lp, curStep(lp)) || {};
        const ask = pick(t.ask, bind(lp).text);
        const tpl = t.kind === 'deadline' ? (rc.nextReminder || 'Next reminder {date}: {ask}') : (rc.nextAsk || 'Next check-in {date}: {ask}');
        if (ask && (text || '').indexOf(fmt(lp.timerAt)) < 0) parts.push(pick(tpl, { date: fmt(lp.timerAt), ask: ask }));
      }
    }
    return parts.join(' ');
  }

  /* The view model components/loop.js draws. Every string is filled. */
  function view(lp) {
    const d = def(lp.kind);
    const b = bind(lp);
    const sn = seen(lp);
    const out = {
      id: lp.id, kind: lp.kind, private: !!d.private, fixed: !!d.fixed,
      title: pick(d.title, b.text) || pick(d.titleEmpty, b.text) || d.situation || '',
      seen: sn, state: lp.state,
      receipt: lp.receipt && !lp.receipt.folded ? lp.receipt.text : null,
      canUndo: lp.undo.length > 0 && !!lp.receipt && !lp.receipt.noUndo,
      timerAt: lp.timerAt,
    };
    if (!isOpen(lp)) {
      out.closed = {
        on: fmt(lp.closedOn), text: lp.closeReceipt || '',
        /* "The new job ended" only when a new job is on the record. */
        reopen: lp.state === 'closed' ? (d.reopenOn || []).filter((r) => r.key !== REOPEN_NEW_JOB || !!newJobOf(lp)).map((r) => ({ key: r.key, label: r.label })) : [],
      };
      return out;
    }
    const st = curStep(lp);
    const opts = (f) => {
      let list = f.options || [];
      if (f.optionsFrom === 'change.purposes') list = (data.change || {}).purposes || [];
      else if (f.optionsFrom) list = d[f.optionsFrom] || [];
      list = list.map((o) => ({ value: o.value, label: pick(o.label, b.text) || o.label }));
      if (f.notSure) list = list.concat([{ value: 'unsure', label: f.notSure }]);
      return list;
    };
    const contacts = L.contacts || {};
    out.step = {
      key: lp.step,
      tag: st.tag,
      title: pick(st.title, b.text),
      short: st.short ? pick(st.short, b.text) : null,
      once: !!st.once,
      lines: (st.lines || []).filter((l) => whenOk(l.when, b)).map((l) => ({
        text: pick(l.text, b.text), tag: l.tag || null, threat: !!l.threat,
        source: l.source === '@report' ? ((b.report && b.report.rule) || (b.report || {}).source || null) : (l.source || null),
      })).filter((l) => l.text),
      cantTell: lp.cantTell ? pick((L.seen || {}).cantTell, { fact: d.cantTell || 'this', asOf: fmt(lp.cantTell.asOf) }) : null,
      fields: (st.fields || []).map((f) => ({
        key: f.key, kind: f.kind, label: pick(f.label, b.text) || f.label, placeholder: f.placeholder || null,
        value: lp.values[f.key] == null ? '' : lp.values[f.key], options: f.kind === 'choice' ? opts(f) : null,
        error: (b.invalid || {})[f.key] || null,
      })),
      actions: (st.actions || []).filter((a) => whenOk(a.when, b)).map((a) => {
        if (a.kind === 'draft') {
          const dr = (d.drafts || {})[a.draft];
          if (!dr) return null;
          if (dr.from === 'email') return { kind: 'draft', key: 'loop:' + lp.id + ':' + a.draft, draft: Object.assign({}, data.email, { step: null }) };
          const t = b.text;
          return { kind: 'draft', key: 'loop:' + lp.id + ':' + a.draft, draft: {
            openLabel: dr.openLabel, to: pick(dr.to, t) || dr.to, subject: pick(dr.subject, t) || '',
            paragraphs: (dr.paragraphs || []).map((p) => pick(p, t)).filter(Boolean),
            questions: (dr.questions || []).map((q) => pick(q, t)).filter(Boolean),
            signoff: (dr.signoff || []).map((s) => pick(s, t)).filter(Boolean),
          } };
        }
        if (a.kind === 'link') {
          let href = a.href || (a.fact ? b.text[a.fact] : null);
          if (a.contact) { const c = contacts[a.contact] || {}; href = a.part ? c[a.part] : c.href; }
          return href ? { kind: 'link', label: pick(a.label, b.text) || a.label, href: href } : null;
        }
        if (a.kind === 'rule') return { kind: 'rule', label: a.label, source: a.source };
        if (a.kind === 'calendar') return { kind: 'calendar', label: a.label };
        if (a.kind === 'start') return { kind: 'start', label: a.label, loop: a.loop };
        return null;
      }).filter(Boolean),
      exits: [],
    };
    let primaryGiven = false;
    out.step.exits = exitsOf(lp, b).map((e) => {
      const ok = needsMet(lp, e, b);
      const label = pick(e.label, b.text) || '';
      const primary = !e.quiet && !primaryGiven;
      if (primary) primaryGiven = true;
      return { key: e.key, label: label, disabled: !ok, primary: primary, quiet: !!e.quiet,
        confirm: e.confirm || null, cancel: e.cancel || null, closes: e.to === 'closed' };
    });
    return out;
  }

  /* ---------------- the follow-up scheduler (BLUEPRINT 2.4) ---------------- */
  const weekOf = (iso) => { const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))).getUTCDay(); return addDays(iso, -((d + 6) % 7)); };
  /* Guaranteed: an engine date gives two reminders, on its date minus the
     lead and on the day. Back-off, snooze and dismiss never remove them.
     Budgeted: check-ins, at most weeklyBudget a week (Monday to Sunday);
     the rest move to the next week. All of it batched by morning. */
  function schedule(o) {
    const opt = o || {};
    const asOf = opt.asOf || now();
    const budget = S.weeklyBudget || 3;
    const out = [];
    store().list.filter(isOpen).filter((lp) => !opt.only || lp.id === opt.only).forEach((lp) => {
      const b = bind(lp);
      const ob = datedObligation(lp, b);
      if (ob) {
        const lead = addDays(ob.iso, -(S.deadlineLeadDays || 3));
        [lead, ob.iso].forEach((iso) => {
          if (iso >= asOf) out.push({ iso: iso, loopId: lp.id, kind: 'deadline', guaranteed: true, text: ob.title + ' on or before ' + fmt(ob.iso) });
        });
      }
      const st = curStep(lp);
      const t = timerOf(lp, st);
      if (lp.timerAt && lp.timerAt >= asOf && t) {
        const text = pick(t.ask, b.text) || '';
        if (t.kind === 'deadline') {
          if (!out.some((x) => x.loopId === lp.id && x.iso === lp.timerAt)) out.push({ iso: lp.timerAt, loopId: lp.id, kind: 'deadline', guaranteed: true, text: text });
        } else if (!lp.backedOff) {
          out.push({ iso: lp.timerAt, loopId: lp.id, kind: 'checkin', guaranteed: false, text: text });
        }
      }
    });
    out.sort((x, y) => (x.iso < y.iso ? -1 : (x.iso > y.iso ? 1 : (x.guaranteed === y.guaranteed ? 0 : (x.guaranteed ? -1 : 1)))));
    const used = {};
    const cut = [];
    const kept = out.map((r) => {
      if (r.guaranteed) return r;
      let iso = r.iso;
      let wk = weekOf(iso);
      while ((used[wk] || 0) >= budget) { wk = addDays(wk, 7); iso = wk; }
      used[wk] = (used[wk] || 0) + 1;
      if (iso !== r.iso) { cut.push({ from: r.iso, to: iso, loopId: r.loopId, text: r.text }); return Object.assign({}, r, { iso: iso, moved: true }); }
      return r;
    }).sort((x, y) => (x.iso < y.iso ? -1 : (x.iso > y.iso ? 1 : 0)));
    const digest = [];
    kept.forEach((r) => {
      const last = digest[digest.length - 1];
      if (last && last.iso === r.iso) last.items.push(r); else digest.push({ iso: r.iso, items: [r] });
    });
    return {
      asOf: asOf, reminders: kept,
      guaranteed: kept.filter((r) => r.guaranteed), budgeted: kept.filter((r) => !r.guaranteed),
      cut: cut, pending: kept.slice(0, S.pendingCap || 50), digest: digest, on: remindersOn(),
    };
  }

  /* Fire every timer due on or before asOf, in date order. A check-in that
     fires when the last one went unanswered counts as unanswered; at
     backoffAfter, asking stops and the loop turns Can't tell yet, as of the
     last day the student answered. Deadline timers are never stopped. */
  function runTimers(asOf) {
    const target = asOf || now();
    let guard = 0;
    for (;;) {
      const due = store().list.filter((lp) => isOpen(lp) && lp.timerAt && lp.timerAt <= target)
        .sort((a, b) => (a.timerAt < b.timerAt ? -1 : 1))[0];
      if (!due || guard > 500) break;
      guard += 1;
      const fireOn = due.timerAt;
      clock = fireOn;
      fire(due, fireOn);
    }
    clock = asOf || clock;
    return store().list;
  }
  function fire(lp, on) {
    const st = curStep(lp);
    const t = timerOf(lp, st);
    if (!t) { lp.timerAt = null; return; }
    if (t.kind === 'checkin') {
      if (lp.firedOnce && !lp.answeredSinceFire) lp.unanswered += 1;
      lp.firedOnce = true;
      lp.answeredSinceFire = false;
      if (lp.unanswered >= (S.backoffAfter || 3)) {
        lp.backedOff = true;
        lp.cantTell = { asOf: lp.lastAnsweredOn || lp.opened };
        lp.timerAt = null;
        log(lp, 'backoff', { n: lp.unanswered, asOf: fmt(lp.cantTell.asOf) });
        emit('loop', lp.id, 'needs', null);
        return;
      }
    }
    enter(lp, t.then, { by: 'timer', on: on });
    if (lp.timerAt && lp.timerAt <= on && t.then === lp.step) lp.timerAt = addDays(on, S.checkinDays || 14);
    log(lp, 'moved', { what: pick(t.ask, bind(lp).text) || '' });
    emit('loop', lp.id, seen(lp).kind, null);
  }

  /* ---------------- the footprint: Your record ---------------- */
  function log(lp, kind, extra) {
    const d = def(lp.kind);
    if (d.private) return;
    const r = rec();
    r.footprint = r.footprint || [];
    const fp = L.footprint || {};
    const title = pick(d.title, bind(lp).text) || pick(d.titleEmpty, {}) || d.situation || '';
    const e = Object.assign({ title: title, receipt: lp.receipt ? lp.receipt.text : '' }, extra || {});
    const text = pick(fp[kind], e) || title;
    r.footprint.push({ on: now(), kind: 'loop', loop: lp.kind, event: kind, state: lp.state, text: text });
  }
  const footprint = () => (rec().footprint || []).filter((x) => x.kind === 'loop');

  /* ---------------- lists, Today, Ask ---------------- */
  /* Triggers from the record: a stale fact opens a check-in (D73). */
  function seed() {
    const st = store();
    if (st.seeded) return;
    st.seeded = true;
    (App.checkins ? App.checkins() : []).filter((c) => c.kind === 'job').forEach((c) => start('checkin', { jobId: c.jobId }));
  }
  function list(o) {
    seed();
    const opt = o || {};
    return store().list.filter((lp) => (opt.all ? true : (opt.closed ? lp.state === 'closed' : isOpen(lp))));
  }
  /* Today, slot 2 (BLUEPRINT 3.2): at most three open loops, earliest
     engine date first; the overflow names the next date. */
  function whatsNext(o) {
    const max = (o && o.max) || 3;
    const open = list().filter((lp) => !def(lp.kind).private || lp.step === 'keep').map((lp) => {
      const ob = datedObligation(lp);
      return { loop: lp, iso: ob ? ob.iso : (lp.timerAt || '9999-12-31') };
    }).sort((a, b) => (a.iso < b.iso ? -1 : (a.iso > b.iso ? 1 : 0)));
    const shown = open.slice(0, max);
    const rest = open.slice(max);
    const restIso = rest.map((x) => x.iso).filter(okIso)[0];
    return {
      loops: shown.map((x) => x.loop),
      more: rest.length ? (rest.length + ' more' + (restIso ? ', next on ' + fmt(restIso) : '')) : null,
    };
  }

  const norm = (s) => String(s || '').toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ').trim();
  /* Ask in v1 (D76, D77): crisis phrasing first, then the guides' phrases,
     longest match first; no match drafts the DSO question. */
  function match(text) {
    const q = ' ' + norm(text) + ' ';
    const crisis = (L.crisisPhrases || []).filter((p) => q.indexOf(' ' + norm(p.text) + ' ') >= 0 || q.indexOf(norm(p.text)) >= 0);
    if (crisis.length) return { crisis: true, kind: 'crisis', notice: crisis.some((p) => p.notice), matches: [{ kind: 'crisis', label: def('crisis').title }] };
    const hits = [];
    defs().forEach((d) => {
      (d.triggers || []).filter((t) => t.from === 'ask' && t.phrases).forEach((t) => {
        t.phrases.forEach((p) => {
          const n = norm(p);
          if (q.indexOf(' ' + n + ' ') >= 0) hits.push({ kind: d.kind, label: d.situation || pick(d.title, {}) || d.kind, score: n.length });
        });
      });
    });
    const best = {};
    hits.forEach((h) => { if (!best[h.kind] || best[h.kind].score < h.score) best[h.kind] = h; });
    const top = Object.keys(best).map((k) => best[k]).sort((a, b) => b.score - a.score).slice(0, 3);
    return top.length ? { crisis: false, kind: top[0].kind, matches: top } : { crisis: false, kind: null, matches: [], stepback: true };
  }
  const situations = () => defs().filter((d) => d.situation && !d.child && !d.fixed).map((d) => ({ kind: d.kind, label: d.situation }));

  /* The loop's dates as an .ics file. Titles are generic by default
     ("Duly item"): a calendar provider sees no status (BLUEPRINT 5.5). */
  function calendarFile(id) {
    const lp = get(id);
    if (!lp) return '';
    const days = loopDates(lp);
    if (!days.length) return '';
    const stamp = now().replace(/-/g, '') + 'T000000Z';
    const ev = days.map((iso, i) => {
      const d = iso.replace(/-/g, '');
      const end = addDays(iso, 1).replace(/-/g, '');
      return ['BEGIN:VEVENT', 'UID:' + id + '-' + i + '@duly.local', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + end, 'SUMMARY:Duly item', 'END:VEVENT'].join('\r\n');
    });
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Duly//Loops//EN'].concat(ev, ['END:VCALENDAR']).join('\r\n');
  }

  /* The receipt for the calendar file: what was saved and what a calendar
     provider sees. Not a change to the record, so no Undo. */
  function calendarReceipt(id) {
    const lp = get(id);
    const days = lp ? loopDates(lp) : [];
    if (!days.length) return null;
    const rc = L.receipts || {};
    const text = pick(rc.calendarSaved || 'Calendar file saved: {dates}. Titles read Duly item.', { dates: joinAnd(days.map(fmt)) });
    lp.receipt = { text: text, on: now(), exit: 'calendar', folded: false, noUndo: true };
    return text;
  }

  App.loops = {
    calendarFile, calendarReceipt, loopDates,
    start, answer, take, plan, wait, confirm, close, dismiss, reopen, undo,
    get, list, def, defs, bind, view, seen, schedule, runTimers, whatsNext, match, situations, footprint,
    setClock(iso) { clock = iso || null; },
    now,
    markSeen(id) { const lp = get(id); if (lp && isOpen(lp)) lp.seenOnce[lp.step] = true; },
    foldReceipt(id) { const lp = get(id); if (lp && lp.receipt) lp.receipt.folded = true; },
    /* For check-loops.mjs: the save names the data may use. */
    _saves: Object.keys(SAVE),
    _binders: Object.keys(BIND),
  };

  /* ---------------- wiring: clicks, fields, in-place redraw ---------------- */
  if (typeof document === 'undefined' || !document.addEventListener) return;
  const cssEsc = (v) => (_.cssEsc ? _.cssEsc(v) : String(v).replace(/["\\]/g, '\\$&'));
  function redraw(id, focusSel) {
    const lp = get(id);
    document.querySelectorAll('[data-loop="' + cssEsc(id) + '"]').forEach((el) => {
      if (!lp || !window.C || !C.loop) return;
      const wrap = document.createElement('div');
      wrap.innerHTML = C.loop(lp, { open: true });
      const next = wrap.firstElementChild;
      el.replaceWith(next);
      if (focusSel) { const f = next.querySelector(focusSel); if (f) f.focus({ preventScroll: true }); }
      if (lp.state === 'closed' && App.play) App.play(next, 'is-settling');
    });
  }
  function after(res, id) {
    if (!res || !res.ok) return;
    if (App.haptic) App.haptic(res.loop && res.loop.state === 'closed' ? 'complete' : 'select');
    App.state['loopOpen:' + id] = true;
    /* Numbers elsewhere on the page come from the record: redraw the column
       in place (same scroll, same open rows), then focus the receipt. */
    if (typeof _.render === 'function') _.render('inplace');
    /* A loop drawn outside the column (a sheet, Today's slot) is redrawn
       here too; one inside it is already fresh and is drawn again the same. */
    redraw(id, '.loop-receipt');
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-loop-act],[data-loop-toggle],[data-loop-ask],[data-loop-cancel],[data-loop-choice],[data-loop-reopen],[data-loop-undo],[data-loop-fold],[data-loop-start],[data-loop-calendar]');
    if (!t) return;
    const box = t.closest('[data-loop]');
    const id = box && box.dataset.loop;
    if (!id) return;
    e.preventDefault();
    if (t.hasAttribute('data-loop-toggle')) {
      const open = t.getAttribute('aria-expanded') !== 'true';
      App.state['loopOpen:' + id] = open;
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
      const body = box.querySelector('.loop-body');
      if (body) body.hidden = !open;
      if (open) App.loops.markSeen(id);
      return;
    }
    if (t.hasAttribute('data-loop-ask')) {
      const c = box.querySelector('[data-loop-confirm="' + cssEsc(t.dataset.loopAsk) + '"]');
      if (c) { c.hidden = false; t.hidden = true; const k = c.querySelector('[data-loop-cancel]'); if (k) k.focus(); }
      return;
    }
    if (t.hasAttribute('data-loop-cancel')) {
      const c = t.closest('[data-loop-confirm]');
      if (c) { c.hidden = true; const a = box.querySelector('[data-loop-ask="' + cssEsc(c.dataset.loopConfirm) + '"]'); if (a) { a.hidden = false; a.focus(); } }
      return;
    }
    if (t.hasAttribute('data-loop-choice')) {
      const key = t.dataset.loopChoice;
      answer(id, key, t.dataset.value);
      redraw(id, '[data-loop-choice="' + cssEsc(key) + '"][aria-checked="true"]');
      if (App.haptic) App.haptic('select');
      return;
    }
    if (t.hasAttribute('data-loop-calendar')) {
      const text = calendarFile(id);
      if (!text || !window.URL || !URL.createObjectURL) return;
      const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'duly-item.ics';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (calendarReceipt(id)) {
        if (App.haptic) App.haptic('select');
        App.state['loopOpen:' + id] = true;
        redraw(id, '.loop-receipt');
      }
      return;
    }
    if (t.hasAttribute('data-loop-fold')) { App.loops.foldReceipt(id); redraw(id, '.loop-head'); return; }
    if (t.hasAttribute('data-loop-undo')) { after(undo(id), id); return; }
    if (t.hasAttribute('data-loop-reopen')) { after(reopen(id, t.dataset.loopReopen), id); return; }
    if (t.hasAttribute('data-loop-start')) {
      const lp = get(id);
      const child = start(t.dataset.loopStart, { parent: id, notice: true });
      if (child) { App.state['loopOpen:' + child.id] = true; if (lp) emit('loop', child.id, 'needs', null); }
      if (typeof _.render === 'function') _.render('inplace'); else redraw(id);
      return;
    }
    if (t.hasAttribute('data-loop-act')) {
      if (t.disabled) return;
      after(take(id, t.dataset.loopAct), id);
    }
  });
  function onField(e) {
    const f = e.target.closest && e.target.closest('[data-loop-field]');
    if (!f) return;
    const box = f.closest('[data-loop]');
    if (!box) return;
    const id = box.dataset.loop;
    answer(id, f.dataset.loopField, f.value);
    /* Update the exit labels and their enabled state in place; never
       redraw the field the student is typing in. */
    const v = view(get(id));
    if (!v.step) return;
    v.step.exits.forEach((x) => {
      const b = box.querySelector('[data-loop-act="' + cssEsc(x.key) + '"]');
      if (b) { b.textContent = x.label; b.disabled = x.disabled; }
    });
    v.step.fields.forEach((x) => {
      const err = box.querySelector('[data-loop-error="' + cssEsc(x.key) + '"]');
      if (err) { err.textContent = x.error || ''; err.hidden = !x.error; }
    });
  }
  document.addEventListener('input', onField);
  document.addEventListener('change', onField);
})();
