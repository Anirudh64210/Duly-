/* Checklists. One view per path, switched by the chips: CPT (done), OPT (now),
   STEM OPT (next filing, default) and H-1B (later). Task state is shared with
   What's next through App.state['task:<key>'], and both screens render the
   same list of steps (data.stem.tasks). The STEM OPT question is owned by
   What's next; here the answer shows as one quiet line with a link.
   The 10-day reporting rule is owned here, on the OPT view (C.ongoing). */
(function () {
  'use strict';

  const PATHS = ['cpt', 'opt', 'stem', 'h1b'];
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
  /* The screen title is the one h1 (C.pageHeader). Each path's heading is an
     h2 at the sub size, under the chips. Spacing below it: 12 to the quiet
     STEM OPT line, 24 to a list, and the standard section gap to a section. */
  const STYLE = '<style>' +
    '.screen-checklists .cl-head { display: flex; flex-direction: column; }' +
    '.screen-checklists .cl-head .cl-eyebrow { margin-bottom: var(--s-8); }' +
    '.screen-checklists .cl-head .cl-sub { margin-top: var(--s-8); }' +
    '.screen-checklists .cl-head .progress { margin-top: var(--s-16); }' +
    '.screen-checklists .cl-head + .cl-intent { margin-top: var(--s-12); }' +
    '.screen-checklists .cl-head + .list, .screen-checklists .cl-intent + .list { margin-top: var(--s-24); }' +
    '.screen-checklists .cl-email, .screen-checklists .cl-done { margin-top: var(--s-32); }' +
    '.screen-checklists .cl-done .t-lead { margin-top: var(--s-4); }' +
    '</style>';

  function state() { return window.App ? window.App.state : {}; }
  function isDone(key, fallback) {
    const v = state()['task:' + key];
    return v == null ? !!fallback : !!v;
  }
  function intent() { return window.App.stemIntent(); }
  function pathFrom(data, params) {
    const p = params && params[0];
    if (PATHS.indexOf(p) !== -1) { state()['checklists:path'] = p; return p; }
    const last = state()['checklists:path'];
    return PATHS.indexOf(last) !== -1 ? last : (data.checklists.selected || 'stem');
  }

  /* The heading for one path: eyebrow, h2, subline, progress. */
  function tabHead(p) {
    return '<header class="cl-head">' +
      (p.eyebrow ? '<p class="cl-eyebrow t-eyebrow-hero">' + C.esc(p.eyebrow) + '</p>' : '') +
      '<h2 class="t-sub" tabindex="-1">' + C.esc(p.title) + '</h2>' +
      (p.subline ? '<p class="cl-sub t-lead">' + C.esc(p.subline) + '</p>' : '') +
      (p.progress ? C.progress(p.progress) : '') +
      '</header>';
  }

  function chips(data, current) {
    return C.chips({
      key: 'path', label: 'Paths',
      items: data.checklists.paths.map((p) => ({
        value: p.key, label: p.label, done: p.done, selected: p.key === current, href: '#/checklists/' + p.key,
      })),
    });
  }

  /* ---------------- STEM OPT ---------------- */

  /* One quiet line under the header; the question lives on What's next. */
  function intentLine() {
    const v = intent();
    if (v === 'yes') return '';
    const text = v === 'no' ? 'STEM OPT: not this time.' : 'STEM OPT: not decided yet.';
    const label = v === 'no' ? "Change in What's next" : "Decide in What's next";
    return '<p class="t-meta cl-intent">' + C.esc(text) + ' ' + C.link({ label: label, href: '#/next' }) + '</p>';
  }

  function mailtoFrom(subject, body) {
    return 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  function stemView(data) {
    const s = data.checklists.stem;
    const steps = s.steps;
    const done = steps.filter((t) => isDone(t.key, t.done)).length;
    const all = done === steps.length;
    const pct = Math.round((done / steps.length) * 100);
    const doneParts = s.doneLine.split('. ');

    const tasks = steps.map((t) => C.task({
      key: t.key,
      title: t.title,
      meta: t.meta,
      done: isDone(t.key, t.done),
      doneMeta: t.meta,
      source: t.source,
      caution: t.caution,
      cautionSource: t.cautionSource,
      below: t.unknown ? C.unknown(t.unknown) : null,
      onDone: t.onDone ? C.unknown(t.onDone) + C.source(t.onDone.source, { inline: true }) : null,
      action: t.action ? C.button({
        label: t.action, kind: 'pill',
        attrs: { 'data-cl-email': true, 'aria-expanded': 'false', 'aria-controls': 'cl-email' },
      }) : null,
    }));

    return tabHead({
        eyebrow: 'Your next filing · ' + s.eyebrow,
        title: s.title,
        progress: { pct: pct, label: done + ' of ' + steps.length + ' done · ' + s.progressMeta, suffix: s.progressMeta },
      }) +
      intentLine() +
      C.list(tasks, { accordion: false, label: 'Steps' }) +
      '<div class="cl-email" id="cl-email" hidden>' +
      /* Same email options as What's next: no header row, Copy under the panel. */
      C.email(Object.assign({}, data.email, {
        copyBelow: true,
        extra: C.button({ label: 'Open in Mail', kind: 'text', attrs: { 'data-cl-mail': '' } }),
      })) +
      '</div>' +
      '<div class="cl-done" data-cl-done' + (all ? '' : ' hidden') + '>' +
      '<p class="t-row">' + C.esc(doneParts[0] + '.') + '</p>' +
      '<p class="t-lead">' + C.esc(doneParts.slice(1).join('. ')) + '</p>' +
      C.buttonRow({ primary: C.button({ label: 'Add receipt number', kind: 'primary', href: '#/next' }) }) +
      '</div>';
  }

  /* ---------------- OPT ---------------- */

  function optView(data) {
    const o = data.checklists.opt;
    const rows = o.steps.map((t) => {
      if (t.ongoing) return C.ongoing({ key: t.key, title: t.title, meta: t.meta, source: t.source });
      return C.task({
        key: t.key, title: t.title, meta: t.meta,
        done: isDone(t.key, t.done),
        doneMeta: t.done ? t.meta : null,
        source: t.source,
      });
    });
    return tabHead({
      eyebrow: 'Now',
      title: "You're on OPT.",
      subline: data.job.title + ' at ' + data.job.employer + '. Your card is valid until ' + data.opt.cardUntil + '.',
    }) +
      C.section({
        eyebrow: 'Applying for OPT · You did this',
        content: C.list([C.row({ title: o.applied, lead: C.phaseMark('done') })], { accordion: false }),
      }) +
      C.section({
        eyebrow: "While you're on OPT",
        content: C.list(rows, { accordion: false }),
      });
  }

  /* ---------------- CPT ---------------- */

  function cptView(data) {
    const n = data.cpt.length;
    const count = WORDS[n] || String(n);
    return tabHead({
      eyebrow: 'You did this',
      title: 'CPT: ' + count + ' internship' + (n === 1 ? '' : 's') + ', done.',
    }) +
      C.list(data.cpt.map((c) => C.row({ title: c.employer, meta: c.dates, lead: C.phaseMark('done') })), { accordion: false, label: 'Internships' });
  }

  /* ---------------- H-1B ---------------- */

  function h1bView(data) {
    const h = data.checklists.h1b;
    return tabHead({ eyebrow: h.eyebrow, title: h.title, subline: h.line });
  }

  /* ---------------- shared behaviour ---------------- */

  function mainEl() { return document.getElementById('main'); }

  function syncDone() {
    const root = mainEl();
    if (!root) return;
    const box = root.querySelector('[data-cl-done]');
    if (!box) return;
    const checks = Array.from(root.querySelectorAll('[role="checkbox"][data-task]'));
    const all = checks.length > 0 && checks.every((c) => c.getAttribute('aria-checked') === 'true');
    box.hidden = !all;
  }

  let listening = false;
  function listen() {
    if (listening) return;
    listening = true;
    document.addEventListener('duly:change', (e) => {
      if (!window.App || window.App.route !== 'checklists') return;
      const d = e.detail || {};
      if (d.kind === 'task') syncDone();
    });
  }

  function onRootClick(e) {
    const t = e.target;
    const root = e.currentTarget;

    const emailBtn = t.closest('[data-cl-email]');
    if (emailBtn) {
      const panel = root.querySelector('#cl-email');
      if (!panel) return;
      const open = panel.hidden;
      panel.hidden = !open;
      emailBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    if (t.closest('[data-cl-mail]')) {
      const panel = root.querySelector('#cl-email');
      const subject = (panel.querySelector('[data-subject]') || {}).textContent || '';
      const body = (panel.querySelector('.email-body') || {}).innerText || '';
      window.location.href = mailtoFrom(subject, body.trim());
      return;
    }

  }

  window.SCREENS['checklists'] = {
    title: 'Checklists',
    render(data, params) {
      const path = pathFrom(data, params);
      let body;
      if (path === 'cpt') body = cptView(data);
      else if (path === 'opt') body = optView(data);
      else if (path === 'h1b') body = h1bView(data);
      else body = stemView(data);
      return STYLE +
        C.pageHeader({ title: 'Checklists', subline: 'Every step for each path, in order.' }) +
        chips(data, path) + body + C.footer();
    },
    mount(root, data, params) {
      root.classList.add('screen-checklists');
      root.addEventListener('click', onRootClick);
      listen();
      const path = pathFrom(data, params);
      if (path === 'cpt' && !state()['checklists:cptCelebrated']) {
        state()['checklists:cptCelebrated'] = true;
        const head = root.querySelector('.cl-head h2');
        if (head) setTimeout(() => window.App.confetti(head), 400);
      }
    },
  };
})();
