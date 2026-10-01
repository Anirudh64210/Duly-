/* app/documents.js: Share a document, dates to a calendar, add a document from anywhere. */

(function () {
  'use strict';

  const App = window.App;
  const data = App.data;
  const _ = App._;
  const { isPhone } = App._;
  /* Defined in a file loaded later; looked up when called. */
  const go = (...a) => _.go(...a);
  const render = (...a) => _.render(...a);
  const emit = (...a) => _.emit(...a);
  const schoolImportFound = (...a) => _.schoolImportFound(...a);
  const toast = (...a) => _.toast(...a);

  /* App.share({ title, text?, url? }) : one tap to the phone's share sheet
     where the browser has one; otherwise a quiet toast (the prototype has no
     real files). Emits 'share'. */
  function share(doc) {
    const d = typeof doc === 'string' ? { title: doc } : (doc || {});
    emit('share', d.title || '', true, null);
    if (navigator.share && isPhone()) {
      navigator.share({ title: d.title, text: d.text || d.title, url: d.url }).catch(() => { /* closed */ });
      return;
    }
    toast('Share ' + (d.title || 'this document') + ' to Mail, Messages or any app');
  }
  App.share = share;

  /* App.calendarEvents() : every date the calendar file holds, each with a
     UID taken from its item id, so adding the file again after a date moves
     replaces that event instead of adding a second one (VALUE-2).
       STEM plan, while there is no STEM card and STEM is not answered no:
         start preparing 2027-02-13 - 90 days = 2026-11-15, less 1 month
           = 2026-10-15 (a planning date)
         window opens 2027-02-13 - 90 days = 2026-11-15
       Document watch (feature 6), each one still ahead:
         EAD card 2027-02-13 (with the STEM plan: the last day to file)
         F-1 visa 2028-08-01 (sample), passport 2031-07-09 (sample)
         travel signature 2026-03-02 + 6 months = 2026-09-02 and program
           end 2025-12-18 are passed, so left out
       Reports you owe (feature 4): each open row due today or later.
     Today 2026-09-30, Priya's record: 5 events. Checked with python3. */
  function calendarEvents() {
    const rec = App.record();
    const D = App.dates;
    const t = data.today.iso;
    const out = [];
    const add = (id, iso, title) => { if (D.okIso(iso) && iso >= t) out.push({ uid: 'duly-' + id + '@duly.local', iso: iso, title: title }); };
    const until = rec.opt && rec.opt.until;
    const stemPlan = D.okIso(until) && !(rec.stem && rec.stem.card) && !(App.stemIntent && App.stemIntent() === 'no');
    if (stemPlan) {
      const opens = D.addDays(until, -App.RULE.stemBefore);
      add('stem:prepare', D.addMonths(opens, -1), 'Start preparing for STEM OPT');
      add('stem:opens', opens, 'STEM OPT window opens');
    }
    const ends = { ead: 'EAD card ends', stemCard: 'STEM OPT card ends', visa: null, passport: 'Passport ends', travelSignature: 'Travel signature runs out', program: 'Program ends' };
    App.documentWatch().items.forEach((i) => {
      if (i.passed) return;
      let title = i.key === 'ead' && stemPlan ? 'EAD card ends. Last day to file for STEM OPT' : (ends[i.key] || i.title + ' ends');
      if (i.sample) title += ' (sample date)';
      add('watch:' + i.key, i.iso, title);
    });
    App.reportsOwed().open.forEach((r) => add(r.id, r.due, r.title + (r.sample ? ' (sample date)' : '')));
    return out.sort((a, b) => (a.iso < b.iso ? -1 : (a.iso > b.iso ? 1 : 0)));
  }
  App.calendarEvents = calendarEvents;

  /* App.calendarFile() : those dates as an .ics text (all-day events).
     App.addToCalendar() saves it; the calendar app takes it from there. */
  function calendarFile() {
    const stamp = (data.today.iso || '').replace(/-/g, '') + 'T060000Z';
    const next = (iso) => App.dates.addDays(iso, 1).replace(/-/g, '');
    const ev = calendarEvents().map((d) => [
      'BEGIN:VEVENT',
      'UID:' + d.uid,
      'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:' + d.iso.replace(/-/g, ''),
      'DTEND;VALUE=DATE:' + next(d.iso),
      'SUMMARY:' + String(d.title).replace(/([,;\\])/g, '\\$1'),
      'END:VEVENT',
    ].join('\r\n'));
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Duly//Dates//EN', 'CALSCALE:GREGORIAN'].concat(ev, ['END:VCALENDAR']).join('\r\n') + '\r\n';
  }
  App.calendarFile = calendarFile;
  App.addToCalendar = () => {
    const r = data.reminders || {};
    const n = calendarEvents().length;
    try {
      const url = URL.createObjectURL(new Blob([calendarFile()], { type: 'text/calendar' }));
      const a = document.createElement('a');
      a.href = url; a.download = r.file || 'dates.ics';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { /* blocked download: the toast still says what happened */ }
    App.state['remind:calendar'] = true;
    emit('calendar', 'remind:calendar', true, null);
    toast(n + (n === 1 ? ' date' : ' dates') + ' ready for your calendar');
  };

  /* ---------------- documents from anywhere ---------------- */
  function addDocument(file) {
    App.state.pendingDocument = file ? file.name : null;
    emit('document', 'add', file ? file.name : null, null);
    /* Documents (#/documents); #/papers redirects there. */
    if (App.route !== 'papers' && App.route !== 'documents') go('#/documents/add'); else render('inplace');
  }
  App.addDocument = addDocument;
  window.addEventListener('dragover', (e) => { e.preventDefault(); });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    /* A school PDF dropped on the school box gives steps, not a document. */
    const zone = e.target && e.target.closest && e.target.closest('[data-school-import-zone]');
    if (zone && f) { schoolImportFound(zone.closest('.school-import'), { label: f.name, href: null }); return; }
    addDocument(f || null);
  });

  Object.assign(App._, { share, addDocument });
})();
