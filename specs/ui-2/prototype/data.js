/* Sample student for the ui-2 prototype. Illustrative, fixed data.
   Today is Wednesday, September 30, 2026. In the product every date and count
   comes from the engine and the student's documents, never from the client.
   Nothing in [brackets] is ever shown on screen: where a saved source has
   not been filled in yet, the copy names where the value lives instead.
   Rule quotes below are copied from rulepacks/f1-us/v2026.09/parameters.yaml.

   The OPT dates are consistent with each other: program ends Dec 18, 2025;
   the card runs Feb 14, 2026 to Feb 13, 2027 (12 months, starting inside
   the 60 days after the program end); the job starts Feb 27, 2026, so
   Feb 14 to Feb 26 are the 13 unemployment days. */

(function () {
  /* Days between two ISO dates, for the few bars the prototype draws. */
  function days(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }
  window.DULY_CALC = {
    days: days,
    optBar: Math.round((days('2026-02-14', '2026-09-30') / days('2026-02-14', '2027-02-13')) * 100),
  };
})();

window.DULY_SAMPLE = {
  today: { iso: '2026-09-30', long: 'Wednesday, September 30', short: 'Sep 30, 2026' },
  checked: { today: 'Checked today, 6:00 AM', rules: 'Rules checked today, 6:00 AM', offline: 'Rules last checked Sep 29. They are checked again once you are online.' },
  version: 'Version 0.2 prototype',

  /* Round 4 (VALUE.md). Duly is web, phone and desktop, one account. Copy
     never says "this Mac": it says "your device" (or "this device" where the
     student is looking at it). device.name is the one currently in use. */
  device: { here: 'this device', yours: 'your device', name: "Priya's phone", platforms: ['Web', 'Phone', 'Desktop'] },

  /* The promise (VALUE.md section 1). Shown once on Welcome and once under
     the Home title, nowhere else. "F-1 record" becomes "immigration record"
     when the H-1B, O-1 and EB-1A packs are filled (BACKLOG B5). */
  promise: {
    line: 'A private place for your F-1 record, right to the day.',
    subline: 'Your documents, dates and next steps in one place, counted from your own documents, with every rule one tap away.',
  },

  /* Three pillars, for Welcome (VALUE.md section 2). Title plus one line each;
     the line may go behind an ⓘ on a small screen. */
  pillars: [
    { key: 'day', title: 'Right to the day', line: 'Every date is counted from your own documents, in your time zone, with the rule one tap away.' },
    { key: 'private', title: 'Private by design', line: 'Documents are read on your device and stored encrypted. No ads, no partner deals, no selling data.' },
    { key: 'ahead', title: 'Ahead of what comes next', line: 'Your next move with its date, free reminders, and rule changes explained for you.' },
  ],

  student: {
    first: 'Priya',
    name: 'Priya Raman',
    visa: 'F-1',
    school: 'State University',
    sevisId: 'N0012345678',
  },

  program: {
    level: "Master's",
    major: 'Computer Science',
    degree: "Master's in Computer Science",
    stem: true,
    start: 'Aug 21, 2023',
    end: 'Dec 18, 2025',
    awarded: 'Dec 18, 2025',
    earlier: "Bachelor's, Anna University, India, 2023",
  },

  cpt: [
    { employer: 'Acme Robotics', dates: 'Jun 1 to Aug 15, 2024', note: 'On its own I-20' },
    { employer: 'Lumen Labs', dates: 'Jan 13 to May 2, 2025', note: 'On its own I-20' },
  ],

  opt: {
    category: 'Post-completion OPT',
    categoryCode: 'C03B',
    receipt: 'IOE0912345678',
    filed: 'Oct 10, 2025',
    approved: 'Dec 20, 2025',
    cardFrom: 'Feb 14, 2026',
    cardUntil: 'Feb 13, 2027',
    daysLeft: 136,
    unemploymentUsed: 13,
    unemploymentLimit: 90,
    unemploymentLeft: 77,
    unemploymentPct: 14,
  },

  job: {
    title: 'Software Engineer',
    employer: 'Northwind Systems',
    started: 'Feb 27, 2026',
    reported: true,
  },

  /* Unemployment days (VALUE.md section 3, analysis move 7.2). The count is
     shown only once the student has said the job list is complete: "Yes,
     that's every job" or "I haven't had a job yet". Before that, the one
     line "Add your job to count these days" (no job on file) or the choice
     card (a job on file). Always with its as-of date.
       state   'ask' | 'every' | 'none'. App.state.jobsComplete wins.
               Read it through App.unemployment(), never here.
       every   the count with Northwind Systems as the only job: Feb 14 to
               Feb 26, 2026, the card's first 13 days before the job began.
       none    the count with no job: every day from the card start (Feb 14,
               2026) to today (Sep 30, 2026), 229 days. Shown as a fact
               with its source; no verdict, the DSO step is on the page. */
  unemployment: {
    state: 'every',
    asOf: 'Sep 30',
    asOfLong: 'Sep 30, 2026',
    limit: 90,
    cardFrom: 'Feb 14, 2026',
    every: { used: 13, left: 77, pct: 14, counted: 'Your card started Feb 14, 2026. Your job started Feb 27, 2026. Feb 14 to Feb 26 are 13 days without work.' },
    none: { used: 229, left: 0, pct: 100, counted: 'Your card started Feb 14, 2026, and no job is on file. Feb 14 to Sep 30 are 229 days without work.' },
    ask: {
      /* With a job on file. */
      jobTitle: 'Northwind Systems, since Feb 27, 2026. Is that every job on your OPT?',
      every: "Yes, that's every job",
      another: 'Add another job',
      /* With no job on file. */
      noJobTitle: 'Have you had a job on your OPT yet?',
      none: "I haven't had a job yet",
      addJob: 'Add your job',
      href: '#/case/jobs',
      info: 'Days without work are counted only once your job list is complete, so the number is never a guess.',
    },
    everyLine: "That's every job, as of Sep 30.",
    noneLine: 'No job yet, as of Sep 30.',
    add: { action: 'Add your job', rest: 'to count these days.', href: '#/case/jobs' },
    confirm: { action: 'Confirm your jobs', rest: 'to count these days.', href: '#/case/jobs' },
  },

  /* STEM field from the I-20 (VALUE.md section 3, analysis move 7.4). The
     field code (CIP) printed on the I-20 is read on the device and confirmed
     once, then checked against the DHS STEM Designated Degree Program List.
     A fact with its source and date, never a verdict about the student.
       state  'found' (read, not confirmed yet) | 'confirmed'.
              App.state.stemField wins. Read it through App.stemField().
     The list is not yet saved in rulepacks/f1-us (decision 10.6): until it
     is, the product keeps "This looks like a STEM degree" as a question. */
  stemField: {
    state: 'confirmed',
    cip: '11.0701',
    field: 'Computer Science',
    from: 'Your I-20',
    onList: true,
    listName: 'DHS STEM Designated Degree Program List',
    listDate: 'Jul 2024',
    checked: 'Sep 30',
    line: "Your I-20's field code, 11.0701, is on the STEM list.",
    short: '11.0701, on the STEM list',
    foundTitle: 'Your I-20 lists field code 11.0701, Computer Science.',
    confirmLabel: 'That matches',
    changeLabel: 'Fix it',
    info: 'The field code on your I-20, checked against the government list of STEM fields. The list is one of the STEM OPT requirements; your DSO confirms the rest.',
  },

  /* Employer check (VALUE.md section 3). Two public facts about the
     student's own employer (or an offer they hold), each with its source and
     checked date. Never a verdict on the employer, and not a search tool.
     The E-Verify fact feeds the STEM OPT step "Check that Northwind Systems
     uses E-Verify"; the student still confirms the company ID on the I-983.
     H-1B figures are sample data in the prototype (sample: true shows a
     "Sample" mark). Where the data allows, the name is matched on the
     device against downloaded public data. Route: #/employer. */
  employer: {
    name: 'Northwind Systems',
    role: 'Software Engineer',
    since: 'Feb 27, 2026',
    relation: 'Your job',
    title: 'Employer check',
    info: 'Public records about your employer, each with its source. Not a judgement of the employer.',
    everify: {
      key: 'everify',
      label: 'E-Verify',
      state: 'participates',
      value: 'Takes part',
      line: 'Northwind Systems takes part in E-Verify.',
      meta: 'E-Verify Employer Search · checked Sep 30',
      checked: 'Sep 30',
      source: { name: 'E-Verify Employer Search', publisher: 'E-Verify (DHS and USCIS)', href: 'https://www.e-verify.gov/about-e-verify/e-verify-data/e-verify-employer-search' },
      next: 'Ask HR for the E-Verify company ID. It goes on your I-983.',
      rule: 'everify',
    },
    h1b: {
      key: 'h1b',
      label: 'H-1B petitions approved',
      sample: true,
      unit: 'approved',
      years: [
        { fy: 'FY 2025', count: 14 },
        { fy: 'FY 2024', count: 11 },
        { fy: 'FY 2023', count: 9 },
      ],
      latest: '14 in FY 2025',
      meta: 'USCIS H-1B Employer Data Hub · checked Sep 30',
      checked: 'Sep 30',
      lag: 'The latest year USCIS has published is FY 2025.',
      info: 'New and continuing H-1B approvals USCIS recorded for this employer, by federal fiscal year. Past filings, not a promise about yours.',
      source: { name: 'H-1B Employer Data Hub', publisher: 'USCIS', href: 'https://www.uscis.gov/tools/reports-and-studies/h-1b-employer-data-hub' },
      rule: 'h1bHub',
    },
    offer: { action: 'Add an offer letter', rest: 'to check that employer too.', href: '#/documents/add' },
    footer: 'From public government records, not legal advice.',
  },

  /* USCIS processing times (VALUE.md section 3, analysis move 7.7). Shown on
     USCIS status for a filed application only: USCIS's own published figure,
     quoted with form, category, office, source and date. USCIS's figure, not
     a prediction for the student. Sample figures in the prototype
     (decision 10.5; the page is not yet saved as a source). Keyed by an
     application's `processing`. Read through App.processingFor(app). */
  processingTimes: {
    'i765-stem': {
      key: 'i765-stem',
      label: 'USCIS processing time',
      form: 'Form I-765',
      category: 'STEM OPT extension',
      office: 'Potomac Service Center',
      figure: '3 months',
      basis: 'USCIS says 80% of these cases are decided within',
      line: 'USCIS says 80% of these cases are decided within 3 months.',
      meta: 'Form I-765, STEM OPT · Potomac Service Center · as of Sep 24, 2026',
      asOf: 'Sep 24, 2026',
      checked: 'Sep 30',
      sample: true,
      info: "USCIS's published figure for this form and office. Not a date for your case.",
      source: { name: 'Case Processing Times', publisher: 'USCIS', href: 'https://egov.uscis.gov/processing-times/' },
      rule: 'processing',
    },
    'i765-opt': {
      key: 'i765-opt',
      label: 'USCIS processing time',
      form: 'Form I-765',
      category: 'Post-completion OPT',
      office: 'Potomac Service Center',
      figure: '2.5 months',
      basis: 'USCIS says 80% of these cases are decided within',
      line: 'USCIS says 80% of these cases are decided within 2.5 months.',
      meta: 'Form I-765, OPT · Potomac Service Center · as of Sep 24, 2026',
      asOf: 'Sep 24, 2026',
      checked: 'Sep 30',
      sample: true,
      info: "USCIS's published figure for this form and office. Not a date for your case.",
      source: { name: 'Case Processing Times', publisher: 'USCIS', href: 'https://egov.uscis.gov/processing-times/' },
      rule: 'processing',
    },
  },

  /* Reminders (VALUE.md section 3 and 4). Free for good, on by default, at
     the student's local morning, one message for every date due. Every
     channel is free. An email carries only the date and a title, never a
     SEVIS ID, name or document. Calendar is a file added once (.ics),
     built by App.calendarFile() from `dates`. Channel on/off lives in
     App.state['remind:<key>'] (C.reminders wires it). */
  reminders: {
    on: true,
    when: 'Two weeks before, and again two days before',
    time: 'At 8:00 AM, your time',
    bundle: 'One message for every date due',
    info: 'Reminders are free on every channel.',
    channels: [
      { key: 'email', label: 'Email', on: true, meta: 'Only the date and a title', info: 'An email carries the date and a title, never your SEVIS ID, your name or a document.' },
      { key: 'phone', label: 'Phone notification', on: true, meta: 'On your phone' },
      { key: 'calendar', label: 'Calendar', meta: 'Every date, added to your calendar once', action: 'Add to calendar' },
    ],
    example: 'Nov 15: STEM OPT window opens',
    dates: [
      { iso: '2026-10-15', title: 'Start preparing for STEM OPT' },
      { iso: '2026-11-15', title: 'STEM OPT window opens' },
      { iso: '2027-02-13', title: 'EAD card ends. Last day to file for STEM OPT' },
    ],
    file: 'duly-dates.ics',
  },

  /* Onboarding: the six skeleton steps */
  onboarding: {
    steps: [
      { key: 'status', label: 'Status', answer: 'F-1' },
      { key: 'school', label: 'School', answer: 'State University' },
      { key: 'degree', label: 'Degree', answer: "Master's, Computer Science" },
      { key: 'dates', label: 'Dates', answer: 'Aug 21, 2023 to Dec 18, 2025' },
      { key: 'now', label: 'Now', answer: 'On OPT' },
      { key: 'ead', label: 'EAD card', answer: 'Added' },
    ],
    schools: ['State University', 'State University of New York', 'Stateline College', 'Stanford University'],
    eadFound: [
      ['Name', 'Priya Raman'],
      ['Category', 'Post-completion OPT'],
      ['Valid from', 'Feb 14, 2026'],
      ['Valid until', 'Feb 13, 2027'],
    ],
    summary: [
      "F-1 · Master's in Computer Science, State University",
      'On OPT · card valid until Feb 13, 2027',
      'Next · Decide on STEM OPT · start preparing by Oct 15 if you apply',
    ],
  },

  /* Home */
  home: {
    eyebrow: 'On OPT',
    headline: "You're working on OPT at Northwind Systems.",
    /* The why behind the hero, for an ⓘ beside it (C.hero({ info })). */
    info: 'Counted from your EAD card and your job start date.',
    subline: 'Your STEM OPT window opens Nov 15. Start preparing by Oct 15.',
    /* Subline once the student has said no to STEM OPT, or has nothing left this week. */
    sublineQuiet: 'Nothing else needs you this week.',
    metrics: [
      { eyebrow: 'Unemployment days', value: '13', unit: 'used · 77 left', bar: 14, source: 'unemployment', asOf: 'As of Sep 30' },
      { eyebrow: 'EAD valid until', value: 'Feb 13, 2027', date: true, unit: '136 days left', source: 'eadEnds' },
      { eyebrow: 'Next date', value: 'Nov 15', date: true, unit: 'STEM OPT window opens · in 46 days', source: 'stemOpens' },
    ],
    /* Third metric when the student said no to STEM OPT: the next real date. */
    metricNoStem: { eyebrow: 'Next date', value: 'Feb 13, 2027', date: true, unit: 'Your card ends · in 136 days', source: 'eadEnds' },
    /* Third metric with no EAD card on file. */
    metricNoEad: { eyebrow: 'Next date', add: { action: 'Add your EAD card', rest: 'to see this date.', href: '#/documents/add' } },
    /* Your next move: one line, a date and one action (Round 3, note 1).
       'stemIntent' is answered in place on Home (Round 5, note 1): inPlace
       true means draw C.stemDecide() there instead of a link away; the
       primary href is kept only as the no-script fallback.
       'changes' is the standing rule to report a job change within 10 days;
       it has no date and shows only when there is no dated move. Address
       is left out until (f)(17) is a saved rule (BLUEPRINT 2.6 D). */
    nextMoves: [
      {
        key: 'stemIntent',
        title: 'Decide on STEM OPT',
        date: 'Oct 15',
        meta: 'Start preparing by Oct 15',
        primary: { label: 'Decide', href: '#/steps' },
        inPlace: true,
        source: 'startPreparing',
      },
      {
        key: 'changes',
        title: 'Changed your job?',
        meta: 'Report it within 10 days',
        href: '#/steps',
        source: 'reportChanges',
      },
    ],
    /* What's new: headlines only, each opening its article in News.
       key is an updates.items id (App.findUpdate). */
    whatsNew: [
      { key: 'court' },
    ],
  },

  /* Next steps: STEM OPT. One page (#/steps) holds the path, its dates and
     its steps (Round 3, note 2). Lines named *Info are explanations for an ⓘ,
     never printed as subtext. */
  stem: {
    intent: null, /* null, 'yes', 'no' or 'unsure' */
    eyebrow: 'STEM OPT extension',
    askTitle: 'Planning to apply for STEM OPT?',
    askLine: 'Window opens Nov 15, 2026.',
    askInfo: "Your I-20's field code, 11.0701, is on the STEM list, and your card ends Feb 13, 2027.",
    unsureLine: 'Here are the dates. Decide any time.',
    yesTitle: 'Start preparing by Oct 15.',
    yesLine: 'File between Nov 15, 2026 and Feb 13, 2027.',
    noTitle: 'Your card ends Feb 13, 2027.',
    noLine: null,
    noInfo: "You'll see what comes after OPT closer to that date.",
    today: { label: 'Today', pct: 0 },
    /* The three key dates. One source of truth for Home's in-place strip,
       Next steps and USCIS status: read them through App.stemPlan() and draw
       them with C.timeline(App.stemTimeline()). key names the date, iso is
       what the timeline scales by, date is how it reads. */
    dates: [
      { key: 'prepare', iso: '2026-10-15', date: 'Oct 15, 2026', label: 'Start preparing', source: 'startPreparing' },
      { key: 'opens', iso: '2026-11-15', date: 'Nov 15, 2026', label: 'Window opens', source: 'stemOpens' },
      { key: 'closes', iso: '2027-02-13', date: 'Feb 13, 2027', label: 'Last day to file', source: 'stemCloses', end: true },
    ],
    /* The real timeline (Round 5, note 3), built by App.stemTimeline():
       scaled to time from today (or the start of the first span, once today is
       past it) to the last day to file. Two shaded spans, a Today marker with
       one line, and only the date that matters now emphasized: the window
       opening until it opens, then the last day to file. {n} is "46 days",
       {date} a date as it reads. */
    timeline: {
      label: 'STEM OPT dates',
      spans: [
        { label: 'Prepare', from: 'prepare', to: 'opens' },
        { label: 'Filing window', from: 'opens', to: 'closes' },
      ],
      captions: {
        before: 'Window opens in {n}',
        open: 'Last day to file in {n}',
        last: 'Today is the last day to file',
        after: 'The last day to file was {date}',
      },
    },
    /* Home's next move, answered in place (Round 5, note 1). C.stemDecide()
       draws it from here; the answer is App.state.stemIntent, the same one
       Next steps reads (App.stemIntent, App.setStemIntent). A yes shows the
       three dates in a small strip and an optional See all steps; nothing
       leaves Home unasked. */
    decide: {
      title: 'Decide on STEM OPT',
      choices: [
        { label: 'Yes', value: 'yes' },
        { label: 'No', value: 'no' },
        { label: 'Not sure', value: 'unsure' },
      ],
      yes: 'You plan to apply',
      no: 'Not applying this time',
      unsure: 'Decide any time',
      change: 'Change',
      seeAll: { label: 'See all steps', href: '#/steps' },
    },
    /* The federal STEM OPT steps, computed from the sourced rule pack for this
       student and recomputed when an approved rule change lands. App.steps('stem')
       merges them with the school's steps. The receipt number is not a step:
       USCIS status covers it.
         meta   a date or a short fact, or null
         info   the explanation, behind an ⓘ (C.task({ info }))
         onDone shown inside a step once it is checked
         updated { date, href, what }: set only when an approved rule change
                touched the step. None today. */
    tasks: [
      { key: 'everify', title: 'Check that Northwind Systems uses E-Verify', meta: 'Listed in E-Verify, checked Sep 30', info: 'Ask HR for the E-Verify company ID. It goes on your I-983.', source: 'stemEmployer',
        open: { label: 'See', href: '#/employer' } },
      { key: 'i983', title: 'Fill out your I-983 training plan with your manager', meta: 'Form I-983', info: 'You and your manager both sign it.', source: 'stemPlan' },
      { key: 'i20', title: 'Get your new I-20 from your school', meta: null, info: "It carries your school's STEM OPT recommendation.", source: 'within60',
        onDone: { action: 'Add the date your school recommends you', rest: 'to see your exact last day to file.', href: '#/case/recommended', source: 'within60' } },
      { key: 'i765', title: 'File Form I-765 with USCIS', meta: 'Nov 15, 2026 to Feb 13, 2027', info: "Within 60 days of your school's recommendation.", source: 'stemOpens' },
    ],
  },

  /* The rule pack behind every federal step and date. Shown as one quiet
     line, "Rules checked Sep 30", with the why behind an ⓘ (C.rulesLine). */
  rules: {
    checked: 'Rules checked Sep 30',
    checkedLong: 'Rules checked today, 6:00 AM',
    info: 'Your steps and dates are worked out from the current rules. When a rule changes, they update and the change shows in News.',
    href: '#/updates',
  },

  /* Your school's steps (Round 3, note 4). Never typed in by hand: the
     student pastes the school's OPT or STEM OPT page link, or adds the
     school's PDF (C.schoolImport). The steps are read from it, marked
     "Your school", placed against the federal steps, and confirmed once.
     Public school information, not the student's documents.
       state      'empty' | 'found' | 'confirmed' at launch
       found      what the demo link yields. Any link or PDF gives these in
                  the prototype. Each is placed against a federal step:
                    before     the federal step shows "Waiting on: <title>"
                    alongside  shown next to the federal step
                    after      shown once the federal step is done
       draft      'dso' means the step carries the DSO email draft.
     schoolSteps holds the confirmed ones; App.setSchoolImport fills it. */
  schoolImport: {
    state: 'empty',
    placeholder: "Paste your school's STEM OPT page link",
    info: "Public information from your school's site, not your documents. The steps go into your list and you confirm them once.",
    demo: 'https://www.example.edu/international/stem-opt',
    href: 'https://www.example.edu/international/stem-opt',
    label: "State University's STEM OPT page",
    found: [
      { id: 'su-workshop', path: 'stem', title: 'Watch the STEM OPT workshop', meta: 'On the school site', placement: 'before', federal: 'i983', done: false },
      { id: 'su-stem-request', path: 'stem', title: 'Send the STEM OPT request in the school portal', meta: 'With your signed I-983', placement: 'before', federal: 'i20', done: false, draft: 'dso' },
      { id: 'su-receipt', path: 'stem', title: 'Send your USCIS receipt to the school', meta: 'In the school portal', placement: 'alongside', federal: 'i765', done: false },
    ],
  },
  schoolSteps: [],

  /* Things the student has already completed. Confetti fires only the first
     time a key is completed, and never for a key listed here. App.complete()
     adds to this list at runtime. */
  completions: ['timeline:arrival', 'timeline:masters', 'timeline:cpt', 'checklists:cpt', 'checklists:opt', 'steps:cpt', 'steps:opt', 'application:opt'],

  /* USCIS status (#/uscis, Round 3, note 3). Status is entered by the
     student for now, always with the date it was true ("as of"). Live
     tracking from USCIS is parked (BACKLOG B8); until then the page offers a
     recheck on USCIS itself. */
  applications: {
    steps: ['Filed', 'Received', 'Biometrics', 'Decision', 'Card mailed'],
    receiptPlaceholder: 'Three letters and ten digits, from your USCIS notice',
    /* Track another case (Round 5, note 2): any receipt number with its form
       type, saved to the list with status Unknown until the student rechecks
       it on USCIS. App.addCase() validates and saves; C.trackCase() is the
       form. key 'other' asks for the form in the student's own words. */
    formTypes: [
      { key: 'i129', label: 'H-1B petition', form: 'Form I-129' },
      { key: 'i485', label: 'Green card', form: 'Form I-485' },
      { key: 'i140', label: 'Immigrant petition', form: 'Form I-140' },
      { key: 'i131', label: 'Travel document', form: 'Form I-131' },
      { key: 'i765', label: 'Work permit', form: 'Form I-765' },
      { key: 'i539', label: 'Change or extend stay', form: 'Form I-539' },
      { key: 'other', label: 'Other' },
    ],
    add: {
      open: 'Track another case',
      receiptLabel: 'Receipt number',
      formLabel: 'What is it for?',
      otherLabel: 'Form or name',
      otherPlaceholder: 'For example Form I-130',
      save: 'Track this case',
      cancel: 'Cancel',
      saved: 'Case added. Recheck it on USCIS to see its status',
      unknown: 'Unknown',
      unknownLine: 'Recheck on USCIS to see its status',
      errors: {
        empty: 'Add the receipt number from your USCIS notice.',
        format: 'A receipt number is three letters and ten digits, like IOE0912345678.',
        duplicate: 'This receipt number is already on your list.',
        form: 'Choose what the case is for.',
        other: 'Name the form, for example Form I-130.',
      },
    },
    tracking: {
      live: false,
      label: 'Live tracking',
      state: 'Once connected to USCIS',
      info: 'Live tracking reads your case status from USCIS once that connection is approved. Until then, status is what you last saw on USCIS.',
      recheck: { label: 'Recheck in your USCIS account', href: 'https://myaccount.uscis.gov/' },
      caseStatus: { label: 'Check case status on USCIS', href: 'https://egov.uscis.gov/' },
    },
    items: [
      {
        id: 'opt',
        title: 'OPT work permit',
        form: 'Form I-765',
        category: 'Post-completion OPT',
        receipt: 'IOE0912345678',
        status: 'Approved',
        current: 4,
        asOf: 'Dec 20, 2025',
        manual: true,
        dates: [
          { label: 'Filed', date: 'Oct 10, 2025' },
          { label: 'Approved', date: 'Dec 20, 2025' },
          { label: 'Card valid', date: 'Feb 14, 2026 to Feb 13, 2027' },
        ],
        next: { title: 'Nothing to do here', meta: 'Your card is valid until Feb 13, 2027.' },
        processing: 'i765-opt',
        document: { label: 'I-797 approval notice', href: '#/documents/opt' },
        schoolSteps: [],
      },
      {
        id: 'stem',
        title: 'STEM OPT work permit',
        form: 'Form I-765',
        category: 'STEM OPT extension',
        receipt: null,
        status: 'Not filed yet',
        current: null,
        asOf: 'Sep 30, 2026',
        manual: true,
        dates: [
          { label: 'Start preparing', date: 'Oct 15, 2026', source: 'startPreparing' },
          { label: 'Window opens', date: 'Nov 15, 2026', source: 'stemOpens' },
          { label: 'Last day to file', date: 'Feb 13, 2027', source: 'stemCloses' },
        ],
        next: { title: 'Start preparing by Oct 15', href: '#/steps' },
        /* Shown once filed (a receipt number and no decision): App.processingFor(). */
        processing: 'i765-stem',
        schoolSteps: [],
      },
    ],
  },

  /* The DSO email, opened only when asked (C.emailDraft({ key: 'dso', ... })).
     It belongs to the school step 'su-stem-request' (draft: 'dso'). */
  email: {
    key: 'dso',
    step: 'school:su-stem-request',
    openLabel: 'Write the email to your DSO',
    to: 'Your DSO at State University',
    subject: 'STEM OPT extension, Priya Raman',
    paragraphs: [
      'Hi,',
      "I'm Priya Raman. I finished my Master's in Computer Science at State University in December 2025 and I'm on OPT now, working as a Software Engineer at Northwind Systems. My EAD card is valid until February 13, 2027.",
      "I'd like to apply for the STEM OPT extension. Could you help me with a few things?",
    ],
    questions: [
      'I will send my STEM OPT request through the school portal with my signed Form I-983. Is there anything else you need with it?',
      'When is a good time to send my Form I-983, so your recommendation lines up with my filing window?',
      'Is there anything in my record I should update first?',
    ],
    signoff: ['Thank you,', 'Priya Raman', 'SEVIS ID N0012345678'],
    foot: 'Written from your records. Change anything before you send it.', /* behind an ⓘ */
  },

  /* Timeline */
  phases: [
    {
      key: 'arrival', state: 'done', title: 'Arrival', meta: 'F-1 visa · Aug 2023',
      text: 'You did this: arrived on your F-1 visa.',
      link: { label: '3 documents: passport, visa, I-94', href: '#/documents/visa' },
    },
    {
      key: 'masters', state: 'done', title: "Master's in Computer Science", meta: 'Aug 21, 2023 to Dec 18, 2025 · degree awarded',
      text: "You did this: finished your Master's at State University. Degree awarded Dec 18, 2025.",
      link: { label: '2 documents: degree certificate, transcripts', href: '#/documents/university' },
    },
    {
      key: 'cpt', state: 'done', title: 'CPT: two internships, done', meta: 'Acme Robotics · Lumen Labs',
      rows: [
        { title: 'Acme Robotics', meta: 'Jun 1 to Aug 15, 2024 · on its own I-20' },
        { title: 'Lumen Labs', meta: 'Jan 13 to May 2, 2025 · on its own I-20' },
      ],
    },
    {
      key: 'opt', state: 'now', title: 'OPT', meta: 'Software Engineer at Northwind Systems · 136 days left on your card',
      /* Share of the card used: Feb 14, 2026 to Sep 30, 2026 is 228 of 364 days. */
      bar: window.DULY_CALC.optBar,
      now: [
        { kind: 'value', label: 'Unemployment days', value: '13 of 90 used', source: 'unemployment' },
        { kind: 'value', label: 'Job reported to school', value: 'Software Engineer, Northwind Systems, since Feb 27, 2026' },
        { kind: 'value', label: 'USCIS', value: 'IOE0912345678 · approved Dec 20, 2025', href: '#/uscis/opt' },
      ],
      link: { label: 'EAD card and approval notice', href: '#/documents/opt' },
    },
    {
      key: 'stem', state: 'next', title: 'STEM OPT extension', meta: 'Window opens Nov 15, 2026',
      /* Intent is asked only on Next steps. Here it is one quiet line with a link. */
      undecided: { text: 'STEM OPT: not decided yet.', link: { label: 'Decide', href: '#/steps' } },
      after: { text: 'Start preparing by Oct 15.', link: { label: 'See your steps', href: '#/steps' } },
      declined: { text: 'Not this time.', link: { label: 'Change', href: '#/steps' } },
    },
    {
      key: 'after', state: 'next', title: 'After OPT', meta: 'H-1B and other paths',
      text: 'H-1B starts with your employer. The dates appear here when USCIS announces the next registration.',
    },
  ],

  /* The paths on Next steps. Applications are not steps: USCIS status
     covers them. */
  checklists: {
    paths: [
      { key: 'cpt', label: 'CPT', done: true },
      { key: 'opt', label: 'OPT' },
      { key: 'stem', label: 'STEM OPT' },
      { key: 'h1b', label: 'H-1B' },
    ],
    selected: 'stem',
    stem: {
      eyebrow: 'Window opens Nov 15',
      title: 'STEM OPT extension',
      progressMeta: 'start by Oct 15',
      steps: null, /* set below to stem.tasks: one list of steps */
      doneLine: 'Every step done.',
    },
    opt: {
      steps: [
        { key: 'reported', title: 'Job reported to your school', meta: 'Northwind Systems, Feb 27, 2026', done: true, doneMeta: 'Done Feb 27, 2026' },
        /* A standing rule, never done: render with C.ongoing (no checkbox). */
        { key: 'changes', title: 'Report a change of name or job within 10 days', meta: 'Ongoing', ongoing: true, source: 'reportChanges' },
      ],
    },
    h1b: { eyebrow: 'Later', title: 'H-1B starts with your employer.', line: null, info: 'The dates appear here when USCIS announces the next registration.' },
  },

  /* ===== NEWS ===== (owned by screens/updates.js; route stays #/updates)
     Each item is an article with its own page at #/updates/<id>
     (App.findUpdate(id)), written only from a source saved in
     rulepacks/f1-us/v2026.09/sources (see its SOURCES.md) or the notes on the
     2026 regime. An item with no saved source is removed, never invented
     (Round 3, note 6). Newest first.
       title     the headline
       dek       one short line under it, for rows and under the headline
       label     a word or two above the headline on the article page
       date      the day it happened; source { name, label, href, file }
       article   four to six short paragraphs: what happened, the
                 background, what it changes and does not, what comes next
       forYou    the "For you" box: affects.short is its first line, forYou
                 the one line after it (what to do)
       affects   { short, line, byIntent? } and todo, kept for C.affectsFor
       changed   steps a rule change touched: [{ path, step, title, change }]
       info      for the ⓘ beside "For you" */
  updates: {
    pageInfo: 'Court rulings and rule changes for F-1 students, each written from the order or the rule itself. When one changes your dates, your steps update too.',
    items: [
      {
        id: 'court',
        kind: 'news',
        label: 'Court ruling',
        title: 'Court puts the rule ending duration of status on hold',
        dek: 'A federal judge in Boston paused the fixed admission period for F-1 students, nationwide.',
        date: 'Sep 14, 2026',
        meta: 'Sep 14, 2026 · U.S. District Court, Massachusetts',
        article: [
          'On September 14, a federal judge in Boston put on hold a Department of Homeland Security rule that would have ended "duration of status" for F-1 students. The rule was due to take effect the next day. Judge F. Dennis Saylor IV postponed its effective date and barred the government from taking any further step to carry it out.',
          'Since 1978, with limited exceptions, F-1 students have been admitted for duration of status: they may stay while studying full time, or while on authorized practical training after their studies, rather than until a date set on arrival.',
          'The rule, published July 17, 2026, would have replaced that with a fixed period of up to four years. Anyone who needed longer, such as many Ph.D. students, would have had to ask for an extension on Form I-539.',
          'The case was brought by groups representing colleges, universities and educators, among them the Presidents\' Alliance on Higher Education and Immigration and NAFSA, along with several unions. The judge found they were likely to win, and that the harm would be immediate.',
          'The pause covers everyone, not only the schools in the case: the judge said separate rules for different schools would cause "chaos and confusion." It postpones the rule; it does not strike it down. The request to set the rule aside for good was denied for now, and can be raised again.',
          'The order lasts until the court says otherwise or decides the case. A status conference is set for October 2 in Boston. As of September 28, the court record showed no later order.',
        ],
        forYou: "Your dates are counted under the rules in effect today, which this order keeps in place. Nothing to do; if the order changes, you'll see it here.",
        affects: {
          short: 'No change for you',
          line: 'No change for you. Your dates are counted under the rules in effect today.',
        },
        todo: "Nothing to do. You'll get an update if the court's order changes.",
        source: {
          name: 'U.S. District Court, Massachusetts',
          label: 'Read the order',
          href: 'https://www.courtlistener.com/docket/74661796/51/presidents-alliance-on-higher-education-and-immigration-v-united-states/',
          file: 'mad-1-26-cv-13799-doc51-order',
        },
        changed: [],
        info: 'News, not a rule change. Your steps and dates stay as they are.',
      },
      {
        id: 'dc-ruling',
        kind: 'news',
        label: 'Court ruling',
        title: "A second court turns down one J-1 visitor's request",
        dek: 'The ruling covers one case. The nationwide pause stays in place.',
        date: 'Sep 14, 2026',
        meta: 'Sep 14, 2026 · U.S. District Court, District of Columbia',
        article: [
          'Also on September 14, a federal judge in Washington, D.C. denied a request from a J-1 exchange visitor and her U.S. citizen husband to keep the same rule from applying to her while their lawsuit goes on.',
          'Their lawsuit is about a waiver of the J-1 requirement to return home for two years. They said the new rule would start her "unlawful presence" clock as early as September 15, and that time can later bar a person from coming back to the United States.',
          'Judge Jia M. Cobb found they had not shown they could get the order they asked for. Their lawsuit challenges how the waiver was handled, not the rule itself, and winning it would not stop the clock.',
          'The ruling covers only that case. It does not undo the Boston order issued the same day, which postpones the rule for everyone.',
          'Only the request for a quick order was denied. Their lawsuit over the waiver continues.',
        ],
        forYou: 'This case concerns one J-1 visitor. The rule stays on hold for everyone under the Boston order. Nothing to do.',
        affects: {
          short: 'No change for you',
          line: 'No change for you. The rule stays on hold under the Boston order.',
        },
        todo: 'Nothing to do.',
        source: {
          name: 'U.S. District Court, District of Columbia',
          label: 'Read the opinion',
          href: 'https://www.courtlistener.com/docket/73578893/14/trilleras-gomez-v-mullin/',
          file: 'dcd-1-26-cv-02364-doc14-opinion',
        },
        changed: [],
        info: 'News, not a rule change. Your steps and dates stay as they are.',
      },
      {
        id: 'fixed-admission-rule',
        kind: 'news',
        label: 'Federal rule',
        title: 'What the paused rule would change for students on OPT',
        dek: 'Fixed end dates, and 30 days instead of 60 after your program ends.',
        date: 'Jul 17, 2026',
        meta: 'Jul 17, 2026 · Federal Register',
        article: [
          'On July 17, 2026, the Department of Homeland Security published a final rule setting a fixed period of admission for F-1 students, exchange visitors and foreign journalists. It was due to take effect September 15, 2026. A court has postponed it, so none of it applies today.',
          'Under the rule, students arriving after it took effect would get an I-94 with a set end date: the program end date on their I-20, up to four years, plus 30 days to leave.',
          'Three counts that matter on OPT would shrink from 60 days to 30: the time to leave or change status after finishing, the time to apply for OPT after the program ends, and the latest OPT start date a student can ask for.',
          'Most comments on the proposal opposed cutting the 60 days to 30. The final rule kept the cut.',
          'The STEM OPT requirements read the same, word for word, in the old and the new text.',
          'The rule stays postponed until the court in Boston says otherwise or decides the case.',
        ],
        forYou: 'Nothing changes while the rule is on hold, and your STEM OPT steps read the same under it. Nothing to do.',
        affects: {
          short: 'Not in effect',
          line: 'Not in effect. Your dates are counted under the rules in effect today.',
        },
        todo: 'Nothing to do.',
        source: {
          name: 'Federal Register',
          label: 'Read the rule',
          href: 'https://www.federalregister.gov/documents/2026/07/17/2026-14439/establishing-a-fixed-time-period-of-admission-and-an-extension-of-stay-procedure-for-nonimmigrant',
          file: 'fr-2026-14439',
        },
        changed: [],
        info: 'Your steps and dates follow the rules in effect today. If this rule takes effect, they update and you see it here.',
      },
    ],
    empty: 'No news yet.',
    emptyStatus: 'Nothing new for your status this week.',
    emptyNews: 'No news this week.',
    footer: 'Written from the court orders and the rule. Not legal advice.',
  },
  /* ===== END NEWS ===== */

  /* Documents */
  documents: {
    count: 12,
    headline: '12 documents, one record.',
    meta: 'Every version kept, encrypted on your device.',
    /* One tap opens, one tap shares through the phone's own share sheet
       (C.shareButton, App.share). No more sending an I-20 to your own chat. */
    share: { label: 'Share', info: 'Opens your phone\'s share sheet: Mail, Messages or any app.' },
    /* The three asked for most, one tap from the top of Documents on a phone. */
    quick: [
      { title: 'I-20 · OPT', meta: 'OPT from Feb 14, 2026', href: '#/documents/i20-opt' },
      { title: 'EAD card', meta: 'Valid until Feb 13, 2027', href: '#/documents/opt' },
      { title: 'Passport', meta: 'Valid until Jul 9, 2031', href: '#/documents/passport' },
    ],
    tabs: [
      { key: 'all', label: 'All' },
      { key: 'i20', label: 'I-20s', count: 4 },
      { key: 'work', label: 'Work', count: 3 },
      { key: 'identity', label: 'Identity', count: 3 },
      { key: 'school', label: 'School', count: 2 },
    ],
    /* Each I-20 is named by what it is for. A document opens its own page
       (#/documents/<id>): what it is, its key dates, Open and Share, then
       its earlier versions, each with what changed. latest.change says
       what the newest version changed; versions run newest first. */
    i20Groups: [
      { key: 'opt', title: 'OPT', items: [
        { id: 'i20-opt', name: 'I-20 · OPT', title: 'OPT', meta: 'OPT Feb 14, 2026 to Feb 13, 2027 · at Northwind Systems', current: true,
          about: "Your OPT I-20, with your school's recommendation on page 2. Carry it with your EAD card.",
          dates: [['OPT start', 'Feb 14, 2026'], ['OPT end', 'Feb 13, 2027'], ['Employer you reported', 'Northwind Systems, since Feb 27, 2026'], ['School recommended OPT', 'Oct 3, 2025'], ['You filed your I-765', 'Oct 10, 2025'], ['This version', 'Mar 2, 2026']],
          latest: { date: 'Mar 2, 2026', change: 'Travel signature added' },
          versions: [
            { date: 'Oct 24, 2025', change: 'End date corrected' },
            { date: 'Oct 3, 2025', change: 'Original, sent with the I-765' },
          ] },
      ] },
      { key: 'cpt', title: 'CPT', items: [
        { id: 'i20-cpt-lumen', name: 'I-20 · CPT at Lumen Labs', title: 'Lumen Labs', meta: 'CPT Jan 13 to May 2, 2025 · Part time',
          about: 'The I-20 that let you work at Lumen Labs on CPT.',
          dates: [['CPT start', 'Jan 13, 2025'], ['CPT end', 'May 2, 2025'], ['Employer', 'Lumen Labs'], ['Hours', 'Part time'], ['This version', 'Jan 8, 2025']],
          latest: { date: 'Jan 8, 2025', change: 'Start date corrected' },
          versions: [{ date: 'Dec 16, 2024', change: 'Original' }] },
        { id: 'i20-cpt-acme', name: 'I-20 · CPT at Acme Robotics', title: 'Acme Robotics', meta: 'CPT Jun 1 to Aug 15, 2024 · Full time',
          about: 'The I-20 that let you work at Acme Robotics on CPT.',
          dates: [['CPT start', 'Jun 1, 2024'], ['CPT end', 'Aug 15, 2024'], ['Employer', 'Acme Robotics'], ['Hours', 'Full time'], ['This version', 'May 20, 2024']],
          latest: { date: 'May 20, 2024', change: 'Original' } },
      ] },
      { key: 'start', title: 'Starting school', items: [
        { id: 'i20-start', name: 'I-20 · Starting school', title: 'Initial I-20', meta: 'Program Aug 21, 2023 to Dec 18, 2025',
          about: 'The I-20 you entered the US with, for your program at State University.',
          dates: [['Program start', 'Aug 21, 2023'], ['Program end', 'Dec 18, 2025'], ['This version', 'Dec 9, 2024']],
          latest: { date: 'Dec 9, 2024', change: 'Travel signature added' },
          versions: [
            { date: 'Dec 11, 2023', change: 'Travel signature added' },
            { date: 'Jun 2, 2023', change: 'Original, used for your visa' },
          ] },
      ] },
    ],
    work: [
      { id: 'ead-card', title: 'EAD card', meta: 'Valid Feb 14, 2026 to Feb 13, 2027',
        about: 'Your work permit for OPT.', dates: [['Valid from', 'Feb 14, 2026'], ['Valid until', 'Feb 13, 2027'], ['This version', 'Mar 3, 2026']] },
      { id: 'i797', title: 'I-797 approval notice', meta: 'OPT approved Dec 20, 2025',
        about: 'USCIS approved your OPT application.', dates: [['You filed', 'Oct 10, 2025'], ['Approved', 'Dec 20, 2025'], ['This version', 'Mar 3, 2026']] },
      { id: 'offer-northwind', title: 'Offer letter · Northwind Systems', meta: 'Job on OPT, from Feb 27, 2026', also: ['opt'],
        about: 'Your job on OPT: Software Engineer at Northwind Systems.', dates: [['Job', 'Software Engineer'], ['Start', 'Feb 27, 2026']] },
    ],
    identity: [
      { id: 'passport', title: 'Passport', meta: 'Valid until Jul 9, 2031', about: 'Your passport.', dates: [['Valid until', 'Jul 9, 2031'], ['This version', 'Mar 3, 2026']] },
      { id: 'f1-visa', title: 'F-1 visa', meta: 'Issued Aug 2023', about: 'The visa in your passport.', dates: [['Issued', 'Aug 2023'], ['This version', 'Mar 3, 2026']] },
      { id: 'i94', title: 'I-94', meta: 'Entered Aug 2023', about: 'Your record of entry to the US.', dates: [['Entered', 'Aug 2023'], ['This version', 'Mar 3, 2026']] },
    ],
    school: [
      { id: 'degree', title: 'Degree certificate', meta: 'Awarded Dec 18, 2025', about: "Your Master's in Computer Science.", dates: [['Awarded', 'Dec 18, 2025']] },
      { id: 'transcripts', title: 'Transcripts', meta: 'State University', about: 'Your grades from State University.', dates: [] },
    ],
    kinds: ['I-20', 'EAD card', 'I-797', 'Other'],
    /* What the prototype "reads" from a CPT I-20 added in the sheet. */
    sampleRead: { kind: 'CPT I-20', employer: 'Harbor Analytics', dates: 'Jun 2 to Aug 22, 2025' },
  },

  /* Your case */
  caseFile: {
    sections: [
      { key: 'about', eyebrow: 'About you', rows: [
        { key: 'name', label: 'Name', value: 'Priya Raman' },
        { key: 'visa', label: 'Visa', value: 'F-1' },
        { key: 'school', label: 'School', value: 'State University' },
      ] },
      { key: 'study', eyebrow: 'Study', rows: [
        { key: 'degree', label: 'Degree', value: "Master's in Computer Science" },
        { key: 'stem', label: 'STEM field', value: 'Field code 11.0701, on the STEM list', source: 'stemList', readonly: true },
        { key: 'dates', label: 'Program dates', value: 'Aug 21, 2023 to Dec 18, 2025' },
        { key: 'awarded', label: 'Degree awarded', value: 'Dec 18, 2025' },
        { key: 'earlier', label: 'Earlier degree', value: "Bachelor's, Anna University, India, 2023" },
      ] },
      { key: 'cpt', eyebrow: 'Internships (CPT)', rows: [
        { key: 'acme', label: 'Acme Robotics', value: 'Jun 1 to Aug 15, 2024' },
        { key: 'lumen', label: 'Lumen Labs', value: 'Jan 13 to May 2, 2025' },
      ], add: 'Add another internship' },
      { key: 'opt', eyebrow: 'OPT',
        rows: [
          { key: 'permit', label: 'Work permit', value: 'Feb 14, 2026 to Feb 13, 2027' },
          { key: 'application', label: 'Application', value: 'IOE0912345678 · approved Dec 20, 2025' },
          { key: 'unemployment', label: 'Unemployment days', value: '13 of 90 used', source: 'unemployment', readonly: true },
        ] },
      { key: 'job', eyebrow: 'Job', rows: [
        { key: 'job', label: 'Job', value: 'Software Engineer, Northwind Systems' },
        { key: 'started', label: 'Started', value: 'Feb 27, 2026' },
        { key: 'reported', label: 'Reported to school', value: 'Yes' },
      ] },
      { key: 'plans', eyebrow: 'Plans',
        /* Intent is asked only on Next steps. Here it is one quiet line with a link. */
        undecided: { text: 'STEM OPT: not decided yet.', link: { label: 'Decide', href: '#/steps' } },
        rows: [] },
    ],
  },

  /* Settings */
  settings: {
    storage: { title: 'Stored encrypted', meta: 'Your records and documents are encrypted on your device. 12 documents.' },
    /* One short privacy line, true to what is built (analysis move 7.8). */
    privacy: 'No ads. No partner deals. No selling data. Documents are read on your device.',
    /* Where Duly runs. One account on each. */
    devices: [
      { title: 'This phone', meta: "Priya's phone · now" },
      { title: 'MacBook', meta: "Priya's MacBook · Sep 29" },
      { title: 'Web', meta: 'Chrome · Sep 28' },
    ],
    backup: { title: 'Back up to a file', meta: 'An encrypted copy you keep. Last backup: Sep 12, 2026.' },
    restoreFrom: "From Priya's MacBook, Sep 12, 2026",
    lockAfter: '5 minutes',
    lockOptions: ['1 minute', '5 minutes', '15 minutes', '1 hour'],
    remind: 'Two weeks before, and again two days before.',
    /* The value beside the reminder switch, on one line. */
    remindShort: 'Two weeks and two days before',
    timeZone: 'New York, set from this device',
    theme: 'system',
    deleteMeta: 'Removes your records and documents from your account and your devices. Backups you saved stay where you put them.',
  },

  /* Where the waiting dot shows in the nav. app.js adds 'steps' while the
     STEM OPT intent is unanswered and 'case' while a Your case question waits. */
  waitingIn: [],

  /* Asked once, in Your case > Study, only when no document shows it
     (a degree certificate or an I-20 settles it). Never in onboarding. */
  awardedAsk: {
    key: 'awarded',
    title: 'Was your degree awarded?',
    meta: 'Add your degree certificate to fill this in, or answer here.',
    choices: [{ label: 'Yes, on Dec 18, 2025', value: 'end' }, { label: 'Yes, on another date', value: 'other' }, { label: 'Not yet', value: 'no' }],
    notSure: "I'm not sure",
  },

  /* ===== THE RECORD (VALUE-2, D72 to D74) =====
     The facts every computed date and count in VALUE-2 is worked out from,
     as ISO dates. App.record() copies this once; "This happened" in Try a
     change writes to that copy, never here. Nothing below is a date Duly
     worked out: app/record.js computes every derived date and count from
     these facts, with the arithmetic beside each one.
     Passport, visa and address are the new record kinds of D74, with
     sample values (sample: true shows the "Sample" mark where they appear).
     No passport or visa number is kept in the prototype: ids never show. */
  records: {
    program: { level: "Master's", major: 'Computer Science', school: 'State University', start: '2023-08-21', end: '2025-12-18', doc: 'i20-start' },
    opt: {
      category: 'Post-completion OPT', code: 'C03B',
      from: '2026-02-14', until: '2027-02-13', doc: 'ead-card',
      /* From page 2 of the OPT I-20: the day the DSO entered the
         recommendation in SEVIS. Fed the OPT file-by date. */
      recommended: '2025-10-03', recommendedDoc: 'i20-opt',
      filed: '2025-10-10', receipt: 'IOE0912345678',
    },
    /* No STEM card yet: STEM reports have no dates until one is added
       (engine: a STEM stage with no card has no report dates). */
    stem: { card: null, recommended: null, filed: null },
    /* A sample STEM card, for review only (#/steps/reports-sample and the
       like): one day after the OPT card ends, 24 months. Never the record. */
    sampleStemCard: { from: '2027-02-14', until: '2029-02-13', sample: true },
    jobs: [
      { id: 'northwind', title: 'Software Engineer', employer: 'Northwind Systems', start: '2026-02-27', end: null,
        hours: 40, hoursChanges: [], confirmedOn: '2026-08-28', doc: 'offer-northwind' },
    ],
    cpt: [
      { id: 'acme', employer: 'Acme Robotics', start: '2024-06-01', end: '2024-08-15', fullTime: true, doc: 'i20-cpt-acme' },
      { id: 'lumen', employer: 'Lumen Labs', start: '2025-01-13', end: '2025-05-02', fullTime: false, doc: 'i20-cpt-lumen' },
    ],
    passport: { kind: 'passport', title: 'Passport', country: 'India', issued: '2021-07-10', expires: '2031-07-09', doc: 'passport', sample: true },
    visa: { kind: 'visa', title: 'F-1 visa', issued: '2023-08-02', expires: '2028-08-01', entries: 'Multiple', doc: 'f1-visa', sample: true },
    address: { lines: ['120 Pine Street, Apt 4B', 'Springfield, IL 62704'], since: '2026-03-01', sample: true },
    /* The newest travel signature, on page 2 of the OPT I-20. */
    travelSignature: { signed: '2026-03-02', doc: 'i20-opt' },
    trips: [],
    petitions: [],
    /* Reports the student marked made, by report id: "You marked this made
       on Mar 4." Never "submitted", never "late". */
    made: {
      'report:job-start:northwind': '2026-02-27',
      'report:address:2026-03-01': '2026-03-04',
    },
  },

  /* Your record as a journey (founder review, Oct 1): about six milestones,
     oldest first, each one line with its dates, opening to a few facts and
     its papers. Copy only: screens/record.js reads every date from records
     above and from the papers. {employer} is filled from the job. */
  journey: {
    title: 'Your record',
    save: 'Save a copy',
    profile: 'Your profile',
    arrived: 'Arrived in the US',
    cpt: 'CPT',
    opt: 'OPT',
    stem: 'STEM OPT',
    job: 'Job at {employer}',
    petition: 'H-1B petition',
    now: 'Now',
    empty: 'Nothing here yet. Documents you add show here, with their dates.',
  },

  /* Reports you owe (VALUE-2 feature 4). Copy only; the rows and dates come
     from App.reportsOwed(). Business days skip the federal holidays of
     5 U.S.C. 6103(a), on the days the law lists. */
  reports: {
    title: 'Reports you owe',
    info: 'What you report, to whom and by when, worked out from your record. Mark one made when you send it.',
    to: 'Your DSO',
    /* No address here until 8 CFR 214.2(f)(17) is a saved rule with its
       quote (BLUEPRINT 2.6 D): the address loop says "Your DSO can confirm
       the deadline" instead. */
    standing: { title: 'Report a change of name or job', meta: 'Within 10 days of the change' },
    made: 'You marked this made on {date}',
    markDone: 'Mark made',
    undo: 'Undo',
    noCard: { action: 'Add your STEM OPT card', rest: 'to see your STEM report dates.', href: '#/documents/add' },
    holidayLine: 'Counted in business days. Weekends and {list} are left out.',
    holidaysLine: 'Counted in business days. Weekends, {list} are left out.',
    weekendLine: 'Counted in business days, weekends left out.',
  },

  /* The check-in (VALUE-2 feature 5, D73: computed on the device). One card
     when a fact a running clock reads has gone stale. jobDays is a product
     setting, not a rule; petitionDays is D66. */
  checkin: {
    jobDays: 30,
    petitionDays: 30,
    job: { title: 'Still at {employer}, about {hours} hours a week?', yes: 'Yes, same', update: 'Update' },
    petition: { title: 'Is your H-1B petition still pending?', yes: 'Yes, still pending', update: 'Update' },
    meta: 'Last confirmed {date}. Your count is as of that day.',
    done: 'Confirmed {date}. Your count is as of today.',
    info: 'A count is only right while your record is. You are asked when a fact has not been confirmed for a while; quiet weeks stay quiet.',
    undo: 'Undo',
  },

  /* Try a change (VALUE-2 feature 2, D72). The presets in build order; the
     dates below are the sample inputs the sheet opens with. Nothing is
     saved until "This happened". */
  change: {
    title: 'Try a change',
    info: 'See what a change would move on your record, worked out from your documents and the rule. Nothing is saved unless you tap This happened.',
    save: 'This happened',
    cancel: 'Cancel',
    saved: 'Saved to your record',
    nothing: 'Nothing on your record moves.',
    incomplete: 'Add the date to see what moves.',
    ask: 'Ask your DSO',
    before: 'Now',
    after: 'With this change',
    presets: [
      { key: 'jobEnd', label: 'My job ends', dateLabel: 'Last day at work', defaults: { on: '2026-10-31' } },
      { key: 'newEmployer', label: 'New employer', dateLabel: 'First day', defaults: { start: '2026-11-16', hours: 40, instead: 'instead', employer: '' } },
      { key: 'fewerHours', label: 'Fewer hours', dateLabel: 'From', defaults: { on: '2026-11-01', hours: 15 } },
      { key: 'cpt', label: 'CPT internship', dateLabel: 'Start', defaults: { start: '2027-01-11', end: '2027-05-07', fullTime: 'full' } },
      { key: 'trip', label: 'A trip', dateLabel: 'Leave', defaults: { leave: '2026-12-19', back: '2027-01-09', purpose: 'leave' } },
      { key: 'petition', label: 'H-1B petition', dateLabel: 'Filed', defaults: { filed: '2027-04-01', start: '2027-10-01', outcome: 'pending', decided: '2027-07-15' } },
    ],
    purposes: [
      { value: 'leave', label: 'Leave my employer approved' },
      { value: 'work', label: 'Travel for my job' },
      { value: 'other', label: 'Other' },
      { value: 'unsure', label: "I'm not sure" },
    ],
    outcomes: [
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'denied', label: 'Denied or withdrawn' },
    ],
  },

  /* Share documents (VALUE-2 feature 7, Round 7): tick documents, then
     share them together or save them as one file. No summary page. */
  sharePack: {
    title: 'Share documents',
    share: 'Share',
    save: 'Save',
    cancel: 'Cancel',
    bundle: 'Documents',
  },

  /* Document watch (VALUE-2 feature 6). Days before an end that count as
     close: a product setting. No red unless a date is close. */
  watch: { closeDays: 30, title: 'Next to run out' },

  /* Source marks. Quotes are verbatim from the saved rule text. */
  sources: {
    unemployment: {
      name: 'Unemployment days on OPT',
      plain: 'During post-completion OPT you can have up to 90 days without work in all.',
      quote: 'Students may not accrue an aggregate of more than 90 days of unemployment during any post-completion OPT period described in 8 CFR 274a.12(c)(3)(i)(B).',
      counted: ['Your card started Feb 14, 2026. Your job started Feb 27, 2026. Feb 14 to Feb 26 are 13 days without work.'],
      link: { label: '8 CFR 214.2(f)(10)(ii)(E) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 30',
    },
    eadEnds: {
      name: 'Your EAD card',
      plain: 'Your work permission runs to the end date printed on your card.',
      quote: null,
      counted: ['Read from your EAD card: category C03B, valid until Feb 13, 2027. From today, that is 136 days.'],
      link: { label: 'Your EAD card, in Documents', href: '#/documents/opt' },
      checked: 'Checked Sep 30',
    },
    stemOpens: {
      name: 'STEM OPT filing window',
      plain: 'You can file up to 90 days before your EAD card ends.',
      quote: "A student meeting the eligibility requirements for a 24-month OPT extension under paragraph (f)(10)(ii)(C) of this section may request an extension of employment authorization by filing Form I-765 or successor form, with the required fee and supporting documents, up to 90 days prior to the expiration date of the student's current OPT employment authorization.",
      counted: ['Feb 13, 2027, minus 90 days, is Nov 15, 2026.'],
      link: { label: '8 CFR 214.2(f)(11)(i)(C) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 30',
    },
    stemCloses: {
      name: 'Latest day to file',
      plain: 'You apply while you are still in your OPT period, which runs to the day your card ends.',
      quote: 'a qualified student may apply for an extension of OPT while in a valid period of post-completion OPT authorized under 8 CFR 274a.12(c)(3)(i)(B)',
      counted: ['Your card ends Feb 13, 2027.'],
      link: { label: '8 CFR 214.2(f)(10)(ii)(C) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 30',
    },
    within60: {
      name: 'Filing after your school recommends you',
      plain: 'You file within 60 days of the day your school enters its recommendation.',
      quote: 'The student seeking such 24-month OPT extension must properly file his or her Form I-765 or successor form with USCIS within 60 days of the date the DSO enters the recommendation for the OPT extension into his or her SEVIS record.',
      counted: ['The 60 days are counted once you add the date your school recommends you.'],
      link: { label: '8 CFR 214.2(f)(11)(i)(C) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 30',
    },
    startPreparing: {
      name: 'When to start preparing',
      plain: 'A suggested date, one month before your window opens, so the training plan and school request are ready.',
      quote: null,
      counted: ['Nov 15, 2026, minus one month, is Oct 15, 2026. This is a planning date, not a rule.'],
      link: { label: 'STEM OPT filing window on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 30',
    },
    reportChanges: {
      name: 'Reporting changes on OPT',
      plain: 'While on OPT you report changes to your name, address and job within 10 days.',
      quote: "While on OPT, the student must report to the DSO within 10 days any changes in the student's name or address, and employment information.",
      counted: ['There is no fixed date. The 10 days start when your address or job changes.'],
      link: { label: 'Study in the States, F-1 OPT', href: 'https://studyinthestates.dhs.gov/sevis-help-hub/student-records/fm-student-employment/f-1-optional-practical-training-opt' },
      checked: 'Checked Sep 30',
    },
    stemEmployer: {
      name: 'STEM OPT employers',
      plain: 'For STEM OPT, your employer is enrolled in E-Verify and has a tax ID number (EIN).',
      quote: "The student's employer is enrolled in E-Verify, as evidenced by either a valid E-Verify Company Identification number or, if the employer is using an employer agent to create its E-Verify cases, a valid E-Verify Client Company Identification number, and the employer remains a participant in good standing with E-Verify, as determined by USCIS. An employer must also have an employer identification number (EIN) used for tax purposes.",
      counted: ['Northwind Systems is listed in the E-Verify Employer Search, checked Sep 30. The company ID for your I-983 comes from HR.'],
      link: { label: '8 CFR 214.2(f)(10)(ii)(C) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 30',
    },
    stemPlan: {
      name: 'Training plan, Form I-983',
      plain: 'You and your employer fill out a training plan together.',
      quote: null,
      counted: [],
      link: { label: '8 CFR 214.2(f)(10)(ii)(C) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 30',
    },
    stemList: {
      name: 'STEM degree list',
      plain: 'For STEM OPT, the degree is in a category on the government list of STEM fields when your school recommends you.',
      quote: 'At the time the DSO recommends a 24-month OPT extension under this paragraph (f)(10)(ii)(C) in SEVIS, the degree that is the basis for the application for the OPT extension must be contained within a category on the STEM Designated Degree Program List.',
      counted: ["Your I-20's field code is 11.0701, Computer Science. Code 11.0701 is on the list dated Jul 2024."],
      link: { label: 'DHS STEM Designated Degree Program List', href: 'https://www.ice.gov/doclib/sevis/pdf/stemList2024.pdf' },
      checked: 'Checked Sep 30',
    },
    /* Round 4: public records, each with its source and checked date. */
    everify: {
      name: 'E-Verify participation',
      plain: 'Whether an employer is listed as taking part in E-Verify, from the government search.',
      quote: null,
      counted: ['Northwind Systems is listed as taking part, checked Sep 30.', 'Your I-983 still needs the E-Verify company ID from HR.'],
      link: { label: 'E-Verify Employer Search on e-verify.gov', href: 'https://www.e-verify.gov/about-e-verify/e-verify-data/e-verify-employer-search' },
      checked: 'Checked Sep 30',
    },
    h1bHub: {
      name: 'H-1B Employer Data Hub',
      plain: 'H-1B petitions USCIS approved for an employer, by fiscal year. Sample figures in this prototype.',
      quote: null,
      counted: ['FY 2025: 14. FY 2024: 11. FY 2023: 9.', 'The latest year USCIS has published is FY 2025.'],
      link: { label: 'H-1B Employer Data Hub on uscis.gov', href: 'https://www.uscis.gov/tools/reports-and-studies/h-1b-employer-data-hub' },
      checked: 'Checked Sep 30',
    },
    processing: {
      name: 'USCIS processing times',
      plain: "USCIS's own published figure for a form, category and office. It describes past cases, not a date for yours. Sample figure in this prototype.",
      quote: null,
      counted: ['Form I-765, STEM OPT extension, Potomac Service Center: 80% of cases decided within 3 months, as of Sep 24, 2026.'],
      link: { label: 'Case Processing Times on uscis.gov', href: 'https://egov.uscis.gov/processing-times/' },
      checked: 'Checked Sep 30',
    },

    /* ===== VALUE-2 rules. Quotes verbatim from rulepacks/f1-us/v2026.09/parameters.yaml.
       counted lines that hold a date are worked out from DULY_SAMPLE.records;
       the arithmetic is in the comment beside each and was checked with python3
       against engine/dates.py. A line with no number is the method only. ===== */
    optFileBy: {
      name: 'Filing after your school recommends you',
      plain: 'You file your OPT application within 30 days of the day your school enters its recommendation, and within the dates set by your program end.',
      quote: 'The student must also file his or her Form I-765 or successor form with USCIS within 30 days of the date the DSO enters the recommendation for OPT into his or her SEVIS record.',
      /* 2025-10-03 + 30 days = 2025-11-02; 2025-12-18 + 60 days = 2026-02-16;
         the earlier is 2025-11-02. Filed 2025-10-10, so the clock stopped. */
      counted: ['Recommended Oct 3, 2025, plus 30 days, is Nov 2, 2025.', 'Program end Dec 18, 2025, plus 60 days, is Feb 16, 2026.', 'The earlier, Nov 2, 2025, set the day. You filed Oct 10, 2025.'],
      link: { label: '8 CFR 214.2(f)(11)(i)(B)(2) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 28',
    },
    stemValidation: {
      name: 'STEM OPT validation reports',
      plain: 'Every six months on STEM OPT you confirm your name, address and employer to your DSO, within 10 business days of each reporting date.',
      quote: 'The student must complete a validation report, confirming that the information required by paragraph (f)(12)(ii)(A) of this section has not changed, every six months. The validation report is due to the student\'s DSO within 10 business days of each reporting date.',
      counted: ['Each reporting date is your STEM OPT card start plus six months, then twelve, then eighteen. Ten business days follow it, with weekends and federal holidays left out.'],
      link: { label: '8 CFR 214.2(f)(12)(ii)(B) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 30',
    },
    holidays: {
      name: 'Federal holidays',
      plain: 'Business days leave out weekends and the federal holidays the law lists, on the days it lists them.',
      quote: "The following are legal public holidays: New Year's Day, January 1. Birthday of Martin Luther King, Jr., the third Monday in January. Washington's Birthday, the third Monday in February. Memorial Day, the last Monday in May. Juneteenth National Independence Day, June 19. Independence Day, July 4. Labor Day, the first Monday in September. Columbus Day, the second Monday in October. Veterans Day, November 11. Thanksgiving Day, the fourth Thursday in November. Christmas Day, December 25.",
      counted: [],
      link: { label: '5 U.S.C. 6103(a) on uscode.house.gov', href: 'https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title5-section6103&num=0&edition=prelim' },
      checked: 'Checked Sep 30',
    },
    stemEvaluation: {
      name: 'STEM OPT evaluations',
      plain: 'Your DSO gets your 12-month evaluation and your final evaluation no later than 10 days after each period ends.',
      quote: 'The student is responsible for ensuring the DSO receives his or her 12-month evaluation and final evaluation no later than 10 days following the conclusion of the reporting period or conclusion of his or her practical training opportunity, respectively.',
      counted: ['The 12-month evaluation: your STEM OPT card start plus 12 months, plus 10 days. The final evaluation: the day the job or the card ends, plus 10 days.'],
      link: { label: '8 CFR 214.2(f)(10)(ii)(C)(9)(i) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 30',
    },
    stemNewPlan: {
      name: 'A new training plan for a new employer',
      plain: 'On STEM OPT, a new employer means a new Form I-983 to your DSO within 10 days of starting.',
      quote: 'If a student initiates a new practical training opportunity with a new employer during his or her 24-month OPT extension, the student must submit, within 10 days of beginning the new practical training opportunity, a new Form I-983 or successor form to the student\'s DSO, and subsequently obtain a new DSO recommendation.',
      counted: ['The first day at the new employer, plus 10 days.'],
      link: { label: '8 CFR 214.2(f)(10)(ii)(C)(7)(iv) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 30',
    },
    stemReportChange: {
      name: 'Reporting changes on STEM OPT',
      plain: 'On STEM OPT you report a change of name, address or employer, or the loss of a job, within 10 days.',
      quote: "Within 10 days of the change, the student must report to the student's DSO a change of legal name, residential or mailing address, employer name, employer address, and/or loss of employment.",
      counted: ['The day of the change, plus 10 days.'],
      link: { label: '8 CFR 214.2(f)(12)(ii)(A) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 30',
    },
    optHours: {
      name: 'Hours on OPT',
      plain: 'SEVP guidance says OPT after your program is at least 20 hours a week. Agency guidance, not a regulation.',
      quote: "Post-Completion OPT: Any portion of OPT used after the student's Program End Date. It must be at least 20 hours per week or full-time.",
      counted: ['A day on a job under 20 hours a week is counted as a day without work.'],
      link: { label: 'Study in the States, F-1 OPT', href: 'https://studyinthestates.dhs.gov/sevis-help-hub/student-records/fm-student-employment/f-1-optional-practical-training-opt' },
      checked: 'Checked Sep 30',
    },
    cptDays: {
      name: 'Full-time CPT and OPT',
      plain: 'One year or more of full-time CPT closes post-completion OPT. Read here two ways: as 365 days, and as 12 months. Part-time CPT is not counted.',
      quote: 'Students who have received one year or more of full time curricular practical training are ineligible for post-completion academic training.',
      /* Acme Robotics 2024-06-01 to 2024-08-15, full time, both days counted:
         30 + 31 + 15 = 76 days; months: Jun 1 to Aug 1 is 2 months, Aug 1 to
         Aug 16 is 15 days. Lumen Labs was part time. */
      counted: ['Acme Robotics, Jun 1 to Aug 15, 2024, full time: 76 days, or 2 months and 15 days.', 'Lumen Labs was part time and is not counted.'],
      link: { label: '8 CFR 214.2(f)(10)(i) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 30',
    },
    travelSignature: {
      name: 'Travel signature on OPT',
      plain: 'To come back on OPT you carry your EAD card and an I-20 your DSO signed for travel within the last six months.',
      quote: 'endorsed for reentry by the DSO within the last six months',
      /* 2026-03-02 + 6 months = 2026-09-02 (engine add_months). */
      counted: ['Signed Mar 2, 2026, plus six months, is Sep 2, 2026.'],
      link: { label: '8 CFR 214.2(f)(13)(ii) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 29',
    },
    travelAbsence: {
      name: 'Five months away',
      plain: 'A student back from a trip of five months or less may be readmitted, with the documents the rule lists.',
      quote: 'An F-1 student returning to the United States from a temporary absence of five months or less may be readmitted for attendance at an SEVP-certified educational institution',
      counted: ['The day you leave, plus five months.'],
      link: { label: '8 CFR 214.2(f)(4) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 29',
    },
    unemploymentAbroad: {
      name: 'Days abroad on OPT',
      plain: 'SEVP guidance says days outside the US on OPT count as days without work, unless you are on leave your employer allowed or travelling for the job. Agency guidance, not a regulation.',
      quote: 'Time spent outside the United States during an approved period of post- completion OPT counts as unemployment against the 90/120-day limits',
      counted: ['Days away are counted from the day you leave up to the day before you return. This is a reading, not the words of the guidance.'],
      link: { label: 'SEVP Policy Guidance 1004-03 on ice.gov', href: 'https://www.ice.gov/doclib/sevis/pdf/opt_policy_guidance_042010.pdf' },
      checked: 'Checked Sep 29',
    },
    capGap: {
      name: 'Cap-gap',
      plain: 'With an H-1B petition under the cap that asks for a change of status, your status and OPT work permission can run on until April 1 of the H-1B fiscal year, or the H-1B start if earlier.',
      quote: 'The duration of status, and any employment authorization granted under 8 CFR 274a.12(c)(3)(i)(B) or (C), of an F-1 student who is the beneficiary of an H-1B petition subject to section 214(g)(1)(A) of the Act (8 U.S.C. 1184(g)(1)(A)) requesting a change of status will be automatically extended until April 1 of the fiscal year for which such H-1B status is being requested or until the validity start date of the approved petition, whichever is earlier, where such petition:',
      counted: ['A fiscal year starts October 1, so an H-1B start of Oct 1, 2027 is in fiscal year 2028, and April 1 of that year is Apr 1, 2028.', 'For a petition filed on or after Jan 17, 2025. Before that day the end was October 1.'],
      link: { label: '8 CFR 214.2(f)(5)(vi)(A) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 30',
    },
    capGapOutcome: {
      name: 'When cap-gap ends early',
      plain: 'Cap-gap ends on its own if the petition is rejected, denied, revoked or withdrawn, or the change of status is denied or withdrawn.',
      quote: "shall automatically terminate upon the rejection, denial, revocation, or withdrawal of the H-1B petition filed on such F-1 student's behalf or upon the denial or withdrawal of the request for change of nonimmigrant status",
      counted: ['No later date is worked out after a denial. That question goes to your DSO.'],
      link: { label: '8 CFR 214.2(f)(5)(vi)(B) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 29',
    },
    capGapStart: {
      name: 'When H-1B starts',
      plain: 'Agency words from 2016: once a change-of-status petition is approved, F-1 status ends the day H-1B status begins. Guidance, not a regulation.',
      quote: 'If an H-1B change-of-status petition requesting a start date of October 1 has been approved, the F-1 status will expire on the same day as the H-1B status begins.',
      counted: [],
      link: { label: '81 FR 13040 on federalregister.gov', href: 'https://www.federalregister.gov/documents/full_text/xml/2016/03/11/2016-04828.xml' },
      checked: 'Checked Sep 30',
    },
    capGapUnemployment: {
      name: 'Days without work in cap-gap',
      plain: 'SEVP guidance says the 90-day limit keeps running during cap-gap. Agency guidance, not a regulation.',
      quote: 'Yes, the 90 day limitation on unemployment continues during the cap gap extension.',
      counted: [],
      link: { label: 'SEVP Policy Guidance 1004-03 on ice.gov', href: 'https://www.ice.gov/doclib/sevis/pdf/opt_policy_guidance_042010.pdf' },
      checked: 'Checked Sep 29',
    },
  },
};

/* "From your paper" (D74): the field on a paper beside the date it fed, for
   the source sheet. path is where the value sits in DULY_SAMPLE.records;
   fed is the computed item it gave (App.fedValue(key)). Read through
   App.fromPaper(sourceKey). */
window.DULY_SAMPLE.paperFields = {
  eadEnds: [{ paper: 'EAD card', field: 'Card expires', path: 'opt.until', doc: 'ead-card', fed: 'eadEnds' }],
  stemOpens: [{ paper: 'EAD card', field: 'Card expires', path: 'opt.until', doc: 'ead-card', fed: 'stemOpens' }],
  stemCloses: [{ paper: 'EAD card', field: 'Card expires', path: 'opt.until', doc: 'ead-card', fed: 'stemCloses' }],
  startPreparing: [{ paper: 'EAD card', field: 'Card expires', path: 'opt.until', doc: 'ead-card', fed: 'startPreparing' }],
  unemployment: [
    { paper: 'EAD card', field: 'Valid from', path: 'opt.from', doc: 'ead-card', fed: 'unemployment' },
    { paper: 'Offer letter', field: 'Start date', path: 'jobs.0.start', doc: 'offer-northwind', fed: 'unemployment' },
  ],
  optFileBy: [
    { paper: 'I-20 · OPT', field: 'Recommended by your DSO', path: 'opt.recommended', doc: 'i20-opt', fed: 'optFileBy' },
    { paper: 'I-20 · OPT', field: 'Program end date', path: 'program.end', doc: 'i20-opt', fed: 'optFileByLatest' },
  ],
  travelSignature: [{ paper: 'I-20 · OPT', field: 'Travel signature', path: 'travelSignature.signed', doc: 'i20-opt', fed: 'travelSignature' }],
  cptDays: [{ paper: 'I-20 · CPT at Acme Robotics', field: 'CPT dates, full time', path: 'cpt.0.start', pathEnd: 'cpt.0.end', doc: 'i20-cpt-acme', fed: 'cptDays' }],
};

/* One list of STEM OPT steps. */
window.DULY_SAMPLE.checklists.stem.steps = window.DULY_SAMPLE.stem.tasks;

/* ===== LOOPS (BLUEPRINT section 2; D75, D76, D77) =====
   Every question or life event is a loop carried to a confirmed outcome.
   This section is the Playbooks as data: reviewed words with typed holes,
   and a graph of steps. app/loops.js runs them; components/loop.js draws
   one; check-loops.mjs fails the build on a dead end.

   No literal number lives in a template: every date and count is a hole
   that app/loops.js fills from App.compute, App.fileBy and the record
   (the engine stand-in in app/record.js). The sample dates for Priya, from
   DULY_SAMPLE.records, checked with python3 on 2026-09-30:
     job ends: last day 2026-10-31 + 10 days = 2026-11-10 (report day);
               2026-11-10 - 3 = 2026-11-07 (first reminder);
               13 days without work before Northwind (Feb 14 to Feb 26);
               day 14 is 2026-11-01, day 90 is 2026-11-01 + 76 = 2027-01-16;
               a new job from 2026-11-20 stops the count at 13 + 19 = 32.
               Check-in every 14 days: 2026-09-30 + 14 = 2026-10-14.
     travel:   2026-12-19 to 2027-01-09 is 21 days away; signature
               2026-03-02 + 6 months = 2026-09-02, before the return;
               five months from leaving is 2027-05-19; asks on
               2026-12-19 - 21 = 2026-11-28 and 2026-12-19 - 2 = 2026-12-17.
     STEM:     card end 2027-02-13 - 90 = 2026-11-15 (window opens);
               start preparing 2026-11-15 - 1 month = 2026-10-15; with a
               recommendation on 2026-12-01, + 60 = 2027-01-30 sets the day;
               recommended 2026-09-30 + 60 = 2026-11-29, reminders on
               2026-11-29 - 3 = 2026-11-26 and the day. A filing day of
               2026-09-30 is before the window opens (2026-11-15). DSO
               reply day: 2026-09-30 + 5 business days = 2026-10-07.
     address:  no date in the loop (no saved (f)(17) rule); a check-in a
               week on, 2026-09-30 + 7 = 2026-10-07.
     new job:  Acme from 2026-11-20: its report 2026-11-20 + 10 = 2026-11-30.
     hours:    15 hours a week from 2026-10-01: report by 2026-10-01 + 10 =
               2026-10-11; 15 < 20, so those days count as days without work.
     check-in: Northwind confirmed 2026-08-28, 33 days ago; a yes today
               sets the next one at 2026-09-30 + 30 = 2026-10-30.

   Step shape (internal names, never on screen):
     { state, who?: 'date'|'event'|'person', person?, tag: 'A'|'B'|'fixed',
       title, lines?: [{ text, source?, tag?, threat? }], fields?: [...],
       actions?: [...], exits: [{ key, label, to, by?, needs?, saves?,
       receipt?, confirm?, cancel?, snooze?, quiet?, when? }],
       timer: { kind: 'deadline'|'checkin', at, then, ask, every?, fallback? } }
   A template may be a list: the first one whose holes are all filled is
   used, and '' hides the line. to: a step key, 'closed', 'dismissed',
   '@back' (the step before) or '@resume' (where a step back began).
   at: { fact, minus?, plus? } | { days } | { businessDays } | { setting }. */
window.DULY_SAMPLE.loops = {
  states: ['open', 'asking', 'planned', 'waiting', 'confirming', 'closed', 'dismissed'],
  final: ['closed', 'dismissed'],
  /* What the student sees. Never the internal state name. */
  seen: {
    needs: 'Needs you',
    planned: 'Planned: {next}',
    waitingWho: 'Waiting on {who} until {until}',
    waitingEvent: 'Waiting on {who}',
    waitingDate: 'Waiting until {until}',
    done: 'Done {date}',
    cantTell: "Can't tell yet: {fact} as of {asOf}",
  },
  /* Product settings, not rules (BLUEPRINT 2.4; founder decision 11). */
  settings: {
    deadlineLeadDays: 3,
    weeklyBudget: 3,
    backoffAfter: 3,
    dsoReplyBusinessDays: 5,
    checkinDays: 14,
    travelFirstAskDays: 21,
    travelLastAskDays: 2,
    newFactDays: 3,
    pendingCap: 50,
  },
  /* The receipt: what changed, what was checked, the next date. */
  receipts: {
    remindOn: 'Reminder set on this phone: {dates}.',
    remindOff: 'Reminders are off here. Add the dates to your calendar.',
    nothingElse: 'Nothing else needs you for this.',
    next: 'Next: {next}.',
    checked: 'Checked against {checked}.',
    undo: 'Undo',
    fold: 'Fold',
    reopen: 'Reopen',
    calendarOnce: 'Add the dates to your calendar',
  },
  /* Footprint lines, written to Your record on every transition. A closing
     receipt already starts "Done.", so closed adds nothing before it. */
  footprint: {
    opened: 'Opened: {title}',
    moved: '{title}: {what}',
    closed: '{title}: {receipt}',
    dismissed: '{title}: dropped',
    reopened: '{title}: reopened. {reason}',
    backoff: "{title}: {n} check-ins unanswered, asking stopped. Can't tell yet as of {asOf}",
  },
  /* Ask in v1 (D77): matched on the device, crisis first (BLUEPRINT 2.7). */
  crisisPhrases: [
    { text: 'ice came', notice: false },
    { text: 'ice at my door', notice: false },
    { text: 'ice is at my door', notice: false },
    { text: 'immigration officers', notice: false },
    { text: 'detained', notice: false },
    { text: 'sevis terminated', notice: true },
    { text: 'sevis was terminated', notice: true },
    { text: 'terminated my sevis', notice: true },
    { text: 'visa revoked', notice: true },
    { text: 'visa was revoked', notice: true },
    { text: 'revoked my visa', notice: true },
    { text: "i can't do this anymore", notice: false },
    { text: 'i cant do this anymore', notice: false },
    { text: 'want to die', notice: false },
    { text: 'end my life', notice: false },
    { text: 'hurt myself', notice: false },
  ],
  /* Public contacts for the crisis screen. The school office is the sample
     school's office page (State University's site, the same example.edu
     domain as its STEM OPT page in schoolImport); no phone number is
     invented. */
  contacts: {
    lifeline: { name: '988 Lifeline', call: 'tel:988', text: 'sms:988', href: 'https://988lifeline.org/' },
    attorney: { name: 'AILA lawyer search', href: 'https://www.ailalawyer.com/' },
    schoolOffice: { name: 'international student office', href: 'https://www.example.edu/international' },
  },

  /* Steps shared by every playbook that uses them: the step back (BOUNDARY,
     "The step back"; D57) and its hand-off that comes back. */
  shared: {
    stepback: {
      'dso-ask': {
        state: 'asking', tag: 'B',
        title: 'This part depends on your own situation, so it is a question for your DSO.',
        lines: [{ text: 'Write it in your own words. The email is drafted from your record; you send it yourself.' }],
        fields: [{ key: 'question', kind: 'text', label: 'Your question', placeholder: 'For example: does a volunteer role count?' }],
        actions: [{ kind: 'draft', draft: 'question' }, { kind: 'link', label: 'Find an immigration attorney', contact: 'attorney' }],
        exits: [
          { key: 'sent', label: 'Save to my record: asked my DSO {today}', to: 'dso-wait', saves: 'askedDso', receipt: 'Saved: question sent to your DSO {today}.' },
          { key: 'back', label: 'Back', to: '@back', quiet: true },
        ],
        timer: { kind: 'checkin', at: { setting: 'newFactDays' }, then: 'dso-ask', ask: 'Send the question to your DSO?' },
      },
      'dso-wait': {
        state: 'waiting', who: 'person', person: 'your DSO', tag: 'B',
        title: 'Waiting on your DSO until {dsoReplyBy}',
        lines: [{ text: 'Any date that needs you keeps its reminders while you wait.' }],
        exits: [
          { key: 'replied', label: 'Save to my record: DSO replied {today}', to: '@resume', saves: 'dsoReplied', receipt: 'Saved: your DSO replied {today}.' },
          { key: 'again', label: 'Write the question again', to: 'dso-ask', quiet: true },
        ],
        timer: { kind: 'checkin', at: { setting: 'dsoReplyBusinessDays', businessDays: true }, then: 'dso-reply', ask: 'Did your DSO reply?' },
      },
      'dso-reply': {
        state: 'confirming', tag: 'B',
        title: 'Did your DSO reply?',
        exits: [
          { key: 'replied', label: 'Save to my record: DSO replied {today}', to: '@resume', saves: 'dsoReplied', receipt: 'Saved: your DSO replied {today}.' },
          { key: 'notYet', label: 'No reply yet: ask again {dsoReplyBy}', to: 'dso-wait' },
        ],
        timer: { kind: 'checkin', at: { setting: 'dsoReplyBusinessDays', businessDays: true }, then: 'dso-reply', ask: 'Did your DSO reply?' },
      },
    },
  },

  playbooks: {
    /* A. Job ends (the founder's chain): what, how, where, when, and what to
       keep in mind. Never what follows day 90, never a status word. */
    'job-ends': {
      version: '2026.09.2',
      title: 'Job at {employer} ended',
      situation: 'My job ended',
      cantTell: 'days without work',
      newJobLines: {
        full: ['Count stopped at {stoppedAt} days.', ''],
        part: 'Fewer than {minHours} hours a week: those days count as days without work.',
        unsure: 'Hours not saved yet: add them in WorkBook to stop the count.',
      },
      start: 'last-day',
      uses: ['stepback'],
      dismiss: false,
      obligation: { fact: 'reportDue', source: 'reportChanges', title: 'Report the end of your job', metBy: ['reportMade'] },
      triggers: [
        { from: 'checkin', exit: 'ended' },
        { from: 'ask', phrases: ['i got laid off', 'laid off', 'i lost my job', 'lost my job', 'my job ended', 'job ended', 'fired', 'my last day at work', 'quit my job'] },
        { from: 'workbook', event: 'job.end' },
      ],
      reopenOn: [
        { key: 'newJobEnded', label: 'Reopen: the new job ended' },
        { key: 'hours', label: 'Reopen: my hours fell' },
        { key: 'rule', label: 'Reopen: a reporting rule changed' },
      ],
      holes: ['minHours', 'employer', 'lastDay', 'lastDayLong', 'reportDue', 'reportLead', 'used', 'limit', 'asOf', 'day90', 'byEnd', 'cardEnd', 'otherJobs',
        'newEmployer', 'newStart', 'stoppedAt', 'newJobLine', 'made', 'name', 'sevisId', 'school', 'question', 'careerPage', 'nextCheckin'],
      /* Flags the steps read (app/loops.js BIND['job-ends']):
           made           the end-of-job report is marked made
           beforeLastDay  today is before the saved last day: the report is
                          not offered as made before the job has ended
                          (2026-09-30 < 2026-10-31). Until the binder sets it,
                          '!beforeLastDay' reads true and nothing is hidden. */
      drafts: {
        report: {
          openLabel: 'Write the report to your DSO',
          to: 'Your DSO at {school}',
          subject: 'End of my job at {employer}, {name}',
          paragraphs: ['Hi,', "I'm {name}, on post-completion OPT. My last day at {employer} is {lastDayLong}.", "I'm writing to report the end of this job."],
          questions: ['Is there anything else you need from me for this report?', 'Is there a form or a portal I use for it?'],
          signoff: ['Thank you,', '{name}', 'SEVIS ID {sevisId}'],
        },
        late: {
          openLabel: 'Write to your DSO',
          to: 'Your DSO at {school}',
          subject: 'Reporting the end of my job, {name}',
          paragraphs: ['Hi,', "I'm {name}, on post-completion OPT. My last day at {employer} was {lastDayLong}, and I have not reported it yet."],
          questions: ['How do I report it now?', 'Is there anything else you need from me?'],
          signoff: ['Thank you,', '{name}', 'SEVIS ID {sevisId}'],
        },
        question: {
          openLabel: 'Write the question to your DSO',
          to: 'Your DSO at {school}',
          subject: 'A question about my OPT, {name}',
          paragraphs: ['Hi,', "I'm {name}, on post-completion OPT. My last day at {employer} is {lastDayLong}."],
          questions: ['{question}'],
          signoff: ['Thank you,', '{name}', 'SEVIS ID {sevisId}'],
        },
      },
      steps: {
        'last-day': {
          state: 'asking', tag: 'A',
          title: 'When is your last day at {employer}?',
          lines: [{ text: ['Other jobs on your record: {otherJobs}.', 'No other job on your record.'] }],
          fields: [{ key: 'lastDay', kind: 'date', label: 'Last day at work' }],
          exits: [
            { key: 'save', label: ['Save to my record: job ended {lastDay}', 'Pick the last day to save it'], needs: ['lastDay'], to: 'plan', saves: 'jobEnd',
              receipt: 'Saved: last day at {employer}, {lastDay}. Checked against your record and the reporting rule.' },
            { key: 'notSure', label: "I'm not sure yet", to: 'last-day-wait', quiet: true },
            /* The job is confirmed as of today, so the count moves on from
               here and the next check-in is set: a yes on 2026-09-30 + 30
               (checkin.jobDays) = 2026-10-30. */
            { key: 'still', label: 'Still at {employer}: confirm as of {today}', to: 'closed', by: 'student', outcome: 'same', saves: 'checkinYes',
              receipt: ['Confirmed {today}. Next check-in: {nextCheckin}.', 'Confirmed {today}: still at {employer}.'] },
          ],
          timer: { kind: 'checkin', at: { setting: 'newFactDays' }, then: 'last-day', ask: 'Do you know your last day at {employer} now?' },
        },
        'last-day-wait': {
          state: 'waiting', who: 'date', tag: 'A',
          title: "Can't tell yet: your report day. Your last day at {employer} settles it.",
          exits: [{ key: 'know', label: 'Add my last day now', to: 'last-day' }],
          timer: { kind: 'checkin', at: { days: 7 }, then: 'last-day', ask: 'Do you know your last day at {employer} now?' },
        },
        plan: {
          state: 'planned', tag: 'A', threat: true,
          title: 'Report the end of your job on or before {reportDue}',
          lines: [
            { text: 'Saved: last day at {employer}, {lastDay}.' },
            { text: 'Report it to your DSO at {school} on or before {reportDue}.', source: 'reportChanges', tag: 'guidance' },
            { text: ['As of {asOf}: {used} of {limit} days without work used. Day {limit} is {day90}.', 'As of {asOf}: {used} of {limit} days without work used. By {cardEnd}: {byEnd}.'], source: 'unemployment', threat: true },
            { text: 'A job of at least {minHours} hours a week stops the count.', source: 'optHours' },
          ],
          actions: [
            { kind: 'draft', draft: 'report' },
            { kind: 'link', label: "Your school's career office", fact: 'careerPage' },
            { kind: 'rule', label: 'What counts as a job on OPT', source: 'optHours' },
          ],
          exits: [
            { key: 'remind', label: 'Remind me on {reportLead} and {reportDue}', to: 'wait-report', receipt: '{remindReceipt}' },
            { key: 'made', label: 'Save to my record: report made {today}', when: '!beforeLastDay', to: 'count', saves: 'reportMade', receipt: 'Report marked made {today}.' },
            { key: 'newJob', label: 'Add a new job or offer: it stops the count', to: 'new-job', quiet: true },
            { key: 'dso', label: 'Ask my DSO a question', to: 'dso-ask', quiet: true },
          ],
          timer: { kind: 'deadline', at: { fact: 'reportDue', minus: 'lead' }, then: 'confirm-report', ask: 'Report made? The day is {reportDue}.' },
        },
        'wait-report': {
          state: 'waiting', who: 'date', tag: 'A',
          title: 'Report the end of your job on or before {reportDue}',
          lines: [{ text: 'Reminders: {reportLead} and {reportDue}.' }],
          actions: [{ kind: 'draft', draft: 'report' }, { kind: 'calendar', label: 'Add both dates to your calendar' }],
          exits: [
            { key: 'made', label: 'Save to my record: report made {today}', when: '!beforeLastDay', to: 'count', saves: 'reportMade', receipt: 'Report marked made {today}.' },
            { key: 'newJob', label: 'Add a new job or offer', to: 'new-job', quiet: true },
            { key: 'dso', label: 'Ask my DSO a question', to: 'dso-ask', quiet: true },
          ],
          timer: { kind: 'deadline', at: { fact: 'reportDue', minus: 'lead' }, then: 'confirm-report', ask: 'Report made? The day is {reportDue}.' },
        },
        /* The same three steps once a new job is saved before the report is
           made: marking the report made then closes the loop, since the new
           job has already stopped the count. Last day 2026-10-31, Acme from
           2026-11-20 at 20 hours or more: 13 + (2026-11-20 - 2026-11-01 =
           19) = 32 days, "Count stopped at 32 days." */
        'wait-report-job': {
          state: 'waiting', who: 'date', tag: 'A',
          title: 'Report the end of your job on or before {reportDue}',
          lines: [
            { text: 'New job at {newEmployer} from {newStart} saved.' },
            { text: 'Reminders: {reportLead} and {reportDue}.' },
          ],
          actions: [{ kind: 'draft', draft: 'report' }, { kind: 'calendar', label: 'Add both dates to your calendar' }],
          exits: [
            { key: 'made', label: 'Save to my record: report made {today}', when: '!beforeLastDay', to: 'closed', by: 'student', outcome: 'new-job', saves: 'reportMade',
              receipt: 'Done. Report marked made {made}. New job at {newEmployer} from {newStart} saved. {newJobLine}' },
            { key: 'dso', label: 'Ask my DSO a question', to: 'dso-ask', quiet: true },
          ],
          timer: { kind: 'deadline', at: { fact: 'reportDue', minus: 'lead' }, then: 'confirm-report-job', ask: 'Report made? The day is {reportDue}.' },
        },
        'confirm-report-job': {
          state: 'confirming', tag: 'A',
          title: 'Report made? The day is {reportDue}.',
          lines: [{ text: 'New job at {newEmployer} from {newStart} saved.' }],
          actions: [{ kind: 'draft', draft: 'report' }],
          exits: [
            { key: 'made', label: 'Save to my record: report made {today}', to: 'closed', by: 'student', outcome: 'new-job', saves: 'reportMade',
              receipt: 'Done. Report marked made {made}. New job at {newEmployer} from {newStart} saved. {newJobLine}' },
            { key: 'notYet', label: 'Not yet: remind me on {reportDue}', to: 'wait-report-job', snooze: { limit: 'reportDue' } },
            { key: 'dso', label: 'Ask my DSO a question', to: 'dso-ask', quiet: true },
          ],
          timer: { kind: 'deadline', at: { fact: 'reportDue', plus: 1 }, then: 'report-passed-job', ask: 'Report made? The day was {reportDue}.' },
        },
        'report-passed-job': {
          state: 'confirming', tag: 'B', threat: true, once: true,
          title: 'The report day was {reportDue}. Today is {today}.',
          short: 'Report day was {reportDue}: a question for your DSO',
          lines: [{ text: 'This is a question for your DSO.', threat: true }],
          actions: [{ kind: 'draft', draft: 'late' }, { kind: 'link', label: 'Find an immigration attorney', contact: 'attorney' }],
          exits: [
            { key: 'made', label: 'Save to my record: report made {today}', to: 'closed', by: 'student', outcome: 'new-job', saves: 'reportMade',
              receipt: 'Done. Report marked made {made}. New job at {newEmployer} from {newStart} saved. {newJobLine}' },
            { key: 'asked', label: 'Save to my record: asked my DSO {today}', to: 'dso-wait', saves: 'askedDso', receipt: 'Saved: question sent to your DSO {today}.' },
          ],
          timer: { kind: 'checkin', at: { days: 7 }, then: 'report-passed-job', ask: 'Report made, or asked your DSO?' },
        },
        'confirm-report': {
          state: 'confirming', tag: 'A',
          title: 'Report made? The day is {reportDue}.',
          actions: [{ kind: 'draft', draft: 'report' }],
          exits: [
            { key: 'made', label: 'Save to my record: report made {today}', to: 'count', saves: 'reportMade', receipt: 'Report marked made {today}.' },
            { key: 'notYet', label: 'Not yet: remind me on {reportDue}', to: 'wait-report', snooze: { limit: 'reportDue' } },
            { key: 'dso', label: 'Ask my DSO a question', to: 'dso-ask', quiet: true },
          ],
          timer: { kind: 'deadline', at: { fact: 'reportDue', plus: 1 }, then: 'report-passed', ask: 'Report made? The day was {reportDue}.' },
        },
        /* Bad news: once, in full, with the path in the same view. */
        'report-passed': {
          state: 'confirming', tag: 'B', threat: true, once: true,
          title: 'The report day was {reportDue}. Today is {today}.',
          short: 'Report day was {reportDue}: a question for your DSO',
          lines: [{ text: 'This is a question for your DSO.', threat: true }],
          actions: [{ kind: 'draft', draft: 'late' }, { kind: 'link', label: 'Find an immigration attorney', contact: 'attorney' }],
          exits: [
            { key: 'made', label: 'Save to my record: report made {today}', to: 'count', saves: 'reportMade', receipt: 'Report marked made {today}.' },
            { key: 'asked', label: 'Save to my record: asked my DSO {today}', to: 'dso-wait', saves: 'askedDso', receipt: 'Saved: question sent to your DSO {today}.' },
          ],
          timer: { kind: 'checkin', at: { days: 7 }, then: 'report-passed', ask: 'Report made, or asked your DSO?' },
        },
        count: {
          state: 'waiting', who: 'event', person: 'a new job', tag: 'A', threat: true,
          title: ['Days without work: {used} of {limit} as of {asOf}', 'Days without work: as of {asOf}'],
          lines: [
            { text: ['Report marked made {made}.', ''] },
            { text: ['Day {limit} is {day90}.', 'By {cardEnd}: {byEnd}.'], source: 'unemployment', threat: true },
            { text: 'When you have an offer, add it here: it stops the count.' },
          ],
          actions: [{ kind: 'rule', label: 'What counts as a job on OPT', source: 'optHours' }],
          exits: [
            { key: 'newJob', label: 'Add a new job or offer', to: 'new-job' },
            { key: 'dso', label: 'Ask my DSO a question', to: 'dso-ask', quiet: true },
          ],
          timer: { kind: 'checkin', at: { setting: 'checkinDays' }, then: 'checkin-job', ask: 'Any new job or offer?' },
        },
        'checkin-job': {
          state: 'confirming', tag: 'A', threat: true,
          title: 'Any new job or offer?',
          lines: [{ text: ['Days without work: {used} of {limit} as of {asOf}. Day {limit} is {day90}.', 'Days without work: {used} of {limit} as of {asOf}.'], source: 'unemployment', threat: true }],
          exits: [
            { key: 'newJob', label: 'Add the new job', to: 'new-job' },
            { key: 'none', label: 'No job yet: ask again {nextCheck}', to: 'count', saves: 'confirmNoJob', receipt: 'Confirmed: no new job as of {today}.' },
            { key: 'stop', label: 'Stop checking in: keep the count on Today', to: 'closed', by: 'student', outcome: 'report-made', quiet: true, when: 'made',
              receipt: 'Done. Report marked made {made}. The count stays on Today.' },
          ],
          timer: { kind: 'checkin', at: { setting: 'checkinDays' }, then: 'checkin-job', ask: 'Any new job or offer?' },
        },
        'new-job': {
          state: 'asking', tag: 'A',
          title: 'Your new job',
          fields: [
            { key: 'newEmployer', kind: 'text', label: 'Employer' },
            { key: 'newStart', kind: 'date', label: 'First day' },
            { key: 'newHours', kind: 'choice', label: 'Hours a week', options: [{ value: 'full', label: 'At least {minHours}' }, { value: 'part', label: 'Fewer than {minHours}' }], notSure: "I'm not sure" },
          ],
          exits: [
            { key: 'save', label: ['Save to my record: job at {newEmployer} from {newStart}', 'Add the employer, first day and hours to save it'], needs: ['newEmployer', 'newStart', 'newHours'], when: 'made',
              to: 'closed', by: 'student', outcome: 'new-job', saves: 'newJob', spawn: [{ kind: 'report-owed', report: 'job-start' }],
              receipt: 'Done. Report marked made {made}. New job at {newEmployer} from {newStart} saved. {newJobLine}' },
            { key: 'saveFirst', label: ['Save to my record: job at {newEmployer} from {newStart}', 'Add the employer, first day and hours to save it'], needs: ['newEmployer', 'newStart', 'newHours'], when: '!made',
              to: 'wait-report-job', saves: 'newJob', spawn: [{ kind: 'report-owed', report: 'job-start' }],
              receipt: 'New job at {newEmployer} from {newStart} saved. {newJobLine} Still open: report the end of your job on or before {reportDue}.' },
            { key: 'back', label: 'Back', to: '@back', quiet: true },
          ],
          timer: { kind: 'checkin', at: { setting: 'newFactDays' }, then: 'new-job', ask: 'Add the new job?' },
        },
      },
    },

    /* B. Travel. Never "you can travel"; re-entry judgements go to the DSO. */
    travel: {
      version: '2026.09.2',
      title: 'Trip {leave} to {back}',
      titleEmpty: 'A trip',
      situation: "I'm travelling",
      cantTell: 'your return',
      start: 'dates',
      uses: ['stepback'],
      dismiss: true,
      triggers: [{ from: 'plan', action: 'Plan a trip' }, { from: 'ask', phrases: ['going home', 'travel', 'travelling', 'traveling', 'trip', 'flying home', 'leave the us', 'christmas'] }],
      reopenOn: [{ key: 'returnChanged', label: 'Reopen: my return date changed' }, { key: 'newI20', label: 'Reopen: a new I-20 arrived' }],
      holes: ['signatureMonths', 'absenceMonths', 'folderCount', 'leave', 'back', 'leaveLong', 'backLong', 'daysAway', 'signed', 'signedLong', 'signatureUntil', 'cardEnd', 'fiveMonths', 'passportUntil', 'visaUntil',
        'firstAsk', 'lastAsk', 'purposeLabel', 'returned', 'name', 'sevisId', 'school', 'question'],
      carry: ['i20-opt', 'ead-card', 'passport', 'f1-visa'],
      drafts: {
        signature: {
          openLabel: 'Ask your DSO for a new travel signature',
          to: 'Your DSO at {school}',
          subject: 'Travel signature, {name}',
          paragraphs: ['Hi,', "I'm {name}, on post-completion OPT. I plan to travel from {leaveLong} and come back on {backLong}.", 'The travel signature on my I-20 is from {signedLong}.'],
          questions: ['Could I get a new travel signature on my I-20 before I leave?', 'Is there anything else you need from me for it?'],
          signoff: ['Thank you,', '{name}', 'SEVIS ID {sevisId}'],
        },
        question: {
          openLabel: 'Write the question to your DSO',
          to: 'Your DSO at {school}',
          subject: 'A question about my trip, {name}',
          paragraphs: ['Hi,', "I'm {name}, on post-completion OPT. I plan to travel from {leaveLong} and come back on {backLong}."],
          questions: ['{question}'],
          signoff: ['Thank you,', '{name}', 'SEVIS ID {sevisId}'],
        },
      },
      steps: {
        dates: {
          state: 'asking', tag: 'A',
          title: 'When do you leave and come back?',
          lines: [{ text: 'Passport and visa: on file.' }],
          fields: [
            { key: 'leave', kind: 'date', label: 'Leave' },
            { key: 'back', kind: 'date', label: 'Come back' },
            { key: 'purpose', kind: 'choice', label: 'While away', optionsFrom: 'change.purposes' },
          ],
          exits: [
            { key: 'save', label: ['Save this trip plan: {leave} to {back}', 'Add both dates and the reason to save it'], needs: ['leave', 'back', 'purpose'], to: 'check', saves: 'tripPlan',
              receipt: 'Trip plan saved: {leave} to {back}. Checked against your I-20, EAD card, passport and visa.' },
            { key: 'drop', label: 'Not planning a trip after all', to: 'dismissed', quiet: true, confirm: 'Drop this trip plan? Nothing is saved.', cancel: 'Cancel' },
          ],
          timer: { kind: 'checkin', at: { days: 7 }, then: 'dates', ask: 'Still planning a trip?' },
        },
        check: {
          state: 'planned', tag: 'A',
          title: 'Trip {leave} to {back}: {daysAway} days away',
          lines: [
            { text: ['Travel signature: signed {signed}. {signatureMonths} months from it is {signatureUntil}, after your return.'], when: 'signatureCovers', source: 'travelSignature' },
            { text: 'Travel signature: signed {signed}. {signatureMonths} months from it is {signatureUntil}, before your return on {back}.', when: '!signatureCovers', source: 'travelSignature' },
            { text: 'EAD card: ends {cardEnd}, after your return.', when: 'cardCovers', source: 'eadEnds' },
            { text: 'EAD card: ends {cardEnd}, before your return on {back}.', when: '!cardCovers', source: 'eadEnds' },
            { text: '{absenceMonths} months from leaving is {fiveMonths}. Your return is {back}.', source: 'travelAbsence' },
            { text: 'Passport valid until {passportUntil}. F-1 visa valid until {visaUntil}.' },
            { text: 'Days away count as days without work unless on leave your employer approved or travel for the job.', when: 'purposeCounts', source: 'unemploymentAbroad' },
          ],
          actions: [
            { kind: 'draft', draft: 'signature', when: '!signatureCovers' },
            { kind: 'link', label: 'Carry these: I-20, EAD card, passport, visa', href: '#/documents' },
            { kind: 'calendar', label: 'Add both dates to your calendar' },
          ],
          exits: [
            { key: 'remind', label: 'Remind me on {firstAsk} and {lastAsk}', to: 'wait', receipt: '{remindReceipt}' },
            { key: 'asked', label: 'Save to my record: signature asked {today}', when: '!signatureCovers', to: 'wait-folder', saves: 'signatureRequested',
              receipt: 'Saved: travel signature asked {today}.' },
            { key: 'change', label: 'Change the dates', to: 'dates', quiet: true },
            { key: 'dso', label: 'Ask my DSO a question', to: 'dso-ask', quiet: true },
            { key: 'drop', label: 'Cancel this trip', to: 'dismissed', quiet: true, confirm: 'Drop this trip plan? The dates come off your plan.', cancel: 'Keep the trip' },
          ],
          timer: { kind: 'checkin', at: { fact: 'firstAsk' }, then: 'ask-signature', ask: 'Signature requested?' },
        },
        /* Waiting keeps the check lines and the one thing the trip still
           needs (a new signature, when the last one does not cover the
           return): 2026-03-02 + 6 months = 2026-09-02, before 2027-01-09. */
        wait: {
          state: 'waiting', who: 'date', tag: 'A',
          title: 'Trip {leave} to {back}',
          lines: [
            { text: 'Next: {firstAsk}, then {lastAsk}.' },
            { text: ['Travel signature: signed {signed}. {signatureMonths} months from it is {signatureUntil}, after your return.'], when: 'signatureCovers', source: 'travelSignature' },
            { text: 'Travel signature: signed {signed}. {signatureMonths} months from it is {signatureUntil}, before your return on {back}.', when: '!signatureCovers', source: 'travelSignature' },
            { text: 'EAD card: ends {cardEnd}, after your return.', when: 'cardCovers', source: 'eadEnds' },
            { text: 'EAD card: ends {cardEnd}, before your return on {back}.', when: '!cardCovers', source: 'eadEnds' },
            { text: '{absenceMonths} months from leaving is {fiveMonths}. Your return is {back}.', source: 'travelAbsence' },
            { text: 'Passport valid until {passportUntil}. F-1 visa valid until {visaUntil}.' },
            { text: 'Days away count as days without work unless on leave your employer approved or travel for the job.', when: 'purposeCounts', source: 'unemploymentAbroad' },
          ],
          actions: [
            { kind: 'draft', draft: 'signature', when: '!signatureCovers' },
            { kind: 'link', label: 'Carry these: I-20, EAD card, passport, visa', href: '#/documents' },
            { kind: 'calendar', label: 'Add both dates to your calendar' },
          ],
          exits: [
            { key: 'asked', label: 'Save to my record: signature asked {today}', when: '!signatureCovers', to: 'wait-folder', saves: 'signatureRequested',
              receipt: 'Saved: travel signature asked {today}.' },
            { key: 'change', label: 'Change the dates', to: 'dates', quiet: true },
            { key: 'drop', label: 'Cancel this trip', to: 'dismissed', quiet: true, confirm: 'Drop this trip plan? The dates come off your plan.', cancel: 'Keep the trip' },
          ],
          timer: { kind: 'checkin', at: { fact: 'firstAsk' }, then: 'ask-signature', ask: 'Signature requested?' },
        },
        'ask-signature': {
          state: 'confirming', tag: 'A',
          title: ['Travel signature requested? {signatureMonths} months from the last one is {signatureUntil}.', 'Travel signature requested?'],
          actions: [{ kind: 'draft', draft: 'signature' }],
          exits: [
            { key: 'requested', label: 'Save to my record: signature requested {today}', to: 'wait-folder', saves: 'signatureRequested', receipt: 'Saved: travel signature requested {today}.' },
            { key: 'signed', label: 'Save to my record: new signature added', to: 'wait-folder', by: 'fact', saves: 'signatureAdded', receipt: 'Saved: new travel signature {today}.' },
            { key: 'dso', label: 'Ask my DSO a question', to: 'dso-ask', quiet: true },
          ],
          timer: { kind: 'checkin', at: { fact: 'lastAsk' }, then: 'ask-folder', ask: 'Folder on this phone?' },
        },
        'wait-folder': {
          state: 'waiting', who: 'date', tag: 'A',
          title: 'Trip {leave} to {back}',
          lines: [{ text: 'Next: {lastAsk}, the folder for this phone.' }],
          exits: [{ key: 'change', label: 'Change the dates', to: 'dates', quiet: true }],
          timer: { kind: 'checkin', at: { fact: 'lastAsk' }, then: 'ask-folder', ask: 'Folder on this phone?' },
        },
        'ask-folder': {
          state: 'confirming', tag: 'A',
          title: 'Carry these on this phone?',
          lines: [{ text: 'I-20, EAD card, passport and visa, ready without a connection.' }],
          exits: [
            { key: 'save', label: 'Save the folder to this phone', to: 'away', saves: 'carryFolder', receipt: 'Folder saved to this phone: {folderCount} documents.' },
            { key: 'skip', label: 'Skip the folder', to: 'away', quiet: true },
          ],
          timer: { kind: 'checkin', at: { fact: 'back' }, then: 'confirm-return', ask: 'Back in the US? Confirm your return date.' },
        },
        away: {
          state: 'waiting', who: 'date', tag: 'A',
          title: 'Away until {back}',
          exits: [{ key: 'change', label: 'My return date changed', to: 'dates' }],
          timer: { kind: 'checkin', at: { fact: 'back' }, then: 'confirm-return', ask: 'Back in the US? Confirm your return date.' },
        },
        'confirm-return': {
          state: 'confirming', tag: 'A',
          title: 'Back in the US? Confirm your return date.',
          exits: [
            { key: 'same', label: 'Save to my record: back on {back}', to: 'closed', by: 'student', outcome: 'trip', saves: 'tripDone',
              receipt: 'Trip saved, {leave} to {back}, {daysAway} days away.' },
            { key: 'other', label: 'Back on another day', to: 'return-date', quiet: true },
          ],
          timer: { kind: 'checkin', at: { setting: 'newFactDays' }, then: 'confirm-return', ask: 'Back in the US? Confirm your return date.' },
        },
        'return-date': {
          state: 'asking', tag: 'A',
          title: 'The day you came back',
          fields: [{ key: 'returned', kind: 'date', label: 'Back in the US' }],
          exits: [
            { key: 'save', label: ['Save to my record: back on {returned}', 'Pick the day to save it'], needs: ['returned'], to: 'closed', by: 'student', outcome: 'trip', saves: 'tripReturned',
              receipt: 'Trip saved, {leave} to {back}, {daysAway} days away.' },
            { key: 'back', label: 'Back', to: '@back', quiet: true },
          ],
          timer: { kind: 'checkin', at: { setting: 'newFactDays' }, then: 'confirm-return', ask: 'Back in the US? Confirm your return date.' },
        },
      },
    },

    /* C. STEM OPT filing. The Today card "Decide on STEM OPT" opens it in
       place; Yes goes to planned, not to a strip that stops. Never
       "eligible", odds, or a date from a rule not saved with its quote. */
    'stem-filing': {
      version: '2026.09.2',
      title: 'STEM OPT extension',
      situation: 'Apply for STEM OPT',
      cantTell: 'the filing',
      /* Round 7: "Last day Feb 13, 2027, set by your EAD card." */
      lastBy: { card: 'set by your EAD card', recommendation: 'set by your recommendation plus {withinDays} days' },
      start: 'facts',
      uses: ['stepback'],
      dismiss: false,
      obligation: { fact: 'last', source: 'stemCloses', title: 'File your I-765', metBy: ['filed'] },
      triggers: [{ from: 'decide', key: 'stemIntent', value: 'yes' }, { from: 'ask', phrases: ['stem extension', 'stem opt', 'stem'] }, { from: 'runway', fact: 'stemOpens' }],
      /* after: the outcomes a reason fits. "Apply after all" follows "not
         applying"; a new employer or an evidence notice follows a filing. */
      reopenOn: [
        { key: 'apply', label: 'Reopen: I want to apply after all', after: ['not-applying'] },
        { key: 'employer', label: 'Reopen: I changed employer', after: ['approved', 'denied'] },
        { key: 'rfe', label: 'Reopen: a notice asking for evidence arrived', after: ['approved', 'denied'] },
      ],
      holes: ['withinDays', 'opens', 'last', 'lastBy', 'prepare', 'cip', 'field', 'employer', 'everifyChecked', 'everifyEmployer', 'cardUntil', 'recommended', 'receipt', 'cardFrom', 'newCardFrom', 'newCardUntil',
        'name', 'sevisId', 'school', 'question', 'filed', 'filedOn', 'lastLead'],
      /* Holes and flags the filing steps read (app/loops.js
         BIND['stem-filing']):
           lastLead    the last day minus deadlineLeadDays. Recommended
                       2026-09-30: + 60 = 2026-11-29, - 3 = 2026-11-26;
                       with no recommendation, 2027-02-13 - 3 = 2027-02-10.
           filedOn     the filing day the student typed
           filedEarly  filedOn is before the window opens (2027-02-13 - 90
                       = 2026-11-15), so a filing saved on 2026-09-30 is
                       outside it. Until the binder sets it, the early line
                       and draft stay hidden and nothing else changes. */
      drafts: {
        recommend: { from: 'email' },
        early: {
          openLabel: 'Write to your DSO about the filing day',
          to: 'Your DSO at {school}',
          subject: 'STEM OPT filing day, {name}',
          paragraphs: ['Hi,', "I'm {name}, on post-completion OPT. I filed my STEM OPT application on {filedOn}, receipt {receipt}. The filing window on my record opens {opens}."],
          questions: ['Could we go over the filing day together?', 'Is there anything you need from me?'],
          signoff: ['Thank you,', '{name}', 'SEVIS ID {sevisId}'],
        },
        late: {
          openLabel: 'Write to your DSO',
          to: 'Your DSO at {school}',
          subject: 'STEM OPT filing, {name}',
          paragraphs: ['Hi,', "I'm {name}, on post-completion OPT. My EAD card ends {cardUntil}, and I have not filed my STEM OPT application."],
          questions: ['Could we talk about my options?'],
          signoff: ['Thank you,', '{name}', 'SEVIS ID {sevisId}'],
        },
        rfe: {
          openLabel: 'Write to your DSO about the notice',
          to: 'Your DSO at {school}',
          subject: 'Request for evidence on my STEM OPT application, {name}',
          paragraphs: ['Hi,', "I'm {name}. USCIS sent a request for evidence on my STEM OPT application, receipt {receipt}. It arrived {today}."],
          questions: ['Could we go over it together?', 'Is this something to take to an immigration attorney?'],
          signoff: ['Thank you,', '{name}', 'SEVIS ID {sevisId}'],
        },
        question: {
          openLabel: 'Write the question to your DSO',
          to: 'Your DSO at {school}',
          subject: 'A question about STEM OPT, {name}',
          paragraphs: ['Hi,', "I'm {name}, on post-completion OPT. I'm preparing to apply for the STEM OPT extension."],
          questions: ['{question}'],
          signoff: ['Thank you,', '{name}', 'SEVIS ID {sevisId}'],
        },
      },
      steps: {
        facts: {
          state: 'asking', tag: 'A',
          title: 'File your I-765 on or before {last}',
          /* Round 7, rule 2: plain lines, no ⓘ on any of them; their
             sources are listed once under "How this was counted". The
             recommendation note is one quiet line; "Add the date" shows
             the field and its save. */
          lines: [
            { text: 'Window opens {opens}. Last day {last}, {lastBy}.', sources: ['stemOpens', 'stemCloses'] },
            { text: ['{field} ({cip}) is on the STEM list. {everifyEmployer} uses E-Verify.', '{field} ({cip}) is on the STEM list.', '{everifyEmployer} uses E-Verify.'], sources: ['stemList', 'stemEmployer'] },
            { text: "Your school's recommendation date can move the last day earlier.", source: 'within60', quiet: true, reveal: 'recommended', revealLabel: 'Add the date' },
          ],
          fields: [{ key: 'recommended', kind: 'date', label: 'Day your school recommended you', reveal: true }],
          /* Receipts carry the file-by date in their own words, so the
             engine adds no second "Next" line. Opens 2026-11-15 - 1 month =
             2026-10-15, the training plan's start-by day. */
          exits: [
            { key: 'start', label: 'Start the steps: training plan first', to: 'i983',
              receipt: 'Saved: applying for STEM OPT. File on or before {last}. Next: training plan, start by {prepare}.' },
            { key: 'rec', label: ['Save to my record: recommended {recommended}', 'Add the recommendation day to save it'], needs: ['recommended'], to: 'file', saves: 'recommended',
              receipt: 'Saved: recommended {recommended}. File on or before {last}.' },
            { key: 'no', label: 'Not applying for STEM OPT this time', to: 'closed', by: 'student', outcome: 'not-applying', quiet: true,
              confirm: 'Stop the STEM OPT steps? Your file-by date stays in Plan.', cancel: 'Cancel',
              receipt: 'Saved: not applying for STEM OPT this time. Your EAD card ends {cardUntil}.' },
          ],
          timer: { kind: 'checkin', at: { days: 7 }, then: 'facts', ask: 'Start the STEM OPT steps?' },
        },
        i983: {
          state: 'planned', tag: 'A',
          title: 'Fill out your I-983 with your manager',
          lines: [
            { text: 'Start preparing by {prepare}. Window opens {opens}. File on or before {last}.', source: 'startPreparing' },
            { text: 'You and your manager both sign it.', source: 'stemPlan' },
          ],
          exits: [
            /* 2026-09-30 + 5 business days = 2026-10-07, the DSO reply day. */
            { key: 'signed', label: 'Save to my record: I-983 signed {today}', to: 'recommend', saves: 'i983Signed',
              receipt: "Saved: I-983 signed {today}. File on or before {last}. Next: {dsoReplyBy}, your school's recommendation." },
            { key: 'dso', label: 'Ask my DSO a question', to: 'dso-ask', quiet: true },
            { key: 'no', label: 'Not applying for STEM OPT this time', to: 'closed', by: 'student', outcome: 'not-applying', quiet: true,
              confirm: 'Stop the STEM OPT steps? Your file-by date stays in Plan.', cancel: 'Cancel',
              receipt: 'Saved: not applying for STEM OPT this time. Your EAD card ends {cardUntil}.' },
          ],
          timer: { kind: 'checkin', at: { fact: 'prepare' }, every: 'checkinDays', then: 'i983', ask: 'Training plan signed?' },
        },
        recommend: {
          state: 'waiting', who: 'person', person: 'your DSO', tag: 'A',
          title: 'Waiting on your DSO until {dsoReplyBy}',
          lines: [{ text: 'Your school enters its recommendation and sends a new I-20. File within {withinDays} days of it.', source: 'within60' }],
          fields: [{ key: 'recommended', kind: 'date', label: 'Day your school recommended you' }],
          actions: [{ kind: 'draft', draft: 'recommend' }],
          exits: [
            { key: 'rec', label: ['Save to my record: recommended {recommended}', 'Add the recommendation day to save it'], needs: ['recommended'], to: 'file', by: 'fact', saves: 'recommended',
              receipt: 'Saved: recommended {recommended}. File on or before {last}.' },
          ],
          timer: { kind: 'checkin', at: { setting: 'dsoReplyBusinessDays', businessDays: true }, then: 'recommend-reply', ask: 'Did your DSO reply?' },
        },
        'recommend-reply': {
          state: 'confirming', tag: 'A',
          title: 'Did your school recommend you?',
          fields: [{ key: 'recommended', kind: 'date', label: 'Day your school recommended you' }],
          exits: [
            { key: 'rec', label: ['Save to my record: recommended {recommended}', 'Add the recommendation day to save it'], needs: ['recommended'], to: 'file', by: 'fact', saves: 'recommended',
              receipt: 'Saved: recommended {recommended}. File on or before {last}.' },
            { key: 'notYet', label: 'Not yet: ask again {dsoReplyBy}', to: 'recommend' },
          ],
          timer: { kind: 'checkin', at: { setting: 'dsoReplyBusinessDays', businessDays: true }, then: 'recommend-reply', ask: 'Did your school recommend you?' },
        },
        /* The receipt number is the outside fact that meets the obligation
           (BLUEPRINT 2.3 rule 4, 2.6 C5). The filing day is optional and
           typed, never assumed to be today, and checked against the window:
           a day before it opens is said once, in full, with the DSO draft
           beside it (filedEarly). */
        file: {
          state: 'planned', tag: 'A',
          title: 'File your I-765 on or before {last}',
          lines: [
            { text: 'Window opens {opens}. Last day {last}, {lastBy}.', sources: ['stemOpens', 'within60'] },
            { text: 'Filed {filedOn}, before the window opens on {opens}. This is a question for your DSO.', when: 'filedEarly', threat: true },
            { text: 'Add the filing day and the receipt number from your USCIS notice once you file.' },
          ],
          fields: [
            { key: 'filedOn', kind: 'date', label: 'Day you filed' },
            { key: 'receipt', kind: 'receipt', label: 'Receipt number', placeholder: 'Three letters and ten digits' },
          ],
          actions: [
            { kind: 'draft', draft: 'early', when: 'filedEarly' },
            { kind: 'link', label: 'Where to file: Form I-765 on uscis.gov', href: 'https://www.uscis.gov/i-765' },
            { kind: 'calendar', label: 'Add both dates to your calendar' },
          ],
          exits: [
            { key: 'filed', label: ['Save to my record: filed {filedOn}, receipt {receipt}', 'Save to my record: receipt {receipt}', 'Add the receipt number to save it'], needs: ['receipt'], to: 'decision', by: 'fact', saves: 'filed',
              receipt: ['Saved: filed {filedOn}, receipt {receipt}. USCIS status shows it on Today.', 'Saved: filed, receipt {receipt}. USCIS status shows it on Today.'] },
            { key: 'remind', label: ['Remind me on {lastLead} and {last}', 'Remind me before {last}'], to: 'file-wait', receipt: '{remindReceipt}' },
            { key: 'dso', label: 'Ask my DSO a question', to: 'dso-ask', quiet: true },
          ],
          timer: { kind: 'deadline', at: { fact: 'last', minus: 'lead' }, then: 'file-confirm', ask: 'Filed? The last day is {last}.' },
        },
        'file-wait': {
          state: 'waiting', who: 'date', tag: 'A',
          title: 'File your I-765 on or before {last}',
          lines: [
            { text: ['Reminders: {lastLead} and {last}.', 'Window opens {opens}.'] },
            { text: 'Filed {filedOn}, before the window opens on {opens}. This is a question for your DSO.', when: 'filedEarly', threat: true },
          ],
          fields: [
            { key: 'filedOn', kind: 'date', label: 'Day you filed' },
            { key: 'receipt', kind: 'receipt', label: 'Receipt number', placeholder: 'Three letters and ten digits' },
          ],
          actions: [
            { kind: 'draft', draft: 'early', when: 'filedEarly' },
            { kind: 'link', label: 'Where to file: Form I-765 on uscis.gov', href: 'https://www.uscis.gov/i-765' },
            { kind: 'calendar', label: 'Add both dates to your calendar' },
          ],
          exits: [
            { key: 'filed', label: ['Save to my record: filed {filedOn}, receipt {receipt}', 'Save to my record: receipt {receipt}', 'Add the receipt number to save it'], needs: ['receipt'], to: 'decision', by: 'fact', saves: 'filed',
              receipt: ['Saved: filed {filedOn}, receipt {receipt}. USCIS status shows it on Today.', 'Saved: filed, receipt {receipt}. USCIS status shows it on Today.'] },
            { key: 'dso', label: 'Ask my DSO a question', to: 'dso-ask', quiet: true },
          ],
          timer: { kind: 'deadline', at: { fact: 'last', minus: 'lead' }, then: 'file-confirm', ask: 'Filed? The last day is {last}.' },
        },
        'file-confirm': {
          state: 'confirming', tag: 'A',
          title: 'Filed? The last day is {last}.',
          lines: [{ text: 'Filed {filedOn}, before the window opens on {opens}. This is a question for your DSO.', when: 'filedEarly', threat: true }],
          fields: [
            { key: 'filedOn', kind: 'date', label: 'Day you filed' },
            { key: 'receipt', kind: 'receipt', label: 'Receipt number', placeholder: 'Three letters and ten digits' },
          ],
          actions: [{ kind: 'draft', draft: 'early', when: 'filedEarly' }, { kind: 'link', label: 'Where to file: Form I-765 on uscis.gov', href: 'https://www.uscis.gov/i-765' }],
          exits: [
            { key: 'filed', label: ['Save to my record: filed {filedOn}, receipt {receipt}', 'Save to my record: receipt {receipt}', 'Add the receipt number to save it'], needs: ['receipt'], to: 'decision', by: 'fact', saves: 'filed',
              receipt: ['Saved: filed {filedOn}, receipt {receipt}. USCIS status shows it on Today.', 'Saved: filed, receipt {receipt}. USCIS status shows it on Today.'] },
            { key: 'notYet', label: 'Not yet: remind me on {last}', to: 'file', snooze: { limit: 'last' } },
            { key: 'dso', label: 'Ask my DSO a question', to: 'dso-ask', quiet: true },
          ],
          timer: { kind: 'deadline', at: { fact: 'last', plus: 1 }, then: 'file-passed', ask: 'Filed? The last day was {last}.' },
        },
        'file-passed': {
          state: 'confirming', tag: 'B', threat: true, once: true,
          title: 'The last day to file was {last}. Today is {today}.',
          short: 'Last day to file was {last}: a question for your DSO',
          lines: [{ text: 'This is a question for your DSO.', threat: true }],
          fields: [
            { key: 'filedOn', kind: 'date', label: 'Day you filed, if you filed' },
            { key: 'receipt', kind: 'receipt', label: 'Receipt number, if you filed', placeholder: 'Three letters and ten digits' },
          ],
          actions: [{ kind: 'draft', draft: 'late' }, { kind: 'link', label: 'Find an immigration attorney', contact: 'attorney' }],
          exits: [
            { key: 'filed', label: ['Save to my record: filed {filedOn}, receipt {receipt}', 'Save to my record: receipt {receipt}', 'Add the receipt number if you filed'], needs: ['receipt'], to: 'decision', by: 'fact', saves: 'filed',
              receipt: ['Saved: filed {filedOn}, receipt {receipt}.', 'Saved: filed, receipt {receipt}.'] },
            { key: 'asked', label: 'Save to my record: asked my DSO {today}', to: 'dso-wait', saves: 'askedDso', receipt: 'Saved: question sent to your DSO {today}.' },
          ],
          timer: { kind: 'checkin', at: { days: 7 }, then: 'file-passed', ask: 'Filed, or asked your DSO?' },
        },
        decision: {
          state: 'waiting', who: 'event', person: 'USCIS', tag: 'A',
          title: 'Waiting on USCIS: receipt {receipt}',
          lines: [{ text: ['Filed {filed}. The status line sits on Today.', 'The status line sits on Today.'] }],
          fields: [
            { key: 'newCardFrom', kind: 'date', label: 'New card valid from' },
            { key: 'newCardUntil', kind: 'date', label: 'New card valid until' },
          ],
          actions: [
            { kind: 'link', label: 'Check case status on USCIS', href: 'https://egov.uscis.gov/' },
            { kind: 'link', label: 'Add the approval notice and the new card to Documents', href: '#/documents/add' },
          ],
          exits: [
            /* Closed when the approval arrives and the dates on the new card
               are typed and confirmed (BLUEPRINT 2.6 C6). Closing opens its
               children: the validation reports and evaluations, each its own
               loop. */
            { key: 'approved', label: ['Save to my record: approved, new card {newCardFrom} to {newCardUntil}', 'Add the dates on the new card to save it'], needs: ['newCardFrom', 'newCardUntil'],
              to: 'closed', by: 'fact', outcome: 'approved', saves: 'newCard', spawn: [{ kind: 'report-owed', report: 'stem' }],
              receipt: 'Done. Approval saved, new card valid {newCardFrom} to {newCardUntil}. Report dates for STEM OPT are now on your plan.' },
            { key: 'rfe', label: 'A notice asking for more evidence arrived', to: 'rfe', saves: 'rfe', receipt: 'Saved: a request for evidence arrived {today}.' },
            { key: 'denied', label: 'A denial notice arrived', to: 'denied', saves: 'denied', receipt: 'Saved: a denial notice arrived {today}.' },
          ],
          timer: { kind: 'checkin', at: { days: 30 }, then: 'decision', ask: 'Any notice from USCIS?' },
        },
        rfe: {
          state: 'waiting', who: 'person', person: 'your DSO or an attorney', tag: 'B',
          title: 'Waiting on your DSO or an attorney until {dsoReplyBy}',
          lines: [{ text: 'A request for evidence arrived {today}. This is a question for your DSO or an immigration attorney.' }],
          actions: [{ kind: 'draft', draft: 'rfe' }, { kind: 'link', label: 'Find an immigration attorney', contact: 'attorney' }],
          exits: [{ key: 'sent', label: 'Save to my record: response sent {today}', to: 'decision', saves: 'rfeAnswered', receipt: 'Saved: response sent {today}. Waiting on USCIS.' }],
          timer: { kind: 'checkin', at: { setting: 'dsoReplyBusinessDays', businessDays: true }, then: 'rfe', ask: 'Did your DSO or attorney reply?' },
        },
        denied: {
          state: 'waiting', who: 'person', person: 'your DSO or an attorney', tag: 'B', once: true,
          title: 'A denial notice arrived {today}. This is a question for your DSO or an immigration attorney.',
          short: 'Denial notice saved: a question for your DSO',
          actions: [{ kind: 'draft', draft: 'late' }, { kind: 'link', label: 'Find an immigration attorney', contact: 'attorney' }],
          exits: [{ key: 'spoke', label: 'Save to my record: spoke with my DSO {today}', to: 'closed', by: 'student', outcome: 'denied',
            receipt: 'Denial notice saved. Talk with your DSO saved {today}.' }],
          timer: { kind: 'checkin', at: { setting: 'dsoReplyBusinessDays', businessDays: true }, then: 'denied', ask: 'Did your DSO or attorney reply?' },
        },
      },
    },

    /* D. Address change. No date and no "10 days" figure (BLUEPRINT 2.6 D):
       8 CFR 214.2(f)(17) is decided (D74) but not yet a saved rule with its
       quote, and the only source here is Study in the States guidance. So the
       step says "Your DSO can confirm the deadline" and drafts the update.
       The obligation reads ruleDue, which the engine binds only once the
       (f)(17) rule is saved; until then the deadline timers fall back to a
       check-in a week on (2026-09-30 + 7 = 2026-10-07) and nothing is
       guaranteed by a date Duly does not have. When the rule lands, the
       templates gain the date and open address loops reopen to show it. */
    address: {
      version: '2026.09.2',
      title: 'New address',
      situation: 'I moved',
      cantTell: 'the school update',
      start: 'new-address',
      uses: ['stepback'],
      dismiss: false,
      obligation: { fact: 'ruleDue', source: 'reportChanges', title: 'Tell your school your new address', optional: true, metBy: ['addressTold'] },
      triggers: [{ from: 'ask', phrases: ['i moved', 'moved', 'new address', 'change my address', 'moving'] }, { from: 'record', fact: 'address' }],
      reopenOn: [{ key: 'rule', label: 'Reopen: the address rule was saved' }],
      holes: ['address', 'moved', 'movedLong', 'oldAddress', 'ruleDue', 'name', 'sevisId', 'school', 'question'],
      drafts: {
        address: {
          openLabel: 'Write to your school',
          to: 'Your DSO at {school}',
          subject: 'New address, {name}',
          paragraphs: ['Hi,', "I'm {name}, on post-completion OPT. I moved on {movedLong}. My new address is {address}."],
          questions: ['Could you update my record?', 'Is there a deadline for this update?', 'Is there anything else you need from me?'],
          signoff: ['Thank you,', '{name}', 'SEVIS ID {sevisId}'],
        },
        question: {
          openLabel: 'Write the question to your DSO',
          to: 'Your DSO at {school}',
          subject: 'A question about my address, {name}',
          paragraphs: ['Hi,', "I'm {name}. I moved on {movedLong}."],
          questions: ['{question}'],
          signoff: ['Thank you,', '{name}', 'SEVIS ID {sevisId}'],
        },
      },
      steps: {
        'new-address': {
          state: 'asking', tag: 'A',
          title: 'Your new address',
          lines: [{ text: 'On your record now: {oldAddress}.' }],
          fields: [
            { key: 'address', kind: 'text', label: 'New address' },
            { key: 'moved', kind: 'date', label: 'Moved on' },
          ],
          exits: [
            { key: 'save', label: ['Save to my record: new address from {moved}', 'Add the address and the day to save it'], needs: ['address', 'moved'], to: 'tell', saves: 'address',
              receipt: 'Saved: new address from {moved}.' },
            { key: 'none', label: 'Not moving after all', to: 'closed', by: 'student', outcome: 'no-change', quiet: true, receipt: 'Nothing saved. Your address stays {oldAddress}.' },
          ],
          timer: { kind: 'checkin', at: { setting: 'newFactDays' }, then: 'new-address', ask: 'Add your new address?' },
        },
        tell: {
          state: 'planned', tag: 'A',
          title: 'Tell your school about your new address. Your DSO can confirm the deadline.',
          lines: [{ text: 'Saved: new address from {moved}.' }],
          actions: [{ kind: 'draft', draft: 'address' }],
          exits: [
            { key: 'told', label: 'Save to my record: school told {today}', to: 'closed', by: 'student', outcome: 'told', saves: 'addressTold',
              receipt: 'Done. New address saved from {moved}. School told {today}.' },
            { key: 'remind', label: 'Remind me in a week', to: 'wait', receipt: '{remindReceipt}' },
          ],
          timer: { kind: 'deadline', at: { fact: 'ruleDue', minus: 'lead' }, then: 'confirm', ask: 'Updated with your school?', fallback: { kind: 'checkin', at: { days: 7 } } },
        },
        wait: {
          state: 'waiting', who: 'date', tag: 'A',
          title: 'Tell your school about your new address',
          lines: [{ text: 'Your DSO can confirm the deadline.' }],
          actions: [{ kind: 'draft', draft: 'address' }],
          exits: [{ key: 'told', label: 'Save to my record: school told {today}', to: 'closed', by: 'student', outcome: 'told', saves: 'addressTold',
            receipt: 'Done. New address saved from {moved}. School told {today}.' }],
          timer: { kind: 'deadline', at: { fact: 'ruleDue', minus: 'lead' }, then: 'confirm', ask: 'Updated with your school?', fallback: { kind: 'checkin', at: { days: 7 } } },
        },
        confirm: {
          state: 'confirming', tag: 'A',
          title: 'Updated with your school?',
          actions: [{ kind: 'draft', draft: 'address' }],
          exits: [
            { key: 'told', label: 'Save to my record: school told {today}', to: 'closed', by: 'student', outcome: 'told', saves: 'addressTold',
              receipt: 'Done. New address saved from {moved}. School told {today}.' },
            { key: 'notYet', label: ['Not yet: remind me on {ruleDue}', 'Not yet: ask again in a week'], to: 'wait', snooze: { limit: 'ruleDue' } },
          ],
          timer: { kind: 'deadline', at: { fact: 'ruleDue', plus: 1 }, then: 'passed', ask: 'Updated with your school?', fallback: { kind: 'checkin', at: { days: 7 }, then: 'confirm' } },
        },
        /* Reached only once ruleDue is bound (the saved (f)(17) rule). */
        passed: {
          state: 'confirming', tag: 'B', threat: true, once: true,
          title: ['The day to tell your school was {ruleDue}. Today is {today}.', 'Tell your school about your new address. Your DSO can confirm the deadline.'],
          short: ['Address day was {ruleDue}: a question for your DSO', 'Address update: a question for your DSO'],
          lines: [{ text: 'This is a question for your DSO.', threat: true }],
          actions: [{ kind: 'draft', draft: 'address' }],
          exits: [
            { key: 'told', label: 'Save to my record: school told {today}', to: 'closed', by: 'student', outcome: 'told', saves: 'addressTold',
              receipt: 'Done. New address saved from {moved}. School told {today}.' },
            { key: 'asked', label: 'Save to my record: asked my DSO {today}', to: 'dso-wait', saves: 'askedDso', receipt: 'Saved: question sent to your DSO {today}.' },
          ],
          timer: { kind: 'checkin', at: { days: 7 }, then: 'passed', ask: 'Updated with your school?' },
        },
      },
    },

    /* E. Lost document (Round 7, rule 6). The saved copy opens at once
       ("Open your copy" first), then who replaces that kind of document,
       then "Mark the old one lost", which closes with a receipt.
         I-20      your DSO reissues it (the school issues every I-20)
         EAD card  a replacement through Form I-765, filed with USCIS
         passport  your country's consulate
         I-94      download it from the CBP I-94 website
       Any other document: no replacement steps are saved, so the DSO
       question, with the draft. The kind key (lost-paper) and the hole names
       stay as they were: they are never shown. */
    'lost-paper': {
      version: '2026.10.1',
      title: ['Lost {paperLower}', 'A lost document'],
      situation: 'I lost a document',
      cantTell: 'the replacement',
      start: 'which',
      reopenTo: 'copy',
      dismiss: true,
      triggers: [{ from: 'papers', action: 'I lost a document' }, { from: 'ask', phrases: ['lost my passport', 'lost my i-20', 'lost my ead', 'lost my card', 'lost my visa', 'lost my i-94', 'lost a document', 'stolen'] }],
      reopenOn: [{ key: 'again', label: 'Reopen: show the replacement steps again' }],
      holes: ['paper', 'paperLower', 'copySaved', 'copyHref', 'copyDoc', 'today', 'name', 'sevisId', 'school'],
      papers: [
        { value: 'passport', label: 'Passport', doc: 'passport', replace: 'consulate' },
        { value: 'ead', label: 'EAD card', doc: 'ead-card', replace: 'i765' },
        { value: 'i20', label: 'I-20', doc: 'i20-opt', replace: 'dso' },
        { value: 'visa', label: 'F-1 visa', doc: 'f1-visa' },
        { value: 'i94', label: 'I-94', doc: 'i94', replace: 'cbp' },
        /* Documents adds an "I lost this" entry on each immigration
           document it keeps; these four are the rest of Priya's. The
           degree, transcripts and offer letter come from the school or
           employer, so this guide does not cover them. */
        { value: 'i797', label: 'I-797 approval notice', doc: 'i797' },
        { value: 'i20-cpt-lumen', label: 'I-20 for CPT at Lumen Labs', doc: 'i20-cpt-lumen', replace: 'dso' },
        { value: 'i20-cpt-acme', label: 'I-20 for CPT at Acme Robotics', doc: 'i20-cpt-acme', replace: 'dso' },
        { value: 'i20-start', label: 'Initial I-20', doc: 'i20-start', replace: 'dso' },
      ],
      drafts: {
        reissue: {
          openLabel: 'Write to your DSO',
          to: 'Your DSO at {school}',
          subject: 'Lost {paperLower}, {name}',
          paragraphs: ['Hi,', "I'm {name}, on post-completion OPT. I lost my {paperLower}."],
          questions: ['Could you reissue it?', 'Is there anything you need from me in the meantime?'],
          signoff: ['Thank you,', '{name}', 'SEVIS ID {sevisId}'],
        },
      },
      steps: {
        /* Picking the document opens its copy at once (advance). From a
           document's own page the document is known, so the copy opens
           with no question at all. */
        which: {
          state: 'asking', tag: 'A',
          title: 'Which document did you lose?',
          fields: [{ key: 'paper', kind: 'choice', label: 'Document', optionsFrom: 'papers' }],
          advance: 'show',
          exits: [
            { key: 'show', label: ['Open the {paperLower} steps', 'Pick the document'], needs: ['paper'], to: 'copy' },
            { key: 'found', label: 'Found it: nothing to save', to: 'dismissed', quiet: true, confirm: 'Drop this? Nothing is saved.', cancel: 'Cancel' },
          ],
          timer: { kind: 'checkin', at: { setting: 'newFactDays' }, then: 'which', ask: 'Which document did you lose?' },
        },
        /* The copy's saved date is the document's "This version" date in
           Documents (I-20 for OPT: Mar 2, 2026; passport: Mar 3, 2026). */
        copy: {
          state: 'planned', tag: 'A',
          title: 'Your copy, then a new {paperLower}',
          lines: [
            { text: ['Your copy, saved {copySaved}, has its number and dates. It opens without a connection.', 'Your copy has its number and dates. It opens without a connection.'] },
            { text: 'Ask your DSO to reissue it. Only your school can issue a new I-20.', when: 'by-dso' },
            { text: 'A lost EAD card is replaced through Form I-765, filed with USCIS.', when: 'by-i765' },
            { text: "Your country's consulate replaces a lost passport.", when: 'by-consulate' },
            { text: 'Download your I-94 from the CBP I-94 website.', when: 'by-cbp' },
            { text: 'No replacement steps are saved for this document yet, so the next step is a question for your DSO.', when: 'by-none' },
          ],
          actions: [
            { kind: 'copy', label: 'Open your copy', fact: 'copyDoc', lead: true },
            { kind: 'draft', draft: 'reissue', when: 'byDsoDraft' },
            { kind: 'link', label: 'Form I-765 on uscis.gov', href: 'https://www.uscis.gov/i-765', when: 'by-i765' },
            { kind: 'link', label: 'Find your consulate', href: 'https://www.state.gov/foreign-consular-offices/', when: 'by-consulate' },
            { kind: 'link', label: 'Get your I-94 on the CBP website', href: 'https://i94.cbp.dhs.gov/', when: 'by-cbp' },
          ],
          exits: [
            { key: 'lost', label: 'Mark the old one lost', to: 'closed', by: 'student', outcome: 'lost', saves: 'lost',
              receipt: 'Saved: {paperLower} marked lost {today}. Your copy stays in Documents. Add the new one there when it arrives.' },
            { key: 'found', label: 'Found it: nothing to save', to: 'dismissed', quiet: true, confirm: 'Drop this? Nothing is saved.', cancel: 'Cancel' },
          ],
          timer: { kind: 'checkin', at: { setting: 'checkinDays' }, then: 'copy', ask: 'Mark the {paperLower} lost?' },
        },
      },
    },

    /* Crisis and enforcement (BLUEPRINT 2.7). A fixed screen, never
       generated, no dates and no verdict. Matched before any guide. Nothing
       from it is written to Your record (private: true; BLUEPRINT 3.4).
       To be reviewed by a clinician and an attorney before it ships. */
    crisis: {
      version: '2026.09.2',
      title: 'Help now',
      start: 'help',
      private: true,
      fixed: true,
      dismiss: true,
      literals: ['988'],
      review: 'clinician and attorney, before it ships',
      triggers: [{ from: 'ask', crisis: true }],
      holes: ['school', 'officeName', 'today', 'keepAsk'],
      steps: {
        help: {
          state: 'open', tag: 'fixed',
          title: 'Help is here, now.',
          lines: [
            { text: 'Call or text 988, any time, day or night.' },
            { text: 'Your {officeName} at {school}.' },
            { text: 'Talk to an immigration attorney now.' },
          ],
          actions: [
            { kind: 'link', label: 'Call 988', contact: 'lifeline', part: 'call' },
            { kind: 'link', label: 'Text 988', contact: 'lifeline', part: 'text' },
            { kind: 'link', label: 'Open the {officeName} page', contact: 'schoolOffice' },
            { kind: 'link', label: 'Find an immigration attorney', contact: 'attorney' },
            { kind: 'start', label: 'Save the notice and the day it arrived', loop: 'notice', when: 'notice' },
          ],
          exits: [
            { key: 'keep', label: 'Keep these on Today', to: 'keep' },
            { key: 'close', label: 'Close this', to: 'dismissed', quiet: true, confirm: 'Take these off the screen? Ask finds them again any time.', cancel: 'Cancel' },
          ],
          timer: { kind: 'checkin', at: { fact: 'keepAsk' }, then: 'check', ask: 'Still want these on Today?' },
        },
        /* Kept on Today: the same help, no date, no timer line, no receipt
           (BLUEPRINT 2.7). keepAsk is never bound, so the timer never sets a
           date: the screen stays until the student takes it off. Its only
           purpose is the check step the student can still be asked from. */
        keep: {
          state: 'open', tag: 'fixed',
          title: 'Help is here, now.',
          lines: [
            { text: 'Call or text 988, any time, day or night.' },
            { text: 'Your {officeName} at {school}.' },
            { text: 'Talk to an immigration attorney now.' },
          ],
          actions: [
            { kind: 'link', label: 'Call 988', contact: 'lifeline', part: 'call' },
            { kind: 'link', label: 'Text 988', contact: 'lifeline', part: 'text' },
            { kind: 'link', label: 'Open the {officeName} page', contact: 'schoolOffice' },
            { kind: 'link', label: 'Find an immigration attorney', contact: 'attorney' },
          ],
          exits: [{ key: 'off', label: 'Take these off Today', to: 'closed', by: 'student', outcome: 'off', quiet: true,
            confirm: 'Take these off Today? Ask finds them again any time.', cancel: 'Cancel' }],
          timer: { kind: 'checkin', at: { fact: 'keepAsk' }, then: 'check', ask: 'Still want these on Today?' },
        },
        check: {
          state: 'confirming', tag: 'fixed',
          title: 'Still want these on Today?',
          exits: [
            { key: 'keep', label: 'Keep these on Today', to: 'keep' },
            { key: 'off', label: 'Take these off Today', to: 'closed', by: 'student', outcome: 'off' },
          ],
          timer: { kind: 'checkin', at: { fact: 'keepAsk' }, then: 'check', ask: 'Still want these on Today?' },
        },
      },
    },

    /* A notice received: SEVIS termination or visa revocation (BLUEPRINT
       2.7). Save the notice, record the day it arrived, drafts to the DSO and
       an attorney. No consequence is stated, ever. */
    notice: {
      version: '2026.09.1',
      title: ['Notice: {kindLabel}', 'A notice'],
      situation: 'I got a notice',
      literals: ['988'],
      cantTell: 'a reply',
      start: 'notice',
      dismiss: true,
      triggers: [{ from: 'crisis', action: 'notice' }, { from: 'papers', action: 'Add a notice' }],
      holes: ['kindLabel', 'kindLower', 'arrived', 'arrivedLong', 'name', 'sevisId', 'school', 'today'],
      kinds: [
        { value: 'sevis', label: 'SEVIS record terminated' },
        { value: 'visa', label: 'Visa revoked' },
        { value: 'other', label: 'Another notice' },
      ],
      drafts: {
        dso: {
          openLabel: 'Write to your DSO',
          to: 'Your DSO at {school}',
          subject: 'A notice I received, {name}',
          paragraphs: ['Hi,', "I'm {name}, an F-1 student at {school}. I received a notice: {kindLower}. It arrived on {arrivedLong}."],
          questions: ['Could we talk about it as soon as possible?', 'What do you need from me?'],
          signoff: ['Thank you,', '{name}', 'SEVIS ID {sevisId}'],
        },
        attorney: {
          openLabel: 'Write to an immigration attorney',
          to: 'An immigration attorney',
          subject: 'Consultation request, {name}',
          paragraphs: ['Hello,', "I'm {name}, an F-1 student at {school}. I received a notice: {kindLower}. It arrived on {arrivedLong}."],
          questions: ['Could I book a consultation about it?', 'What should I bring?'],
          signoff: ['Thank you,', '{name}'],
        },
      },
      steps: {
        notice: {
          state: 'asking', tag: 'B',
          title: 'Save the notice',
          lines: [{ text: 'Help now: call or text 988, any time.' }],
          fields: [
            { key: 'kind', kind: 'choice', label: 'The notice', optionsFrom: 'kinds' },
            { key: 'arrived', kind: 'date', label: 'The day it arrived' },
          ],
          actions: [{ kind: 'link', label: 'Add the notice to Documents', href: '#/documents/add' }],
          exits: [
            { key: 'save', label: ['Save to my record: {kindLabel}, arrived {arrived}', 'Pick the notice and the day it arrived'], needs: ['kind', 'arrived'], to: 'handoff', saves: 'notice',
              receipt: 'Saved: {kindLabel}, arrived {arrived}.' },
            { key: 'close', label: 'Close without saving', to: 'dismissed', quiet: true, confirm: 'Close without saving the notice?', cancel: 'Cancel' },
          ],
          timer: { kind: 'checkin', at: { days: 1 }, then: 'notice', ask: 'Save the notice?' },
        },
        handoff: {
          state: 'waiting', who: 'person', person: 'your DSO and an attorney', tag: 'B',
          title: 'Waiting on your DSO and an attorney until {dsoReplyBy}',
          lines: [{ text: 'Saved: {kindLabel}, arrived {arrived}.' }, { text: 'This is a question for your DSO and an immigration attorney.' }],
          actions: [{ kind: 'draft', draft: 'dso' }, { kind: 'draft', draft: 'attorney' }, { kind: 'link', label: 'Find an immigration attorney', contact: 'attorney' }],
          exits: [
            { key: 'dso', label: 'Save to my record: spoke with my DSO {today}', to: 'closed', by: 'student', outcome: 'dso', saves: 'spokeDso',
              receipt: 'Notice saved, arrived {arrived}. Talk with your DSO saved {today}.' },
            { key: 'attorney', label: 'Save to my record: spoke with an attorney {today}', to: 'closed', by: 'student', outcome: 'attorney', saves: 'spokeAttorney',
              receipt: 'Notice saved, arrived {arrived}. Talk with an attorney saved {today}.' },
          ],
          timer: { kind: 'checkin', at: { setting: 'dsoReplyBusinessDays', businessDays: true }, then: 'reply', ask: 'Did your DSO or an attorney reply?' },
        },
        reply: {
          state: 'confirming', tag: 'B',
          title: 'Did your DSO or an attorney reply?',
          exits: [
            { key: 'dso', label: 'Save to my record: spoke with my DSO {today}', to: 'closed', by: 'student', outcome: 'dso', saves: 'spokeDso',
              receipt: 'Notice saved, arrived {arrived}. Talk with your DSO saved {today}.' },
            { key: 'attorney', label: 'Save to my record: spoke with an attorney {today}', to: 'closed', by: 'student', outcome: 'attorney', saves: 'spokeAttorney',
              receipt: 'Notice saved, arrived {arrived}. Talk with an attorney saved {today}.' },
            { key: 'notYet', label: 'No reply yet: ask again {dsoReplyBy}', to: 'handoff' },
          ],
          timer: { kind: 'checkin', at: { setting: 'dsoReplyBusinessDays', businessDays: true }, then: 'reply', ask: 'Did your DSO or an attorney reply?' },
        },
      },
    },

    /* The job check-in (VALUE-2 feature 5, now a loop). Opened by a stale
       fact. "Still at Northwind" closes it with a receipt; "My job ended"
       hands over to the job-ends loop. */
    checkin: {
      version: '2026.09.2',
      title: 'Still at {employer}?',
      cantTell: 'days without work',
      start: 'ask',
      dismiss: false,
      triggers: [{ from: 'stale', fact: 'job.confirmedOn', days: 'checkin.jobDays' }],
      holes: ['employer', 'hours', 'confirmedOn', 'nextCheckin', 'newHours', 'hoursFrom', 'today', 'minHours'],
      /* hoursBelow (app/loops.js BIND.checkin): the new hours are fewer than
         opt.min_hours_per_week (15 < 20). Then the save says those days count
         as days without work and opens the count (job-ends at its count
         step, reason hours). Until the binder sets it, the plain save runs
         and the rule line above the fields says the same thing. */
      steps: {
        ask: {
          state: 'confirming', tag: 'A',
          title: 'Still at {employer}, about {hours} hours a week?',
          lines: [{ text: 'Last confirmed {confirmedOn}. Your count is as of that day.', source: 'unemployment' }],
          exits: [
            { key: 'same', label: 'Still at {employer}', to: 'closed', by: 'student', outcome: 'same', saves: 'checkinYes',
              receipt: 'Confirmed {today}. Next check-in: {nextCheckin}.' },
            { key: 'ended', label: 'My job ended', to: 'closed', by: 'student', outcome: 'ended', spawn: [{ kind: 'job-ends' }],
              receipt: 'Check-in closed: job ending. Next: your last day at {employer}.' },
            { key: 'hours', label: 'My hours changed', to: 'hours', quiet: true },
          ],
          timer: { kind: 'checkin', at: { days: 7 }, then: 'ask', ask: 'Still at {employer}, about {hours} hours a week?' },
        },
        hours: {
          state: 'asking', tag: 'A',
          title: 'Your hours at {employer}',
          lines: [{ text: 'A job of at least {minHours} hours a week stops the count. Fewer: those days count as days without work.', source: 'optHours' }],
          fields: [
            { key: 'newHours', kind: 'number', label: 'Hours a week' },
            { key: 'hoursFrom', kind: 'date', label: 'From' },
          ],
          exits: [
            { key: 'save', label: ['Save to my record: {newHours} hours a week from {hoursFrom}', 'Add the hours and the day to save it'], needs: ['newHours', 'hoursFrom'], when: '!hoursBelow',
              to: 'closed', by: 'student', outcome: 'hours', saves: 'hours', spawn: [{ kind: 'report-owed', report: 'job-hours' }],
              receipt: 'Saved: {newHours} hours a week at {employer} from {hoursFrom}.' },
            { key: 'saveBelow', label: ['Save to my record: {newHours} hours a week from {hoursFrom}', 'Add the hours and the day to save it'], needs: ['newHours', 'hoursFrom'], when: 'hoursBelow',
              to: 'closed', by: 'student', outcome: 'hours', saves: 'hours', spawn: [{ kind: 'report-owed', report: 'job-hours' }, { kind: 'job-ends', start: 'count', reason: 'hours' }],
              receipt: 'Saved: {newHours} hours a week at {employer} from {hoursFrom}. Fewer than {minHours} hours a week: those days count as days without work.' },
            { key: 'back', label: 'Back', to: '@back', quiet: true },
          ],
          timer: { kind: 'checkin', at: { setting: 'newFactDays' }, then: 'ask', ask: 'Still at {employer}, about {hours} hours a week?' },
        },
      },
    },

    /* A dated report the student owes: the children of other loops (a new
       job's report, STEM OPT validation reports and evaluations). The due
       date and its rule come from App.reportsOwed(), never from here. */
    'report-owed': {
      version: '2026.09.2',
      title: '{reportTitle}',
      cantTell: 'the report',
      start: 'owed',
      child: true,
      uses: ['stepback'],
      dismiss: false,
      obligation: { fact: 'due', source: '@report', title: '{reportTitle}', metBy: ['reportOwedMade'] },
      triggers: [{ from: 'loop', event: 'closed or saved' }, { from: 'engine', fact: 'reportsOwed' }],
      holes: ['reportTitle', 'due', 'reportLead', 'name', 'sevisId', 'school', 'question'],
      /* notYetDue (app/loops.js BIND['report-owed']): the event the report
         is about has not happened yet (row.from after today: Acme starts
         2026-11-20; the first validation report is counted from
         2027-08-14). Then "report made" is not offered. Until the binder
         sets it, '!notYetDue' reads true and nothing is hidden. */
      drafts: {
        question: {
          openLabel: 'Write the question to your DSO',
          to: 'Your DSO at {school}',
          subject: 'A question about a report, {name}',
          paragraphs: ['Hi,', "I'm {name}. This is about: {reportTitle}, due {due}."],
          questions: ['{question}'],
          signoff: ['Thank you,', '{name}', 'SEVIS ID {sevisId}'],
        },
      },
      steps: {
        owed: {
          state: 'planned', tag: 'A',
          title: ['{reportTitle} on or before {due}', '{reportTitle}'],
          lines: [{ text: ['Reminders: {reportLead} and {due}.', 'The date shows once the dates it is counted from are on your record.'], source: '@report' }],
          exits: [
            { key: 'made', label: 'Save to my record: report made {today}', when: '!notYetDue', to: 'closed', by: 'student', outcome: 'made', saves: 'reportOwedMade', receipt: 'Done. {reportTitle}: marked made {today}.' },
            { key: 'dso', label: 'Ask my DSO a question', to: 'dso-ask', quiet: true },
          ],
          timer: { kind: 'deadline', at: { fact: 'due', minus: 'lead' }, then: 'confirm', ask: 'Made? The day is {due}.', fallback: { kind: 'checkin', at: { setting: 'checkinDays' } } },
        },
        confirm: {
          state: 'confirming', tag: 'A',
          title: 'Made? The day is {due}.',
          exits: [
            { key: 'made', label: 'Save to my record: report made {today}', to: 'closed', by: 'student', outcome: 'made', saves: 'reportOwedMade', receipt: 'Done. {reportTitle}: marked made {today}.' },
            { key: 'notYet', label: 'Not yet: remind me on {due}', to: 'owed', snooze: { limit: 'due' } },
          ],
          timer: { kind: 'deadline', at: { fact: 'due', plus: 1 }, then: 'passed', ask: 'Made? The day was {due}.', fallback: { kind: 'checkin', at: { setting: 'checkinDays' }, then: 'confirm' } },
        },
        passed: {
          state: 'confirming', tag: 'B', threat: true, once: true,
          title: 'The day was {due}. Today is {today}.',
          short: '{reportTitle}: the day was {due}',
          lines: [{ text: 'This is a question for your DSO.', threat: true }],
          exits: [
            { key: 'made', label: 'Save to my record: report made {today}', to: 'closed', by: 'student', outcome: 'made', saves: 'reportOwedMade', receipt: 'Done. {reportTitle}: marked made {today}.' },
            { key: 'asked', label: 'Ask my DSO a question', to: 'dso-ask' },
          ],
          timer: { kind: 'checkin', at: { days: 7 }, then: 'passed', ask: 'Made, or asked your DSO?' },
        },
      },
    },
  },
};
/* ===== END LOOPS ===== */

/* ===== WORK (BRIEF Round 8, note 4) =====
   Copy for Work (#/work, screens/work.js): the student's jobs, more than one
   at a time is normal (part time at one employer and full time at her own
   company). Every date and count on the page comes from records.jobs, the
   reports (App.reportsOwed) and the check-in setting above (checkin.jobDays);
   nothing here is a date. {holes} are filled by screens/work.js. */
window.DULY_SAMPLE.work = {
  title: 'Work',
  sub: 'Your jobs, their hours and what you reported. More than one job at a time is normal.',
  add: 'Add a job',
  kinds: { employer: 'An employer', own: 'My own company' },
  fields: { employer: 'Employer', company: 'Company name', title: 'Your title', hours: 'Hours a week', start: 'First day' },
  save: 'Add this job',
  cancel: 'Cancel',
  ownMark: 'Your company',
  hours: '{hours} hours a week',
  noHours: 'Hours not saved yet',
  since: 'Since {date}',
  between: '{from} to {to}',
  reportedLabel: 'Reported to your DSO',
  reported: 'Marked {date}',
  reportBy: 'By {date}',
  reportLater: 'Within {days} days of the first day',
  markReported: 'Mark reported',
  checkinLabel: 'Last confirmed',
  checkin: '{date} · next check-in {next}',
  changeHours: 'Change hours',
  jobEnded: 'My job ended',
  hoursFrom: 'From',
  saveHours: 'Save the new hours',
  earlier: 'Earlier jobs',
  empty: 'No job on your record yet.',
  errors: {
    employer: 'Add the employer.',
    company: 'Add the company name.',
    hours: 'Add the hours a week.',
    start: 'Add the first day.',
  },
  receipts: {
    added: 'Added {employer}. Report it to your DSO by {due}.',
    addedLater: 'Added {employer}. Report it to your DSO within {days} days of the first day.',
    addedOwn: ' Its steps are in Plan.',
    reported: 'Marked reported {today}.',
    hours: 'Saved: {hours} hours a week at {employer} from {from}. Report it by {due}.',
    hoursBelow: ' Fewer than {minHours} hours a week: those days count as days without work.',
  },
  undo: 'Undo',
};
/* ===== END WORK ===== */

/* ===== GOALS (BRIEF Round 8, note 5) =====
   Plan is built from the record and the student's goals. STEM OPT is drawn
   from the record (screens/steps.js); each goal below is a short ordered list
   of steps, added from Plan ("Add a goal") or from an Ask answer
   (App.addGoal(kind)). A step's date comes from the record, never from here:
     date 'report'     the job report for her own company, from
                       App.reportsOwed: first day + 10 days (a company started
                       2026-10-01 is due 2026-10-11, python3).
     date 'stemStart'  the first STEM OPT day: the OPT card's last day + 1,
                       2027-02-13 + 1 = 2027-02-14 (python3); a saved STEM
                       card's own first day wins.
     date 'cardEnd'    the last day of the work permission she has now: the
                       OPT card, 2027-02-13; a saved STEM card's last day wins.
   Each step opens to one plain line and, at its bottom, the one ⓘ with its
   source. Holes: {major} from records.program, {minHours} from App.RULE,
   {days} the report window (App.RULE.reportWithin). */
window.DULY_SAMPLE.goals = {
  add: 'Add a goal',
  addTitle: 'Which goal?',
  cancel: 'Cancel',
  remove: 'Remove',
  added: 'Added to your plan: {title}.',
  removed: 'Removed from your plan: {title}.',
  undo: 'Undo',
  order: ['company', 'o1'],
  kinds: {
    company: {
      title: 'Start my own company',
      sub: 'Self-employment on OPT, and what changes at STEM OPT',
      steps: [
        { key: 'license', title: 'Register the business and get its licenses',
          line: 'Keep the registration and licenses with your documents: they show the business is real and running.', source: 'selfEmployed' },
        { key: 'related', title: 'Keep the work related to your {major} degree',
          line: 'The business is in the field you studied.', source: 'selfEmployed' },
        { key: 'hours', title: 'Work at least {minHours} hours a week in it',
          line: 'Fewer hours a week: those days count as days without work.', source: 'optHours' },
        { key: 'report', title: 'Report it to your DSO as self-employed', date: 'report',
          line: 'Report it as a self-employed business owner, with the day you went into business, within {days} days.', source: 'reportChanges' },
        { key: 'stem', title: 'At STEM OPT, work for an employer who signs your I-983', date: 'stemStart',
          line: 'STEM OPT needs a real employer and employee relationship: an employer in E-Verify, with a tax ID, and a supervisor who is not you. You cannot sign the employer part for your own company.', source: 'stemOwnCompany' },
        { key: 'dso', title: 'Ask your DSO whether your setup fits',
          line: 'Whether your company and your role fit these rules is a question for your DSO.' },
      ],
    },
    o1: {
      title: 'O-1 later',
      sub: 'No lottery: an employer or an agent files for you, with evidence of your work',
      steps: [
        { key: 'evidence', title: 'Build evidence in at least three of eight kinds',
          line: 'Prizes or awards, memberships that judge achievement, articles about your work, judging the work of others, original contributions, articles you wrote, a leading role at a known organization, and high pay.', source: 'o1Evidence' },
        { key: 'petitioner', title: 'Find a petitioner: a US employer or a US agent',
          line: 'You cannot file the petition for yourself. An agent can file for work with more than one employer.', source: 'o1Petitioner' },
        { key: 'advisory', title: 'Get a written opinion from a peer group in your field',
          line: 'The petition includes a written advisory opinion from a group in your field.', source: 'o1Advisory' },
        { key: 'timing', title: 'Plan the filing before your work permission ends', date: 'cardEnd',
          line: 'There is no lottery and no yearly cap, so the filing follows your own timing. When to file is a question for your petitioner.', source: 'o1Cap' },
      ],
    },
  },
};

/* Sources the goals cite (each quote read from the saved source in
   rulepacks/f1-us/v2026.09/sources, or a public page where the law gives
   no quote). */
Object.assign(window.DULY_SAMPLE.sources, {
  selfEmployed: {
    name: 'Self-employment on OPT',
    plain: 'On post-completion OPT you may start a business and be self-employed, with the licenses it needs, in a business related to your degree.',
    quote: 'Self-employed business owner. A student on OPT may start a business and be self-employed. The student must be able to prove that he or she has the proper business licenses and is actively engaged in a business related to the student’s degree program.',
    counted: [],
    link: { label: 'SEVP Policy Guidance 1004-03 on ice.gov', href: 'https://www.ice.gov/doclib/sevis/pdf/opt_policy_guidance_042010.pdf' },
    checked: 'Checked Sep 30',
  },
  stemOwnCompany: {
    name: 'STEM OPT and your own company',
    plain: 'STEM OPT needs a real employer and employee relationship. A start-up can be the employer when every requirement is met, but you cannot sign the employer part for yourself.',
    quote: 'In response to comments received, DHS clarifies that students may be employed by start-up businesses, but all regulatory requirements must be met and the student may not provide employer attestations on his or her own behalf.',
    counted: [],
    link: { label: '81 FR 13040 (2016) on federalregister.gov', href: 'https://www.federalregister.gov/d/2016-04828' },
    checked: 'Checked Sep 30',
  },
  o1Evidence: {
    name: 'O-1 evidence',
    plain: 'For science, education, business or athletics: a major award, or documents of at least three of eight kinds.',
    quote: 'An alien of extraordinary ability in the fields of science, education, business, or athletics must demonstrate sustained national or international acclaim and recognition for achievements in the field of expertise by providing evidence of: (A) Receipt of a major, internationally recognized award, such as the Nobel Prize; or (B) At least three of the following forms of documentation',
    counted: [],
    link: { label: '8 CFR 214.2(o)(3)(iii) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
    checked: 'Checked Sep 30',
  },
  o1Petitioner: {
    name: 'Who files an O-1',
    plain: 'A US employer or a US agent files the petition. You cannot file it for yourself.',
    quote: 'An O alien may not petition for himself or herself.',
    counted: [],
    link: { label: '8 CFR 214.2(o)(2)(i) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
    checked: 'Checked Sep 30',
  },
  o1Advisory: {
    name: 'The advisory opinion',
    plain: 'An O-1 petition comes with a written advisory opinion from a group in your field.',
    quote: '(D) A written advisory opinion(s) from the appropriate consulting entity or entities.',
    counted: [],
    link: { label: '8 CFR 214.2(o)(2)(ii) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
    checked: 'Checked Sep 30',
  },
  o1Cap: {
    name: 'O-1 on uscis.gov',
    plain: 'The O-1 has no yearly cap and no lottery. Your current work permission runs to the end date on your card.',
    quote: null,
    counted: [],
    link: { label: 'O-1 visa on uscis.gov', href: 'https://www.uscis.gov/working-in-the-united-states/temporary-workers/o-1-visa-individuals-with-extraordinary-ability-or-achievement' },
    checked: 'Checked Sep 30',
  },
});
/* ===== END GOALS ===== */
