/* app/decisions.js: Round 5: the STEM OPT choice, one source for Home and Next steps. */

(function () {
  'use strict';

  const App = window.App;
  const data = App.data;
  const _ = App._;
  const { stemIntent } = App._;
  /* Defined in a file loaded later; looked up when called. */
  const haptic = (...a) => _.haptic(...a);
  const play = (...a) => _.play(...a);
  const layoutTimelines = (...a) => _.layoutTimelines(...a);
  const emit = (...a) => _.emit(...a);

  /* ---------------- round 5: the STEM OPT choice, one source (note 1) ---------------- */

  const isoT = (iso) => Date.parse(String(iso).slice(0, 10) + 'T12:00:00Z');
  const dayCount = (a, b) => Math.round((isoT(b) - isoT(a)) / 86400000);
  const nDays = (n) => n + (n === 1 ? ' day' : ' days');
  const fill = (tpl, v) => String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));

  /* App.stemTimeline({ today? }) : props for C.timeline from DULY_SAMPLE.stem.
     Scaled from today (or from the start of the first span once today is past
     it, so the Today marker travels through the plan) to the last day to
     file. Emphasis and the one line follow where today is: the window
     opening until it opens, then the last day to file. today overrides the
     sample's today, for a review link. */
  function stemTimeline(o) {
    const opt = o || {};
    const st = data.stem || {};
    const tl = st.timeline || {};
    const c = tl.captions || {};
    const today = opt.today || data.today.iso;
    const by = {};
    (st.dates || []).forEach((d) => { by[d.key] = d; });
    const opens = by.opens, closes = by.closes;
    const t = isoT(today);
    let emph = null, caption = null;
    if (opens && t < isoT(opens.iso)) { emph = 'opens'; caption = fill(c.before, { n: nDays(dayCount(today, opens.iso)) }); }
    else if (closes && t < isoT(closes.iso)) { emph = 'closes'; caption = fill(c.open, { n: nDays(dayCount(today, closes.iso)) }); }
    else if (closes && t === isoT(closes.iso)) { emph = 'closes'; caption = c.last; }
    else if (closes) { caption = fill(c.after, { date: closes.date }); }
    const spans = (tl.spans || []).filter((s) => by[s.from] && by[s.to]).map((s) => ({ label: s.label, from: by[s.from].iso, to: by[s.to].iso }));
    const first = spans.length ? spans[0].from : today;
    const end = closes ? closes.iso : today;
    return {
      key: 'stem', label: tl.label, today: today,
      from: isoT(first) < t ? first : today,
      to: isoT(end) > t ? end : today,
      spans: spans,
      marks: (st.dates || []).map((d) => ({ label: d.label, date: d.iso, emphasis: d.key === emph, source: d.source })),
      caption: caption,
    };
  }
  App.stemTimeline = stemTimeline;

  /* App.stemPlan({ today? }) : what Home and Next steps both read.
       intent    App.stemIntent()
       dates     the three key dates [{ key, iso, date, label, source, end? }]
       byKey     the same by key: prepare, opens, closes
       decide    DULY_SAMPLE.stem.decide (title, choices, lines, seeAll)
       timeline  App.stemTimeline() */
  function stemPlan(o) {
    const st = data.stem || {};
    const dates = (st.dates || []).map((d) => Object.assign({}, d));
    const byKey = {};
    dates.forEach((d) => { byKey[d.key] = d; });
    return {
      intent: stemIntent(), today: (o && o.today) || data.today.iso,
      dates: dates, byKey: byKey, decide: st.decide || {}, timeline: stemTimeline(o),
    };
  }
  App.stemPlan = stemPlan;

  /* App.setStemIntent('yes' | 'no' | 'unsure' | null) : the answer, from any
     screen. A light tap, the 'answer' event (Next steps redraws on it), and
     every C.stemDecide block on the page redrawn in place. */
  function setStemIntent(v, el) {
    App.state.stemIntent = v == null ? '' : String(v);
    haptic('tick');
    emit('answer', 'stemIntent', App.state.stemIntent, el || null);
    refreshDecide(el);
  }
  App.setStemIntent = setStemIntent;

  /* Redraw each [data-stem-decide] in place, keep focus inside it. */
  function refreshDecide(from) {
    const hadFocus = from && from.closest && from.closest('[data-stem-decide]');
    document.querySelectorAll('main#main [data-stem-decide]').forEach((box) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = C.stemDecide({ seeAll: box.dataset.seeAll !== 'no' });
      const next = tmp.firstElementChild;
      if (!next) return;
      box.replaceWith(next);
      layoutTimelines(next);
      play(next, 'is-arriving');
      if (hadFocus) {
        const f = next.querySelector('[data-answer="stemIntent"][aria-pressed="true"], [data-answer="stemIntent"], a');
        if (f) f.focus({ preventScroll: true });
      }
    });
  }

  Object.assign(App._, { setStemIntent });
})();
