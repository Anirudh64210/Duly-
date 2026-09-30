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
    /* Your next move holds moves only: things the student does, with a date.
       Rule changes and news live under whatsNew.
       'stemIntent' is not asked here: the question is owned by What's next,
       and this row links to it.
       'changes' is the standing rule to report a change within 10 days. It
       has no date and is owned by Checklists > OPT; Home shows it only when
       there is no dated move, as a link to its owner. There is no fixed
       six-month check on post-completion OPT. */
    nextMoves: [
      {
        key: 'stemIntent',
        title: 'Decide on STEM OPT',
        meta: 'Start preparing by Oct 15',
        text: 'Your STEM OPT window opens Nov 15, 2026. If you plan to apply, start preparing by Oct 15.',
        primary: { label: "Decide in What's next", href: '#/next' },
        source: 'startPreparing',
      },
      {
        key: 'changes',
        title: 'Changed your address or job?',
        meta: 'Report it within 10 days',
        href: '#/checklists/opt',
      },
    ],
    /* What's new for your status: the rule change first, then the news. */
    /* Each row opens its own page and shows the "affects you?" answer
       inline (affects). The full items live in updates.items. */
    whatsNew: [
      { key: 'fee', kind: 'rule', title: 'The fee for Form I-765 is changing', meta: 'Rule change · USCIS · Sep 30, 2026', affects: 'Not yet', href: '#/updates/fee' },
      { key: 'court', kind: 'news', title: 'A court paused a change to an F-1 rule', meta: 'In the news · U.S. District Court, Massachusetts · Sep 14, 2026', affects: 'No change for you', href: '#/updates/court' },
    ],
  },

  /* What's next: STEM OPT */
  stem: {
    intent: null, /* null, 'yes', 'no' or 'unsure' */
    eyebrow: 'STEM OPT extension',
    askTitle: 'Planning to apply for STEM OPT?',
    askLine: 'Computer Science is on the STEM list and your card ends Feb 13, 2027. Say yes to see your dates and steps.',
    unsureLine: "That's fine. Here are the dates anyway, and you can decide later.",
    yesTitle: 'Start preparing by Oct 15.',
    yesLine: 'Your window to file opens Nov 15, 2026 and closes Feb 13, 2027.',
    noTitle: 'Your card ends Feb 13, 2027.',
    noLine: "You'll see what comes after OPT closer to that date.",
    today: { label: 'Today', pct: 0 },
    dates: [
      { date: 'Oct 15, 2026', label: 'Start preparing', source: 'startPreparing' },
      { date: 'Nov 15, 2026', label: 'Window opens', source: 'stemOpens' },
      { date: 'Feb 13, 2027', label: 'Latest day to file · your card ends', source: 'stemCloses', end: true },
    ],
    /* The federal STEM OPT steps. They are not a saved draft: in the product
       they are computed from the sourced rule pack for this student, and
       recomputed whenever an approved rule change lands (see rules and
       updates.items). What's next and Checklists both render them
       (checklists.stem.steps is this same array), merged with the student's
       own school steps by App.steps('stem'). The receipt number is not a
       step: Applications covers it.
       onDone shows inside a step once it is checked: the recommendation date
       cannot be known before the new I-20 arrives.
       updated: set when an approved rule change touched this step; the step
       shows "Updated Sep 30" and links to the update. */
    tasks: [
      { key: 'everify', title: 'Check that Northwind Systems uses E-Verify', meta: "Ask HR for the company's E-Verify number.", source: 'stemEmployer' },
      { key: 'i983', title: 'Fill out your training plan with your manager', meta: 'Form I-983. Your manager signs it.', source: 'stemPlan' },
      { key: 'i20', title: 'Get your new I-20 from your school', meta: "It carries your school's STEM OPT recommendation.", source: 'within60',
        onDone: { action: 'Add the date your school recommends you', rest: 'to see your exact last day to file.', href: '#/case/recommended', source: 'within60' } },
      { key: 'i765', title: 'File Form I-765 with USCIS', meta: "Between Nov 15, 2026 and Feb 13, 2027, within 60 days of your school's recommendation.", source: 'stemOpens',
        caution: 'The fee is changing. The USCIS notice has the new amount.', cautionSource: 'feeChange',
        updated: { date: 'Sep 30', href: '#/updates/fee', what: 'Fee note added' } },
    ],
  },

  /* The rule pack behind every federal step and date. Shown as one quiet
     line on Checklists ("Rules checked Sep 30"); never a version number. */
  rules: {
    checked: 'Rules checked Sep 30',
    checkedLong: 'Rules checked today, 6:00 AM',
    line: 'Your steps and dates are worked out from the current rules, and they update when a rule changes.',
    /* The visible half of C.rulesLine: "Updated for you when a rule changes · Rules checked Sep 30".
       The same words on Home, What's next, Checklists and Timeline, so every
       screen that shows federal steps says they are live, not a saved draft. */
    short: 'Updated for you when a rule changes',
    href: '#/updates',
  },

  /* Your school's steps (Note 10). Generic, added by the student, never a
     per-school integration. Each is placed against a federal step:
       before     a prerequisite: the federal step shows "Waiting on: <title>"
                  until this is done, while its dates keep counting
       alongside  shown next to the federal step
       after      shown only once the federal step is done
     kind is one of schoolStepKinds. done may be overridden at runtime by
     App.state['task:school:<id>']. saved: kept for reuse on the next path.
     draft: 'dso' means the step's action opens the DSO email draft. */
  schoolStepKinds: [
    { key: 'portal', label: 'Request form in the school portal' },
    { key: 'upload', label: 'Upload the I-983 to the school' },
    { key: 'workshop', label: 'OPT or STEM workshop' },
    { key: 'fee', label: 'School fee' },
    { key: 'meeting', label: 'DSO meeting' },
    { key: 'other', label: 'Something else' },
  ],
  schoolSteps: [
    {
      id: 'su-stem-request',
      path: 'stem',
      title: "Send State University's STEM OPT request",
      kind: 'portal',
      meta: 'In the school portal. Include your signed I-983.',
      link: null, /* the student has not added the portal link yet */
      addLink: { action: "Add your school's form link", rest: 'to keep it here.' },
      document: 'Signed I-983',
      placement: 'before',
      federal: 'i20',
      done: false,
      addedBy: 'you',
      added: 'Sep 30',
      saved: true,
      draft: 'dso',
    },
  ],

  /* Things the student has already completed. Confetti fires only the first
     time a key is completed, and never for a key listed here. App.complete()
     adds to this list at runtime. */
  completions: ['timeline:arrival', 'timeline:masters', 'timeline:cpt', 'checklists:cpt', 'checklists:opt', 'application:opt'],

  /* Applications (Note 9). Status is updated by the student for now, always
     with the date it was true ("as of"). USCIS case status is parked
     (BACKLOG B8). */
  applications: {
    steps: ['Filed', 'Received', 'Biometrics', 'Decision', 'Card mailed'],
    receiptPlaceholder: 'Three letters and ten digits, from your USCIS notice',
    items: [
      {
        id: 'opt',
        title: 'OPT work permit',
        form: 'Form I-765',
        category: 'Post-completion OPT',
        receipt: 'IOE0912345678',
        status: 'Approved',
        current: 3,
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
          { label: 'Latest day to file · your card ends', date: 'Feb 13, 2027', source: 'stemCloses' },
        ],
        next: { title: "Send State University's STEM OPT request", meta: 'Your school step, before your new I-20', href: '#/checklists/stem' },
        schoolSteps: ['su-stem-request'],
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
    foot: 'Written from your records. Change anything before you send it.',
  },

  /* Kept for the current What's next tracker; Applications uses
     applications.items. */
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
      link: { label: 'EAD card and approval notice', href: '#/documents/status' },
    },
    {
      key: 'stem', state: 'next', title: 'STEM OPT extension', meta: 'Window opens Nov 15, 2026',
      /* Intent is asked only on What's next. Here it is one quiet line with a link. */
      undecided: { text: 'STEM OPT: not decided yet.', link: { label: "Decide in What's next", href: '#/next' } },
      after: { text: 'Start preparing by Oct 15.', link: { label: 'See the plan', href: '#/next' } },
      declined: { text: 'Not this time.', link: { label: "Change in What's next", href: '#/next' } },
    },
    {
      key: 'after', state: 'next', title: 'After OPT', meta: 'H-1B and other paths',
      text: 'H-1B starts with your employer. The dates appear here when USCIS announces the next registration.',
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
    h1b: { eyebrow: 'Later', title: 'H-1B starts with your employer.', line: 'The dates appear here when USCIS announces the next registration.' },
  },

  /* Updates */
  updates: {
    status: {
      meta: 'Rule change · USCIS',
      title: 'The fee for Form I-765 is changing.',
      body: 'Form I-765 is the form you file for STEM OPT. The new fee and the date it starts are in the USCIS notice. Your I-765 step now carries a note about it.',
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
        text: 'The rule would have given F-1 students a fixed end date instead of a stay tied to their studies. It is paused while the case goes on. Your dates are counted under the rules in effect today, and you will get an update if that changes.',
        link: { label: 'Read the court order', href: '[court order link]' },
      },
    ],
    /* Every update and news item, each with its own page at #/updates/<id>
       (App.findUpdate(id)). In plain words, for this student:
         what      what is happening (paragraphs)
         affects   { short, line }: short for rows ("Not yet"), line for the page
         todo      anything to do
         source    tucked away: { name, label, href, rule? (key into sources) }
         changed   what changed in your checklist: [{ path, step, title, change, date }]
                   The step shows "Updated <date>" in its checklist.
         checked   how it reached you, one quiet line
       The product pipeline (updates-1): watch the primary sources and the
       news, draft the change from the source with its quote, run the checks,
       get human approval in Ops (D22), bump the rule pack and recompute
       every case. Each affected student gets this page, unasked. */
    items: [
      {
        id: 'fee',
        kind: 'rule',
        label: 'For your status',
        title: 'The fee for Form I-765 is changing',
        meta: 'Rule change · USCIS · Sep 30, 2026',
        date: 'Sep 30, 2026',
        /* notice: the new amount and the day it starts, with the quote, read
           from the saved USCIS notice in the rule pack. Not filled in: the
           notice is not saved in rulepacks/f1-us yet, and a value is never
           typed in from memory. Once it is, what[1] and affects.line compare
           the start date to her window, for example "Yes, when you file. The
           new fee starts <date>, before your window opens Nov 15." */
        notice: { amount: null, starts: null, quote: null },
        what: [
          'USCIS is changing the fee for Form I-765, the form you file for STEM OPT.',
          'Your Form I-765 step was updated on Sep 30, without you asking. It keeps the fee that applies on the day you file.',
        ],
        /* byIntent: the answer once she has said Yes or No to STEM OPT
           (C.affectsFor). The row, the Home row and this page all read it
           from here, so they never disagree. A No is a plain No. */
        affects: {
          short: 'Not yet',
          line: 'Not yet. Your next Form I-765 is for STEM OPT, filed from Nov 15.',
          byIntent: {
            no: { short: 'No', line: 'No. You are not filing for STEM OPT, so this fee does not reach you.', todo: 'Nothing to do.' },
          },
        },
        todo: 'Nothing now. The fee on your I-765 step is kept current until you file.',
        source: { name: 'USCIS', label: 'Read the USCIS notice', href: 'https://www.uscis.gov/i-765', rule: 'feeChange' },
        /* short: how the rows on Home and Updates name the step that changed. */
        changed: [
          { path: 'stem', step: 'i765', title: 'File Form I-765 with USCIS', short: 'Your Form I-765 step', change: 'A note that the fee is changing, with a link to the notice.', date: 'Sep 30' },
        ],
        checked: 'Taken from the USCIS notice, checked against it and approved before it reached your checklist.',
        link: { label: 'See your STEM OPT steps', href: '#/checklists/stem' },
      },
      {
        id: 'court',
        kind: 'news',
        label: 'In the news',
        title: 'A court paused a change to an F-1 rule',
        meta: 'In the news · U.S. District Court, Massachusetts · Sep 14, 2026',
        date: 'Sep 14, 2026',
        what: [
          'A new rule would have given F-1 students a fixed end date instead of a stay tied to their studies.',
          'A federal court in Massachusetts paused it on Sep 14, 2026, for the whole country, while the case goes on.',
        ],
        affects: {
          short: 'No change for you',
          line: 'No change for you now. Your dates are counted under the rules in effect today.',
        },
        todo: "Nothing to do. You'll get an update if the court's decision changes.",
        source: { name: 'U.S. District Court, Massachusetts', label: 'Read the court order', href: null },
        changed: [],
        checked: 'News, not a rule change. Your checklist stays as it is.',
      },
    ],
    emptyStatus: 'Nothing new for your status this week.',
    emptyNews: 'No news this week.',
    /* 'Checked today, 6:00 AM' sits in the hero meta, not here. */
    footer: 'Records and dates from your documents, not legal advice.',
  },

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
        /* Intent is asked only on What's next. Here it is one quiet line with a link. */
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

  /* Where the waiting dot shows in the nav. app.js adds 'next' while the
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
