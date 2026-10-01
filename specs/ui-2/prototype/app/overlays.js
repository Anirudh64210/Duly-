/* app/overlays.js: The source popover, the menu sheet, the toast. */

(function () {
  'use strict';

  const App = window.App;
  const { isPhone, waitingIn } = App._;

  /* ---------------- popover ---------------- */
  let openPop = null;
  function togglePopover(mark) {
    if (openPop && openPop.mark === mark) { closePopover(true); return; }
    closePopover(false);
    const rule = C.getRule(mark.dataset.source);
    if (!rule) return;
    const id = C.uid('pop');
    const wrap = document.createElement('div');
    const sheet = isPhone();
    wrap.innerHTML = (sheet ? '<div class="scrim" data-scrim></div>' : '') + C.popover(rule, id);
    const nodes = Array.from(wrap.children);
    nodes.forEach((n) => document.body.appendChild(n));
    const pop = document.getElementById(id);
    if (sheet) {
      pop.classList.add('is-sheet');
      pop.setAttribute('aria-modal', 'true');
    } else {
      place(pop, mark);
    }
    mark.setAttribute('aria-expanded', 'true');
    mark.setAttribute('aria-controls', id);
    openPop = { mark: mark, nodes: nodes, pop: pop };
    pop.focus({ preventScroll: true });
    pop.addEventListener('keydown', trapFocus);
  }
  function place(pop, mark) {
    const r = mark.getBoundingClientRect();
    const w = pop.offsetWidth;
    let left = r.right - w + window.scrollX;
    const min = 16 + window.scrollX;
    const max = window.innerWidth - w - 16 + window.scrollX;
    left = Math.max(min, Math.min(left, max));
    let top = r.bottom + 8 + window.scrollY;
    const h = pop.offsetHeight;
    if (r.bottom + 8 + h > window.innerHeight - 16 && r.top - 8 - h > 16) top = r.top - 8 - h + window.scrollY;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }
  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const f = Array.from(this.querySelectorAll('a[href], button:not([disabled])'));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === this)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function closePopover(returnFocus) {
    if (!openPop) return;
    openPop.nodes.forEach((n) => n.remove());
    openPop.mark.setAttribute('aria-expanded', 'false');
    openPop.mark.removeAttribute('aria-controls');
    if (returnFocus && document.contains(openPop.mark)) openPop.mark.focus();
    openPop = null;
  }
  window.addEventListener('resize', () => { if (openPop) closePopover(false); });

  /* ---------------- menu (tablet and phone) ---------------- */
  let menuOpen = false;
  function toggleMenu() { if (menuOpen) closeMenu(); else openMenu(); }
  function openMenu() {
    const holder = document.createElement('div');
    holder.innerHTML = C.menuSheet({ route: App.route, waiting: waitingIn() });
    document.body.appendChild(holder.firstChild);
    const b = document.querySelector('[data-menu]');
    if (b) { b.setAttribute('aria-expanded', 'true'); b.textContent = 'Close'; }
    menuOpen = true;
    const first = document.querySelector('.menu a');
    if (first) first.focus();
  }
  function closeMenu() {
    const m = document.getElementById('menu');
    if (m) m.remove();
    const b = document.querySelector('[data-menu]');
    if (b) { b.setAttribute('aria-expanded', 'false'); b.textContent = 'Menu'; }
    menuOpen = false;
  }

  /* ---------------- toast ---------------- */
  let toastTimer = null;
  function toast(message, opts) {
    const o = opts || {};
    const old = document.querySelector('.toast');
    if (old) old.remove();
    clearTimeout(toastTimer);
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<span>' + C.esc(message) + '</span>' + (o.action ? '<button type="button">' + C.esc(o.action) + '</button>' : '');
    document.body.appendChild(el);
    if (o.action) {
      el.querySelector('button').addEventListener('click', () => { el.remove(); if (o.onAction) o.onAction(); });
    }
    toastTimer = setTimeout(() => el.remove(), o.action ? 6000 : 3000);
  }

  App.toast = toast;
  App.closePopover = closePopover;
  Object.assign(App._, { togglePopover, closePopover, toggleMenu, closeMenu, toast });
  /* Read by app/events.js. */
  Object.defineProperty(App._, 'openPop', { get: () => openPop });
  Object.defineProperty(App._, 'menuOpen', { get: () => menuOpen });
})();
