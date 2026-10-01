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

  /* App.calendarFile() : every reminder date as an .ics text (all-day events).
     App.addToCalendar() saves it once; the calendar app takes it from there. */
  function calendarFile() {
    const r = data.reminders || {};
    const stamp = (data.today.iso || '').replace(/-/g, '') + 'T060000Z';
    const next = (iso) => { const t = new Date(iso + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10).replace(/-/g, ''); };
    const ev = (r.dates || []).map((d, i) => [
      'BEGIN:VEVENT',
      'UID:duly-' + d.iso + '-' + i + '@duly.local',
      'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:' + d.iso.replace(/-/g, ''),
      'DTEND;VALUE=DATE:' + next(d.iso),
      'SUMMARY:' + String(d.title).replace(/([,;])/g, '\\$1'),
      'END:VEVENT',
    ].join('\r\n'));
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Duly//Dates//EN', 'CALSCALE:GREGORIAN'].concat(ev, ['END:VCALENDAR']).join('\r\n') + '\r\n';
  }
  App.calendarFile = calendarFile;
  App.addToCalendar = () => {
    const r = data.reminders || {};
    try {
      const url = URL.createObjectURL(new Blob([calendarFile()], { type: 'text/calendar' }));
      const a = document.createElement('a');
      a.href = url; a.download = r.file || 'dates.ics';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { /* blocked download: the toast still says what happened */ }
    App.state['remind:calendar'] = true;
    emit('calendar', 'remind:calendar', true, null);
    toast((r.dates || []).length + ' dates ready for your calendar');
  };

  /* ---------------- documents from anywhere ---------------- */
  function addDocument(file) {
    App.state.pendingDocument = file ? file.name : null;
    emit('document', 'add', file ? file.name : null, null);
    if (App.route !== 'documents') go('#/documents/add'); else render('inplace');
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
