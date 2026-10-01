/* app/nav.js: What a redraw keeps (scroll, open rows, focus) and the nav in place. */

(function () {
  'use strict';

  const App = window.App;
  const data = App.data;
  const _ = App._;
  const { cssEsc, waitingIn } = App._;
  /* Defined in a file loaded later; looked up when called. */
  const setOpen = (...a) => _.setOpen(...a);

  /* What a redraw must keep: scroll, open rows, focus. */
  function snapshot(root) {
    return {
      y: window.scrollY,
      open: Array.from(root.querySelectorAll('.item.is-open[data-key]')).map((el) => el.dataset.key),
      focus: describeFocus(root),
    };
  }
  function reopen(root, snap, still) {
    (snap.open || []).forEach((k) => {
      const item = root.querySelector('.item[data-key="' + cssEsc(k) + '"]');
      if (!item || item.classList.contains('is-open')) return;
      const list = item.parentElement;
      if (list && list.hasAttribute('data-accordion') && list.querySelector(':scope > .item.is-open')) return;
      setOpen(item, true);
      const d = item.querySelector(':scope > .disc');
      if (d) d.style.animation = 'none';
    });
    if (still) root.querySelectorAll('.bar > i').forEach((i) => { i.style.animation = 'none'; });
  }
  const FOCUS_ATTRS = ['data-task', 'data-field', 'data-draft-act', 'data-school-import', 'data-edit', 'data-next', 'data-action', 'data-toggle', 'data-copy'];
  function describeFocus(root) {
    const el = document.activeElement;
    if (!el || el === document.body || !root.contains(el)) return null;
    if (el.id && !/^(c|f|d|sh|disc|email|pop|src|sa|danger)-\d+(-\w+)?$/.test(el.id)) return '#' + cssEsc(el.id);
    if (el.matches('[data-answer]')) return '[data-answer="' + cssEsc(el.dataset.answer) + '"][data-value="' + cssEsc(el.dataset.value || '') + '"]';
    if (el.matches('[role="radio"][data-value]')) {
      const g = el.closest('[data-choices]');
      if (g) return '[data-choices="' + cssEsc(g.dataset.choices) + '"] [data-value="' + cssEsc(el.dataset.value) + '"]';
    }
    for (let i = 0; i < FOCUS_ATTRS.length; i++) {
      const a = FOCUS_ATTRS[i];
      if (el.hasAttribute(a)) {
        const scope = el.closest('[data-key]');
        return (scope ? '[data-key="' + cssEsc(scope.dataset.key) + '"] ' : '') + '[' + a + '="' + cssEsc(el.getAttribute(a)) + '"]';
      }
    }
    if (el.matches('[data-disclosure]')) {
      const item = el.closest('.item[data-key]');
      if (item) return '.item[data-key="' + cssEsc(item.dataset.key) + '"] ' + (el.classList.contains('task-more') ? '.task-more' : '> [data-disclosure]');
    }
    if (el.matches('a[href]')) return 'a[href="' + cssEsc(el.getAttribute('href')) + '"]';
    return null;
  }
  function refocus(root, sel) {
    if (document.activeElement && document.activeElement !== document.body && root.contains(document.activeElement)) return;
    let el = null;
    try { el = root.querySelector(sel); } catch (e) { el = null; }
    if (el && !el.closest('[hidden]')) el.focus({ preventScroll: true });
  }

  /* The nav is never redrawn: the current item and the waiting dots move in
     place. Each item is a place (data-place: home, plan, documents,
     updates, record, settings, feedback) that holds several routes (C.placeOf), so #/uscis
     shows Plan as current and a dot waiting in steps shows on Plan. */
  function updateNav() {
    const waiting = waitingIn();
    const placeOf = (r) => (C.placeOf ? C.placeOf(r) : r);
    const here = placeOf(App.route);
    const dots = waiting.map(placeOf);
    const nameOf = (a) => a.dataset.place || (a.getAttribute('href') || '').replace(/^#\//, '');
    document.querySelectorAll('.nav-item').forEach((a) => {
      const name = nameOf(a);
      if (name === here) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      const dot = a.querySelector('.wait-dot');
      const on = dots.indexOf(name) !== -1;
      if (on && !dot) a.insertAdjacentHTML('beforeend', '<span class="wait-dot" role="img" aria-label="Something here is waiting for you"></span>');
      if (!on && dot) dot.remove();
    });
    document.querySelectorAll('.tabbar .tab').forEach((a) => {
      if (nameOf(a) === here) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  App.updateNav = updateNav;

  function phoneDate() {
    const t = data.today.long.split(', ');
    return t.length > 1 ? t[1] : t[0];
  }

  /* The places' own names: #/today goes to #/home and #/papers to
     #/documents, sub-paths kept (#/papers/ead-card -> #/documents/ead-card).
     Set once every page file has run (they load after this one and an older
     one may point documents the other way), before the first draw. */
  function settleAliases() {
    const A = App.ALIASES || {};
    if (A.documents === 'papers') delete A.documents;
    if (A.home === 'today') delete A.home;
    A.today = 'home';
    A.papers = 'documents';
  }
  settleAliases();
  window.addEventListener('DOMContentLoaded', settleAliases);

  Object.assign(App._, { snapshot, reopen, refocus, updateNav, phoneDate });
})();
