/* Duly ui-2 prototype: router, shell and shared behaviour.
   A screen registers itself:
     window.SCREENS.home = {
       title: 'Home',
       bare?: true,                 // no sidebar (onboarding)
       render(data, params) -> html,
       mount?(root, data, params),  // wire screen-specific behaviour
     };
   Routes are #/<name>[/<param>...]; params arrive as an array of strings.
   Shared behaviour is wired here once, by data attributes, and every change
   is announced as a 'duly:change' event on document:
     detail = { kind, key, value, el }
     kind: 'task' | 'choice' | 'answer' | 'toggle' | 'edit' | 'field' | 'confirm' | 'step' */

window.SCREENS = window.SCREENS || {};

(function () {
  'use strict';

  const data = window.DULY_SAMPLE;
  const App = {
    data: data,
    state: {},
    route: null,
    params: [],
    go: go,
    rerender: () => render(false),
    toast: toast,
    confetti: confetti,
    closePopover: closePopover,
    emit: emit,
  };
  window.App = App;

  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isPhone = () => window.matchMedia('(max-width: 640px)').matches;

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

  /* ---------------- router ---------------- */
  function parse() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    const parts = h.split('/').filter(Boolean).map(decodeURIComponent);
    return { name: parts[0] || 'home', params: parts.slice(1) };
  }
  function go(path) {
    const target = path.charAt(0) === '#' ? path : '#/' + path.replace(/^\//, '');
    if (location.hash === target) render(false); else location.hash = target;
  }

  function render(animate) {
    const r = parse();
    let screen = window.SCREENS[r.name];
    if (!screen) { r.name = 'home'; screen = window.SCREENS.home; }
    App.route = r.name;
    App.params = r.params;
    closePopover();
    closeMenu();

    const app = document.getElementById('app');
    const body = screen ? screen.render(data, r.params) : '';
    const enter = animate !== false && !reduced() ? ' is-entering' : '';

    if (screen && screen.bare) {
      app.innerHTML = '<main class="bare' + enter + '" id="main">' + body + '</main>';
    } else {
      const nav = { route: r.name, waiting: data.waitingIn || [] };
      app.innerHTML =
        '<div class="shell">' + C.sidebar(nav) +
        '<div class="main">' + C.topbar({ date: phoneDate() }) +
        '<main class="col' + enter + '" id="main">' + body + '</main>' +
        '</div></div>' + C.tabbar(nav);
    }
    document.title = (screen ? screen.title + ' · ' : '') + 'Duly';

    const root = document.getElementById('main');
    if (animate !== false) {
      window.scrollTo(0, 0);
      const h1 = root.querySelector('h1');
      if (h1 && App.booted) h1.focus({ preventScroll: true });
    }
    if (screen && typeof screen.mount === 'function') screen.mount(root, data, r.params);
  }

  function phoneDate() {
    const t = data.today.long.split(', ');
    return t.length > 1 ? t[1] : t[0];
  }

  /* ---------------- events ---------------- */
  function emit(kind, key, value, el) {
    document.dispatchEvent(new CustomEvent('duly:change', { detail: { kind: kind, key: key, value: value, el: el } }));
  }

  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onInput);

  function onClick(e) {
    const t = e.target;

    /* source mark */
    const src = t.closest('[data-source]');
    if (src) { e.preventDefault(); e.stopPropagation(); togglePopover(src); return; }
    const pop = t.closest('.pop');
    if (pop) {
      if (t.closest('[data-show-all]')) {
        const q = pop.querySelector('.pop-quote');
        if (q) q.classList.add('is-all');
        t.closest('[data-show-all]').remove();
      }
      return;
    }
    if (openPop && !t.closest('.pop')) closePopover(false);

    /* menu */
    if (t.closest('[data-menu]')) { toggleMenu(); return; }
    if (menuOpen && !t.closest('.menu')) closeMenu();

    /* disclosure rows: one open per list */
    const head = t.closest('[data-disclosure]');
    if (head && !t.closest('a, button, input, textarea, select, [contenteditable]')) { toggleDisclosure(head); return; }

    /* checkbox tasks */
    const check = t.closest('[role="checkbox"][data-task]');
    if (check) { setTask(check, check.getAttribute('aria-checked') !== 'true'); return; }

    /* radios: choice cards and chips */
    const radio = t.closest('[role="radiogroup"] [role="radio"]');
    if (radio) { selectRadio(radio); return; }

    /* switches */
    const sw = t.closest('[role="switch"]');
    if (sw) {
      const on = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', on ? 'true' : 'false');
      App.state[sw.dataset.toggle] = on;
      emit('toggle', sw.dataset.toggle, on, sw);
      return;
    }

    /* inline asks and "I'm not sure" */
    const ans = t.closest('[data-answer]');
    if (ans) { answer(ans); return; }

    /* destructive confirm */
    const conf = t.closest('[data-confirm]');
    if (conf) {
      const box = document.getElementById(conf.dataset.confirm);
      conf.hidden = true; box.hidden = false;
      const first = box.querySelector('button'); if (first) first.focus();
      return;
    }
    const keep = t.closest('[data-keep]');
    if (keep) {
      const box = document.getElementById(keep.dataset.keep);
      box.hidden = true;
      const trigger = document.querySelector('[data-confirm="' + keep.dataset.keep + '"]');
      if (trigger) { trigger.hidden = false; trigger.focus(); }
      return;
    }
    const confirmed = t.closest('[data-confirmed]');
    if (confirmed) { emit('confirm', confirmed.dataset.confirmed, true, confirmed); return; }

    /* copy email */
    const copy = t.closest('[data-copy]');
    if (copy) { copyEmail(copy); return; }

    /* edit in place */
    const edit = t.closest('[data-edit]');
    if (edit) { startEdit(edit); return; }
    const save = t.closest('[data-edit-save]');
    if (save) { finishEdit(save.closest('.vrow'), true); return; }
    const cancel = t.closest('[data-edit-cancel]');
    if (cancel) { finishEdit(cancel.closest('.vrow'), false); return; }

    /* focus a field (date "Change") */
    const f = t.closest('[data-focus]');
    if (f) { const el = document.getElementById(f.dataset.focus); if (el) el.focus(); return; }

    /* onboarding step list */
    const step = t.closest('[data-step]');
    if (step) { emit('step', 'step', Number(step.dataset.step), step); return; }

    /* generic toast trigger */
    const tt = t.closest('[data-toast]');
    if (tt) { toast(tt.dataset.toast); }
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      if (openPop) { closePopover(true); return; }
      if (menuOpen) { closeMenu(); const m = document.querySelector('[data-menu]'); if (m) m.focus(); return; }
      const editing = document.querySelector('.vrow.is-editing');
      if (editing) { finishEdit(editing, false); return; }
    }
    const t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t.matches && t.matches('[data-disclosure]')) {
      e.preventDefault(); toggleDisclosure(t); return;
    }
    if (e.key === 'Enter' && t.closest && t.closest('.vrow.is-editing') && t.matches('input')) {
      e.preventDefault(); finishEdit(t.closest('.vrow'), true); return;
    }
    /* arrow keys inside a radiogroup */
    if (/^Arrow(Up|Down|Left|Right)$/.test(e.key) && t.matches && t.matches('[role="radio"]')) {
      const group = t.closest('[role="radiogroup"]');
      const items = Array.from(group.querySelectorAll('[role="radio"]'));
      const i = items.indexOf(t);
      const d = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
      const next = items[(i + d + items.length) % items.length];
      e.preventDefault(); next.focus(); selectRadio(next);
      return;
    }
    /* Cmd or Ctrl + O adds a document from anywhere */
    if ((e.metaKey || e.ctrlKey) && (e.key === 'o' || e.key === 'O')) {
      e.preventDefault(); addDocument();
    }
  }

  function onInput(e) {
    const el = e.target;
    if (!el.dataset || !el.dataset.field) return;
    App.state[el.dataset.field] = el.value;
    emit('field', el.dataset.field, el.value, el);
  }

  /* ---------------- disclosure ---------------- */
  function toggleDisclosure(head) {
    const item = head.closest('.item');
    const open = head.getAttribute('aria-expanded') !== 'true';
    const listEl = item.parentElement;
    if (open && listEl && listEl.hasAttribute('data-accordion')) {
      Array.from(listEl.children).forEach((sib) => { if (sib !== item) setOpen(sib, false); });
    }
    setOpen(item, open);
  }
  function setOpen(item, open) {
    const head = item.querySelector(':scope > [data-disclosure]');
    const disc = item.querySelector(':scope > .disc');
    if (!head || !disc) return;
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    item.classList.toggle('is-open', open);
    disc.hidden = !open;
  }
  App.setOpen = setOpen;

  /* ---------------- tasks ---------------- */
  function setTask(check, on) {
    check.setAttribute('aria-checked', on ? 'true' : 'false');
    const item = check.closest('.task');
    const key = check.dataset.task;
    if (item) {
      item.classList.toggle('is-done', on);
      const meta = item.querySelector('.row-meta');
      if (meta) {
        const doneMeta = meta.dataset.doneMeta || ('Done ' + shortToday());
        meta.textContent = on ? doneMeta : meta.dataset.meta;
      }
    }
    App.state['task:' + key] = on;
    updateProgress(check.closest('main'));
    emit('task', key, on, check);
  }
  function shortToday() { return data.today.short.replace(/, \d{4}$/, ''); }
  function updateProgress(root) {
    if (!root) return;
    const prog = root.querySelector('[data-progress]');
    if (!prog) return;
    const checks = root.querySelectorAll('[role="checkbox"][data-task]');
    const done = Array.from(checks).filter((c) => c.getAttribute('aria-checked') === 'true').length;
    const pct = checks.length ? Math.round((done / checks.length) * 100) : 0;
    const fill = prog.querySelector('.bar > i');
    if (fill) fill.style.width = pct + '%';
    const bar = prog.querySelector('.bar');
    if (bar) bar.setAttribute('aria-valuenow', pct);
    const label = prog.querySelector('[data-progress-label]');
    if (label) {
      const suffix = label.dataset.suffix || '';
      label.textContent = done + ' of ' + checks.length + ' done' + (suffix ? ' · ' + suffix : '');
    }
    if (checks.length && done === checks.length) confetti(prog);
  }
  App.updateProgress = updateProgress;

  /* ---------------- radios ---------------- */
  function selectRadio(radio) {
    const group = radio.closest('[role="radiogroup"]');
    group.querySelectorAll('[role="radio"]').forEach((r) => {
      const on = r === radio;
      r.setAttribute('aria-checked', on ? 'true' : 'false');
      r.tabIndex = on ? 0 : -1;
    });
    const key = group.dataset.choices;
    App.state[key] = radio.dataset.value;
    if (key === 'theme') applyTheme(radio.dataset.value);
    emit('choice', key, radio.dataset.value, radio);
  }

  /* ---------------- inline asks ---------------- */
  function answer(btn) {
    const key = btn.dataset.answer;
    const value = btn.dataset.value;
    App.state[key] = value;
    const item = btn.closest('.ask');
    if (item) {
      if (value === 'unsure') {
        const n = item.querySelector('[data-ask-note]');
        if (n) n.hidden = false;
      } else if (!reduced()) {
        item.classList.add('is-leaving');
        setTimeout(() => item.remove(), 280);
      } else {
        item.remove();
      }
    }
    emit('answer', key, value, btn);
  }

  /* ---------------- edit in place ---------------- */
  function startEdit(btn) {
    const row = btn.closest('.vrow');
    if (!row || row.classList.contains('is-editing')) return;
    const current = document.querySelector('.vrow.is-editing');
    if (current) finishEdit(current, false);
    row.classList.add('is-editing');
    const label = row.querySelector('.v-label').textContent;
    const box = document.createElement('div');
    box.className = 'v-edit';
    box.innerHTML = '<input class="input" type="text" aria-label="' + C.esc(label) + '" value="' + C.esc(btn.textContent) + '">' +
      '<button type="button" class="btn btn-pill" data-edit-save>Save</button>' +
      '<button type="button" class="btn btn-text is-quiet" data-edit-cancel>Cancel</button>';
    btn.hidden = true;
    row.querySelector('.row').appendChild(box);
    row.querySelector('.row').style.flexWrap = 'wrap';
    const input = box.querySelector('input');
    input.focus(); input.select();
  }
  function finishEdit(row, keep) {
    if (!row) return;
    const btn = row.querySelector('[data-edit]');
    const box = row.querySelector('.v-edit');
    if (keep && box) {
      const v = box.querySelector('input').value.trim();
      if (v) {
        btn.textContent = v;
        App.state['edit:' + btn.dataset.edit] = v;
        emit('edit', btn.dataset.edit, v, btn);
        toast('Saved');
      }
    }
    if (box) box.remove();
    row.querySelector('.row').style.flexWrap = '';
    row.classList.remove('is-editing');
    btn.hidden = false;
    btn.focus();
  }

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
    holder.innerHTML = C.menuSheet({ route: App.route, waiting: data.waitingIn || [] });
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

  /* ---------------- copy email ---------------- */
  function copyEmail(btn) {
    const body = document.getElementById(btn.dataset.copy);
    /* Copy may sit in the panel's header or under it (email({ copyBelow: true })). */
    const panel = (body && body.closest('.email')) || btn.closest('.email');
    const subject = panel ? (panel.querySelector('[data-subject]') || {}).textContent || '' : '';
    const text = (subject ? 'Subject: ' + subject + '\n\n' : '') + (body ? body.innerText.trim() : '');
    const done = () => toast('Email copied');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, done);
    } else {
      done();
    }
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

  /* ---------------- confetti ---------------- */
  function confetti(anchor) {
    if (reduced() || !anchor || !anchor.getBoundingClientRect || !Element.prototype.animate) return;
    const r = anchor.getBoundingClientRect();
    const cs = getComputedStyle(document.documentElement);
    const colors = [cs.getPropertyValue('--accent').trim(), cs.getPropertyValue('--accent-soft').trim()];
    for (let i = 0; i < 8; i++) {
      const p = document.createElement('span');
      p.className = 'confetti';
      p.style.left = (r.left + Math.min(r.width, 180) / 2) + 'px';
      p.style.top = (r.top) + 'px';
      p.style.background = colors[i % 2];
      document.body.appendChild(p);
      const angle = (Math.PI * (i + 0.5)) / 8;
      const dx = Math.cos(angle) * (48 + (i % 3) * 16) * (i % 2 ? 1 : -1);
      const dy = -Math.sin(angle) * 48 - 16;
      p.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (i * 45) + 'deg)', opacity: 1, offset: 0.6 },
        { transform: 'translate(' + dx * 1.2 + 'px,' + (dy + 48) + 'px) rotate(' + (i * 90) + 'deg)', opacity: 0 },
      ], { duration: 680, easing: 'cubic-bezier(.2,.7,.2,1)' }).onfinish = () => p.remove();
    }
  }

  /* ---------------- documents from anywhere ---------------- */
  function addDocument(file) {
    App.state.pendingDocument = file ? file.name : null;
    emit('document', 'add', file ? file.name : null, null);
    if (App.route !== 'documents') go('#/documents/add'); else render(false);
  }
  App.addDocument = addDocument;
  window.addEventListener('dragover', (e) => { e.preventDefault(); });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    addDocument(f || null);
  });

  /* ---------------- boot ---------------- */
  window.addEventListener('hashchange', () => render(true));
  window.addEventListener('DOMContentLoaded', () => {
    if (!location.hash) history.replaceState(null, '', '#/home');
    render(true);
    App.booted = true;
  });
})();
