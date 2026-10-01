/* components/employer.js: Round 4: employer check, processing time, reminders, share. */

(function () {
  'use strict';

  const C = window.C;
  const { esc, escText, cls, icon, list, row, valueRow, toggle, info, fact } = C;
  const { SAMPLE, APP } = C._;

  /* employerCheck(emp = DULY_SAMPLE.employer, { next? }) : the two public facts
     about the student's own employer, as one list:
       E-Verify                takes part · source and checked date · source mark
       H-1B petitions approved the latest year on the right, Sample mark; opens
                               to the yearly counts and the data lag
     next: true adds the one quiet line after it ("Ask HR for the E-Verify
     company ID. It goes on your I-983."). Never a verdict on the employer. */
  function employerCheck(e, o) {
    const emp = e || SAMPLE().employer;
    if (!emp) return '';
    const opt = o || {};
    const ev = emp.everify || {};
    const h = emp.h1b || {};
    const years = (h.years || []).map((y) => valueRow({ label: y.fy, value: y.count + (h.unit ? ' ' + h.unit : ''), editable: false, num: true })).join('');
    const rows = [
      fact({ key: 'employer-everify', title: ev.label, value: ev.value, meta: ev.meta, sample: !ev.saved, source: ev.rule }),
      fact({
        key: 'employer-h1b', title: h.label, value: h.latest, meta: h.meta, sample: h.sample, source: h.rule,
        content: '<div class="list">' + years + '</div>' + (h.lag ? '<p class="t-meta">' + escText(h.lag) + '</p>' : ''),
      }),
    ];
    return list(rows, { accordion: false, label: emp.title || 'Employer check' }) +
      (opt.next && ev.next ? '<p class="employer-next t-meta">' + escText(ev.next) + '</p>' : '');
  }

  /* employerRow(emp = DULY_SAMPLE.employer) : one link row to #/employer, for
     Your profile's Job section or a STEM OPT step. */
  function employerRow(e) {
    const emp = e || SAMPLE().employer;
    if (!emp) return '';
    const bits = [emp.everify ? emp.everify.label + ': ' + String(emp.everify.value || '').toLowerCase() : '', emp.h1b ? 'H-1B: ' + emp.h1b.latest : ''];
    return row({ key: 'employer', title: emp.title || 'Employer check', meta: bits.filter(Boolean).join(' · '), href: '#/employer' });
  }

  /* processingTime(pt) : USCIS's published processing time for a filed
     application, from App.processingFor(app). The line is USCIS's figure,
     never a prediction: "USCIS says 80% of these cases are decided within
     3 months." with form, office and as-of date under it, the Sample mark in
     the prototype, and the source mark. One item; wrap it in C.list. */
  function processingTime(pt) {
    if (!pt) return '';
    return fact({ key: 'processing-' + pt.key, title: pt.line, meta: pt.meta, sample: pt.sample, source: pt.rule });
  }

  /* reminders(r = DULY_SAMPLE.reminders) : the channels, as setting rows. Email
     and phone are switches (App.state['remind:email'], 'remind:phone');
     Calendar is one button that saves every date as a calendar file
     (App.addToCalendar). All free; say so once, behind the section's ⓘ. */
  function reminders(r) {
    const rr = r || SAMPLE().reminders;
    if (!rr) return '';
    const st = APP().state || {};
    const rows = (rr.channels || []).map((ch) => {
      const k = 'remind:' + ch.key;
      const on = st[k] != null ? !!st[k] : !!ch.on;
      const control = ch.action
        ? '<button type="button" class="btn btn-pill" data-calendar>' + esc(ch.action) + '</button>'
        : toggle({ key: k, on: on, label: ch.label });
      return '<div class="item srow" data-key="' + esc(k) + '"><div class="row is-static">' +
        '<span class="row-text"><span class="row-title">' + esc(ch.label) + '</span>' +
        (ch.meta ? '<span class="row-meta">' + esc(ch.meta) + '</span>' : '') + '</span>' +
        '<span class="s-control">' + (ch.info ? info(ch.info, { inline: false }) : '') + control + '</span>' +
        '</div></div>';
    });
    return list(rows, { accordion: false, label: 'Reminder channels' });
  }

  /* shareButton({ title, label = 'Share', reveal = true }) : Share on a document
     row. One tap opens the phone's own share sheet (App.share; navigator.share
     where the browser has it). On a wide window it shows on hover or focus;
     on a touch screen it always shows. */
  function shareButton(p) {
    const o = p || {};
    return '<button type="button" class="' + cls('btn btn-text is-small share-btn', o.reveal !== false && 'row-reveal') + '" data-share="' + esc(o.title || '') + '" aria-label="' + esc('Share ' + (o.title || 'document')) + '">' +
      icon('share') + '<span>' + esc(o.label || 'Share') + '</span></button>';
  }

  Object.assign(C, { employerCheck, employerRow, processingTime, reminders, shareButton });
})();
