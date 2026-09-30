/* Checklists. One view per path, switched in place by the chips: CPT (done),
   OPT (now), STEM OPT (next filing, default) and H-1B (later).

   The federal steps are live, not a saved draft (Note 11): they are worked
   out from the sourced rule pack and recomputed when an approved rule
   change lands. The page shows it with the quiet "Rules checked Sep 30"
   line under the header, and a step a rule change touched carries
   "Updated Sep 30", linking to that update's page.

   Each path renders App.steps(path): the standard federal steps with the
   student's own school steps placed Before, Alongside or After them
   (Note 10). A Before step makes its federal step show "Waiting on: ...";
   an After step appears once its federal step is done. Every school step
   carries the "Your school" mark, and the one with draft: 'dso' carries the
   DSO email draft (Note 4), shared with What's next through App.state.
   "Add your school's step" sits under every list of steps.

   Task state is shared through App.state['task:<key>']. Confetti fires only
   the first time a list is finished (App.complete, via the progress bar in
   app.js), never on opening a finished path (Note 6). The STEM OPT question
   is owned by What's next; here the answer shows as one quiet line. */
(function () {
  'use strict';

  const PATHS = ['cpt', 'opt', 'stem', 'h1b'];
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
  const LABELS = { cpt: 'CPT checklist', opt: 'OPT checklist', stem: 'STEM OPT checklist', h1b: 'H-1B checklist' };

  /* Layout only; type comes from the shared classes. The path heading is an
     h2 at the medium size under the chips; the rules line reads as the page
     header's last line and keeps the header gap to the chips. */
  const STYLE = '<style>' +
    '.screen-checklists .rules-line { margin-bottom: var(--gap-header); }' +
    '.screen-checklists .cl-head { display: flex; flex-direction: column; }' +
    '.screen-checklists .cl-head .cl-eyebrow { margin-bottom: var(--s-8); }' +
    '.screen-checklists .cl-head .cl-sub { margin-top: var(--s-8); }' +
    '.screen-checklists .cl-head .progress { margin-top: var(--s-16); }' +
    '.screen-checklists .cl-head + .cl-intent { margin-top: var(--s-12); }' +
    '.screen-checklists .cl-head + .list, .screen-checklists .cl-intent + .list { margin-top: var(--s-24); }' +
    '.screen-checklists .school-add { margin-top: var(--s-8); }' +
    '.screen-checklists .cl-done { margin-top: var(--s-32); }' +
    '.screen-checklists .cl-done .t-lead { margin-top: var(--s-4); }' +
    '.screen-checklists .cl-done .btn-row { justify-content: flex-start; margin-top: var(--s-16); }' +
    '</style>';

  const state = () => (window.App ? window.App.state : {});
  const intent = () => window.App.stemIntent();

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
      '<h2 class="t-medium" tabindex="-1">' + C.esc(p.title) + '</h2>' +
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

  /* ---------------- steps: federal and your school's ---------------- */

  /* One row for an App.steps() entry. */
  function stepRow(entry, data) {
    if (entry.type === 'school') return C.schoolStep(entry, { email: data.email, primary: true });
    const t = entry.step;
    if (t.ongoing) return C.ongoing({ key: t.key, title: t.title, meta: t.meta, source: t.source });
    return C.task({
      key: entry.key,
      title: t.title,
      meta: t.meta,
      done: entry.done,
      doneMeta: t.doneMeta || t.meta,
      source: t.source,
      caution: t.caution,
      cautionSource: t.cautionSource,
      updated: t.updated || null,
      waitingOn: entry.waitingOn || null,
      below: t.unknown ? C.unknown(t.unknown) : null,
      onDone: t.onDone ? C.unknown(t.onDone) + C.source(t.onDone.source, { inline: true }) : null,
    });
  }

  /* The rows that count toward progress: checkable and showing now. An After
     step stays hidden until its federal step is done. */
  function counted(entries) {
    return entries.filter((en) => !(en.type === 'federal' && en.step.ongoing) && !(en.afterOf && !en.afterOf.done));
  }

  /* The federal steps a school step can be placed against. A standing rule
     (never done) is left out, since an After step would never show. */
  function federalChoices(entries) {
    return entries.filter((en) => en.type === 'federal' && !en.step.ongoing).map((en) => ({ key: en.key, title: en.step.title }));
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

  function stemView(data) {
    const s = data.checklists.stem;
    const entries = App.steps('stem');
    const live = counted(entries);
    const done = live.filter((en) => en.done).length;
    const all = live.length > 0 && done === live.length;
    const pct = live.length ? Math.round((done / live.length) * 100) : 0;
    const doneParts = s.doneLine.split('. ');

    return tabHead({
      eyebrow: 'Your next filing · ' + s.eyebrow,
      title: s.title,
      progress: { pct: pct, label: done + ' of ' + live.length + ' done · ' + s.progressMeta, suffix: s.progressMeta },
    }) +
      intentLine() +
      C.list(entries.map((en) => stepRow(en, data)), { accordion: false, label: 'Steps' }) +
      C.addSchoolStep({ path: 'stem', federal: federalChoices(entries) }) +
      '<div class="cl-done" data-cl-done' + (all ? '' : ' hidden') + '>' +
      '<p class="t-row">' + C.esc(doneParts[0] + '.') + '</p>' +
      '<p class="t-lead">' + C.esc(doneParts.slice(1).join('. ')) + '</p>' +
      C.buttonRow({ primary: C.button({ label: 'Add receipt number', kind: 'primary', href: '#/applications/stem' }) }) +
      '</div>';
  }

  /* ---------------- OPT ---------------- */

  function optView(data) {
    const o = data.checklists.opt;
    const entries = App.steps('opt');
    return tabHead({
      eyebrow: 'Now',
      title: "You're on OPT.",
      subline: data.job.title + ' at ' + data.job.employer + '. Your card is valid until ' + data.opt.cardUntil + '.',
    }) +
      C.section({
        eyebrow: 'Applying for OPT · You did this',
        content: C.list([C.row({ title: o.applied, lead: C.phaseMark('done'), href: '#/applications/opt' })], { accordion: false }),
      }) +
      C.section({
        eyebrow: "While you're on OPT",
        content: C.list(entries.map((en) => stepRow(en, data)), { accordion: false, label: 'Steps' }) +
          C.addSchoolStep({ path: 'opt', federal: federalChoices(entries) }),
      });
  }

  /* ---------------- CPT ---------------- */

  /* A finished path: a short "You did this" summary, nothing asked again. */
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

  /* ---------------- live changes ---------------- */

  /* The "Every step done" line follows the checkboxes in place. */
  function syncDone() {
    const root = document.getElementById('main');
    if (!root) return;
    const box = root.querySelector('[data-cl-done]');
    if (!box) return;
    const checks = Array.from(root.querySelectorAll('[role="checkbox"][data-task]')).filter((c) => !c.closest('[hidden]'));
    box.hidden = !(checks.length > 0 && checks.every((c) => c.getAttribute('aria-checked') === 'true'));
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

  window.SCREENS['checklists'] = {
    title: 'Checklists',
    paramsInPlace: true,
    titleFor(params, data) {
      return LABELS[pathFrom(data, params)] || 'Checklists';
    },
    render(data, params) {
      const path = pathFrom(data, params);
      let body;
      if (path === 'cpt') body = cptView(data);
      else if (path === 'opt') body = optView(data);
      else if (path === 'h1b') body = h1bView(data);
      else body = stemView(data);
      return STYLE +
        C.pageHeader({ title: 'Checklists', subline: 'Every step for each path, in order, with what each one needs.' }) +
        C.rulesLine(data.rules) +
        chips(data, path) + body + C.footer();
    },
    mount(root) {
      root.classList.add('screen-checklists');
      listen();
      syncDone();
    },
  };
})();
