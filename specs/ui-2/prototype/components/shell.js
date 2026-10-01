/* components/shell.js: Navigation, wordmark, sidebar, top bar, menu sheet, tab bar. */

(function () {
  'use strict';

  const C = window.C;
  const { esc, cls, icon } = C;

  /* ---------------------------------------------------------------- */
  /* Shell                                                              */
  /* ---------------------------------------------------------------- */

  /* Navigation: five places, the same five in the sidebar and the phone's
     tab bar, then Settings and Feedback quietly at the bottom. Ask is not a
     place: it is the field at the top of every page (C.askBar, drawn here
     with the top bar so it never moves).
       name      the place's own route
       routes    every route that belongs to the place: the nav item shows
                 as current on each, and a waiting dot on any of them shows
                 on the place
       fallback  the route the item opens while the place's own screen is not
                 registered
     Old routes keep working: #/today goes to #/home and #/papers to
     #/documents (App.ALIASES, set in app/nav.js). */
  const NAV = [
    { name: 'home', label: 'Home', tab: true, icon: 'home', routes: ['home', 'today'] },
    { name: 'plan', label: 'Plan', tab: true, icon: 'next', routes: ['plan', 'steps', 'uscis', 'timeline', 'employer', 'next', 'checklists', 'applications'], fallback: 'steps' },
    { name: 'documents', label: 'Documents', tab: true, icon: 'documents', routes: ['documents', 'papers'], fallback: 'papers' },
    { name: 'updates', label: 'Updates', tab: true, icon: 'news', routes: ['updates', 'news'] },
    { name: 'record', label: 'Record', tab: true, icon: 'timeline', routes: ['record', 'case'], fallback: 'case' },
  ];
  const NAV_SECONDARY = [
    { name: 'settings', label: 'Settings', routes: ['settings'], quiet: true },
    { name: 'feedback', label: 'Feedback', routes: ['feedback'], quiet: true },
  ];

  /* placeOf(route) : the nav name a route belongs to ('today', 'plan', ...),
     or the route itself when it belongs to none. */
  function placeOf(route) {
    const all = NAV.concat(NAV_SECONDARY);
    for (let i = 0; i < all.length; i += 1) if (all[i].routes.indexOf(route) !== -1) return all[i].name;
    return route;
  }
  /* The address a nav item opens: its own screen when registered, else the
     older page that holds the same things. */
  function hrefOf(n) {
    const S = window.SCREENS || {};
    if (S[n.name] || !n.fallback) return '#/' + n.name;
    return '#/' + n.fallback;
  }
  /* waiting: route names with something waiting (App.waitingIn()); a dot
     shows on the place that holds any of them. */
  function waitsIn(n, waiting) {
    return (waiting || []).some((w) => (n.routes || [n.name]).indexOf(w) !== -1);
  }

  /* wordmark({ large?, link = true }) : link false draws it as plain text,
     for onboarding, where the logo must not be a way out of setup. */
  function wordmark(o) {
    const p = o || {};
    const c = cls('wordmark', p.large && 'is-large');
    const inner = 'Duly<span class="dot" aria-hidden="true">.</span>';
    return p.link === false ? '<span class="' + c + '">' + inner + '</span>' : '<a class="' + c + '" href="' + hrefOf(NAV[0]) + '">' + inner + '</a>';
  }

  function navItem(p) {
    return '<a class="' + cls('nav-item', p.quiet && 'is-quiet') + '" href="' + esc(p.href || ('#/' + p.name)) + '" data-place="' + esc(p.name) + '"' +
      (p.active ? ' aria-current="page"' : '') + '>' +
      '<span>' + esc(p.label) + '</span>' +
      (p.waiting ? '<span class="wait-dot" role="img" aria-label="Something here is waiting for you"></span>' : '') +
      '</a>';
  }
  function navList(items, route, waiting, extra) {
    const here = placeOf(route);
    return '<nav class="' + cls('nav', extra) + '">' + items.map((n) => navItem({
      name: n.name, label: n.label, href: hrefOf(n), quiet: n.quiet,
      active: n.name === here, waiting: waitsIn(n, waiting),
    })).join('') + '</nav>';
  }
  function sidebar(p) {
    return '<aside class="sidebar" aria-label="Main">' + wordmark() +
      navList(NAV, p.route, p.waiting) +
      '<div class="sidebar-spacer"></div>' +
      navList(NAV_SECONDARY, p.route, p.waiting, 'nav-quiet') +
      '</aside>';
  }
  /* The phone and tablet top bar, then Ask: the field at the top of the
     content on every page, drawn once with the shell so it stays put. */
  function topbar(p) {
    return '<header class="topbar">' + wordmark() +
      '<div class="topbar-right">' + (p && p.date ? '<span class="t-micro">' + esc(p.date) + '</span>' : '') +
      '<button class="btn btn-text" type="button" data-menu aria-expanded="false" aria-controls="menu">Menu</button></div>' +
      '</header>' + (typeof C.askBar === 'function' ? C.askBar() : '');
  }
  function menuSheet(p) {
    return '<div class="menu" id="menu" role="dialog" aria-label="Menu">' +
      navList(NAV, p.route, p.waiting) + navList(NAV_SECONDARY, p.route, p.waiting, 'nav-quiet') + '</div>';
  }
  function tabbar(p) {
    const here = placeOf(p.route);
    return '<nav class="tabbar" aria-label="Main">' + NAV.filter((n) => n.tab).map((n) =>
      '<a class="tab" href="' + esc(hrefOf(n)) + '" data-place="' + esc(n.name) + '"' + (n.name === here ? ' aria-current="page"' : '') + '>' +
      icon(n.icon) + '<span>' + esc(n.label) + '</span></a>').join('') + '</nav>';
  }

  Object.assign(C, { NAV, NAV_SECONDARY, placeOf, wordmark, navItem, sidebar, topbar, menuSheet, tabbar });

  /* Settings and Feedback sit quietly at the bottom: the meta colour, the
     same size, no current-page accent weight beyond the colour. */
  if (typeof document !== 'undefined' && !document.getElementById('shell-style')) {
    const el = document.createElement('style');
    el.id = 'shell-style';
    el.textContent = [
      '.nav-quiet .nav-item { color: var(--ink-3); }',
      '.nav-quiet .nav-item:hover { color: var(--ink-2); }',
      '.nav-quiet .nav-item[aria-current="page"] { color: var(--accent); font-weight: 400; }',
    ].join('\n');
    (document.head || document.documentElement).appendChild(el);
  }
})();
