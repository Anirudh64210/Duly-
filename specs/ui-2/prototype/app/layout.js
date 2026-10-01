/* app/layout.js: Timeline layout and the theme. */

(function () {
  'use strict';

  const App = window.App;
  const { reduced } = App._;

  /* ---------------- round 5: timelines (note 3) ---------------- */

  /* A C.timeline stepper fits its column: each label sits centred under
     its point (the first and last at the edges). Where two labels would
     touch, the longer name wraps; where even the dates would touch, the
     steps stack on a vertical line (.is-stacked). The accent line fills
     once per timeline key. */
  const drawn = {};
  let tlObserver = null;
  function layoutTimeline(fig) {
    if (!fig || !fig.isConnected) return;
    const ol = fig.querySelector('.tl-steps');
    if (!ol) return;
    if (tlObserver) tlObserver.observe(ol);
    fig.classList.remove('is-stacked', 'is-tight');
    const items = Array.from(ol.children);
    items.forEach((li) => { li.style.maxWidth = ''; });
    const W = ol.clientWidth;
    if (!W) return;
    const n = items.length;
    if (n > 1) {
      const dot = parseFloat(getComputedStyle(fig).getPropertyValue('--dot')) || 12;
      const D = (W - dot) / (n - 1);
      const A = D - 12;  /* the room between two points, less a 12px gap */
      const width = (li) => Math.max(li.getBoundingClientRect().width, li.firstElementChild ? li.firstElementChild.scrollWidth : 0);
      /* How far each label reaches left and right of its point. */
      const reach = () => items.map((li, i) => {
        const w = width(li);
        if (i === 0) return { l: 0, r: w - dot / 2 };
        if (i === n - 1) return { l: w - dot / 2, r: 0 };
        return { l: w / 2, r: w / 2 };
      });
      const need = reach();
      const cap = need.map((x) => ({ l: x.l, r: x.r }));
      for (let i = 0; i < n - 1; i += 1) {
        const a = need[i].r, b = need[i + 1].l;
        if (a + b <= A) continue;
        if (a <= A / 2) cap[i + 1].l = A - a;
        else if (b <= A / 2) cap[i].r = A - b;
        else { cap[i].r = A / 2; cap[i + 1].l = A / 2; }
      }
      items.forEach((li, i) => {
        const c = i === 0 ? cap[0].r + dot / 2 : (i === n - 1 ? cap[i].l + dot / 2 : 2 * Math.min(cap[i].l, cap[i].r));
        if (c < width(li) - 0.5) li.style.maxWidth = Math.floor(c) + 'px';
      });
      const touches = () => { const got = reach(); return got.some((x, i) => i < n - 1 && x.r + got[i + 1].l > D - 4); };
      if (touches() && fig.querySelector('.tl-y')) fig.classList.add('is-tight');
      if (touches()) {
        fig.classList.remove('is-tight');
        items.forEach((li) => { li.style.maxWidth = ''; });
        fig.classList.add('is-stacked');
      }
    }

    const key = fig.dataset.timeline || '';
    if (!drawn[key]) {
      drawn[key] = true;
      if (!reduced()) fig.classList.add('is-drawing');
    }
  }
  function layoutTimelines(root) {
    const scope = root || document;
    if (scope.matches && scope.matches('[data-timeline]')) layoutTimeline(scope);
    scope.querySelectorAll('[data-timeline]').forEach(layoutTimeline);
  }
  App.layoutTimelines = layoutTimelines;
  if (window.ResizeObserver) {
    tlObserver = new ResizeObserver((entries) => {
      entries.forEach((en) => {
        const fig = en.target.closest('[data-timeline]');
        if (!fig || !fig.isConnected) { tlObserver.unobserve(en.target); return; }
        const w = Math.round(en.contentRect.width);
        if (fig._tlW === w) return;
        fig._tlW = w;
        layoutTimeline(fig);
      });
    });
  } else {
    window.addEventListener('resize', () => layoutTimelines());
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => layoutTimelines());

  /* ---------------- theme ---------------- */
  function readTheme() { try { return localStorage.getItem('duly-theme') || 'system'; } catch (e) { return 'system'; } }
  function applyTheme(t) {
    const root = document.documentElement;
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
    try { localStorage.setItem('duly-theme', t); } catch (e) { /* storage may be blocked */ }
    App.state.theme = t;
  }
  App.setTheme = applyTheme;
  applyTheme(readTheme());

  Object.assign(App._, { layoutTimelines, applyTheme });
})();
