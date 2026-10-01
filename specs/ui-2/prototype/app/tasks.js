/* app/tasks.js: Tasks, progress, completions. */

(function () {
  'use strict';

  const App = window.App;
  const data = App.data;
  const { cssEsc, shortToday, findSchoolStep, haptic, play, advanceCurrent, burst, emit } = App._;

  /* ---------------- tasks ---------------- */
  let completedNow = false;
  function setTask(check, on) {
    check.setAttribute('aria-checked', on ? 'true' : 'false');
    const item = check.closest('.task');
    const key = check.dataset.task;
    const list = item && item.parentElement;
    const tracksCurrent = !!(list && (list.hasAttribute('data-current') || list.querySelector(':scope > .task.is-current')));
    if (on) { play(check, 'is-ticking'); if (item) play(item, 'is-settling'); }
    if (item) {
      item.classList.toggle('is-done', on);
      const meta = item.querySelector('.row-meta');
      if (meta) {
        const doneMeta = meta.dataset.doneMeta || ('Done ' + shortToday());
        meta.textContent = on ? doneMeta : meta.dataset.meta;
        meta.hidden = !meta.textContent;
      }
      const onDone = item.querySelector('[data-on-done]');
      if (onDone) onDone.hidden = !on;
    }
    App.state['task:' + key] = on;
    if (key.indexOf('school:') === 0) {
      const s = findSchoolStep(key.slice(7));
      if (s) s.done = on;
    }
    /* Other copies of the same task on the page, and the steps that wait on it. */
    document.querySelectorAll('[role="checkbox"][data-task="' + cssEsc(key) + '"]').forEach((c) => {
      if (c === check) return;
      c.setAttribute('aria-checked', on ? 'true' : 'false');
      const it = c.closest('.task'); if (it) it.classList.toggle('is-done', on);
    });
    document.querySelectorAll('[data-waits="' + cssEsc(key) + '"]').forEach((el) => { el.hidden = on; });
    document.querySelectorAll('[data-after="' + cssEsc(key) + '"]').forEach((el) => { el.hidden = !on; });
    completedNow = false;
    updateProgress(check.closest('main'));
    if (on && !completedNow) haptic('tick');
    emit('task', key, on, check);
    if (tracksCurrent) { list.setAttribute('data-current', ''); advanceCurrent(list); }
  }
  App.setTask = (key, on) => {
    const c = document.querySelector('[role="checkbox"][data-task="' + cssEsc(key) + '"]');
    if (c) setTask(c, on);
    else { App.state['task:' + key] = on; emit('task', key, on, null); }
  };

  function updateProgress(root) {
    if (!root) return;
    const prog = root.querySelector('[data-progress]');
    if (!prog) return;
    const checks = Array.from(root.querySelectorAll('[role="checkbox"][data-task]')).filter((c) => !c.closest('[hidden]'));
    const done = checks.filter((c) => c.getAttribute('aria-checked') === 'true').length;
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
    if (checks.length && done === checks.length) {
      const key = 'tasks:' + checks.map((c) => c.dataset.task).sort().join(',');
      complete(key, prog);
    }
  }
  App.updateProgress = updateProgress;

  /* ---------------- completions and confetti ---------------- */

  /* complete(key, anchor?) : records that something was completed. Returns true
     and fires confetti from anchor only the first time; a key already in
     DULY_SAMPLE.completions (things done before, a finished checklist
     reopened) never fires. */
  function complete(key, anchor) {
    data.completions = data.completions || [];
    if (!key || data.completions.indexOf(key) !== -1) return false;
    data.completions.push(key);
    completedNow = true;
    haptic('complete');
    if (anchor) { play(anchor, 'is-complete'); burst(anchor); }
    return true;
  }

  /* confetti(anchor, key?) : kept for existing callers. Without a key, the key
     is route:param:row, e.g. 'checklists:cpt' or 'timeline:cpt', so opening
     something already done never fires. Pass a key for anything new. */
  function confetti(anchor, key) {
    let k = key;
    if (!k) {
      const row = anchor && anchor.closest && anchor.closest('[data-key]');
      k = [App.route, App.params && App.params[0], row && row.dataset.key].filter(Boolean).join(':');
    }
    return complete(k, anchor);
  }

  App.confetti = confetti;
  App.complete = complete;
  Object.assign(App._, { setTask });
})();
