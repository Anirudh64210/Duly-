/* app/state.js: Shared state readers: the STEM OPT intent, waiting dots, steps, school steps, round 4 values. */

(function () {
  'use strict';

  const App = window.App;
  const data = App.data;
  const _ = App._;
  /* Defined in a file loaded later; looked up when called. */
  const render = (...a) => _.render(...a);
  const emit = (...a) => _.emit(...a);

  /* The STEM OPT intent, shared by every screen: null, 'yes', 'no' or 'unsure'. */
  function stemIntent() {
    const v = 'stemIntent' in App.state && App.state.stemIntent != null ? App.state.stemIntent : data.stem.intent;
    if (v == null || v === '') return null;
    const s = String(v).toLowerCase();
    if (s === 'unsure' || s.indexOf('not sure') !== -1) return 'unsure';
    if (s.charAt(0) === 'y') return 'yes';
    if (s.charAt(0) === 'n') return 'no';
    return null;
  }
  App.stemIntent = stemIntent;

  /* Is "Was your degree awarded?" waiting in Your case? Only after onboarding
     with a passed end date and no answer yet, or on the #/case/no-degree demo. */
  function awardedWaiting() {
    const st = App.state;
    if (st.caseAwarded && st.caseAwarded !== 'unsure') return false;
    if (st.caseAwardedDemo) return true;
    const onb = st.onb;
    if (!onb || onb.awarded || !onb.end) return false;
    const end = new Date(String(onb.end).trim());
    return !isNaN(end.getTime()) && end < new Date(data.today.iso + 'T00:00:00');
  }
  App.awardedWaiting = awardedWaiting;

  /* Nav dots: where something is waiting for the student. */
  function waitingIn() {
    const out = (data.waitingIn || []).filter((k) => k !== 'steps' && k !== 'case');
    const intent = stemIntent();
    if (intent === null || intent === 'unsure') out.push('steps');
    if (awardedWaiting()) out.push('case');
    return out;
  }
  App.waitingIn = waitingIn;

  /* ---------------- steps: federal plus the student's school steps ---------------- */

  /* Is a task done? App.state wins over the data. School step keys are
     'school:<id>'. */
  function isDone(key, fallback) {
    const v = App.state['task:' + key];
    if (v != null) return !!v;
    if (fallback != null) return !!fallback;
    if (String(key).indexOf('school:') === 0) {
      const s = findSchoolStep(String(key).slice(7));
      return !!(s && s.done);
    }
    return false;
  }
  App.isDone = isDone;

  function findSchoolStep(id) { return (data.schoolSteps || []).filter((s) => s.id === id)[0] || null; }
  App.findSchoolStep = findSchoolStep;
  App.findUpdate = (id) => ((data.updates && data.updates.items) || []).filter((u) => u.id === id)[0] || null;
  App.findApplication = (id) => ((data.applications && data.applications.items) || []).filter((a) => a.id === id)[0] || null;

  /* App.steps(path) : the checklist for a path ('stem', 'opt', ...) in order,
     the standard federal steps with the student's school steps placed against
     them. Each entry:
       { type: 'federal', key, step, done, waitingOn? { key, title, done } }
       { type: 'school',  key: 'school:<id>', step, done, placement, afterOf? { key, done } }
     Render a federal entry with C.task({ ...entry.step, key, done, waitingOn })
     and a school entry with C.schoolStep(entry, { email: data.email }). */
  function steps(path) {
    const fed = path === 'stem' ? data.stem.tasks : (((data.checklists || {})[path] || {}).steps || []);
    const school = (data.schoolSteps || []).filter((s) => s.path === path);
    const schoolEntry = (s) => ({ type: 'school', key: 'school:' + s.id, step: s, done: isDone('school:' + s.id, s.done), placement: s.placement });
    const out = [];
    fed.forEach((f) => {
      const fDone = isDone(f.key, f.done);
      const before = school.filter((s) => s.placement === 'before' && s.federal === f.key);
      before.forEach((s) => out.push(schoolEntry(s)));
      const blocking = before.filter((s) => !isDone('school:' + s.id, s.done))[0] || before[0];
      out.push({
        type: 'federal', key: f.key, step: f, done: fDone,
        waitingOn: blocking ? { key: 'school:' + blocking.id, title: blocking.title, done: isDone('school:' + blocking.id, blocking.done) } : null,
      });
      school.filter((s) => s.placement === 'alongside' && s.federal === f.key).forEach((s) => out.push(schoolEntry(s)));
      school.filter((s) => s.placement === 'after' && s.federal === f.key).forEach((s) => {
        out.push(Object.assign(schoolEntry(s), { afterOf: { key: f.key, done: fDone } }));
      });
    });
    school.filter((s) => !fed.some((f) => f.key === s.federal)).forEach((s) => out.push(schoolEntry(s)));
    return out;
  }
  App.steps = steps;

  /* App.schoolImport(path) : where the school's steps stand for a path.
       { state: 'empty' | 'found' | 'confirmed', href, label, steps }
     state lives in App.state['schoolImport:<path>'] (falls back to
     data.schoolImport.state). App.setSchoolImport(path, state) forces one,
     for a review link such as #/steps/school. Confirming copies the found
     steps into data.schoolSteps, where App.steps() places them. */
  function schoolImportOf(path) {
    const d = data.schoolImport || {};
    const st = App.state['schoolImport:' + path] || d.state || 'empty';
    const src = App.state['schoolImportSrc:' + path] || null;
    return {
      state: st,
      href: src ? src.href : (st === 'empty' ? null : d.href),
      label: src ? src.label : d.label,
      steps: (d.found || []).filter((s) => (s.path || 'stem') === path),
    };
  }
  App.schoolImport = schoolImportOf;
  function setSchoolImport(path, state, src) {
    const imp = schoolImportOf(path);
    data.schoolSteps = (data.schoolSteps || []).filter((s) => !(s.from === 'school-page' && s.path === path));
    if (state === 'confirmed') {
      imp.steps.forEach((s) => data.schoolSteps.push(Object.assign({}, s, {
        path: path, from: 'school-page', done: isDone('school:' + s.id, s.done),
        link: s.link || (imp.href ? { label: 'Open', href: imp.href } : null),
      })));
    }
    if (src !== undefined) App.state['schoolImportSrc:' + path] = src;
    App.state['schoolImport:' + path] = state;
  }
  App.setSchoolImport = setSchoolImport;
  /* Seed: a state set in the data starts with its steps in place. */
  if (data.schoolImport && data.schoolImport.state === 'confirmed') setSchoolImport('stem', 'confirmed');

  /* ---------------- round 4: the value a student gets (VALUE.md) ---------------- */

  /* App.unemployment({ noJob? }) : the unemployment count as every screen
     shows it, so Home, Timeline and Your profile never disagree.
       { state: 'ask' | 'every' | 'none', hasJob, used, left, limit, pct, asOf,
         line, metric, counted, ask, everyLine, noneLine }
     state comes from App.state.jobsComplete ('every' | 'none'), else the data.
     noJob: true (the #/home/no-job demo) means no job on file: 'every' is not
     a possible answer, so it reads as 'ask'.
     metric is a cell for C.metrics: the count with "As of Sep 30" once the job
     list is complete, otherwise the one line that asks for it. used, left and
     line are null until then: a number with a missing fact is not shown. */
  function unemployment(opts) {
    const o = opts || {};
    const u = data.unemployment || {};
    const hasJob = !o.noJob && !!(data.job && data.job.employer);
    let state = App.state.jobsComplete || u.state || 'ask';
    if (state === 'every' && !hasJob) state = 'ask';
    if (state === 'none' && hasJob) state = 'every';
    const n = state === 'every' ? u.every : (state === 'none' ? u.none : null);
    const asOf = u.asOf ? 'As of ' + u.asOf : null;
    const base = ((data.home && data.home.metrics) || [])[0] || { eyebrow: 'Unemployment days' };
    const metric = n
      ? { eyebrow: base.eyebrow, value: String(n.used), unit: n.left > 0 ? 'used · ' + n.left + ' left' : 'of ' + u.limit, bar: n.pct, source: 'unemployment', asOf: asOf }
      : { eyebrow: base.eyebrow, add: hasJob ? u.confirm : u.add };
    return {
      state: state, hasJob: hasJob,
      used: n ? n.used : null, left: n ? n.left : null, limit: u.limit, pct: n ? n.pct : null,
      asOf: u.asOf, asOfLong: u.asOfLong,
      line: n ? (n.left > 0 ? n.used + ' of ' + u.limit + ' used, as of ' + u.asOf : n.used + ' days without work, as of ' + u.asOf) : null,
      counted: n ? n.counted : null,
      metric: metric, ask: u.ask, everyLine: u.everyLine, noneLine: u.noneLine,
    };
  }
  App.unemployment = unemployment;
  /* App.setJobs('every' | 'none' | null) : answer (or clear) "Is that every
     job?", then redraw the column in place. */
  App.setJobs = (v) => { App.state.jobsComplete = v || null; emit('answer', 'jobsComplete', v || null, null); render('inplace'); };

  /* App.stemField() : DULY_SAMPLE.stemField with App.state.stemField
     ('found' | 'confirmed') as its state. */
  App.stemField = () => Object.assign({}, data.stemField || {}, App.state.stemField ? { state: App.state.stemField } : {});

  /* App.employer() : the Employer check for the student's own job. */
  App.employer = () => data.employer || null;

  /* App.processingFor(appOrId, { force? }) : USCIS's processing time for an
     application, only while it is filed and not decided (a receipt number,
     and a status that is not Approved, Denied or Not filed yet). force: true
     returns it anyway, for a review link. Null otherwise. */
  App.processingFor = (a, o) => {
    const app = typeof a === 'string' ? App.findApplication(a) : a;
    if (!app || !app.processing) return null;
    const pt = (data.processingTimes || {})[app.processing] || null;
    if (o && o.force) return pt;
    const receipt = App.state['receipt:' + app.id] || app.receipt;
    const status = App.state['status:' + app.id] || app.status || '';
    const open = !!receipt && !/^(approved|denied|not filed)/i.test(status) && !/card mailed/i.test(status);
    return open ? pt : null;
  };

  Object.assign(App._, { stemIntent, waitingIn, isDone, findSchoolStep, schoolImportOf, setSchoolImport });
})();
