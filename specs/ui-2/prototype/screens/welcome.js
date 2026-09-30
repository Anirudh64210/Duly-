/* Onboarding: a start screen, six short steps and a warm finish. No sidebar.
   Routes: #/welcome (start), #/welcome/<step>, #/welcome/done.
   Steps: status, school, degree, dates, now, ead (ead only when on OPT or STEM OPT).
   Answers live in App.state.onb for the prototype. Every "I'm not sure" is saved
   and listed on the final screen as a question Duly asks again later.
   Onboarding asks the six-part skeleton only. Degree conferral is never asked
   here: Duly reads it from a degree certificate or I-20 when one is added,
   or asks once in Your case > Study (App.awardedWaiting). */
(function () {
  'use strict';

  const D = window.DULY_SAMPLE;
  const ORDER = ['status', 'school', 'degree', 'dates', 'now', 'ead'];
  const LABEL = {};
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
  const STEM_FIELDS = ['Computer Science', 'Computer Engineering', 'Data Science', 'Electrical Engineering',
    'Mechanical Engineering', 'Civil Engineering', 'Biomedical Engineering', 'Information Technology',
    'Mathematics', 'Statistics', 'Physics', 'Chemistry'];
  const OTHER_FIELDS = ['Business Administration', 'Economics', 'Finance', 'Journalism', 'Public Policy'];
  const ALL_FIELDS = STEM_FIELDS.concat(OTHER_FIELDS).sort();

  const QUESTION = {
    status: 'What visa are you here on?',
    school: 'Which school issued your I-20?',
    degree: 'What are you studying?',
    dates: 'When does your program start and end?',
    awarded: 'Was your degree awarded?', /* asked in Your case, listed on the finish screen */
    now: 'What are you doing now?',
  };
  const HINT = {
    status: "It's printed on your visa stamp and at the top of your I-20. You can add it later.",
    school: "It's printed at the top of your I-20. Duly will ask again later.",
    degree: 'Your I-20 lists your major. Add it and Duly reads it for you.',
    dates: 'Your I-20 has both dates. Duly will ask again later.',
    now: 'Duly will ask again later.',
  };
  /* a choice clears the "I'm not sure" of the step it answers */
  const UNSURE_OF = { status: 'status', level: 'degree', now: 'now', eadMode: 'ead' };

  const TODAY = new Date(D.today.iso + 'T00:00:00');
  let readTimer = null;

  const STYLE = '<style>' +
    '.screen-welcome .w-gap-8 { margin-top: var(--s-8); }' +
    '.screen-welcome .w-gap-12 { margin-top: var(--s-12); }' +
    '.screen-welcome .w-gap-16 { margin-top: var(--s-16); }' +
    '.screen-welcome .w-gap-24 { margin-top: var(--s-24); }' +
    '.screen-welcome .w-follow { margin-top: var(--s-24); display: flex; flex-direction: column; }' +
    '.screen-welcome .w-follow > .t-row { margin-bottom: var(--s-12); }' +
    '.screen-welcome .w-choice-row { display: flex; flex-wrap: wrap; align-items: center; column-gap: var(--s-16); }' +
    '.screen-welcome .w-quiet { display: flex; flex-direction: column; align-items: flex-start; }' +
    '.screen-welcome .w-quiet > .btn-text { margin: calc(-1 * var(--s-12)) 0; }' +
    '.screen-welcome .w-hint { margin-top: var(--s-8); }' +
    '.screen-welcome .w-reading { display: flex; flex-direction: column; gap: var(--s-8); }' +
    '.screen-welcome .w-lines { display: flex; flex-direction: column; gap: var(--s-8); }' +
    '.screen-welcome .onb-unsure:has(> [data-onb-area]:empty) { display: none; }' +
    '.screen-welcome .suggest { max-height: calc(var(--s-64) * 4); overflow-y: auto; }' +
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

  function stepKeys(s) {
    const withEad = !s.now || s.now === 'opt' || s.now === 'stem' || s.unsure.now;
    return ORDER.filter((k) => k !== 'ead' || withEad);
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
  /* the first name, only when Duly has read it from the student's own EAD card */
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
  function isStem(m) { return STEM_FIELDS.some((f) => f.toLowerCase() === trim(m).toLowerCase()); }

  function valid(key, s) {
    if (s.unsure[key]) return true;
    switch (key) {
      case 'status': return !!s.status;
      case 'school': return !!trim(s.school);
      case 'degree': return !!s.level && !!trim(s.major);
      case 'dates': return !!trim(s.start) && !!trim(s.end);
      case 'now': return !!s.now;
      case 'ead': return s.eadMode === 'type' && !!trim(s.eadFrom) && !!trim(s.eadUntil);
      default: return false;
    }
  }

  function answerFor(k, s) {
    if (s.unsure[k]) return 'Not sure yet';
    switch (k) {
      case 'status': { const o = STATUS.find((x) => x.value === s.status); return o ? o.short : ''; }
      case 'school': return trim(s.school);
      case 'degree': return degreeText(s);
      case 'dates': return s.start && s.end ? trim(s.start) + ' to ' + trim(s.end) : '';
      case 'now': return titleOf(NOW, s.now);
      case 'ead': return ({ added: 'Added', typed: 'Typed in', later: 'Later' })[s.ead] || '';
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
      C.progress({ pct: 100, label: 'Reading on this device' }) + '</div>';
  }

  /* areas are small parts of a step that update in place, so typing never loses focus */
  const AREAS = {
    stem: {
      sig: (s) => [s.changing, s.majorChosen, s.stem].join('|'),
      html: stemArea,
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

  function stemArea(s) {
    if (s.changing) {
      return '<div class="w-gap-16">' + C.field({ label: 'Pick the field printed on your I-20', key: 'onb.majorSearch', placeholder: 'Search fields', suggest: true }) + '</div>';
    }
    const m = s.majorChosen;
    if (!m || !isStem(m)) return '';
    /* The list goes by the field code on the I-20, not the major's name, so the
       note stays a likely match. Continue is the confirmation; Change corrects it. */
    const rule = Object.assign({}, D.sources.stemList, {
      plain: m + ' fields are on the list of STEM fields. Your I-20 shows the exact field.',
      counted: ['You told Duly your major is ' + m + '.'],
    });
    return '<div class="w-gap-16">' + C.note({
      title: 'This looks like a STEM degree.',
      text: m + " fields are on the government's STEM list. Your I-20 shows the exact field.",
      source: rule,
      actions: '<button type="button" class="link" data-onb="change">Not right? Change</button>',
    }) + '</div>';
  }

  function i20Area(s) {
    return s.datesFrom ? '<p class="t-meta w-gap-12">Filled in from your I-20. Tap a date to change it.</p>' : '';
  }

  /* ---------------- steps ---------------- */

  const BUILD = {
    status(s) {
      return {
        title: QUESTION.status,
        why: 'This decides which rules Duly counts for you.',
        content: C.choices({ key: 'onb.status', options: STATUS, selected: s.status, label: 'Your visa' }),
        notSure: unsure('status', s),
      };
    },

    school(s) {
      return {
        title: QUESTION.school,
        why: "Your school's own forms and steps show up in your checklists.",
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
          '<div class="w-gap-8">' + unsure('degree', s) + '</div>' +
          area('stem', s),
      };
    },

    dates(s) {
      const pick = C.choices({ key: 'onb.datesMode', layout: 'pair', selected: s.datesMode, label: 'How to add your dates', options: [
        { value: 'i20', title: 'Add your I-20', meta: 'Fastest, Duly reads both dates' },
        { value: 'type', title: 'Type the dates', meta: 'Start and end, from your I-20' },
      ] });
      let more = '';
      if (s.read && s.read.kind === 'i20') {
        more = '<div class="w-gap-24">' + reading(s.read.name) + '</div>';
      } else if (s.datesMode === 'type' || s.i20Read) {
        /* the range shows to type into, or to confirm what the I-20 gave */
        more = '<div class="w-gap-24">' + C.dateRange({
          from: { label: 'Start', key: 'onb.start', value: s.start, placeholder: 'Month day, year' },
          to: { label: 'End', key: 'onb.end', value: s.end, placeholder: 'Month day, year' },
        }) + '</div>' + area('i20', s);
      } else if (s.datesMode === 'i20') {
        more = '<p class="t-meta w-gap-12">Or drop the file anywhere on this page.</p>';
      }
      return {
        title: QUESTION.dates,
        why: 'Duly counts every later date from these.',
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
        why: 'Your work dates come from this card. Duly reads it on this Mac. Nothing is uploaded anywhere.',
      };
      const read = s.read && s.read.kind === 'ead' ? s.read : null;
      if (read && read.state === 'reading') {
        return Object.assign(base, { content: reading(read.name) + fileInput() });
      }
      if (read && read.state === 'found') {
        const rows = (s.eadRows || D.onboarding.eadFound).map((r, i) =>
          C.valueRow({ label: r[0], value: r[1], key: 'onb-ead-' + i, editable: !!s.fix })).join('');
        return Object.assign(base, {
          content: '<p class="t-meta">From ' + C.esc(read.name) + '. Read on this Mac.</p>' +
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
      } else if (s.eadMode === 'photo') {
        more = '<p class="t-meta w-gap-12">Or drop the file anywhere on this page.</p>';
      }
      return Object.assign(base, {
        content: C.choices({ key: 'onb.eadMode', layout: 'pair', selected: s.eadMode, label: 'How to add your card', options: [
          { value: 'photo', title: 'Add a photo or PDF', meta: 'Fastest' },
          { value: 'type', title: 'Type the dates', meta: 'Two dates from the card' },
        ] }) + more + fileInput(),
        notSure: quiet('Add it later', 'later'),
      });
    },
  };

  function renderStep(key, s) {
    let keys = stepKeys(s);
    if (keys.indexOf(key) === -1) keys = ORDER.slice();
    const idx = keys.indexOf(key);
    const b = BUILD[key](s);
    return C.onboarding({
      steps: C.steps({ steps: keys.map((k) => ({ key: k, label: LABEL[k], answer: answerFor(k, s) })), current: idx, reached: s.reached }),
      title: b.title,
      why: b.why,
      content: b.content,
      notSure: b.notSure,
      back: C.button({ kind: 'back', label: 'Back', attrs: { 'data-onb': 'back' } }),
      primary: b.primary || C.button({ kind: 'primary', label: 'Continue', disabled: !valid(key, s), attrs: { 'data-onb': 'next' } }),
    });
  }

  function renderStart() {
    return C.onboarding({
      title: 'Your student visa records, in one private place.',
      why: 'Duly keeps your documents, counts your dates and tells you when to start on your next step. Everything stays on this Mac.',
      back: '<span class="t-meta">About two minutes.</span>',
      primary: C.button({ kind: 'primary', label: 'Start', href: '#/welcome/status' }),
    });
  }

  function renderDone(s) {
    if (s.reached < 0) {
      /* opened directly: show the sample student's answers */
      Object.assign(s, {
        status: 'f1', school: D.student.school, level: 'master', major: D.program.major,
        start: D.program.start, end: D.program.end, awarded: 'end', now: 'opt',
        ead: 'added', eadUntil: D.opt.cardUntil, reached: ORDER.length - 1,
        read: { kind: 'ead', name: 'EAD card', state: 'found' },
      });
    }
    const lines = [];
    const status = (STATUS.find((x) => x.value === s.status) || {}).short;
    const study = [degreeText(s), trim(s.school)].filter(Boolean).join(', ');
    if (status || study) lines.push([status, study].filter(Boolean));
    if (s.now) {
      const onWork = s.now === 'opt' || s.now === 'stem';
      const card = s.ead === 'added' || s.ead === 'typed'
        ? (trim(s.eadUntil) ? 'card valid until ' + trim(s.eadUntil) : '')
        : '';
      lines.push([titleOf(NOW, s.now)].concat(onWork && card ? [card] : []));
      if (onWork) lines.push(D.onboarding.summary[2].split(' · '));
    }

    const waiting = ['status', 'school', 'degree', 'dates', 'now']
      .filter((k) => s.unsure[k])
      .map((k) => ({ title: QUESTION[k], meta: k === 'now' ? 'Waiting on Home' : 'Waiting in Your case', key: 'wait-' + k }));
    /* Conferral is not asked in onboarding; it waits in Your case when no document shows it. */
    if (endPassed(s) && !s.awarded) waiting.push({ title: QUESTION.awarded, meta: 'Waiting in Your case', key: 'wait-awarded' });
    if (s.ead === 'later') waiting.push({ title: 'Add your EAD card', meta: 'Waiting on Home, whenever you are ready', key: 'wait-ead' });

    const content =
      (lines.length ? '<div class="w-lines">' + lines.map((parts) =>
        '<p class="t-lead"><span class="t-row">' + C.esc(parts[0]) + '</span>' + (parts.length > 1 ? ' · ' + C.esc(parts.slice(1).join(' · ')) : '') + '</p>').join('') + '</div>' : '') +
      '<p class="t-lead' + (lines.length ? ' w-gap-24' : '') + '">Duly will ask anything else when it matters, one short question at a time.</p>' +
      (waiting.length ? C.waiting({ items: waiting, max: waiting.length }) : '');

    return C.onboarding({
      title: readName(s) ? "You're all set, " + readName(s) + '.' : "You're all set.",
      content: content,
      primary: C.button({ kind: 'primary', label: 'Open Duly', href: '#/home' }),
    });
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
    /* Continue past the STEM note is the confirmation; Change is the way to correct it */
    if (key === 'degree') s.stem = !s.changing && s.majorChosen && isStem(s.majorChosen) ? 'confirmed' : null;
    const keys = stepKeys(s);
    const i = keys.indexOf(key);
    s.reached = Math.max(s.reached, i);
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

  function startRead(kind, file) {
    const s = S();
    const name = file && file.name ? file.name : (kind === 'ead' ? 'EAD card' : 'I-20');
    s.read = { kind: kind, name: name, state: 'reading' };
    if (kind === 'ead') { s.eadMode = 'photo'; s.fix = false; } else { s.datesMode = 'i20'; }
    refresh();
    clearTimeout(readTimer);
    readTimer = setTimeout(() => {
      const cur = S().read;
      if (!cur || cur.name !== name || cur.kind !== kind) return;
      if (kind === 'i20') {
        s.start = D.program.start;
        s.end = D.program.end;
        s.datesFrom = true;
        s.i20Read = true;
        s.datesMode = 'i20';
        s.read = null;
        delete s.unsure.dates;
      } else {
        cur.state = 'found';
        s.eadRows = D.onboarding.eadFound.map((r) => r.slice());
        delete s.unsure.ead;
      }
      if (App.route === 'welcome' && stepKey() === (kind === 'ead' ? 'ead' : 'dates')) {
        refresh(kind === 'ead' ? '[data-onb="confirm-ead"]' : '[data-onb="next"]');
        if (kind === 'i20') App.toast('Dates filled in from your I-20');
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

  function chooseMajor(r, v) {
    const s = S();
    s.major = v;
    s.majorChosen = trim(v) ? v : null;
    s.stem = null;
    s.changing = false;
    if (trim(v)) clearUnsure(r, 'degree');
    const main = r.querySelector('[data-field="onb.major"]');
    if (main && main.value !== v) main.value = v;
    updateArea(r, 'stem', true);
    syncNext(r);
    (r.querySelector('[data-onb="next"]') || main).focus({ preventScroll: true });
  }

  function choose(r, field, value) {
    const box = r.querySelector('[data-suggest="' + field + '"]');
    if (box) box.hidden = true;
    if (field === 'onb.school') {
      const s = S();
      s.school = value;
      const input = r.querySelector('[data-field="onb.school"]');
      if (input) input.value = value;
      clearUnsure(r, 'school');
      syncNext(r);
      const nb = r.querySelector('[data-onb="next"]');
      if (nb) nb.focus({ preventScroll: true });
      return;
    }
    chooseMajor(r, value);
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
      case 'change': {
        s.changing = true;
        updateArea(r, 'stem', true);
        const input = r.querySelector('[data-field="onb.majorSearch"]');
        if (input) { input.focus(); suggest(r, 'onb.majorSearch', ALL_FIELDS, '', true); }
        break;
      }
      case 'later':
        s.ead = 'later';
        s.eadMode = null;
        next('ead');
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
    if (e.key === 'Escape') {
      if (open) { box.hidden = true; return; }
      if (f === 'onb.majorSearch') {
        s.changing = false;
        updateArea(r, 'stem', true);
        const m = r.querySelector('[data-field="onb.major"]');
        if (m) m.focus();
      }
      return;
    }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (open) { choose(r, f, open.dataset.value); return; }
    if (f === 'onb.major' && trim(t.value) && t.value !== s.majorChosen) { chooseMajor(r, t.value); return; }
    if (valid(stepKey(), s)) next(stepKey());
  }

  function onRootChange(e) {
    const t = e.target;
    if (t.matches('[data-onb-file]')) {
      const f = t.files && t.files[0];
      if (f) startRead(stepKey() === 'ead' ? 'ead' : 'i20', f);
      return;
    }
    if (t.matches('[data-field="onb.major"]')) {
      const v = t.value;
      /* a typed major counts as chosen when the field is left, unless a suggestion was picked */
      setTimeout(() => {
        const s = S();
        const r = root();
        if (!r || App.route !== 'welcome' || stepKey() !== 'degree' || s.changing) return;
        if (trim(v) && s.majorChosen !== v && trim(s.major) === trim(v)) chooseMajorQuiet(r, v);
      }, 200);
    }
  }
  function chooseMajorQuiet(r, v) {
    const s = S();
    s.major = v;
    s.majorChosen = v;
    s.stem = null;
    clearUnsure(r, 'degree');
    updateArea(r, 'stem', true);
    syncNext(r);
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation(); /* keep the document here, not in Documents */
    const k = stepKey();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (k === 'ead') startRead('ead', f);
    else if (k === 'dates') startRead('i20', f);
    else App.toast("You can add documents once you're in Duly.");
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
          if (s.majorChosen && d.value !== s.majorChosen) {
            s.majorChosen = null;
            s.stem = null;
            updateArea(r, 'stem');
          }
          suggest(r, 'onb.major', ALL_FIELDS, d.value);
          break;
        case 'majorSearch':
          suggest(r, 'onb.majorSearch', ALL_FIELDS, d.value, true);
          break;
        case 'start':
        case 'end':
          if (trim(s.start) && trim(s.end)) clearUnsure(r, 'dates');
          s.datesFrom = false;
          updateArea(r, 'i20');
          break;
        case 'eadFrom':
        case 'eadUntil':
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
        App.toast("You can add documents once you're in Duly.");
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
      else html = renderStart();
      return STYLE + html.replace('<div class="onb">', '<div class="onb screen-welcome" data-onb-screen="' + C.esc(key) + '">');
    },
    mount(r, data, params) {
      r.addEventListener('click', onRootClick);
      r.addEventListener('keydown', onRootKey);
      r.addEventListener('change', onRootChange);
      r.addEventListener('drop', onDrop);
      const key = (params && params[0]) || 'start';
      const s = S();
      if (key === 'done' && !s.celebrated) {
        s.celebrated = true;
        setTimeout(() => { const h = document.querySelector('#main h1'); if (h) App.confetti(h); }, 450);
      }
    },
  };
})();
