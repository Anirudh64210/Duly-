/* Checklists. One view per path, switched by the chips: CPT (done), OPT (now),
   STEM OPT (next filing, default) and H-1B (later). Task state is shared with
   What's next through App.state['task:<key>'], and the STEM OPT intent through
   App.state.stemIntent. */
(function () {
  'use strict';

  const PATHS = ['cpt', 'opt', 'stem', 'h1b'];
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
  const FOOT = 'Every step has its source. Nothing is filed for you. Records, not legal advice.';

  const STYLE = '<style>' +
    '.screen-checklists .chips { margin-bottom: var(--s-32); }' +
    '.screen-checklists .cl-intent { margin-bottom: var(--s-32); }' +
    '.screen-checklists .cl-ring, .screen-checklists .cl-ring:hover { border-style: dashed; border-color: var(--accent-muted); cursor: default; }' +
    '.screen-checklists .cl-ring:active { transform: none; }' +
    '.screen-checklists .cl-email, .screen-checklists .cl-done { margin-top: var(--s-32); }' +
    '.screen-checklists .cl-done .t-lead { margin-top: var(--s-4); }' +
    '</style>';

  function state() { return window.App ? window.App.state : {}; }
  function isDone(key, fallback) {
    const v = state()['task:' + key];
    return v == null ? !!fallback : !!v;
  }
  function intent(data) {
    const v = state().stemIntent != null ? state().stemIntent : data.stem.intent;
    if (v == null) return null;
    if (v === 'unsure') return 'unsure';
    if (/^y/i.test(v)) return 'yes';
    if (/^n/i.test(v)) return 'no';
    return null;
  }
  function pathFrom(data, params) {
    const p = params && params[0];
    if (PATHS.indexOf(p) !== -1) { state()['checklists:path'] = p; return p; }
    const last = state()['checklists:path'];
    return PATHS.indexOf(last) !== -1 ? last : (data.checklists.selected || 'stem');
  }

  function chips(data, current) {
    return C.chips({
      key: 'path', label: 'Paths', inline: true,
      items: data.checklists.paths.map((p) => ({
        value: p.key, label: p.label, done: p.done, selected: p.key === current, href: '#/checklists/' + p.key,
      })),
    });
  }

  /* ---------------- STEM OPT ---------------- */

  function intentBlock(data) {
    const v = intent(data);
    if (v === 'yes') return '';
    if (v === 'no') {
      return '<p class="t-meta cl-intent">You said not this time. ' +
        '<button type="button" class="link" data-cl-reset>Change my answer</button></p>';
    }
    return '<div class="cl-intent">' + C.list([C.ask({
      key: 'stemIntent',
      title: 'Planning to apply?',
      choices: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }],
      notSure: "I'm not sure yet",
      note: v === 'unsure' ? "We'll ask again later." : null,
    })], { accordion: false }) + '</div>';
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
      action: t.action ? C.button({
        label: t.action, kind: 'pill',
        attrs: { 'data-cl-email': true, 'aria-expanded': 'false', 'aria-controls': 'cl-email' },
      }) : null,
    }));

    return intentBlock(data) +
      C.pageHeader({
        eyebrow: 'Your next filing · ' + s.eyebrow,
        title: s.title,
        progress: { pct: pct, label: done + ' of ' + steps.length + ' done · ' + s.progressMeta, suffix: s.progressMeta },
      }) +
      C.list(tasks, { accordion: false, label: 'Steps' }) +
      '<div class="cl-email" id="cl-email" hidden>' +
      C.email({ to: data.email.to, subject: data.email.subject, paragraphs: data.email.paragraphs, questions: data.email.questions, signoff: data.email.signoff, foot: data.email.foot }) +
      '<div class="btn-row is-start"><button type="button" class="link" data-cl-mail>Open in Mail</button></div>' +
      '</div>' +
      '<div class="cl-done" data-cl-done' + (all ? '' : ' hidden') + '>' +
      '<p class="t-row">' + C.esc(doneParts[0] + '.') + '</p>' +
      '<p class="t-lead">' + C.esc(doneParts.slice(1).join('. ')) + '</p>' +
      C.buttonRow({ primary: C.button({ label: 'Add receipt number', kind: 'primary', href: '#/next' }) }).replace('class="btn-row"', 'class="btn-row is-start"') +
      '</div>';
  }

  /* ---------------- OPT ---------------- */

  function ongoingRow(t) {
    return '<div class="item task" data-key="' + C.esc(t.key) + '"><div class="row is-static">' +
      '<span class="check cl-ring" role="img" aria-label="Ongoing"></span>' +
      '<span class="row-text"><span class="row-title">' + C.esc(t.title) + '</span>' +
      '<span class="row-meta">' + C.esc(t.meta) + '</span></span>' +
      (t.source ? '<span class="row-trail">' + C.source(t.source) + '</span>' : '') +
      '</div></div>';
  }

  function optView(data) {
    const o = data.checklists.opt;
    const rows = o.steps.map((t) => {
      if (t.meta === 'Ongoing') return ongoingRow(t);
      return C.task({
        key: t.key, title: t.title, meta: t.meta,
        done: isDone(t.key, t.done),
        doneMeta: t.done ? t.meta : null,
        source: t.source,
      });
    });
    return C.pageHeader({
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
    return C.pageHeader({
      eyebrow: 'You did this',
      title: 'CPT: ' + count + ' internship' + (n === 1 ? '' : 's') + ', done.',
    }) +
      C.list(data.cpt.map((c) => C.row({ title: c.employer, meta: c.dates, lead: C.phaseMark('done') })), { accordion: false, label: 'Internships' });
  }

  /* ---------------- H-1B ---------------- */

  function h1bView(data) {
    const h = data.checklists.h1b;
    return C.pageHeader({ eyebrow: h.eyebrow, title: h.title, subline: h.line });
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
      if (d.kind === 'answer' && d.key === 'stemIntent' && d.value !== 'unsure') {
        setTimeout(() => { if (window.App.route === 'checklists') window.App.rerender(); }, 300);
      }
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

    if (t.closest('[data-cl-reset]')) {
      window.App.state.stemIntent = null;
      window.App.rerender();
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
      return STYLE + chips(data, path) + body + C.footer(FOOT);
    },
    mount(root, data, params) {
      root.classList.add('screen-checklists');
      root.addEventListener('click', onRootClick);
      listen();
      const path = pathFrom(data, params);
      if (path === 'cpt' && !state()['checklists:cptCelebrated']) {
        state()['checklists:cptCelebrated'] = true;
        const h1 = root.querySelector('h1');
        if (h1) setTimeout(() => window.App.confetti(h1), 400);
      }
    },
  };
})();
