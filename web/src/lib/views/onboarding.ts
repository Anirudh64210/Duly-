import type { AppCase, Program } from "../../app/caseStore";
import { formatDate, levelName } from "../labels";

// design-1 section 5 and path-1 programs.md section 18: one question per view, in five
// sections. Every view in a section keeps that section's pip and label.

export const SECTIONS = [
  "Status",
  "Programs",
  "Practical training",
  "Jobs",
  "Duly's questions",
] as const;

export type ViewKind =
  | "status"
  | "status-name"
  | "level"
  | "dates"
  | "name"
  | "earlier"
  | "cpt"
  | "cpt-days"
  | "opt"
  | "opt-dates"
  | "opt-card"
  | "stem"
  | "stem-dates"
  | "stem-card"
  | "capgap"
  | "capgap-petition"
  | "capgap-status"
  | "capgap-cos"
  | "jobs"
  | "job"
  | "job-hours"
  | "job-reported"
  | "job-another"
  | "questions"
  | "done";

export type View = {
  id: string;
  kind: ViewKind;
  /** 1 to 5; the Done view fills every pip. */
  section: number;
  title: string;
  why: string;
  /** The program or job the view is about, by its index. */
  index?: number;
};

/** The student's own name for a program, or its level, or its dates. */
export function programLabel(program: Program | undefined): string {
  if (program === undefined) return "your program";
  if (program.name.trim() !== "") return program.name.trim();
  if (program.level !== "") return `your ${levelName(program.level)} program`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(program.end))
    return `the program ending ${formatDate(program.end)}`;
  return "this program";
}

export function stepLabel(view: View): string {
  return view.kind === "done" ? "Done" : `Step ${view.section} of ${SECTIONS.length}`;
}

/**
 * Every view for the case as entered so far. The list grows as answers are given:
 * a Yes opens its follow-up views, and the program loop stops only on No.
 */
export function onboardingSteps(held: AppCase, questions: number): View[] {
  const views: View[] = [
    {
      id: "status",
      kind: "status",
      section: 1,
      title: "Which visa status do you hold now?",
      why: "Why we ask: each status has its own rules. Where your answers are stored is in Settings.",
    },
  ];
  const done: View = {
    id: "done",
    kind: "done",
    section: 5,
    title: "What you entered",
    why: "",
  };
  if (held.status === "other") {
    views.push({
      id: "status-name",
      kind: "status-name",
      section: 1,
      title: "What is your status called?",
      why: "Why we ask: so Your case shows your status in your words.",
    });
  }
  if (held.status !== "f1") return [...views, done];

  held.programs.forEach((program, index) => {
    const later = held.programs[index - 1];
    const it = programLabel(program);
    views.push(
      {
        id: `level:${program.key}`,
        kind: "level",
        section: 2,
        index,
        title:
          index === 0
            ? "What level is your latest program?"
            : `What level was the program before ${programLabel(later)}?`,
        why: "Why we ask: many rules count by level, and each program has its own dates and rules.",
      },
      {
        id: `dates:${program.key}`,
        kind: "dates",
        section: 2,
        index,
        title: `When does ${it} run?`,
        why: "Why we ask: the program end date on your I-20 is where many dates start.",
      },
      {
        id: `name:${program.key}`,
        kind: "name",
        section: 2,
        index,
        title: "What do you call it?",
        why: "Why we ask: Duly shows the program by your own name for it.",
      },
      {
        id: `earlier:${program.key}`,
        kind: "earlier",
        section: 2,
        index,
        title: `Before ${it}, did you study in another program in the US?`,
        why: "Why we ask: earlier programs decide how much practical training you have used.",
      },
    );
  });

  held.programs.forEach((program, index) => {
    const it = programLabel(program);
    views.push({
      id: `cpt:${program.key}`,
      kind: "cpt",
      section: 3,
      index,
      title: `Did you have CPT during ${it}?`,
      why: "Why we ask: full-time CPT can change what OPT is open to you.",
    });
    if (program.cpt === true) {
      views.push({
        id: `cpt-days:${program.key}`,
        kind: "cpt-days",
        section: 3,
        index,
        title: "How many days of full-time CPT did you have?",
        why: "Why we ask: the rule counts days of full-time CPT.",
      });
    }
  });

  const latest = programLabel(held.programs[0]);
  const flow = held.flow;
  const fields = held.fields;
  views.push({
    id: "opt",
    kind: "opt",
    section: 3,
    title: `Did you apply for post-completion OPT after ${latest}?`,
    why: "Why we ask: OPT has its own dates and its own unemployment count.",
  });
  if (fields.opt_on) {
    views.push(
      {
        id: "opt-dates",
        kind: "opt-dates",
        section: 3,
        title: "Your DSO's recommendation and your I-765",
        why: "Why we ask: the filing window in the rule counts from these dates.",
      },
      {
        id: "opt-card",
        kind: "opt-card",
        section: 3,
        title: "Your OPT card",
        why: "Why we ask: the unemployment count runs inside the card's dates.",
      },
      {
        id: "stem",
        kind: "stem",
        section: 3,
        title: `Did you apply for a STEM OPT extension after ${latest}?`,
        why: "Why we ask: a STEM OPT extension has its own dates and reports.",
      },
    );
    if (fields.stem_on) {
      views.push(
        {
          id: "stem-dates",
          kind: "stem-dates",
          section: 3,
          title: "Your DSO's recommendation and your STEM OPT I-765",
          why: "Why we ask: the filing rules count from these dates.",
        },
        {
          id: "stem-card",
          kind: "stem-card",
          section: 3,
          title: "Your STEM OPT card",
          why: "Why we ask: the counts run inside the card's dates.",
        },
      );
    }
  }
  views.push({
    id: "capgap",
    kind: "capgap",
    section: 3,
    title: "Did an employer file an H-1B petition for you?",
    why: "Why we ask: a petition can carry your status past the card's end.",
  });
  if (fields.cap_gap_on) {
    views.push(
      {
        id: "capgap-petition",
        kind: "capgap-petition",
        section: 3,
        title: "The petition",
        why: "Why we ask: the rule reads the filing date and the requested start.",
      },
      {
        id: "capgap-status",
        kind: "capgap-status",
        section: 3,
        title: "What is the petition's status?",
        why: "Why we ask: the rule reads where the petition stands.",
      },
      {
        id: "capgap-cos",
        kind: "capgap-cos",
        section: 3,
        title: "Does the petition ask for a change of status?",
        why: "Why we ask: the rule reads whether it asks for a change of status.",
      },
    );
  }

  if (fields.opt_on || fields.stem_on) {
    views.push({
      id: "jobs",
      kind: "jobs",
      section: 4,
      title: "Did you have a job during OPT or STEM OPT?",
      why: "Why we ask: jobs decide the unemployment count and the reports.",
    });
    if (flow.jobs === true) {
      fields.employment.forEach((job, index) => {
        views.push(
          {
            id: `job:${job.key}`,
            kind: "job",
            section: 4,
            index,
            title: "Your job",
            why: "Why we ask: the days between jobs are counted.",
          },
          {
            id: `job-hours:${job.key}`,
            kind: "job-hours",
            section: 4,
            index,
            title: "How many hours a week?",
            why: "Why we ask: the rule counts a job by its hours a week.",
          },
          {
            id: `job-reported:${job.key}`,
            kind: "job-reported",
            section: 4,
            index,
            title: "Did you report this job to your school?",
            why: "Why we ask: jobs are reported to the school.",
          },
          {
            id: `job-another:${job.key}`,
            kind: "job-another",
            section: 4,
            index,
            title: "Another job?",
            why: "Why we ask: every job counts, and Duly does not assume there are none.",
          },
        );
      });
    }
  }
  if (questions > 0) {
    views.push({
      id: "questions",
      kind: "questions",
      section: 5,
      title: "Duly's questions",
      why: "Why we ask: nothing entered is not the same as nothing to record.",
    });
  }
  return [...views, done];
}
