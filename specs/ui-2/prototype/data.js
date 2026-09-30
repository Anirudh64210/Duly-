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
  checked: { today: 'Checked today, 6:00 AM', rules: 'Rules checked today, 6:00 AM', offline: 'Rules last checked Sep 29. Duly checks again when you are online.' },
  version: 'Duly 0.2 prototype',

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
      'Next · Start preparing for STEM OPT by Oct 15',
    ],
  },

  /* Home */
  home: {
    eyebrow: 'On OPT',
    headline: "You're working on OPT at Northwind Systems.",
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
    /* Your next move holds moves only: things the student does. Rule changes
       and news live under whatsNew. The 'sevp' entry is a standing duty with
       no date: there is no fixed six-month check on post-completion OPT, only
       the rule to report a change within 10 days. */
    nextMoves: [
      {
        key: 'sevp',
        title: 'Changed your address or job?',
        meta: 'Report it within 10 days',
        text: 'If your address or employer changes, update it in the SEVP portal within 10 days. It takes about five minutes.',
        primary: { label: 'Open the SEVP portal', href: 'https://sevp.ice.gov/opt/' },
        quiet: { label: 'Nothing has changed' },
        source: 'reportChanges',
      },
      {
        key: 'stemIntent',
        title: 'Planning to apply for STEM OPT?',
        meta: 'Start preparing by Oct 15',
        text: 'Your card ends Feb 13, 2027. Tell Duly and it lays out your dates and steps.',
        choices: ['Yes, I plan to', 'No, not this time'],
        notSure: "I'm not sure yet",
        source: 'stemOpens',
      },
      /* Retired as a move: shown under whatsNew. Kept only until home.js stops asking for it. */
      {
        key: 'feeUpdate',
        title: 'The fee for Form I-765 is changing',
        meta: 'Rule change · USCIS',
        text: 'This is the form you file for STEM OPT. Duly added a note about it to your I-765 step.',
        link: { label: 'See the update', href: '#/updates' },
      },
    ],
    /* What's new for your status: the rule change first, then the news. */
    whatsNew: [
      { key: 'fee', kind: 'rule', title: 'The fee for Form I-765 is changing', meta: 'Rule change · USCIS', href: '#/updates' },
      { key: 'court', kind: 'news', title: 'A court paused a change to an F-1 rule', meta: 'In the news · U.S. District Court, Massachusetts · Sep 14, 2026', href: '#/updates/court' },
    ],
    news: { title: 'A court paused a change to an F-1 rule', meta: 'In the news · U.S. District Court, Massachusetts · Sep 14, 2026', href: '#/updates/court' },
  },

  /* What's next: STEM OPT */
  stem: {
    intent: null, /* null, 'yes', 'no' or 'unsure' */
    eyebrow: 'STEM OPT extension',
    askTitle: 'Planning to apply for STEM OPT?',
    askLine: 'Computer Science is on the STEM list and your card ends Feb 13, 2027. Say yes and Duly lays out the dates and steps.',
    unsureLine: "That's fine. Here are the dates anyway, and you can decide later.",
    yesTitle: 'Start preparing by Oct 15.',
    yesLine: 'Your window to file opens Nov 15, 2026 and closes Feb 13, 2027.',
    noTitle: 'Your card ends Feb 13, 2027.',
    noLine: 'Duly will show what comes after OPT closer to that date.',
    today: { label: 'Today', pct: 0 },
    dates: [
      { date: 'Oct 15, 2026', label: 'Start preparing', source: 'startPreparing' },
      { date: 'Nov 15, 2026', label: 'Window opens', source: 'stemOpens' },
      { date: 'Feb 13, 2027', label: 'Last day to file · your card ends', source: 'stemCloses', end: true },
    ],
    /* Retired from the dates section: the student cannot know this date until
       the 'i20' step is done. Shown then, inside that step (steps[3].onDone). */
    within60: 'You also file within 60 days of the day your school recommends you.',
    recUnknown: { action: 'Add the date your school recommends you', rest: 'to see your exact last day.', href: '#/case', source: 'within60' },
    /* The one list of STEM OPT steps. What's next and Checklists both render
       it (checklists.stem.steps is this same array). The receipt number is
       not a step: the 'Your application' field covers it. */
    tasks: [
      { key: 'everify', title: 'Check that Northwind Systems uses E-Verify', meta: "Ask HR for the company's E-Verify number.", source: 'stemEmployer' },
      { key: 'i983', title: 'Fill out your training plan with your manager', meta: 'Form I-983. Your manager signs it.', source: 'stemPlan' },
      { key: 'request', title: "Send State University's STEM OPT request", meta: 'Include your signed I-983.', caution: "Each school runs this step its own way. Your school's page is the one to follow.", action: 'Write the email to your DSO' },
      { key: 'i20', title: 'Get your new I-20 from your school', meta: "It carries your school's STEM OPT recommendation.", source: 'within60',
        onDone: { action: 'Add the date your school recommends you', rest: 'to see your exact last day to file.', href: '#/case', source: 'within60' } },
      { key: 'i765', title: 'File Form I-765 with USCIS', meta: "Between Nov 15, 2026 and Feb 13, 2027, within 60 days of your school's recommendation. The fee is changing; the USCIS notice has the new amount.", source: 'stemOpens', feeSource: 'feeChange' },
    ],
    school: {
      title: "Send your school's STEM OPT request",
      meta: 'Include your signed I-983.',
      caution: "Each school runs this step its own way. Your school's page is the one to follow.",
      unknown: { action: "Add your school's form link", rest: 'to keep it here.', href: '#/case' },
    },
  },

  email: {
    to: 'Your DSO at State University',
    subject: 'STEM OPT extension, Priya Raman',
    paragraphs: [
      'Hi,',
      "I'm Priya Raman. I finished my Master's in Computer Science at State University in December 2025 and I'm on OPT now, working as a Software Engineer at Northwind Systems. My EAD card is valid until February 13, 2027.",
      "I'd like to apply for the STEM OPT extension. Could you help me with a few things?",
    ],
    questions: [
      'How do I send you my STEM OPT request, and what should I include with it?',
      'When is a good time to send my Form I-983, so your recommendation lines up with my filing window?',
      'Is there anything in my record I should update first?',
    ],
    signoff: ['Thank you,', 'Priya Raman', 'SEVIS ID N0012345678'],
    foot: 'Written from your records. Change anything before you send it.',
  },

  application: {
    steps: ['Filed', 'Received', 'Biometrics', 'Decision', 'Card mailed'],
    current: null, /* index of the current step once a receipt is added */
    receiptPlaceholder: 'Three letters and ten digits, from your USCIS notice',
    past: {
      title: 'OPT work permit',
      receipt: 'IOE0912345678',
      meta: 'Filed Oct 10, 2025 · Approved Dec 20, 2025 · Card valid from Feb 14, 2026',
    },
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
        { kind: 'value', label: 'Application', value: 'IOE0912345678 · approved Dec 20, 2025' },
      ],
      link: { label: '3 documents: EAD card, approval notice, offer letter', href: '#/documents/work' },
    },
    {
      key: 'stem', state: 'next', title: 'STEM OPT extension', meta: 'Window opens Nov 15, 2026',
      /* Retired: intent is asked only on What's next and Home. Use 'undecided' instead. */
      ask: { title: 'Planning to apply?', choices: ['Yes', 'No'], notSure: "I'm not sure yet" },
      undecided: { text: 'STEM OPT: not decided yet.', link: { label: "Decide in What's next", href: '#/next' } },
      after: { text: 'Start preparing by Oct 15.', link: { label: 'See the plan', href: '#/next' } },
    },
    {
      key: 'after', state: 'next', title: 'After OPT', meta: 'H-1B and other paths',
      text: 'H-1B starts with your employer. Duly adds the dates when USCIS announces the next registration.',
    },
  ],

  /* Checklists */
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
      steps: null, /* set below to stem.tasks: one list of steps for both screens */
      doneLine: 'Every step done. Add your receipt number to track it.',
    },
    opt: {
      applied: 'Filed Oct 10, 2025, approved Dec 20, 2025, card valid from Feb 14, 2026.',
      steps: [
        { key: 'reported', title: 'Job reported to your school', meta: 'Northwind Systems, Feb 27, 2026', done: true, doneMeta: 'Done Feb 27, 2026' },
        /* A standing rule, never done: render with C.ongoing (no checkbox). */
        { key: 'changes', title: 'Report a change of address or job within 10 days', meta: 'Ongoing', ongoing: true, source: 'reportChanges' },
      ],
    },
    h1b: { eyebrow: 'Later', title: 'H-1B starts with your employer.', line: 'Duly adds the dates when USCIS announces the next registration.' },
  },

  /* Updates */
  updates: {
    status: {
      meta: 'Rule change · USCIS',
      title: 'The fee for Form I-765 is changing.',
      body: 'Form I-765 is the form you file for STEM OPT. The new fee and the date it starts are in the USCIS notice. Duly added a note about it to your I-765 step.',
      /* Label while STEM OPT intent is unanswered, and once it is yes. */
      link: { label: 'See what STEM OPT needs', href: '#/next' },
      linkPlanned: { label: 'See your STEM OPT steps', href: '#/next' },
      notice: { label: 'Read the USCIS notice', href: 'https://www.uscis.gov/i-765' },
      source: 'feeChange',
    },
    news: [
      {
        key: 'court',
        title: 'A court paused a change to an F-1 rule',
        meta: 'News · U.S. District Court, Massachusetts · Sep 14, 2026',
        text: 'The rule would have given F-1 students a fixed end date instead of a stay tied to their studies. It is paused while the case goes on. Duly counts your dates under the rules in effect today and will tell you if that changes.',
        link: { label: 'Read the court order', href: '[court order link]' },
      },
    ],
    emptyStatus: 'Nothing new for your status this week.',
    emptyNews: 'No news this week.',
    footer: 'Records and dates from your documents, not legal advice. Checked today, 6:00 AM.',
  },

  /* Documents */
  documents: {
    count: 12,
    headline: '12 documents, one record.',
    meta: 'Names and dates match across them. Checked today. Kept on this Mac.',
    tabs: [
      { key: 'all', label: 'All' },
      { key: 'i20', label: 'I-20s', count: 4 },
      { key: 'work', label: 'Work', count: 3 },
      { key: 'identity', label: 'Identity', count: 3 },
      { key: 'school', label: 'School', count: 2 },
    ],
    i20Groups: [
      { key: 'opt', title: 'OPT', items: [
        { title: 'OPT recommendation', meta: 'Current · 3 earlier versions kept', current: true, versions: 3 },
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
        /* Retired: there is no dated check to confirm. Kept only until case.js stops reading it. */
        waiting: [{ key: 'sevp', title: 'Changed your address or job? Report it within 10 days', choices: ['Nothing has changed', 'Open the SEVP portal'], notSure: "I'm not sure" }],
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
        /* Retired: intent is asked only on What's next and Home. Use 'undecided' instead. */
        waiting: [{ key: 'stemIntent', title: 'Planning to apply for STEM OPT?', choices: ['Yes', 'No'], notSure: "I'm not sure yet" }],
        undecided: { text: 'STEM OPT: not decided yet.', link: { label: "Decide in What's next", href: '#/next' } },
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

  /* Where the waiting dot shows in the nav */
  waitingIn: ['home', 'case'],

  /* Source marks. Quotes are verbatim from the saved rule text. */
  sources: {
    unemployment: {
      name: 'Unemployment days on OPT',
      plain: 'During post-completion OPT you can have up to 90 days without work in all.',
      quote: 'Students may not accrue an aggregate of more than 90 days of unemployment during any post-completion OPT period described in 8 CFR 274a.12(c)(3)(i)(B).',
      counted: ['Your card started Feb 14, 2026. Your job started Feb 27, 2026. Feb 14 to Feb 26 are 13 days without work.'],
      link: { label: '8 CFR 214.2(f)(10)(ii)(E) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 28',
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
      checked: 'Checked Sep 28',
    },
    stemCloses: {
      name: 'Last day to file',
      plain: 'You apply while you are still in your OPT period. Duly reads this as the day your card ends.',
      quote: 'a qualified student may apply for an extension of OPT while in a valid period of post-completion OPT authorized under 8 CFR 274a.12(c)(3)(i)(B)',
      counted: ['Your card ends Feb 13, 2027.'],
      link: { label: '8 CFR 214.2(f)(10)(ii)(C) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 28',
    },
    within60: {
      name: 'Filing after your school recommends you',
      plain: 'You file within 60 days of the day your school enters its recommendation.',
      quote: 'The student seeking such 24-month OPT extension must properly file his or her Form I-765 or successor form with USCIS within 60 days of the date the DSO enters the recommendation for the OPT extension into his or her SEVIS record.',
      counted: ['Duly counts 60 days once you add the date your school recommends you.'],
      link: { label: '8 CFR 214.2(f)(11)(i)(C) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 28',
    },
    startPreparing: {
      name: 'When to start preparing',
      plain: 'A suggested date, one month before your window opens, so the training plan and school request are ready.',
      quote: null,
      counted: ['Nov 15, 2026, minus one month, is Oct 15, 2026. This is a planning date, not a rule.'],
      link: { label: 'STEM OPT filing window on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 28',
    },
    reportChanges: {
      name: 'Reporting changes on OPT',
      plain: 'While on OPT you report changes to your name, address and job within 10 days.',
      quote: "While on OPT, the student must report to the DSO within 10 days any changes in the student's name or address, and employment information.",
      counted: ['There is no fixed date. The 10 days start when your address or job changes.'],
      link: { label: 'Study in the States, F-1 OPT', href: 'https://studyinthestates.dhs.gov/sevis-help-hub/student-records/fm-student-employment/f-1-optional-practical-training-opt' },
      checked: 'Checked Sep 28',
    },
    stemEmployer: {
      name: 'STEM OPT employers',
      plain: 'Your employer takes part in E-Verify.',
      quote: null,
      counted: [],
      link: { label: '8 CFR 214.2(f)(10)(ii)(C) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 28',
    },
    stemPlan: {
      name: 'Training plan, Form I-983',
      plain: 'You and your employer fill out a training plan together.',
      quote: null,
      counted: [],
      link: { label: '8 CFR 214.2(f)(10)(ii)(C) on ecfr.gov', href: 'https://www.ecfr.gov/current/title-8/section-214.2' },
      checked: 'Checked Sep 28',
    },
    stemList: {
      name: 'STEM degree list',
      plain: 'Computer Science is on the list of STEM fields.',
      quote: null,
      counted: ['Your I-20 lists Computer Science.'],
      link: { label: 'STEM Designated Degree Program List', href: 'https://www.ice.gov/' },
      checked: 'Checked Sep 28',
    },
    feeChange: {
      name: 'Form I-765 fee',
      plain: 'The fee for Form I-765 is changing. The new amount and the date it starts are in the USCIS notice.',
      quote: null,
      counted: [],
      link: { label: 'USCIS, Form I-765 instructions', href: 'https://www.uscis.gov/i-765' },
      checked: 'Checked Sep 30',
    },
  },
};

/* One list of STEM OPT steps for What's next and Checklists. */
window.DULY_SAMPLE.checklists.stem.steps = window.DULY_SAMPLE.stem.tasks;
