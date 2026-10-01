/* app/router.js: The router: aliases, history, render, the page fade. */

(function () {
  'use strict';

  const App = window.App;
  const data = App.data;
  const _ = App._;
  const { reduced, waitingIn, layoutTimelines } = App._;
  /* Defined in a file loaded later; looked up when called. */
  const snapshot = (...a) => _.snapshot(...a);
  const reopen = (...a) => _.reopen(...a);
  const refocus = (...a) => _.refocus(...a);
  const updateNav = (...a) => _.updateNav(...a);
  const phoneDate = (...a) => _.phoneDate(...a);
  const closePopover = (...a) => _.closePopover(...a);
  const closeMenu = (...a) => _.closeMenu(...a);

  /* ---------------- router ---------------- */
  const ALIASES = { next: 'steps', checklists: 'steps', applications: 'uscis' };
  App.ALIASES = ALIASES;
  /* An old hash is swapped for its new one in place, keeping history.state. */
  function redirect() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    const parts = h.split('/');
    /* After Delete everything (App.state.deleted) only Welcome and its
       onboarding open; any other route, Back included, lands on Welcome.
       Finishing onboarding again clears the flag (welcome.js). */
    if (App.state.deleted && parts[0] !== 'welcome' && parts[0] !== 'onboarding') {
      try { history.replaceState(history.state, '', '#/welcome'); } catch (e) { location.replace('#/welcome'); }
      return;
    }
    const to = ALIASES[parts[0]];
    if (!to) return;
    /* An alias is followed only when its page exists (an alias may carry a
       path, 'plan/status'), so a place not built yet never strands a link. */
    if (!window.SCREENS[String(to).split('/')[0]]) return;
    parts[0] = to;
    try { history.replaceState(history.state, '', '#/' + parts.join('/')); } catch (e) { location.replace('#/' + parts.join('/')); }
  }
  function parse() {
    redirect();
    const h = (location.hash || '').replace(/^#\/?/, '');
    const parts = h.split('/').filter(Boolean).map(decodeURIComponent);
    return { name: parts[0] || 'home', params: parts.slice(1) };
  }

  /* go(path, { replace?, inPlace? }) : replace swaps the current history
     entry; inPlace keeps the scroll and skips the fade. */
  let pending = null;
  function go(path, opts) {
    const o = opts || {};
    const target = path.charAt(0) === '#' ? path : '#/' + path.replace(/^\//, '');
    if (location.hash === target) { render('inplace'); return; }
    pending = o;
    if (o.replace) location.replace(target); else location.hash = target;
  }

  /* History entries: each gets a key and an index in history.state, so Back
     and Forward find their scroll and open rows, and App.from is the entry
     before this one. */
  const session = Date.now().toString(36);
  let seq = 0;
  let curKey = null;
  let curIdx = 0;
  const entries = {};   /* idx -> { hash, title } */
  const saved = {};     /* key -> snapshot */
  try { history.scrollRestoration = 'manual'; } catch (e) { /* older browsers */ }

  function stamp(replace) {
    const st = history.state;
    if (st && st.dulyKey && !replace) {
      curKey = st.dulyKey;
      curIdx = st.idx || 0;
      return saved[curKey] || null;
    }
    if (!replace && curKey != null) curIdx += 1;
    curKey = session + '-' + (seq += 1);
    try { history.replaceState({ dulyKey: curKey, idx: curIdx }, '', location.href); } catch (e) { /* file:// */ }
    Object.keys(entries).forEach((i) => { if (Number(i) > curIdx) delete entries[i]; });
    return null;
  }

  function onNavigate() {
    const o = pending || {};
    pending = null;
    const root = document.getElementById('main');
    if (curKey && root) saved[curKey] = snapshot(root);
    const prevRoute = App.route;
    const prevParams = App.params;
    const back = stamp(!!o.replace);
    const r = parse();
    const screen = window.SCREENS[r.name];
    const inPlace = screen && (typeof screen.paramsInPlace === 'function' ? screen.paramsInPlace(r.params, prevParams) : screen.paramsInPlace);
    const quiet = o.inPlace || (inPlace && r.name === prevRoute);
    if (quiet) render('inplace');
    else render('page', App.state.deleted ? null : back);
  }

  let frame = null;    /* 'shell' | 'bare' */
  let shellDrawn = false;

  /* render(mode, restore?) : mode is 'launch', 'page' or 'inplace'. */
  function render(mode, restore) {
    const r = parse();
    let screen = window.SCREENS[r.name];
    if (!screen) { history.replaceState(history.state, '', '#/home'); r.name = 'home'; screen = window.SCREENS.home; }
    const old = document.getElementById('main');
    const keep = mode === 'inplace' && old ? snapshot(old) : null;

    App.route = r.name;
    App.params = r.params;
    entries[curIdx] = { hash: location.hash || '#/home', title: titleOf(screen, r) };
    const prev = entries[curIdx - 1];
    App.from = prev && prev.hash !== entries[curIdx].hash ? prev : null;
    closePopover(false);
    closeMenu();

    const main = document.createElement('main');
    main.id = 'main';
    main.className = screen.bare ? 'bare' : 'col';
    main.innerHTML = screen.render(data, r.params);

    const motion = !reduced();
    const want = screen.bare ? 'bare' : 'shell';
    const app = document.getElementById('app');
    if (want !== frame) {
      if (want === 'bare') {
        app.innerHTML = '';
        app.appendChild(main);
        if (motion && mode !== 'launch') main.classList.add('is-fading');
        else if (motion) main.classList.add('is-entering');
      } else {
        const nav = { route: r.name, waiting: waitingIn() };
        app.innerHTML = '<div class="shell">' + C.sidebar(nav) +
          '<div class="main" id="main-wrap">' + C.topbar({ date: phoneDate() }) + '</div></div>' + C.tabbar(nav);
        document.getElementById('main-wrap').appendChild(main);
        /* The rise plays once, the first time the shell appears. */
        if (motion) main.classList.add(shellDrawn ? 'is-fading' : 'is-entering');
        shellDrawn = true;
      }
      frame = want;
    } else if (old) {
      if (mode === 'page' && motion) {
        old.parentNode.insertBefore(main, old);
        leave(old);
        main.classList.add('is-fading');
      } else {
        old.parentNode.replaceChild(main, old);
      }
    }
    updateNav();
    /* Onboarding pages carry the product name once, in the wordmark. */
    document.title = screen.bare ? screen.title : screen.title + ' · Duly';

    if (mode === 'inplace') {
      if (keep) reopen(main, keep, true);
      window.scrollTo(0, keep ? keep.y : window.scrollY);
    } else {
      if (restore) reopen(main, restore, false);
      window.scrollTo(0, restore ? restore.y : 0);
      const h1 = main.querySelector('h1');
      if (h1 && App.booted) h1.focus({ preventScroll: true });
    }
    if (typeof screen.mount === 'function') screen.mount(main, data, r.params);
    layoutTimelines(main);
    if (keep && keep.focus) refocus(main, keep.focus);
  }

  function titleOf(screen, r) {
    if (typeof screen.titleFor === 'function') {
      try { return screen.titleFor(r.params, data) || screen.title; } catch (e) { return screen.title; }
    }
    return screen.title;
  }

  /* The old column fades out where it stood while the new one fades in. */
  function leave(old) {
    const box = old.getBoundingClientRect();
    old.removeAttribute('id');
    old.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    old.setAttribute('aria-hidden', 'true');
    old.inert = true;
    old.classList.remove('is-entering', 'is-fading');
    old.classList.add('is-leaving-page');
    Object.assign(old.style, {
      top: box.top + 'px', left: box.left + 'px', width: box.width + 'px', height: box.height + 'px',
    });
    document.body.appendChild(old);
    setTimeout(() => old.remove(), 180);
  }

  App.go = go;
  App.rerender = () => render('inplace');
  Object.assign(App._, { go, stamp, onNavigate, render });
})();
