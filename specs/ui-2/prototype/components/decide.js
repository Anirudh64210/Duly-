/* components/decide.js: Round 5: the STEM OPT choice in place, track another case. */

(function () {
  'use strict';

  const C = window.C;
  const { esc, cls, buttonRow, link, field, chips, source, fmtDate, timeline } = C;

  /* stemDecide({ seeAll = true, label? }) : Home's next move, answered in
     place (Round 5, note 1). Reads App.stemPlan(), so Home and Next steps
     share one answer and one set of dates.
       not answered  "Decide on STEM OPT", its date and source, Yes, No, Not sure
       yes           "You plan to apply · Change", the three dates as a small
                     timeline, and See all steps (seeAll: false hides it)
       no            "Not applying this time · Change"
       not sure      "Decide any time", the three choices kept
     The buttons are data-answer="stemIntent"; app.js redraws every
     [data-stem-decide] in place when the answer changes, with a light tap
     and a short highlight, and never leaves the page. */
  function stemDecide(o) {
    const opt = o || {};
    const plan = window.App && App.stemPlan ? App.stemPlan() : null;
    if (!plan) return '';
    const d = plan.decide;
    const intent = plan.intent;
    const btn = (c, kind) => '<button type="button" class="' + cls('btn', kind) + '" data-answer="stemIntent" data-value="' + esc(c.value) + '"' +
      (intent === c.value ? ' aria-pressed="true"' : '') + '>' + esc(c.label) + '</button>';
    const change = '<button type="button" class="btn btn-text is-small" data-answer="stemIntent" data-value="">' + esc(d.change) + '</button>';
    const prep = plan.byKey.prepare || {};
    let body;
    if (intent === 'yes') {
      body = '<p class="sd-state t-meta"><span>' + esc(d.yes) + '</span>' + change + '</p>' +
        timeline(Object.assign(App.stemTimeline(), { compact: true, key: 'stem-home' })) +
        (opt.seeAll !== false && d.seeAll ? '<p class="sd-more">' + link(d.seeAll) + '</p>' : '');
    } else if (intent === 'no') {
      body = '<p class="sd-state t-meta"><span>' + esc(d.no) + '</span>' + change + '</p>';
    } else {
      body = '<div class="sd-ask">' +
        '<p class="sd-q"><span class="row-title">' + esc(d.title) + '</span>' + (prep.source ? source(prep.source, { inline: true }) : '') +
        (prep.date ? '<span class="sd-date row-value num">By ' + esc(fmtDate(prep.iso, { ref: plan.today })) + '</span>' : '') + '</p>' +
        '<div class="btn-group" role="group" aria-label="' + esc(d.title) + '">' +
        d.choices.map((c, i) => btn(c, i === 0 ? 'btn-primary' : (c.value === 'unsure' ? 'btn-text is-quiet' : 'btn-pill'))).join('') +
        '</div>' +
        (intent === 'unsure' ? '<p class="sd-state t-meta">' + esc(d.unsure) + '</p>' : '') +
        '</div>';
    }
    return '<div class="stem-decide" data-stem-decide' + (opt.seeAll === false ? ' data-see-all="no"' : '') + ' data-intent="' + esc(intent || 'none') + '">' + body + '</div>';
  }

  /* trackCase({ open? }) : "Track another case" on USCIS status (Round 5,
     note 2). Closed, one quiet button; open, the receipt number, what the
     case is for (a short list plus Other, which asks for the form by name),
     Cancel and Track this case. app.js wires it: App.addCase() checks and
     saves, an error shows under its field in place, and a saved case joins
     App.data.applications.items with status Unknown until rechecked. The
     open state is App.state['trackCase:open']. */
  function trackCase(o) {
    const opt = o || {};
    const apps = (window.DULY_SAMPLE || {}).applications || {};
    const a = apps.add || {};
    const st = (window.App && App.state) || {};
    const open = opt.open != null ? opt.open : !!st['trackCase:open'];
    if (!open) {
      return '<div class="track-case" data-track-case="closed">' +
        '<button type="button" class="btn btn-text" data-case-act="open">' + esc(a.open || 'Track another case') + '</button></div>';
    }
    const err = st['trackCase:error'] || {};
    const form = st['trackCase:form'] || null;
    const types = apps.formTypes || [];
    return '<div class="track-case is-open" data-track-case="open" role="group" aria-label="' + esc(a.open || 'Track another case') + '">' +
      field({ label: a.receiptLabel, key: 'trackCase:receipt', value: st['trackCase:receipt'] || null, placeholder: apps.receiptPlaceholder,
        autocomplete: 'off', error: err.receipt || null }) +
      '<div class="field"><p class="field-label" id="tc-form-label">' + esc(a.formLabel) + '</p>' +
      chips({ key: 'trackCase:form', label: a.formLabel, items: types.map((t) => ({ value: t.key, label: t.label, selected: form === t.key })) }) +
      (err.form ? '<p class="field-error">' + esc(err.form) + '</p>' : '') + '</div>' +
      '<div class="tc-other"' + (form === 'other' ? '' : ' hidden') + '>' +
      field({ label: a.otherLabel, key: 'trackCase:other', value: st['trackCase:other'] || null, placeholder: a.otherPlaceholder, error: err.other || null }) +
      '</div>' +
      buttonRow({
        back: '<button type="button" class="btn btn-text is-quiet" data-case-act="cancel">' + esc(a.cancel || 'Cancel') + '</button>',
        primary: '<button type="button" class="btn btn-pill" data-case-act="save">' + esc(a.save || 'Track this case') + '</button>',
      }) +
      '</div>';
  }

  Object.assign(C, { stemDecide, trackCase });
})();
