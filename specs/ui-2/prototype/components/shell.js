/* components/shell.js: Navigation, wordmark, sidebar, top bar, menu sheet, tab bar. */

(function () {
  'use strict';

  const C = window.C;
  const { esc, cls, icon } = C;

  /* ---------------------------------------------------------------- */
  /* Shell                                                              */
  /* ---------------------------------------------------------------- */

  /* Navigation (Round 3, note 7): human labels, each distinct from the rest.
     Old routes redirect (App.ALIASES in app.js): next and checklists go to
     steps, applications to uscis. Tab and sidebar use the same label;
     Timeline lives in Menu on a phone. */
  const NAV = [
    { name: 'home', label: 'Home', tab: true, icon: 'home' },
    { name: 'steps', label: 'Next steps', tab: true, icon: 'next' },
    { name: 'uscis', label: 'USCIS status', tab: true, icon: 'uscis' },
    { name: 'documents', label: 'Documents', tab: true, icon: 'documents' },
    { name: 'updates', label: 'News', tab: true, icon: 'news' },
    { name: 'timeline', label: 'Timeline' },
  ];
  const NAV_SECONDARY = [
    { name: 'case', label: 'Your profile' },
    { name: 'settings', label: 'Settings' },
    { name: 'feedback', label: 'Feedback' },
  ];

  /* wordmark({ large?, link = true }) : link false draws it as plain text,
     for onboarding, where the logo must not be a way out of setup. */
  function wordmark(o) {
    const p = o || {};
    const c = cls('wordmark', p.large && 'is-large');
    const inner = 'Duly<span class="dot" aria-hidden="true">.</span>';
    return p.link === false ? '<span class="' + c + '">' + inner + '</span>' : '<a class="' + c + '" href="#/home">' + inner + '</a>';
  }

  function navItem(p) {
    return '<a class="nav-item" href="#/' + esc(p.name) + '"' + (p.active ? ' aria-current="page"' : '') + '>' +
      '<span>' + esc(p.label) + '</span>' +
      (p.waiting ? '<span class="wait-dot" role="img" aria-label="Something here is waiting for you"></span>' : '') +
      '</a>';
  }
  function navList(items, route, waiting) {
    return '<nav class="nav">' + items.map((n) => navItem({
      name: n.name, label: n.label, active: n.name === route, waiting: (waiting || []).indexOf(n.name) !== -1,
    })).join('') + '</nav>';
  }
  function sidebar(p) {
    return '<aside class="sidebar" aria-label="Main">' + wordmark() +
      navList(NAV, p.route, p.waiting) +
      '<div class="sidebar-spacer"></div>' +
      navList(NAV_SECONDARY, p.route, p.waiting) +
      '</aside>';
  }
  function topbar(p) {
    return '<header class="topbar">' + wordmark() +
      '<div class="topbar-right">' + (p && p.date ? '<span class="t-micro">' + esc(p.date) + '</span>' : '') +
      '<button class="btn btn-text" type="button" data-menu aria-expanded="false" aria-controls="menu">Menu</button></div>' +
      '</header>';
  }
  function menuSheet(p) {
    return '<div class="menu" id="menu" role="dialog" aria-label="Menu">' +
      navList(NAV, p.route, p.waiting) + navList(NAV_SECONDARY, p.route, p.waiting) + '</div>';
  }
  function tabbar(p) {
    return '<nav class="tabbar" aria-label="Main">' + NAV.filter((n) => n.tab).map((n) =>
      '<a class="tab" href="#/' + n.name + '"' + (n.name === p.route ? ' aria-current="page"' : '') + '>' +
      icon(n.icon) + '<span>' + esc(n.label) + '</span></a>').join('') + '</nav>';
  }

  Object.assign(C, { NAV, NAV_SECONDARY, wordmark, navItem, sidebar, topbar, menuSheet, tabbar });
})();
