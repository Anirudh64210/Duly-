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
      { eyebrow: 'Unemployment days', value: '13', unit: 'used · 77 left', bar: 14, source: 'unemployment' },
      { eyebrow: 'EAD valid until', value: 'Feb 13, 2027', date: true, unit: '136 days left', source: 'eadEnds' },
      { eyebrow: 'Next date', value: 'Nov 15', date: true, unit: 'STEM OPT window opens · in 46 days', source: 'stemOpens' },
    ],
    /* Third metric when the student said no to STEM OPT: the next real date. */
    metricNoStem: { eyebrow: 'Next date', value: 'Feb 13, 2027', date: true, unit: 'Your card ends · in 136 days', source: 'eadEnds' },
    /* Third metric with no EAD card on file. */
    metricNoEad: { eyebrow: 'Next date', add: { action: 'Add your EAD card', rest: 'to see this date.', href: '#/documents/add' } },
    /* Your next move: one line, a date and one action (Round 3, note 1).
       'stemIntent' opens Next steps, where the question is asked.
       'changes' is the standing rule to report a change within 10 days; it
       has no date and shows only when there is no dated move. */
    nextMoves: [
      {
        key: 'stemIntent',
        title: 'Decide on STEM OPT',
        date: 'Oct 15',
        meta: 'Start preparing by Oct 15',
        primary: { label: 'Decide', href: '#/steps' },
        source: 'startPreparing',
      },
      {
        key: 'changes',
        title: 'Changed your address or job?',
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
    askInfo: 'Computer Science is on the STEM list, and your card ends Feb 13, 2027.',
    unsureLine: 'Here are the dates. Decide any time.',
    yesTitle: 'Start preparing by Oct 15.',
    yesLine: 'File between Nov 15, 2026 and Feb 13, 2027.',
    noTitle: 'Your card ends Feb 13, 2027.',
    noLine: null,
    noInfo: "You'll see what comes after OPT closer to that date.",
    today: { label: 'Today', pct: 0 },
    dates: [
      { date: 'Oct 15, 2026', label: 'Start preparing', source: 'startPreparing' },
      { date: 'Nov 15, 2026', label: 'Window opens', source: 'stemOpens' },
      { date: 'Feb 13, 2027', label: 'Last day to file', source: 'stemCloses', end: true },
    ],
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
      { key: 'everify', title: 'Check that Northwind Systems uses E-Verify', meta: null, info: "Ask HR for the company's E-Verify number.", source: 'stemEmployer' },
      { key: 'i983', title: 'Fill out your training plan with your manager', meta: 'Form I-983', info: 'You and your manager both sign it.', source: 'stemPlan' },
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
        document: { label: 'I-797 approval notice', href: '#/documents/work' },
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
      link: { label: '3 documents: passport, visa, I-94', href: '#/documents/identity' },
    },
    {
      key: 'masters', state: 'done', title: "Master's in Computer Science", meta: 'Aug 21, 2023 to Dec 18, 2025 · degree awarded',
      text: "You did this: finished your Master's at State University. Degree awarded Dec 18, 2025.",
      link: { label: '2 documents: degree certificate, transcripts', href: '#/documents/school' },
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
      link: { label: 'EAD card and approval notice', href: '#/documents/status' },
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
        { key: 'changes', title: 'Report a change of address or job within 10 days', meta: 'Ongoing', ongoing: true, source: 'reportChanges' },
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
          'The rule stays on paper, postponed, until the court in Boston says otherwise or decides the case.',
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
    meta: 'Every version kept, encrypted on this Mac.',
    tabs: [
      { key: 'all', label: 'All' },
      { key: 'i20', label: 'I-20s', count: 4 },
      { key: 'work', label: 'Work', count: 3 },
      { key: 'identity', label: 'Identity', count: 3 },
      { key: 'school', label: 'School', count: 2 },
    ],
    i20Groups: [
      { key: 'opt', title: 'OPT', items: [
        { title: 'OPT recommendation', meta: 'Oct 2025', current: true,
          /* Earlier versions of the same I-20, kept for the record. */
          versions: ['Travel signature, Dec 2024', 'Travel signature, Dec 2023', 'Program start, Aug 2023'] },
      ] },
      { key: 'cpt', title: 'CPT', items: [
        { title: 'Lumen Labs', meta: 'Jan 13 to May 2, 2025' },
        { title: 'Acme Robotics', meta: 'Jun 1 to Aug 15, 2024' },
      ], add: 'Add another CPT I-20' },
      { key: 'start', title: 'Starting school', items: [
        { title: 'Initial I-20', meta: '2023' },
      ] },
    ],
    work: [
      { title: 'EAD card', meta: 'Feb 14, 2026 to Feb 13, 2027' },
      { title: 'I-797 approval notice', meta: 'Dec 20, 2025' },
      { title: 'Offer letter, Northwind Systems', meta: 'Feb 2026' },
    ],
    identity: [
      { title: 'Passport', meta: 'Valid until Jul 9, 2031' },
      { title: 'F-1 visa', meta: 'Aug 2023' },
      { title: 'I-94', meta: 'Aug 2023' },
    ],
    school: [
      { title: 'Degree certificate', meta: 'Dec 18, 2025' },
      { title: 'Transcripts', meta: 'State University' },
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
        { key: 'stem', label: 'STEM field', value: 'Yes, on the STEM list', source: 'stemList' },
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
    storage: { title: 'Stored on this Mac', meta: 'Your records and documents are encrypted here. 12 documents.' },
    backup: { title: 'Back up to a file', meta: 'An encrypted copy you keep. Last backup: Sep 12, 2026.' },
    restoreFrom: "From Priya's MacBook, Sep 12, 2026",
    lockAfter: '5 minutes',
    lockOptions: ['1 minute', '5 minutes', '15 minutes', '1 hour'],
    remind: 'Two weeks before, and again two days before.',
    timeZone: 'New York, set from this Mac',
    theme: 'system',
    deleteMeta: 'Removes your records and documents from this Mac. Backups you saved stay where you put them.',
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
      link: { label: 'Your EAD card, in Documents', href: '#/documents/work' },
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
      plain: 'Your employer takes part in E-Verify.',
      quote: null,
      counted: [],
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
      plain: 'Computer Science is on the list of STEM fields.',
      quote: null,
      counted: ['Your I-20 lists Computer Science.'],
      link: { label: 'STEM Designated Degree Program List', href: 'https://www.ice.gov/' },
      checked: 'Checked Sep 30',
    },
  },
};

/* One list of STEM OPT steps. */
window.DULY_SAMPLE.checklists.stem.steps = window.DULY_SAMPLE.stem.tasks;
