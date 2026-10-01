/* Onboarding: a start screen, short steps and a warm finish. No sidebar.
   Routes: #/welcome (start), #/welcome/<step>, #/welcome/done.
   Steps: status, school, degree, dates, now, ead, job (ead and job only when
   on OPT or STEM OPT).
   Answers live in App.state.onb for the prototype. Every "I'm not sure" and
   every "Add it later" is saved and listed on the final screen as a question
   asked again later.
   Degree conferral is never asked here: it is read from a degree certificate
   or I-20 when one is added, or asked once in Your profile (App.awardedWaiting).
   Round 3: each question stands alone. Why it is asked sits behind the ⓘ
   beside it (C.titleWith), never as a line under it.
   Round 4 (VALUE.md):
   - the start screen carries the promise, its subline and the three pillars;
   - STEM is never guessed from the major's name, and the degree step never
     asks for a field code. When the I-20 is added on the dates step, the
     code it lists is shown there for one tap ("That matches"), and only then
     is it shown against the STEM list, as a fact with its source. With no
     I-20 the question waits on the finish screen. App.state.stemField
     follows the answer;
   - the job step offers "No job yet" plainly. That answer completes the job
     list (App.state.jobsComplete = 'none'), so the count can start; the
     count itself is shown on Home, never on this celebration screen;
   - copy says "this device", never a computer brand: Duly is web, phone and
     desktop.
   Copy rule (Round 2 note 12): the wordmark is the one "Duly" on every
   onboarding page. Screen text never names the product and never makes it a
   character ("Every later date is counted from these", not "Duly counts"). */
(function () {
  'use strict';

  const D = window.DULY_SAMPLE;
  const DEVICE = (D.device && D.device.here) || 'this device';
  const ORDER = ['status', 'school', 'degree', 'dates', 'now', 'ead', 'job'];
  const LABEL = { job: 'Job' };
  D.onboarding.steps.forEach((s) => { LABEL[s.key] = s.label; });

  const STATUS = [
    { value: 'f1', title: 'F-1 student', meta: 'Studying, on CPT, OPT or STEM OPT', short: 'F-1' },
    { value: 'other', title: 'Something else', meta: 'J-1, H-1B, O-1 and more', short: 'Something else' },
  ];
  const LEVELS = [
    { value: 'bachelor', title: "Bachelor's" },
    { value: 'master', title: "Master's" },
    { value: 'doctorate', title: 'Doctorate' },
    { value: 'other', title: 'Other' },
  ];
  const NOW = [
    { value: 'studying', title: 'Studying' },
    { value: 'cpt', title: 'On CPT' },
    { value: 'opt', title: 'On OPT', meta: 'Working after your degree' },
    { value: 'stem', title: 'On STEM OPT' },
    { value: 'other', title: 'Something else' },
  ];
  /* which "now" answers fit the program dates: after the end date nobody is still
     studying under that I-20, before it nobody is on post-completion OPT yet */
  const NOW_AFTER = ['opt', 'stem', 'other'];
  const NOW_BEFORE = ['studying', 'cpt', 'other'];
  /* Major names for typing ahead only. Whether a field is STEM is never read
     from this list: it comes from the field code on the I-20. */
  const MAJORS = ['Biomedical Engineering', 'Business Administration', 'Chemistry', 'Civil Engineering',
    'Computer Engineering', 'Computer Science', 'Data Science', 'Economics', 'Electrical Engineering',
    'Finance', 'Information Technology', 'Journalism', 'Mathematics', 'Mechanical Engineering',
    'Physics', 'Public Policy', 'Statistics'];

  const QUESTION = {
    status: 'What visa are you here on?',
    school: 'Which school issued your I-20?',
    degree: 'What are you studying?',
    field: 'Is your field on the STEM list?',
    dates: 'When does your program start and end?',
    awarded: 'Was your degree awarded?', /* asked in Your profile, listed on the finish screen */
    now: 'What are you doing now?',
    job: 'Do you have a job on OPT?',
  };
  const HINT = {
    status: "It's printed on your visa stamp and at the top of your I-20. You can add it later.",
    school: "It's printed at the top of your I-20. You can add it later.",
    degree: 'Your I-20 lists your major. Add the I-20 later and it fills this in.',
    dates: 'Your I-20 has both dates. You can add them later.',
    now: 'You can answer this later on Home.',
  };
  const FIELD_INFO = 'Your I-20 prints a field code beside your major, such as 11.0701. The STEM list goes by that code, not by the name of the major.';
  /* a choice clears the "I'm not sure" of the step it answers */
  const UNSURE_OF = { status: 'status', level: 'degree', now: 'now', eadMode: 'ead' };

  const TODAY = new Date(D.today.iso + 'T00:00:00');
  let readTimer = null;

  const STYLE = '<style>' +
    '.screen-welcome .w-gap-8 { margin-top: var(--s-8); }' +
    '.screen-welcome .w-gap-12 { margin-top: var(--s-12); }' +
    '.screen-welcome .w-gap-24 { margin-top: var(--s-24); }' +
    '.screen-welcome .w-gap-32 { margin-top: var(--s-32); }' +
    '.screen-welcome .w-head { display: flex; align-items: center; gap: var(--s-8); }' +
    '.screen-welcome .w-head + * { margin-top: var(--s-12); }' +
    '.screen-welcome .w-code { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--s-12); margin-top: var(--s-16); }' +
    '.screen-welcome .w-code > .field { flex: 1 1 calc(var(--s-64) * 3); min-width: 0; }' +
    '.screen-welcome .w-quiet { display: flex; flex-direction: column; align-items: flex-start; }' +
    '.screen-welcome .w-quiet > .btn-text { margin: calc(-1 * var(--s-12)) 0; }' +
    '.screen-welcome .w-hint { margin-top: var(--s-8); }' +
    '.screen-welcome .w-reading { display: flex; flex-direction: column; gap: var(--s-8); }' +
    '.screen-welcome .w-lines { display: flex; flex-direction: column; gap: var(--s-8); }' +
    '.screen-welcome .w-job { display: flex; flex-direction: column; gap: var(--s-16); margin-top: var(--s-24); }' +
    '.screen-welcome .suggest { max-height: calc(var(--s-64) * 4); overflow-y: auto; }' +
    /* Round 5 (note 4): the tick of a step just answered draws itself, the
       same check a ticked step draws elsewhere. */
    '.screen-welcome .step svg path { stroke-dasharray: 14; stroke-dashoffset: 0; }' +
    '.screen-welcome .step.is-ticking svg path { animation: check-draw .32s .12s ease-out both; }' +
    '.is-entering > .screen-welcome { animation: none; }' +
    '.is-entering .screen-welcome > .onb-body > * { animation: rise .55s var(--ease-rise) backwards; }' +
    '.is-entering .screen-welcome > .onb-body > :nth-child(1) { animation-delay: .06s; }' +
    '.is-entering .screen-welcome > .onb-body > :nth-child(2) { animation-delay: .14s; }' +
    '.is-entering .screen-welcome > .onb-body > :nth-child(3) { animation-delay: .22s; }' +
    '.is-entering .screen-welcome > .onb-body > :nth-child(n+4) { animation-delay: .3s; }' +
    '</style>';

  /* ---------------- state ---------------- */

  function S() {
    if (!App.state.onb) App.state.onb = { reached: -1, unsure: {} };
    return App.state.onb;
  }
  function stepKey() { return App.params[0] || 'start'; }
  function trim(v) { return (v || '').trim(); }
  function root() { return document.getElementById('main'); }
  function reduced() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /* the EAD card and the job are asked only on OPT or STEM OPT (or before
     that is known) */
  function onWork(s) { return !s.now || s.now === 'opt' || s.now === 'stem' || !!s.unsure.now; }
  function stepKeys(s) {
    return ORDER.filter((k) => (k !== 'ead' && k !== 'job') || onWork(s));
  }

  function parseDate(v) {
    const t = trim(v);
    if (!t) return null;
    const d = new Date(t);
    return isNaN(d.getTime()) ? null : d;
  }
  function fmt(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  function endPassed(s) { const d = parseDate(s.end); return !!d && d < TODAY; }
  /* the end date fell within the last 14 months: most students in that window are on OPT */
  function endRecent(s) {
    const d = parseDate(s.end);
    if (!d || d >= TODAY) return false;
    const floor = new Date(TODAY);
    floor.setMonth(floor.getMonth() - 14);
    return d >= floor;
  }
  function nowOptions(s) {
    const end = parseDate(s.end);
    if (!end) return NOW;
    const keep = end < TODAY ? NOW_AFTER : NOW_BEFORE;
    return NOW.filter((o) => keep.indexOf(o.value) !== -1);
  }
  /* drop an answer the dates rule out, and preselect On OPT when the dates point to it */
  function settleNow(s) {
    const opts = nowOptions(s);
    if (s.now && !opts.some((o) => o.value === s.now)) s.now = null;
    if (!s.now && !s.unsure.now && endRecent(s)) s.now = 'opt';
  }
  /* the first name, only when it was read from the student's own EAD card */
  function readName(s) {
    if (s.ead !== 'added' || !s.read || s.read.kind !== 'ead' || s.read.state !== 'found') return '';
    const row = (s.eadRows || D.onboarding.eadFound).find((r) => r[0] === 'Name');
    return row ? trim(row[1]).split(/\s+/)[0] : '';
  }

  function titleOf(list, v) { const o = list.find((x) => x.value === v); return o ? o.title : ''; }
  function degreeText(s) {
    const lvl = s.level && s.level !== 'other' ? titleOf(LEVELS, s.level) : '';
    const major = trim(s.major);
    if (lvl && major) return lvl + ' in ' + major;
    return lvl || major;
  }

  /* ---------------- the STEM field code ---------------- */

  /* s.field: null | { state: 'found' | 'confirmed' | 'saved', code, name?, from: 'i20' | 'typed' }
       found      read from the I-20, waiting for "That matches"
       confirmed  confirmed, and the code is on the STEM list
       saved      a typed code the prototype's list does not hold; it is
                  checked against the saved list in Your profile */
  function askField(s) { return s.status !== 'other'; }
  /* "110701", "11.0701" and "11 0701" all read as 11.0701 */
  function normCode(v) {
    const digits = String(v || '').replace(/\D/g, '');
    return digits.length === 6 ? digits.slice(0, 2) + '.' + digits.slice(2) : '';
  }
  function onList(code) { return !!D.stemField && D.stemField.onList && code === D.stemField.cip; }
  function setAppField(state) {
    App.state.stemField = state;
    App.emit('stem-field', 'stemField', state, null);
  }
  function fieldConfirmed(s) { return !!s.field && s.field.state === 'confirmed'; }

  function valid(key, s) {
    if (s.unsure[key]) return true;
    switch (key) {
      case 'status': return !!s.status;
      case 'school': return !!trim(s.school);
      case 'degree': return !!s.level && !!trim(s.major);
      case 'dates': return !!trim(s.start) && !!trim(s.end);
      case 'now': return !!s.now;
      case 'ead': return s.eadMode === 'type' && !!trim(s.eadFrom) && !!trim(s.eadUntil);
      case 'job': return s.job === 'none' || (s.job === 'yes' && !!trim(s.employer) && !!trim(s.jobStart));
      default: return false;
    }
  }

  /* answered: valid, or the EAD card or the job was added or left for later */
  function answered(k, s) { return valid(k, s) || (k === 'ead' && !!s.ead) || (k === 'job' && !!s.jobLater); }

  function answerFor(k, s) {
    if (s.unsure[k]) return 'Not sure yet';
    switch (k) {
      case 'status': { const o = STATUS.find((x) => x.value === s.status); return o ? o.short : ''; }
      case 'school': return trim(s.school);
      case 'degree': return degreeText(s);
      case 'dates': return s.start && s.end ? trim(s.start) + ' to ' + trim(s.end) : '';
      case 'now': return titleOf(NOW, s.now);
      case 'ead': return ({ added: 'Added', typed: 'Typed in', later: 'Later' })[s.ead] || '';
      case 'job':
        if (s.jobLater && !valid('job', s)) return 'Later';
        if (s.job === 'none') return 'No job yet';
        return s.job === 'yes' ? trim(s.employer) : '';
      default: return '';
    }
  }

  /* ---------------- pieces ---------------- */

  function unsure(key, s, label) {
    const on = !!s.unsure[key];
    return '<div class="w-quiet">' +
      '<button type="button" class="btn btn-text is-quiet is-small" data-onb="unsure" data-for="' + key + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
      C.esc(label || "I'm not sure") + '</button>' +
      '<p class="t-meta w-hint" data-onb-hint="' + key + '"' + (on ? '' : ' hidden') + '>' + C.esc(HINT[key]) + '</p>' +
      '</div>';
  }
  function quiet(label, action) {
    return '<div class="w-quiet"><button type="button" class="btn btn-text is-quiet is-small" data-onb="' + action + '">' + C.esc(label) + '</button></div>';
  }
  function fileInput() {
    return '<input type="file" accept="image/*,application/pdf" data-onb-file hidden tabindex="-1" aria-hidden="true">';
  }
  function reading(name) {
    return '<div class="w-reading"><p class="t-row">' + C.esc(name) + '</p>' +
      C.progress({ pct: 100, label: 'Reading on ' + DEVICE }) + '</div>';
  }
  /* a small question inside a step, with its ⓘ */
  function head(text, infoText) {
    return '<div class="w-head"><p class="t-row">' + C.esc(text) + '</p>' + C.info(infoText) + '</div>';
  }

  /* areas are small parts of a step that update in place, so typing never loses focus */
  const AREAS = {
    field: {
      sig: (s) => [s.status, s.fieldMode, s.field ? s.field.state + ':' + s.field.code : ''].join('|'),
      html: fieldArea,
    },
    i20: {
      sig: (s) => String(!!s.datesFrom),
      html: i20Area,
    },
  };
  function area(name, s) {
    return '<div data-onb-area="' + name + '" data-sig="' + C.esc(AREAS[name].sig(s)) + '">' + AREAS[name].html(s) + '</div>';
  }
  function updateArea(r, name, force) {
    const el = r && r.querySelector('[data-onb-area="' + name + '"]');
    if (!el) return;
    const s = S();
    const sig = AREAS[name].sig(s);
    if (!force && el.dataset.sig === sig) return;
    el.dataset.sig = sig;
    el.innerHTML = AREAS[name].html(s);
  }

  /* The STEM field, from the I-20's field code. Shown on the dates step once
     the I-20 is read: one tap to confirm, or type the right code. A fact once
     confirmed, never a guess from the major and never a verdict about the
     student. With no I-20 it is empty, and the question waits on the finish
     screen. */
  function fieldArea(s) {
    if (!askField(s)) return '';
    const f = s.field;
    const change = '<button type="button" class="btn btn-text is-small" data-onb="field-change">Change</button>';
    let body;
    if (f && f.state === 'found') {
      body = C.list(['<div class="item ask stem-field" data-key="onb-field"><div class="row is-static"><span class="row-text">' +
        '<span class="row-title">' + C.escText('Your I-20 lists field code ' + f.code + (f.name ? ', ' + f.name : '') + '.') + '</span>' +
        '<span class="row-meta">Read from your I-20</span>' +
        '<span class="ask-actions">' +
        '<button type="button" class="btn btn-pill" data-onb="field-confirm">' + C.esc((D.stemField && D.stemField.confirmLabel) || 'That matches') + '</button>' +
        '<button type="button" class="btn btn-text" data-onb="field-fix">Not right? Type it</button>' +
        '</span></span></div></div>'], { accordion: false, label: 'Your field code' });
    } else if (f && f.state === 'confirmed') {
      const sf = D.stemField || {};
      body = C.list([C.fact({
        key: 'onb-field',
        title: f.from === 'i20' ? sf.line : 'Field code ' + f.code + ' is on the STEM list.',
        meta: [f.from === 'i20' ? 'From your I-20' : 'You typed it', sf.listDate ? 'list dated ' + sf.listDate : '', sf.checked ? 'checked ' + sf.checked : ''].filter(Boolean).join(' · '),
        source: 'stemList',
        trailing: change,
      })], { accordion: false, label: 'Your field code' });
    } else if (f && f.state === 'saved') {
      body = C.list([C.fact({
        key: 'onb-field',
        title: 'Field code ' + f.code,
        meta: 'Checked against the STEM list in Your profile',
        trailing: change,
      })], { accordion: false, label: 'Your field code' });
    } else if (s.fieldMode === 'type') {
      const ok = !!normCode(s.cip);
      body = '<div class="w-code">' +
        C.field({ label: 'Field code', key: 'onb.cip', value: s.cip, placeholder: 'Such as 11.0701', inputmode: 'decimal' }) +
        '<button type="button" class="btn btn-pill" data-onb="field-check"' + (ok ? '' : ' disabled') + '>Check it</button>' +
        '</div>';
    } else {
      return '';
    }
    return '<div class="w-gap-32">' + head('Your field code', FIELD_INFO) + body + '</div>';
  }

  function i20Area(s) {
    return s.datesFrom ? '<p class="t-meta w-gap-12">From your I-20</p>' : '';
  }

  /* ---------------- steps ---------------- */

  const BUILD = {
    status(s) {
      return {
        title: QUESTION.status,
        why: 'This sets which rules your dates are counted by.',
        content: C.choices({ key: 'onb.status', options: STATUS, selected: s.status, label: 'Your visa' }),
        notSure: unsure('status', s),
      };
    },

    school(s) {
      return {
        title: QUESTION.school,
        why: "Your dates follow your school's record. Your school's own OPT steps can be added later from its web page.",
        content: C.field({ key: 'onb.school', value: s.school, placeholder: 'Start typing your school', ariaLabel: 'Your school', suggest: true }),
        notSure: unsure('school', s),
      };
    },

    degree(s) {
      return {
        title: QUESTION.degree,
        why: 'Some next steps depend on your field.',
        content: C.choices({ key: 'onb.level', options: LEVELS, selected: s.level, layout: 'row', cols: 4, label: 'Degree level' }) +
          '<div class="w-gap-24">' + C.field({ label: 'Your major', key: 'onb.major', value: s.major, placeholder: 'Start typing your major', suggest: true }) + '</div>' +
          '<div class="w-gap-8">' + unsure('degree', s) + '</div>',
      };
    },

    dates(s) {
      const pick = C.choices({ key: 'onb.datesMode', layout: 'pair', selected: s.datesMode, label: 'How to add your dates', options: [
        { value: 'i20', title: 'Add your I-20' },
        { value: 'type', title: 'Type the dates' },
      ] });
      let more = '';
      if (s.read && s.read.kind === 'i20') {
        more = '<div class="w-gap-24">' + reading(s.read.name) + '</div>';
      } else if (s.datesMode === 'type' || s.i20Read) {
        /* the range shows to type into, or to confirm what the I-20 gave */
        more = '<div class="w-gap-24">' + C.dateRange({
          from: { label: 'Start', key: 'onb.start', value: s.start, placeholder: 'Month day, year' },
          to: { label: 'End', key: 'onb.end', value: s.end, placeholder: 'Month day, year' },
        }) + '</div>' + area('i20', s) + area('field', s);
      }
      return {
        title: QUESTION.dates,
        why: 'Every later date is counted from these.',
        content: pick + more + fileInput(),
        notSure: unsure('dates', s),
      };
    },

    now(s) {
      settleNow(s);
      const end = parseDate(s.end);
      const meta = end ? '<p class="t-meta">Your program ' + (end < TODAY ? 'ended ' : 'ends ') + C.esc(fmt(end)) + '.</p>' : '';
      return {
        title: QUESTION.now,
        why: 'So Home shows what matters today.',
        content: meta + C.choices({ key: 'onb.now', options: nowOptions(s), selected: s.now, label: 'What you are doing now' }),
        notSure: unsure('now', s),
      };
    },

    ead(s) {
      const base = {
        title: 'Add your EAD card.',
        why: 'Your work dates come from this card. It is read on ' + DEVICE + '.',
      };
      const read = s.read && s.read.kind === 'ead' ? s.read : null;
      if (read && read.state === 'reading') {
        return Object.assign(base, { content: reading(read.name) + fileInput() });
      }
      if (read && read.state === 'found') {
        const rows = (s.eadRows || D.onboarding.eadFound).map((r, i) =>
          C.valueRow({ label: r[0], value: r[1], key: 'onb-ead-' + i, editable: !!s.fix })).join('');
        return Object.assign(base, {
          content: '<p class="t-meta">From ' + C.esc(read.name) + '</p>' +
            '<div class="list found w-gap-12">' + rows + '</div>' + fileInput(),
          notSure: s.fix ? '<p class="t-meta">Tap a value to change it.</p>' : quiet('Fix one', 'fix'),
          primary: C.button({ kind: 'primary', label: 'These are right', attrs: { 'data-onb': 'confirm-ead' } }),
        });
      }
      let more = '';
      if (s.eadMode === 'type') {
        more = '<div class="w-gap-24">' + C.dateRange({
          from: { label: 'Valid from', key: 'onb.eadFrom', value: s.eadFrom, placeholder: 'Month day, year' },
          to: { label: 'Valid until', key: 'onb.eadUntil', value: s.eadUntil, placeholder: 'Month day, year' },
        }) + '</div>';
      }
      return Object.assign(base, {
        content: C.choices({ key: 'onb.eadMode', layout: 'pair', selected: s.eadMode, label: 'How to add your card', options: [
          { value: 'photo', title: 'Add a photo or PDF' },
          { value: 'type', title: 'Type the dates' },
        ] }) + more + fileInput(),
        notSure: quiet('Add it later', 'later'),
      });
    },

    /* "No job yet" is a plain answer, as easy as naming the job. Either one
       lets the days without work be counted; the count shows on Home. */
    job(s) {
      let more = '';
      if (s.job === 'yes') {
        more = '<div class="w-job">' +
          C.field({ label: 'Employer', key: 'onb.employer', value: s.employer, placeholder: 'Company name', autocomplete: 'organization' }) +
          C.dateField({ label: 'Start date', key: 'onb.jobStart', value: s.jobStart, placeholder: 'Month day, year' }) +
          '</div>';
      }
      return {
        title: s.now === 'stem' ? 'Do you have a job on STEM OPT?' : QUESTION.job,
        why: 'Days without work are counted from your card and your job dates.',
        content: C.choices({ key: 'onb.job', layout: 'pair', selected: s.job, label: 'Your job', options: [
          { value: 'yes', title: 'Yes' },
          { value: 'none', title: 'No job yet' },
        ] }) + more,
        notSure: quiet('Add it later', 'job-later'),
      };
    },
  };

  function renderStep(key, s) {
    let keys = stepKeys(s);
    if (keys.indexOf(key) === -1) keys = ORDER.slice();
    const idx = keys.indexOf(key);
    const b = BUILD[key](s);
    return withInfo(C.onboarding({
      steps: C.steps({ steps: keys.map((k) => ({ key: k, label: LABEL[k], answer: answerFor(k, s) })), current: idx, reached: s.reached }),
      title: b.title,
      content: b.content,
      notSure: b.notSure,
      back: C.button({ kind: 'back', label: 'Back', attrs: { 'data-onb': 'back' } }),
      primary: b.primary || C.button({ kind: 'primary', label: 'Continue', disabled: !valid(key, s), attrs: { 'data-onb': 'next' } }),
    }), b.why);
  }

  /* The ⓘ beside the step's h1, holding why the question is asked. */
  function withInfo(html, text) {
    if (!text) return html;
    return html.replace(/<h1 class="t-big" tabindex="-1">[\s\S]*?<\/h1>/, (h1) => C.titleWith(h1, text));
  }

  /* The promise once, its subline, and the three pillars with each line
     behind an ⓘ. */
  function renderStart(s) {
    /* coming back to the start after answering: pick up at the first open step */
    let primary = C.button({ kind: 'primary', label: 'Start', href: '#/welcome/status' });
    if (s.reached >= 0) {
      const keys = stepKeys(s);
      const open = keys.find((k) => !answered(k, s));
      primary = C.button({ kind: 'primary', label: open ? 'Pick up where you left off' : 'See your answers', href: '#/welcome/' + (open || 'done') });
    }
    const pr = D.promise || {};
    return C.onboarding({
      title: pr.line,
      why: pr.subline,
      content: C.pillars(null, { lines: false }),
      back: '<span class="t-meta">About two minutes.</span>',
      primary: primary,
    });
  }

  function renderDone(s) {
    if (s.reached < 0) {
      /* opened directly: show the sample student's answers */
      Object.assign(s, {
        status: 'f1', school: D.student.school, level: 'master', major: D.program.major,
        start: D.program.start, end: D.program.end, awarded: 'end', now: 'opt',
        ead: 'added', eadUntil: D.opt.cardUntil, reached: ORDER.length - 1,
        field: { state: 'confirmed', code: D.stemField.cip, name: D.stemField.field, from: 'i20' },
        job: 'yes', employer: D.job.employer, jobStart: D.job.started,
        read: { kind: 'ead', name: 'EAD card', state: 'found' },
      });
    }
    const lines = [];
    const status = (STATUS.find((x) => x.value === s.status) || {}).short;
    const study = [degreeText(s), trim(s.school)].filter(Boolean).join(', ');
    if (status || study) lines.push([status, study].filter(Boolean));
    if (fieldConfirmed(s)) lines.push(['STEM field', s.field.code + ', on the STEM list']);
    else if (s.field && s.field.state === 'saved') lines.push(['Field code', s.field.code]);
    const working = s.now === 'opt' || s.now === 'stem';
    if (s.now) {
      const card = s.ead === 'added' || s.ead === 'typed'
        ? (trim(s.eadUntil) ? 'card valid until ' + trim(s.eadUntil) : '')
        : '';
      lines.push([titleOf(NOW, s.now)].concat(working && card ? [card] : []));
    }
    if (working && s.job === 'none') lines.push(['No job yet']);
    else if (working && s.job === 'yes' && trim(s.employer)) lines.push([trim(s.employer)].concat(trim(s.jobStart) ? ['since ' + trim(s.jobStart)] : []));
    if (working) {
      /* the STEM OPT dates hold only for the sample case: on OPT with a job,
         the field code confirmed on the list and the sample card end date.
         Anyone else is pointed to Home. */
      const sampleStem = s.now === 'opt' && fieldConfirmed(s) && s.job !== 'none' && trim(s.eadUntil) === D.opt.cardUntil;
      if (sampleStem) lines.push(D.onboarding.summary[2].split(' · '));
      else lines.push(['Next', 'Your next step is on Home']);
    }

    const waiting = ['status', 'school', 'degree', 'dates', 'now']
      .filter((k) => s.unsure[k])
      .map((k) => ({ title: QUESTION[k], meta: k === 'now' ? 'Waiting on Home' : 'Waiting in Your profile', key: 'wait-' + k }));
    if (askField(s) && s.field && s.field.state === 'found') {
      waiting.push({ title: 'Is field code ' + s.field.code + ' right?', meta: 'Waiting in Your profile', key: 'wait-field' });
    } else if (askField(s) && !s.field) {
      waiting.push({ title: QUESTION.field, meta: 'Add your I-20 in Documents', key: 'wait-field' });
    }
    /* Conferral is not asked in onboarding; it waits in Your profile when no document shows it. */
    if (endPassed(s) && !s.awarded) waiting.push({ title: QUESTION.awarded, meta: 'Waiting in Your profile', key: 'wait-awarded' });
    if (working && s.ead === 'later') waiting.push({ title: 'Add your EAD card', meta: 'Waiting on Home', key: 'wait-ead' });
    if (working && s.jobLater && !valid('job', s)) waiting.push({ title: s.now === 'stem' ? 'Do you have a job on STEM OPT?' : QUESTION.job, meta: 'Waiting on Home', key: 'wait-job' });

    const content =
      (lines.length ? '<div class="w-lines">' + lines.map((parts) =>
        '<p class="t-lead"><span class="t-row">' + C.escText(parts[0]) + '</span>' + (parts.length > 1 ? ' · ' + C.escText(parts.slice(1).join(' · ')) : '') + '</p>').join('') + '</div>' : '') +
      (waiting.length ? C.waiting({ items: waiting, max: waiting.length }) : '');

    s.finished = true;
    App.state.deleted = false;   /* a new account: every route opens again */
    /* every answer stays one tap away: the step list shows all ticks and opens any step */
    const keys = stepKeys(s);
    const list = C.steps({ steps: keys.map((k) => ({ key: k, label: LABEL[k], answer: answerFor(k, s) })), current: -1, reached: keys.length - 1 })
      .replace(/<span class="sr-only">[^<]*<\/span>/, '<span class="sr-only">All steps answered. Open one to change it.</span>');

    /* No job yet: Home opens on its no-job view, where the count starts */
    const home = working && s.job === 'none' ? '#/home/no-job' : '#/home';
    return withInfo(C.onboarding({
      steps: list,
      title: readName(s) ? "You're all set, " + readName(s) + '.' : "You're all set.",
      content: content,
      primary: C.button({ kind: 'primary', label: 'Open Home', href: home }),
    }), 'Anything else is asked when it matters. When a rule changes, your steps update and you see what changed.');
  }

  /* ---------------- actions ---------------- */

  function focusSel(sel) {
    const el = document.querySelector('#main ' + sel);
    if (el) el.focus({ preventScroll: true });
  }
  function refresh(sel) { App.rerender(); if (sel) focusSel(sel); }

  function syncNext(r) {
    const b = r && r.querySelector('[data-onb="next"]');
    if (b) b.disabled = !valid(stepKey(), S());
  }
  function setUnsureDom(r, k, on) {
    const b = r.querySelector('[data-onb="unsure"][data-for="' + k + '"]');
    if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
    const h = r.querySelector('[data-onb-hint="' + k + '"]');
    if (h) h.hidden = !on;
  }
  function clearUnsure(r, k) {
    const s = S();
    if (!s.unsure[k]) return;
    delete s.unsure[k];
    setUnsureDom(r, k, false);
  }

  function next(key) {
    const s = S();
    if (key === 'ead' && s.eadMode === 'type' && !s.read) s.ead = 'typed';
    /* a field code read but not confirmed waits in Your profile */
    if (key === 'dates' && s.field && s.field.state === 'found') setAppField('found');
    if (key === 'job') {
      if (valid('job', s)) s.jobLater = false;
      /* "No job yet" completes the job list, so the count can start */
      if (s.job === 'none') {
        App.state.jobsComplete = 'none';
        App.emit('answer', 'jobsComplete', 'none', null);
      } else if (App.state.jobsComplete === 'none') {
        App.state.jobsComplete = null;
        App.emit('answer', 'jobsComplete', null, null);
      }
    }
    const keys = stepKeys(s);
    const i = keys.indexOf(key);
    s.reached = Math.max(s.reached, i);
    s.justAnswered = key;
    /* after the finish, a changed answer goes straight back to the summary,
       unless a later step now needs an answer (On OPT adds the EAD card) */
    if (s.finished) {
      const open = keys.slice(i + 1).find((k) => !answered(k, s));
      App.go('welcome/' + (open || 'done'));
      return;
    }
    App.go('welcome/' + (keys[i + 1] || 'done'));
  }
  function back(key) {
    const keys = stepKeys(S());
    const i = keys.indexOf(key);
    App.go(i <= 0 ? 'welcome' : 'welcome/' + keys[i - 1]);
  }

  function markUnsure(r, k) {
    const s = S();
    s.unsure[k] = true;
    if (k === 'status') s.status = null;
    if (k === 'now') s.now = null;
    if (k === 'status' || k === 'now') { refresh('[data-onb="unsure"][data-for="' + k + '"]'); return; }
    setUnsureDom(r, k, true);
    syncNext(r);
  }

  function openPicker() {
    const input = document.querySelector('#main [data-onb-file]');
    if (input) { input.value = ''; input.click(); }
  }

  /* what the sample I-20 shows, read on the device: the program dates and the
     field code, plus the level and major when they are still empty */
  function fillFromI20(s) {
    s.start = D.program.start;
    s.end = D.program.end;
    s.datesFrom = true;
    s.i20Read = true;
    s.datesMode = 'i20';
    delete s.unsure.dates;
    if (!s.level) s.level = 'master';
    if (!trim(s.major)) { s.major = D.program.major; delete s.unsure.degree; }
    if (D.stemField && (!s.field || s.field.state !== 'confirmed')) {
      s.field = { state: 'found', code: D.stemField.cip, name: D.stemField.field, from: 'i20' };
      s.fieldMode = null;
    }
  }

  function startRead(kind, file) {
    const s = S();
    const name = file && file.name ? file.name : (kind === 'ead' ? 'EAD card' : 'I-20');
    const at = stepKey();
    s.read = { kind: kind, name: name, state: 'reading' };
    if (kind === 'ead') { s.eadMode = 'photo'; s.fix = false; } else if (at === 'dates') { s.datesMode = 'i20'; }
    refresh();
    clearTimeout(readTimer);
    readTimer = setTimeout(() => {
      const cur = S().read;
      if (!cur || cur.name !== name || cur.kind !== kind) return;
      if (kind === 'i20') {
        fillFromI20(s);
        s.read = null;
      } else {
        cur.state = 'found';
        s.eadRows = D.onboarding.eadFound.map((r) => r.slice());
        delete s.unsure.ead;
      }
      if (App.route !== 'welcome') return;
      const here = stepKey();
      if (kind === 'ead' && here === 'ead') refresh('[data-onb="confirm-ead"]');
      if (kind === 'i20' && here === 'dates') {
        refresh(s.field && s.field.state === 'found' ? '[data-onb="field-confirm"]' : '[data-onb="next"]');
        App.toast('Dates filled in from your I-20');
      }
    }, reduced() ? 600 : 1600);
  }

  function confirmEad() {
    const s = S();
    const rows = s.eadRows || D.onboarding.eadFound;
    const until = rows.find((r) => r[0] === 'Valid until');
    const from = rows.find((r) => r[0] === 'Valid from');
    s.ead = 'added';
    s.eadUntil = until ? until[1] : '';
    s.eadFrom = from ? from[1] : '';
    s.fix = false;
    next('ead');
  }

  /* the field code, in place: confirm, check a typed one, or type it again */
  function confirmField(r) {
    const s = S();
    if (!s.field) return;
    s.field.state = onList(s.field.code) ? 'confirmed' : 'saved';
    if (s.field.state === 'confirmed') setAppField('confirmed');
    updateArea(r, 'field', true);
    confirmed('Field code confirmed');
    focusSel('[data-onb="next"]');
  }
  function checkField(r) {
    const s = S();
    const code = normCode(s.cip);
    if (!code) return;
    s.cip = code;
    s.field = { state: onList(code) ? 'confirmed' : 'saved', code: code, from: 'typed' };
    if (s.field.state === 'confirmed') setAppField('confirmed');
    updateArea(r, 'field', true);
    confirmed(s.field.state === 'confirmed' ? 'Field code confirmed' : 'Field code saved');
    focusSel('[data-onb="next"]');
  }
  function resetField(r) {
    const s = S();
    const code = s.field ? s.field.code : '';
    s.field = null;
    s.fieldMode = 'type';
    if (code) s.cip = code;
    if (App.state.stemField === 'confirmed' || App.state.stemField === 'found') {
      delete App.state.stemField;
      App.emit('stem-field', 'stemField', null, null);
    }
    updateArea(r, 'field', true);
    focusSel('[data-field="onb.cip"]');
  }

  /* Round 5 (note 4): a confirmed answer's line carries the same check a
     ticked step draws, with a light tap. Under reduced motion the check is
     simply there. */
  function confirmed(message) {
    App.toast(message);
    const line = document.querySelector('.toast > span');
    if (line) {
      line.style.cssText = 'display: inline-flex; align-items: center; gap: var(--s-8);';
      line.insertAdjacentHTML('afterbegin', '<span class="check" aria-checked="true" aria-hidden="true" style="margin-top: 0;">' + C.icon('tick', { size: 12 }) + '</span>');
      App.play(line.firstElementChild, 'is-ticking');
    }
    App.haptic('tick');
  }

  /* The step just answered: its tick in the step list draws itself, with a
     light tap. Only for a real answer, not "I'm not sure" or "Add it later".
     On the finish screen the first visit has its own moment, so the tap is
     left to it. */
  function tickAnswered(r, s, key) {
    const done = s.justAnswered;
    s.justAnswered = null;
    if (!done || s.unsure[done] || !(valid(done, s) || (done === 'ead' && s.ead === 'added'))) return;
    const i = stepKeys(s).indexOf(done);
    const btn = i === -1 ? null : r.querySelectorAll('.steps .step')[i];
    if (!btn || !btn.classList.contains('is-done')) return;
    App.play(btn, 'is-ticking');
    if (key !== 'done' || s.celebrated) App.haptic('tick');
  }

  /* ---------------- suggestions ---------------- */

  function suggest(r, field, list, q, showAll) {
    const box = r.querySelector('[data-suggest="' + field + '"]');
    if (!box) return;
    const qq = trim(q).toLowerCase();
    let items = qq ? list.filter((x) => x.toLowerCase().indexOf(qq) !== -1) : (showAll ? list.slice() : []);
    if (items.length === 1 && items[0].toLowerCase() === qq) items = [];
    if (!showAll) items = items.slice(0, 6);
    const html = items.map((x) => '<button type="button" role="option" data-onb-pick="' + C.esc(field) + '" data-value="' + C.esc(x) + '">' + C.esc(x) + '</button>').join('');
    if (box._last !== html) { box.innerHTML = html; box._last = html; }
    box.hidden = !items.length;
  }

  function choose(r, field, value) {
    const box = r.querySelector('[data-suggest="' + field + '"]');
    if (box) box.hidden = true;
    const s = S();
    const key = field.slice(4);
    s[key] = value;
    const input = r.querySelector('[data-field="' + field + '"]');
    if (input) input.value = value;
    clearUnsure(r, key === 'major' ? 'degree' : key);
    syncNext(r);
    const nb = r.querySelector('[data-onb="next"]');
    if (nb && !nb.disabled) nb.focus({ preventScroll: true });
    else if (input) input.focus({ preventScroll: true });
  }

  /* ---------------- events ---------------- */

  function onRootClick(e) {
    const r = e.currentTarget;
    const s = S();
    const key = stepKey();
    const pick = e.target.closest('[data-onb-pick]');
    if (pick) { choose(r, pick.dataset.onbPick, pick.dataset.value); return; }
    r.querySelectorAll('.suggest:not([hidden])').forEach((b) => { if (!b.parentElement.contains(e.target)) b.hidden = true; });

    const b = e.target.closest('[data-onb]');
    if (!b || b.disabled) return;
    switch (b.dataset.onb) {
      case 'next': if (valid(key, s)) next(key); break;
      case 'back': back(key); break;
      case 'unsure': markUnsure(r, b.dataset.for); break;
      case 'field-confirm': confirmField(r); break;
      case 'field-check': checkField(r); break;
      case 'field-fix':
      case 'field-change': resetField(r); break;
      case 'later':
        s.ead = 'later';
        s.eadMode = null;
        next('ead');
        break;
      case 'job-later':
        s.jobLater = true;
        s.job = null;
        next('job');
        break;
      case 'fix':
        s.fix = true;
        refresh('.found [data-edit]');
        break;
      case 'confirm-ead': confirmEad(); break;
      default: break;
    }
  }

  function onRootKey(e) {
    const r = e.currentTarget;
    const t = e.target;
    const s = S();
    if (t.matches('[data-onb-pick]')) {
      const opts = Array.from(t.parentElement.querySelectorAll('[data-onb-pick]'));
      const i = opts.indexOf(t);
      const input = t.closest('.field').querySelector('input');
      if (e.key === 'ArrowDown') { e.preventDefault(); opts[Math.min(i + 1, opts.length - 1)].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); (i === 0 ? input : opts[i - 1]).focus(); }
      else if (e.key === 'Escape') { e.preventDefault(); t.parentElement.hidden = true; input.focus(); }
      return;
    }
    if (!t.matches('input[data-field]')) return;
    const f = t.dataset.field;
    const box = r.querySelector('[data-suggest="' + f + '"]');
    const open = box && !box.hidden && box.querySelector('button');
    if (e.key === 'ArrowDown' && open) { e.preventDefault(); open.focus(); return; }
    if (e.key === 'Escape') { if (open) box.hidden = true; return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (open) { choose(r, f, open.dataset.value); return; }
    if (f === 'onb.cip') { checkField(r); return; }
    if (valid(stepKey(), s)) next(stepKey());
  }

  function onRootChange(e) {
    const t = e.target;
    if (t.matches('[data-onb-file]')) {
      const f = t.files && t.files[0];
      if (f) startRead(stepKey() === 'ead' ? 'ead' : 'i20', f);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation(); /* keep the document here, not in Documents */
    const k = stepKey();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (k === 'ead') startRead('ead', f);
    else if (k === 'dates') startRead('i20', f);
    else App.toast('You can add documents once setup is done.');
  }

  function onChange(e) {
    if (App.route !== 'welcome') return;
    const d = e.detail || {};
    const s = S();
    const r = root();
    if (d.kind === 'step') {
      const k = stepKeys(s)[d.value];
      if (k) App.go('welcome/' + k);
      return;
    }
    if (d.kind === 'edit' && /^onb-ead-\d+$/.test(d.key || '')) {
      const i = Number(d.key.split('-')[2]);
      if (s.eadRows && s.eadRows[i]) s.eadRows[i][1] = d.value;
      return;
    }
    if (!d.key || d.key.indexOf('onb.') !== 0) return;
    const k = d.key.slice(4);

    if (d.kind === 'choice') {
      s[k] = d.value;
      const u = UNSURE_OF[k];
      if (u) delete s.unsure[u];
      if (k === 'job') {
        if (d.value === 'yes') s.jobLater = false;
        refresh(d.value === 'yes' ? '[data-field="onb.employer"]' : '[data-onb="next"]');
        return;
      }
      refresh('[data-choices="' + d.key + '"] [aria-checked="true"]');
      if ((k === 'eadMode' && d.value === 'photo') || (k === 'datesMode' && d.value === 'i20')) openPicker();
      return;
    }

    if (d.kind === 'field') {
      s[k] = d.value;
      switch (k) {
        case 'school':
          if (trim(d.value)) clearUnsure(r, 'school');
          suggest(r, 'onb.school', D.onboarding.schools, d.value);
          break;
        case 'major':
          if (trim(d.value)) clearUnsure(r, 'degree');
          suggest(r, 'onb.major', MAJORS, d.value);
          break;
        case 'cip': {
          const btn = r && r.querySelector('[data-onb="field-check"]');
          if (btn) btn.disabled = !normCode(d.value);
          break;
        }
        case 'start':
        case 'end':
          if (trim(s.start) && trim(s.end)) clearUnsure(r, 'dates');
          s.datesFrom = false;
          updateArea(r, 'i20');
          break;
        default: break;
      }
      syncNext(r);
    }
  }

  /* registered once for the whole app; each handler checks the route */
  if (!window.__dulyWelcomeWired) {
    window.__dulyWelcomeWired = true;
    document.addEventListener('duly:change', onChange);
    /* Cmd or Ctrl + O during onboarding opens the file picker for this step */
    document.addEventListener('keydown', (e) => {
      if (App.route !== 'welcome') return;
      if (!(e.metaKey || e.ctrlKey) || (e.key !== 'o' && e.key !== 'O')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (document.querySelector('#main [data-onb-file]')) {
        if (stepKey() === 'ead') S().eadMode = 'photo';
        if (stepKey() === 'dates') S().datesMode = 'i20';
        openPicker();
      } else {
        App.toast('You can add documents once setup is done.');
      }
    }, true);
  }

  window.SCREENS['welcome'] = {
    title: 'Welcome',
    bare: true,
    render(data, params) {
      const key = (params && params[0]) || 'start';
      const s = S();
      let html;
      if (key === 'done') html = renderDone(s);
      else if (BUILD[key]) html = renderStep(key, s);
      else html = renderStart(s);
      return STYLE + html.replace('<div class="onb">', '<div class="onb screen-welcome" data-onb-screen="' + C.esc(key) + '">');
    },
    mount(r, data, params) {
      r.addEventListener('click', onRootClick);
      r.addEventListener('keydown', onRootKey);
      r.addEventListener('change', onRootChange);
      r.addEventListener('drop', onDrop);
      const key = (params && params[0]) || 'start';
      const s = S();
      tickAnswered(r, s, key);
      if (key === 'done' && !s.celebrated) {
        s.celebrated = true;
        setTimeout(() => { const h = document.querySelector('#main h1'); if (h) App.confetti(h); }, 450);
      }
    },
  };
})();
