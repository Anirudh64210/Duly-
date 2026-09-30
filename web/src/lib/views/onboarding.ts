import type { AppCase } from "../../app/caseStore";
import { formatDate, levelName } from "../labels";
import { isDateField, nextId, type DraftRecord, type RecordKind } from "../records";

// path-1 programs.md section 18: the onboarding, one question per view, in five steps,
// in the order of the documents a student holds. Every view reads and writes the records
// of the case (section 10). Nothing is preselected and no level has a default.

export const SECTIONS = [
  "Your program now",
  "Earlier study",
  "Permission to work",
  "Jobs, trips and H-1B",
  "Check and finish",
] as const;

export type ViewKind =
  | "status"
  | "status-name"
  | "flow"
  | "choice"
  | "fields"
  | "review"
  | "typed-check"
  | "zone"
  | "questions"
  | "done";

export type Option = { value: string; title: string; line?: string };

export type FieldSpec = {
  record: string;
  name: string;
  label: string;
  type: "text" | "date" | "number";
  optional?: boolean;
  pattern?: RegExp;
  /** A day the student may not know: "I'm not sure" leaves it out, and the engine asks later. */
  notSure?: boolean;
};

export type View = {
  id: string;
  kind: ViewKind;
  /** 1 to 5; the Done view fills every pip. */
  section: number;
  title: string;
  why: string;
  /** A choice view writes this record's field. */
  record?: string;
  field?: string;
  options?: Option[];
  /** "I'm not sure" is a third answer, shown as a quiet link (section 18). */
  notSure?: boolean;
  fields?: FieldSpec[];
  /** A flow view keeps its answer in held.flow under this key. */
  flowKey?: string;
};

// The levels section 18 step 1 question 3 names, in its order.
export const LEVELS = [
  "associate",
  "bachelor",
  "master",
  "doctorate",
  "language_training",
  "other",
] as const;

const GRADUATE = new Set(["master", "doctorate"]);

const YES_NO: Option[] = [
  { value: "yes", title: "Yes" },
  { value: "no", title: "No" },
];

export const NOT_SURE = "not_sure";

const WHOLE = "Duly counts only what you enter, so it asks whether the list is whole.";

export function value(held: AppCase, id: string, name: string): string {
  const found = held.draft.records.find((record) => record.id === id)?.fields[name];
  return typeof found === "string" ? found : "";
}

function records(held: AppCase, kind: RecordKind): DraftRecord[] {
  return held.draft.records.filter((record) => record.kind === kind);
}

function authsOf(held: AppCase, program: string): DraftRecord[] {
  return records(held, "authorization").filter((a) => a.fields.program === program);
}

/** A program named as the student would: its school and level, or its place in the list. */
export function programLabel(held: AppCase, id: string): string {
  const school = value(held, id, "school_name").trim();
  const level = value(held, id, "level");
  const parts = [school, level === "" ? "" : levelName(level)].filter((part) => part !== "");
  return parts.length > 0 ? parts.join(", ") : "this program";
}

const TYPE_NAMES: Record<string, string> = {
  cpt: "CPT",
  opt_pre_completion: "OPT before the program end",
  opt_post_completion: "OPT after the program end",
  stem_extension: "STEM OPT",
};

/** A permission named by its kind and card dates. */
export function authLabel(held: AppCase, id: string): string {
  const type = value(held, id, "type");
  const start = value(held, id, "card_start");
  const end = value(held, id, "card_end");
  const name = TYPE_NAMES[type] ?? "OPT";
  const days = start !== "" && end !== "" ? `, ${formatDate(start)} to ${formatDate(end)}` : "";
  return `${name}${days}`;
}

/** US programs on an F-1 in the order entered: the current one, then older ones, newest first. */
export function f1Programs(held: AppCase): string[] {
  return records(held, "program")
    .filter((p) => p.fields.where === "us_on_f1")
    .map((p) => p.id);
}

function earliestStart(held: AppCase): string {
  const starts = records(held, "program")
    .map((p) => p.fields.start_date)
    .filter((d): d is string => typeof d === "string" && d !== "")
    .sort();
  return starts[0] ?? "";
}

function firstTrainingStart(held: AppCase): string {
  const starts = records(held, "authorization")
    .map((a) => a.fields.card_start)
    .filter((d): d is string => typeof d === "string" && d !== "")
    .sort();
  return starts[0] ?? "";
}

/** The views for one program's own I-20, questions 2 to 9 of step 1. */
function programViews(held: AppCase, id: string, section: number, dual: boolean): View[] {
  const name = programLabel(held, id);
  const views: View[] = [
    {
      id: `school:${id}`,
      kind: "fields",
      section,
      title: "Your school, as your I-20 shows it",
      why: "The school code is printed on some I-20s. Leave it empty if yours does not show it.",
      fields: [
        { record: id, name: "school_name", label: "School name", type: "text" },
        { record: id, name: "school_code", label: "School code", type: "text", optional: true },
      ],
    },
    {
      id: `level:${id}`,
      kind: "choice",
      section,
      title: "Your education level, as your I-20 shows it",
      why: "Many rules count by level, such as 12 months of OPT at each level.",
      record: id,
      field: "level",
      options: LEVELS.map((level) => ({ value: level, title: levelName(level) })),
    },
    {
      id: `field:${id}`,
      kind: "fields",
      section,
      title: "Your major, as your I-20 shows it",
      why: "Duly does not match your major to any list for you.",
      fields: [
        { record: id, name: "field_name", label: "Major", type: "text" },
        {
          record: id,
          name: "cip_code",
          label: "CIP code",
          type: "text",
          optional: true,
          pattern: /^[0-9]{2}\.[0-9]{4}$/,
        },
      ],
    },
    {
      id: `stem-list:${id}`,
      kind: "choice",
      section,
      title: "Is this degree on the STEM Designated Degree Program List?",
      why: "Your DSO can tell you. Duly does not guess it from your major's name.",
      record: id,
      field: "stem_list",
      options: [
        { value: "on_list", title: "Yes" },
        { value: "not_on_list", title: "No" },
      ],
      notSure: true,
    },
    {
      id: `dates:${id}`,
      kind: "fields",
      section,
      title: "The program start and end dates on this I-20",
      why: "The end date is the one on your newest I-20 for this program.",
      fields: [
        { record: id, name: "start_date", label: "Program start date", type: "date" },
        { record: id, name: "end_date", label: "Program end date", type: "date" },
      ],
    },
    flow(
      `ec:${id}`,
      section,
      "Has your DSO changed this program's end date?",
      "Many dates count from the end date, so Duly keeps each change your DSO made.",
    ),
  ];
  const changes = records(held, "end_date_change").filter((c) => c.fields.program === id);
  if (held.flow[`ec:${id}`] === "yes") {
    for (const change of changes) {
      views.push(
        {
          id: `ec-kind:${change.id}`,
          kind: "choice",
          section,
          title: "Did the end date move later or earlier?",
          why: "A later and an earlier end date follow different rules.",
          record: change.id,
          field: "change",
          options: [
            { value: "extension", title: "Later" },
            { value: "shortened", title: "Earlier" },
          ],
        },
        {
          id: `ec-dates:${change.id}`,
          kind: "fields",
          section,
          title: "The end date change",
          why: "Each date as your I-20s and your DSO show it.",
          fields: [
            { record: change.id, name: "old_end", label: "The earlier end date", type: "date" },
            { record: change.id, name: "new_end", label: "The new end date", type: "date" },
            {
              record: change.id,
              name: "requested_on",
              label: "The day you asked",
              type: "date",
              optional: true,
            },
            {
              record: change.id,
              name: "granted_on",
              label: "The day it was granted",
              type: "date",
            },
          ],
        },
        {
          id: `ec-reason:${change.id}`,
          kind: "choice",
          section,
          title: "Why did it change?",
          why: "As the I-20 gives the reason.",
          record: change.id,
          field: "reason",
          options: [
            { value: "academic", title: "Academic" },
            { value: "medical", title: "Medical" },
            { value: "other", title: "Other" },
          ],
          notSure: true,
        },
        flow(
          `ec-more:${change.id}`,
          section,
          "Did the end date change again?",
          "Duly keeps every change, in order.",
        ),
      );
    }
  }
  views.push({
    id: `state:${id}`,
    kind: "choice",
    section,
    title: `Are you still in ${name}?`,
    why: "Some dates count from the day you finished, and others from the end date on your I-20.",
    record: id,
    field: "state",
    options: [
      { value: "in_progress", title: "Still studying" },
      { value: "completed", title: "Finished" },
    ],
  });
  if (value(held, id, "state") === "completed") {
    views.push({
      id: `finished:${id}`,
      kind: "fields",
      section,
      title: "When you finished",
      why: "Leave the conferral day empty if the degree is not conferred yet. If you do not know a day, choose I'm not sure and Duly asks again later.",
      fields: [
        {
          record: id,
          name: "coursework_done_on",
          label: "The day all course requirements were done",
          type: "date",
          notSure: true,
        },
        {
          record: id,
          name: "conferred_on",
          label: "The day the degree was conferred",
          type: "date",
          optional: true,
        },
      ],
    });
  }
  if (!dual) {
    views.push(
      flow(
        `dual:${id}`,
        section,
        "Is this program part of a dual degree?",
        "Duly keeps each program of a dual degree as its own record, with its own dates.",
      ),
    );
  }
  views.push(
    {
      id: `full-course:${id}`,
      kind: "choice",
      section,
      title:
        "In every term, did you take a full course load, or have your DSO's approval first for a lighter one?",
      why: "Duly does not check your terms yet. If the answer is no or not sure, Duly drafts a question for your DSO.",
      record: id,
      field: "full_course_each_term",
      options: YES_NO,
      notSure: true,
    },
    {
      id: `online:${id}`,
      kind: "choice",
      section,
      title: "In every term, was no more than one class, or 3 credits, of your full load online?",
      why: "Duly does not check your terms yet. If the answer is no or not sure, Duly drafts a question for your DSO.",
      record: id,
      field: "online_within_limit",
      options: YES_NO,
      notSure: true,
    },
  );
  const partner = value(held, id, "dual_with");
  if (!dual && held.flow[`dual:${id}`] === "yes" && partner !== "") {
    views.push(...programViews(held, partner, section, true));
  }
  return views;
}

function flow(key: string, section: number, title: string, why: string, options = YES_NO): View {
  return { id: `flow:${key}`, kind: "flow", section, title, why, flowKey: key, options };
}

function authViews(held: AppCase, program: string): View[] {
  const section = 3;
  const name = programLabel(held, program);
  const level = value(held, program, "level");
  const views: View[] = [
    flow(
      `cpt:${program}`,
      section,
      `During ${name}, did you have CPT?`,
      "Duly counts CPT days at each level from what you enter here.",
    ),
  ];
  const auths = authsOf(held, program);
  const cpts = auths.filter((a) => a.fields.type === "cpt");
  if (held.flow[`cpt:${program}`] === "yes") {
    for (const cpt of cpts) {
      const employer = value(held, cpt.id, "employer");
      views.push(
        {
          id: `cpt-dates:${cpt.id}`,
          kind: "fields",
          section,
          title: "This CPT, as your I-20 shows it",
          why: "Each date as your I-20 shows it for this CPT.",
          fields: [
            { record: cpt.id, name: "card_start", label: "CPT start date", type: "date" },
            { record: cpt.id, name: "card_end", label: "CPT end date", type: "date" },
            { record: employer, name: "name", label: "Employer", type: "text" },
            {
              record: cpt.id,
              name: "dso_on",
              label: "The day your DSO signed the I-20 for it",
              type: "date",
              notSure: true,
            },
          ],
        },
        {
          id: `cpt-time:${cpt.id}`,
          kind: "choice",
          section,
          title: "Full or part time, as your DSO marked it",
          why: "Full-time and part-time CPT are counted apart.",
          record: cpt.id,
          field: "time",
          options: [
            { value: "full_time", title: "Full time" },
            { value: "part_time", title: "Part time" },
          ],
          notSure: true,
        },
        flow(
          `cpt-more:${cpt.id}`,
          section,
          "Did you have another CPT during this program?",
          "Duly counts every CPT at this level together.",
        ),
      );
    }
  }
  const opts = auths.filter((a) => a.fields.type !== "cpt" && a.fields.type !== "stem_extension");
  views.push(
    flow(
      `opt:${program}`,
      section,
      `During or after ${name}, did you have OPT?`,
      "OPT is counted in months at each level, from what you enter here.",
    ),
  );
  if (held.flow[`opt:${program}`] === "yes") {
    for (const opt of opts) {
      views.push({
        id: `opt-kind:${opt.id}`,
        kind: "choice",
        section,
        title: "Was this OPT before or after the program end date?",
        why: "OPT before and after the program end date follow different rules.",
        record: opt.id,
        field: "type",
        options: [
          { value: "opt_pre_completion", title: "Before the program end date" },
          { value: "opt_post_completion", title: "After the program end date" },
        ],
      });
      if (opt.fields.type === "opt_pre_completion") {
        views.push({
          id: `opt-time:${opt.id}`,
          kind: "choice",
          section,
          title: "Full or part time, as your I-20 shows it",
          why: "Full-time and part-time OPT are counted apart.",
          record: opt.id,
          field: "time",
          options: [
            { value: "full_time", title: "Full time" },
            { value: "part_time", title: "Part time" },
          ],
          notSure: true,
        });
      }
      views.push(...grantViews(held, opt.id, section));
      if (opt.fields.type === "opt_post_completion") {
        views.push(
          flow(
            `stem:${opt.id}`,
            section,
            "Did you get a STEM extension after this OPT?",
            "A STEM extension brings its own reports and dates.",
          ),
        );
        const stems = records(held, "authorization").filter((a) => a.fields.extends === opt.id);
        if (held.flow[`stem:${opt.id}`] === "yes") {
          for (const stem of stems) {
            views.push(...grantViews(held, stem.id, section), {
              id: `basis:${stem.id}`,
              kind: "choice",
              section,
              title: "Which degree is it based on?",
              why: "The rule for a STEM extension names the degree it rests on. Your DSO can tell you.",
              record: stem.id,
              field: "basis_program",
              options: records(held, "program").map((p) => ({
                value: p.id,
                title: programLabel(held, p.id),
              })),
              notSure: true,
            });
          }
        }
        if (splitAsked(held, opt.id, level)) {
          views.push({
            id: `split:${opt.id}`,
            kind: "choice",
            section,
            title: "Did your DSO note in SEVIS that you are splitting OPT between these programs?",
            why: "Your DSO can tell you. Duly does not assume either answer.",
            record: opt.id,
            field: "split_noted",
            options: YES_NO,
            notSure: true,
          });
        }
      }
      views.push(
        flow(
          `opt-more:${opt.id}`,
          section,
          "Did you have another OPT for this program?",
          "Duly counts every OPT at this level together.",
        ),
      );
    }
  }
  const trained = cpts.length > 0 || opts.length > 0;
  if (trained) {
    views.push({
      id: `first-year:${program}`,
      kind: "choice",
      section,
      title: "Was one full academic year done before your training began?",
      why: "This is your school's fact. Duly never computes a school's calendar.",
      record: program,
      field: "first_year_before_training",
      options: YES_NO,
      notSure: true,
    });
  }
  if (opts.some((a) => a.fields.type === "opt_pre_completion")) {
    views.push({
      id: `first-year-day:${program}`,
      kind: "fields",
      section,
      title: "The day the first full academic year was done",
      why: "Your school can tell you this day.",
      fields: [
        {
          record: program,
          name: "first_year_done_on",
          label: "First full academic year done",
          type: "date",
          optional: true,
        },
      ],
    });
  }
  if (cpts.length > 0 && GRADUATE.has(level)) {
    views.push({
      id: `immediate:${program}`,
      kind: "choice",
      section,
      title: "Does your program require CPT from the start?",
      why: "This is your school's fact. Your DSO can tell you.",
      record: program,
      field: "immediate_cpt",
      options: YES_NO,
      notSure: true,
    });
  }
  views.push(
    flow(`auth-all:${program}`, section, `Is that all the CPT and OPT for ${name}?`, WHOLE, [
      { value: "all", title: "That's all" },
      { value: "cpt", title: "Add a CPT" },
      { value: "opt", title: "Add an OPT" },
    ]),
  );
  return views;
}

/** Two post-completion OPTs at one level: asked on the newer one. */
function splitAsked(held: AppCase, opt: string, level: string): boolean {
  const programs = f1Programs(held);
  const own = programs.indexOf(value(held, opt, "program"));
  return records(held, "authorization").some((other) => {
    if (other.id === opt || other.fields.type !== "opt_post_completion") return false;
    const at = programs.indexOf(String(other.fields.program));
    return at > own && level !== "" && value(held, String(other.fields.program), "level") === level;
  });
}

/** The recommendation, filing, decision and card of an OPT or STEM OPT. */
function grantViews(held: AppCase, id: string, section: number): View[] {
  const views: View[] = [
    {
      id: `grant:${id}`,
      kind: "fields",
      section,
      title: `${authLabel(held, id)}: the recommendation and the filing`,
      why: "Some filing dates count from the day your DSO recommended it. Leave the filing day empty if you have not filed.",
      fields: [
        {
          record: id,
          name: "dso_on",
          label: "The day your DSO recommended it",
          type: "date",
          notSure: true,
        },
        {
          record: id,
          name: "filed_on",
          label: "The day your I-765 was filed",
          type: "date",
          optional: true,
        },
      ],
    },
    {
      id: `decision:${id}`,
      kind: "choice",
      section,
      title: "What has happened with the application so far?",
      why: "Each answer leads to different dates.",
      record: id,
      field: "decision",
      options: [
        { value: "pending", title: "Waiting for a decision" },
        { value: "approved", title: "Approved" },
        { value: "denied", title: "Denied" },
        { value: "withdrawn", title: "Withdrawn" },
      ],
      notSure: true,
    },
  ];
  const decision = value(held, id, "decision");
  if (decision !== "" && decision !== "pending" && decision !== NOT_SURE) {
    views.push({
      id: `decided:${id}`,
      kind: "fields",
      section,
      title: "The day of the decision",
      why: "As the notice from USCIS shows it.",
      fields: [
        { record: id, name: "decided_on", label: "Decision day", type: "date", notSure: true },
      ],
    });
  }
  if (decision === "approved") {
    views.push({
      id: `card:${id}`,
      kind: "fields",
      section,
      title: "The dates on your EAD card",
      why: "Type the dates as the card shows them.",
      fields: [
        { record: id, name: "card_start", label: "Card start date", type: "date" },
        { record: id, name: "card_end", label: "Card end date", type: "date" },
      ],
    });
  }
  return views;
}

function jobViews(held: AppCase): View[] {
  const section = 4;
  const since = firstTrainingStart(held);
  const views: View[] = [
    flow(
      "jobs",
      section,
      "Have you had a job in the US?",
      "Days without a job on OPT are counted from the jobs you enter here.",
    ),
  ];
  if (held.flow.jobs !== "yes") return views;
  const auths = records(held, "authorization");
  for (const job of records(held, "work")) {
    const employer = value(held, job.id, "employer");
    const start = value(held, job.id, "start");
    views.push({
      id: `job:${job.id}`,
      kind: "fields",
      section,
      title: "This job",
      why: "Each as your offer letter or pay records show it.",
      fields: [
        { record: employer, name: "name", label: "Employer", type: "text" },
        { record: job.id, name: "start", label: "First day", type: "date" },
        { record: job.id, name: "hours_per_week", label: "Hours a week", type: "number" },
      ],
    });
    views.push(
      flow(
        `still:${job.id}`,
        section,
        "Do you still work here?",
        "The last day of a job changes the count of days without one.",
        [
          { value: "yes", title: "Still working here" },
          { value: "no", title: "It ended" },
        ],
      ),
    );
    if (held.flow[`still:${job.id}`] === "no") {
      views.push({
        id: `job-end:${job.id}`,
        kind: "fields",
        section,
        title: "The last day of this job",
        why: "As your employer's records show it.",
        fields: [{ record: job.id, name: "end", label: "Last day", type: "date" }],
      });
    }
    views.push(
      flow(
        `hours-changed:${job.id}`,
        section,
        "Did the hours a week change during this job?",
        "Some counts read the hours a week, so Duly keeps each change.",
      ),
    );
    if (held.flow[`hours-changed:${job.id}`] === "yes") {
      views.push({
        id: `hours-change:${job.id}`,
        kind: "fields",
        section,
        title: "The change of hours",
        why: "A change of hours is not the end of a job.",
        fields: [
          {
            record: job.id,
            name: "change_start",
            label: "The day the hours changed",
            type: "date",
          },
          { record: job.id, name: "change_hours", label: "Hours a week from then", type: "number" },
        ],
      });
    }
    views.push({
      id: `under:${job.id}`,
      kind: "choice",
      section,
      title: "Which permission was this job under?",
      why: "Duly marks the permission whose dates hold the start. You choose.",
      record: job.id,
      field: "under",
      options: [
        ...auths.map((a) => {
          const from = value(held, a.id, "card_start");
          const to = value(held, a.id, "card_end");
          const holds =
            start !== "" &&
            from !== "" &&
            to !== "" &&
            from <= start &&
            start <= to &&
            !laterProgramBegan(held, value(held, a.id, "program"), from, start);
          return {
            value: a.id,
            title: authLabel(held, a.id),
            ...(holds ? { line: "Its dates hold the start" } : {}),
          };
        }),
        ...campusOptions(held),
      ],
    });
    const under = value(held, job.id, "under");
    if (under !== "" && value(held, under, "type") === "stem_extension") {
      views.push({
        id: `everify:${job.id}`,
        kind: "choice",
        section,
        title: "Is this employer enrolled in E-Verify?",
        why: "A STEM OPT employer must be. Your employer can tell you.",
        record: employer,
        field: "e_verify",
        options: YES_NO,
        notSure: true,
      });
    }
    views.push(
      flow(
        `job-more:${job.id}`,
        section,
        since === "" ? "Is that every job?" : `Is that every job since ${formatDate(since)}?`,
        WHOLE,
        [
          { value: "no", title: "That's every job" },
          { value: "yes", title: "Add another job" },
        ],
      ),
    );
  }
  return views;
}

/**
 * A card's printed dates can hold a job's start while another program had already begun
 * (programs.md J08: a new level ends the OPT of the old one). The mark is left off then; the
 * student still chooses.
 */
function laterProgramBegan(held: AppCase, program: string, from: string, start: string): boolean {
  return f1Programs(held).some((p) => {
    const began = value(held, p, "start_date");
    return p !== program && began !== "" && from < began && began <= start;
  });
}

/** One on-campus answer for each US program on an F-1, named by its school when there are several. */
function campusOptions(held: AppCase): Option[] {
  const programs = f1Programs(held);
  return programs.map((p) => ({
    value: `${CAMPUS}${p}`,
    title: "A job on campus",
    ...(programs.length > 1 ? { line: `At ${programLabel(held, p)}` } : {}),
  }));
}

const CAMPUS = "campus:";

/**
 * The answer a choice view shows as chosen. A job on campus is held as its program in
 * on_campus, with no permission, and is shown as the on-campus answer for that program.
 */
export function chosen(held: AppCase, view: View): string {
  const record = view.record ?? "";
  const field = view.field ?? "";
  const found = value(held, record, field);
  if (found === "" && field === "under") {
    const campus = value(held, record, "on_campus");
    if (campus !== "") return `${CAMPUS}${campus}`;
  }
  return found;
}

/** The flow key that holds "I'm not sure" for a day the student may not know. */
export function unsureKey(spec: FieldSpec): string {
  return `unsure:${spec.record}.${spec.name}`;
}

/** A day left unknown: nothing is sent, and the engine asks for it later. */
export function markUnsure(held: AppCase, spec: FieldSpec, unsure: boolean): AppCase {
  const next = unsure ? setField(held, spec.record, spec.name, "") : held;
  return { ...next, flow: { ...next.flow, [unsureKey(spec)]: unsure ? "yes" : "" } };
}

function withdrawalViews(held: AppCase): View[] {
  const section = 2;
  const views: View[] = [
    flow(
      "withdrawals",
      section,
      "Have you withdrawn from classes during a program on an F-1?",
      "Some dates count from the day of a withdrawal. Duly asks so it does not assume either way.",
    ),
  ];
  if (held.flow.withdrawals !== "yes") return views;
  for (const withdrawal of records(held, "withdrawal")) {
    views.push(
      {
        id: `wd-program:${withdrawal.id}`,
        kind: "choice",
        section,
        title: "Which program did you withdraw from?",
        why: "Duly keeps the withdrawal with that program.",
        record: withdrawal.id,
        field: "program",
        options: f1Programs(held).map((p) => ({ value: p, title: programLabel(held, p) })),
      },
      {
        id: `wd-day:${withdrawal.id}`,
        kind: "fields",
        section,
        title: "The day of the withdrawal",
        why: "As your school's records show it. If you do not know the day, choose I'm not sure and Duly asks again later.",
        fields: [
          {
            record: withdrawal.id,
            name: "on",
            label: "The day of the withdrawal",
            type: "date",
            notSure: true,
          },
        ],
      },
      {
        id: `wd-dso:${withdrawal.id}`,
        kind: "choice",
        section,
        title: "Did your DSO authorize the withdrawal?",
        why: "Your DSO can tell you. Duly does not assume either answer.",
        record: withdrawal.id,
        field: "dso_authorized",
        options: YES_NO,
        notSure: true,
      },
      flow(`withdrawal-more:${withdrawal.id}`, section, "Is that every withdrawal?", WHOLE, [
        { value: "no", title: "That's every withdrawal" },
        { value: "yes", title: "Add another withdrawal" },
      ]),
    );
  }
  return views;
}

function tripViews(held: AppCase): View[] {
  const section = 4;
  const since = earliestStart(held);
  const views: View[] = [
    flow(
      "trips",
      section,
      since === "" ? "Have you left the US?" : `Have you left the US since ${formatDate(since)}?`,
      "Some counts and some I-20 dates read your time outside the US.",
    ),
  ];
  if (held.flow.trips !== "yes") return views;
  const training = records(held, "authorization").some(
    (a) => a.fields.type === "opt_post_completion" || a.fields.type === "stem_extension",
  );
  for (const trip of records(held, "trip")) {
    views.push(
      {
        id: `trip:${trip.id}`,
        kind: "fields",
        section,
        title: "This trip",
        why: "Leave the day you came back empty while you are still away.",
        fields: [
          { record: trip.id, name: "left_on", label: "The day you left", type: "date" },
          {
            record: trip.id,
            name: "returned_on",
            label: "The day you came back",
            type: "date",
            optional: true,
          },
          {
            record: trip.id,
            name: "signature_on",
            label: "Travel signature date on the I-20 you showed",
            type: "date",
            optional: true,
          },
        ],
      },
      {
        id: `purpose:${trip.id}`,
        kind: "choice",
        section,
        title: "What was the trip?",
        why: "Different kinds of trips follow different rules.",
        record: trip.id,
        field: "purpose",
        options: [
          { value: "job_travel", title: "Travel for my job" },
          { value: "approved_leave", title: "Leave my employer approved" },
          { value: "personal", title: "Personal" },
          { value: "study_abroad", title: "A study abroad term" },
        ],
        notSure: true,
      },
      {
        id: `reentry:${trip.id}`,
        kind: "choice",
        section,
        title: "Which I-20 did you show when you came back?",
        why: "Duly keeps the I-20 you showed with the trip.",
        record: trip.id,
        field: "reentry_i20",
        options: f1Programs(held).map((p) => ({ value: p, title: programLabel(held, p) })),
      },
    );
    if (training) {
      views.push({
        id: `return-job:${trip.id}`,
        kind: "choice",
        section,
        title: "Did you have a job to return to?",
        why: "Some counts read whether a job was waiting when you came back.",
        record: trip.id,
        field: "job_on_return",
        options: YES_NO,
        notSure: true,
      });
    }
    views.push(
      flow(`trip-more:${trip.id}`, section, "Is that every trip?", WHOLE, [
        { value: "no", title: "That's every trip" },
        { value: "yes", title: "Add another trip" },
      ]),
    );
  }
  return views;
}

const PETITION_OUTCOMES: Option[] = [
  { value: "pending", title: "Waiting for a decision" },
  { value: "approved", title: "Approved" },
  { value: "denied", title: "Denied" },
  { value: "rejected", title: "Rejected" },
  { value: "withdrawn", title: "Withdrawn" },
  { value: "revoked", title: "Revoked" },
];

/** A petition named by its employer and the day it was filed, as far as they are entered. */
export function petitionLabel(held: AppCase, id: string): string {
  const employer = value(held, value(held, id, "employer"), "name").trim();
  const filed = value(held, id, "filed_on");
  const parts = [
    "H-1B petition",
    employer === "" ? "" : `from ${employer}`,
    /^\d{4}-\d{2}-\d{2}$/.test(filed) ? `filed ${formatDate(filed)}` : "",
  ];
  return parts.filter((part) => part !== "").join(", ");
}

function petitionViews(held: AppCase): View[] {
  const section = 4;
  const views: View[] = [
    flow(
      "h1b",
      section,
      "Has an employer filed an H-1B petition for you?",
      "An H-1B petition can change some OPT dates. Duly asks so it does not assume either way.",
    ),
  ];
  if (held.flow.h1b !== "yes") return views;
  for (const petition of records(held, "petition")) {
    const employer = value(held, petition.id, "employer");
    const outcome = value(held, petition.id, "outcome");
    views.push(
      {
        id: `petition:${petition.id}`,
        kind: "fields",
        section,
        title: "This petition",
        why: "Each date as the receipt notice and the petition show it.",
        fields: [
          { record: employer, name: "name", label: "Employer", type: "text" },
          { record: petition.id, name: "filed_on", label: "The day it was filed", type: "date" },
          {
            record: petition.id,
            name: "receipt_on",
            label: "Receipt date",
            type: "date",
            optional: true,
          },
          {
            record: petition.id,
            name: "requested_start",
            label: "The start date it asks for",
            type: "date",
          },
        ],
      },
      {
        id: `cos:${petition.id}`,
        kind: "choice",
        section,
        title: "Does it ask to change your status in the US?",
        why: "As the petition shows it. Your employer can tell you.",
        record: petition.id,
        field: "change_of_status",
        options: YES_NO,
      },
      {
        id: `cap:${petition.id}`,
        kind: "choice",
        section,
        title: "Is it under the yearly cap?",
        why: "Your employer can tell you.",
        record: petition.id,
        field: "cap_subject",
        options: YES_NO,
        notSure: true,
      },
      {
        id: `outcome:${petition.id}`,
        kind: "choice",
        section,
        title: "What has happened with it so far?",
        why: "Each outcome leads to different dates.",
        record: petition.id,
        field: "outcome",
        options: PETITION_OUTCOMES,
      },
    );
    if (outcome !== "" && outcome !== "pending") {
      const fields: FieldSpec[] = [
        { record: petition.id, name: "outcome_on", label: "The day it happened", type: "date" },
      ];
      if (outcome === "approved") {
        fields.push(
          {
            record: petition.id,
            name: "validity_start",
            label: "The approved start date",
            type: "date",
            optional: true,
          },
          {
            record: petition.id,
            name: "h1b_began_on",
            label: "The day H-1B status began",
            type: "date",
            optional: true,
          },
        );
      }
      views.push({
        id: `outcome-day:${petition.id}`,
        kind: "fields",
        section,
        title: "When it happened",
        why: "As the notice from USCIS shows it.",
        fields,
      });
    }
    views.push(
      flow(`h1b-more:${petition.id}`, section, "Is that every H-1B petition?", WHOLE, [
        { value: "no", title: "That's every petition" },
        { value: "yes", title: "Add another petition" },
      ]),
    );
  }
  return views;
}

function earlierViews(held: AppCase): View[] {
  const section = 2;
  const views: View[] = [
    flow(
      "earlier",
      section,
      "Before this program, did you study in another program in the US on an F-1?",
      "Why we ask: earlier programs decide how much OPT and CPT you have used, and which degrees a STEM extension can rest on.",
    ),
  ];
  if (held.flow.earlier === "yes") {
    for (const move of records(held, "move")) {
      const from = value(held, move.id, "from_program");
      const to = value(held, move.id, "to_program");
      views.push(...programViews(held, from, section, false));
      views.push({
        id: `move:${move.id}`,
        kind: "choice",
        section,
        title: `How did you move from ${programLabel(held, from)} to ${programLabel(held, to)}?`,
        why: "Each kind of move has its own steps and dates.",
        record: move.id,
        field: "how",
        options: [
          { value: "transfer", title: "Transferred to another school" },
          { value: "change_of_level", title: "New level at the same school" },
          { value: "new_initial_i20", title: "Left the US and came back on a new I-20" },
        ],
      });
      const transfer = value(held, move.id, "how") === "transfer";
      const fields: FieldSpec[] = [];
      if (transfer) {
        fields.push({
          record: move.id,
          name: "told_school_on",
          label: "The day you told the school",
          type: "date",
          notSure: true,
        });
      }
      fields.push(
        {
          record: move.id,
          name: "release_date",
          label: "The release date",
          type: "date",
          optional: !transfer,
          notSure: transfer,
        },
        {
          record: move.id,
          name: "i20_issued_on",
          label: "The new I-20's date",
          type: "date",
          notSure: true,
        },
      );
      if (transfer) {
        fields.push({
          record: move.id,
          name: "contacted_new_dso_on",
          label: "The day you contacted the new DSO",
          type: "date",
          notSure: true,
        });
      }
      views.push({
        id: `move-dates:${move.id}`,
        kind: "fields",
        section,
        title: "The dates of that move",
        why: "Each date as your schools and your I-20s show it. If you do not know a day, choose I'm not sure and Duly asks again later.",
        fields,
      });
      views.push(
        flow(
          `more:${from}`,
          section,
          "Is that every program you studied in the US on an F-1?",
          WHOLE,
          [
            { value: "no", title: "That's every program" },
            { value: "yes", title: "Add another program" },
          ],
        ),
      );
    }
  }
  views.push(
    flow(
      "outside",
      section,
      "Do you have a degree from a school outside the US, or from a US school while not on an F-1?",
      "The rule for a STEM extension names a degree from a U.S. educational institution. Duly asks so it does not assume either way.",
    ),
  );
  if (held.flow.outside === "yes") {
    for (const other of records(held, "program").filter((p) => p.fields.where !== "us_on_f1")) {
      views.push(
        {
          id: `where:${other.id}`,
          kind: "choice",
          section,
          title: "Where was this degree?",
          why: "The rule for a STEM extension names a degree from a U.S. educational institution.",
          record: other.id,
          field: "where",
          options: [
            { value: "outside_us", title: "At a school outside the US" },
            { value: "us_other_status", title: "At a US school, not on an F-1" },
          ],
        },
        {
          id: `level:${other.id}`,
          kind: "choice",
          section,
          title: "The degree's level",
          why: "Many rules count by level.",
          record: other.id,
          field: "level",
          options: LEVELS.map((level) => ({ value: level, title: levelName(level) })),
        },
        {
          id: `other:${other.id}`,
          kind: "fields",
          section,
          title: "The degree",
          why: "As your diploma shows it. Leave the day empty if you do not know it.",
          fields: [
            { record: other.id, name: "school_name", label: "School name", type: "text" },
            { record: other.id, name: "field_name", label: "Field", type: "text" },
            {
              record: other.id,
              name: "conferred_on",
              label: "The day it was conferred",
              type: "date",
              optional: true,
            },
          ],
        },
      );
      if (other.fields.where === "us_other_status") {
        views.push({
          id: `stem-list:${other.id}`,
          kind: "choice",
          section,
          title: "Is this degree on the STEM Designated Degree Program List?",
          why: "Your DSO can tell you. Duly does not guess it from your major's name.",
          record: other.id,
          field: "stem_list",
          options: [
            { value: "on_list", title: "Yes" },
            { value: "not_on_list", title: "No" },
          ],
          notSure: true,
        });
      }
      views.push(
        flow(`outside-more:${other.id}`, section, "Is that every such degree?", WHOLE, [
          { value: "no", title: "That's every degree" },
          { value: "yes", title: "Add another degree" },
        ]),
      );
    }
  }
  return views;
}

/**
 * Every view for the case as entered so far. The list grows as answers are given: a Yes
 * opens its follow-up views, and each loop stops only when the student says it is whole.
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
    title: "You're set.",
    why: "Duly works out each date from these answers and shows where each rule is written.",
  };
  if (held.status === "other") {
    views.push({
      id: "status-name",
      kind: "status-name",
      section: 1,
      title: "What is the status called?",
      why: "Duly keeps your words on this computer. It holds no rules for this status yet.",
    });
  }
  if (held.status !== "f1") return [...views, done];
  const current = f1Programs(held)[0] ?? "p1";
  views.push(
    flow(
      "i20",
      1,
      "Add your current I-20.",
      "Your I-20 holds your school, level, field and dates. Duly reads it on this computer, and you check each field before Duly uses it.",
      [
        { value: "add", title: "Add my I-20" },
        { value: "type", title: "Type it in" },
      ],
    ),
    ...programViews(held, current, 1, false),
    ...earlierViews(held),
    ...withdrawalViews(held),
  );
  for (const program of f1Programs(held)) views.push(...authViews(held, program));
  views.push(...jobViews(held), ...tripViews(held), ...petitionViews(held));
  views.push(
    {
      id: "review",
      kind: "review",
      section: 5,
      title: "Your record, in order",
      why: "Each date is shown as you entered it.",
      flowKey: "review",
      options: [
        { value: "everything", title: "This is everything" },
        { value: "change", title: "Change something" },
      ],
    },
    flow(
      "typed",
      5,
      "Did you type these dates from your documents?",
      "Duly uses a typed date only once you have checked it against its document.",
    ),
  );
  if (held.flow.typed === "yes") {
    views.push({
      id: "typed-check",
      kind: "typed-check",
      section: 5,
      title: "Check each date against its document",
      why: "Mark each date you checked. A date you have not checked is not used yet.",
    });
  }
  views.push({
    id: "zone",
    kind: "zone",
    section: 5,
    title: "Your time zone",
    why: "Duly counts each day in your own time zone. This one comes from your computer.",
  });
  if (questions > 0) {
    views.push({
      id: "questions",
      kind: "questions",
      section: 5,
      title: "Duly's questions",
      why: "Why we ask: Duly does not assume what it cannot see in your dates.",
    });
  }
  return [...views, done];
}

function withRecord(held: AppCase, record: DraftRecord): AppCase {
  return { ...held, draft: { ...held.draft, records: [...held.draft.records, record] } };
}

function add(held: AppCase, kind: RecordKind, fields: DraftRecord["fields"]): [AppCase, string] {
  const id = nextId(held.draft.records, kind);
  return [withRecord(held, { id, kind, fields }), id];
}

/** Removes records, and every record that links to one removed. */
export function removeRecords(held: AppCase, ids: string[]): AppCase {
  const gone = new Set(ids);
  let changed = true;
  let records = held.draft.records;
  while (changed) {
    changed = false;
    const kept = records.filter((record) => {
      if (gone.has(record.id)) return false;
      const linked = Object.entries(record.fields).some(
        ([name, v]) => typeof v === "string" && gone.has(v) && name !== "dual_with",
      );
      if (linked) {
        gone.add(record.id);
        changed = true;
      }
      return !linked;
    });
    records = kept;
  }
  // An employer no record names any more goes with the records that named it.
  records = records.filter(
    (record) =>
      record.kind !== "employer" || records.some((other) => other.fields.employer === record.id),
  );
  records = records.map((record) =>
    typeof record.fields.dual_with === "string" && gone.has(record.fields.dual_with)
      ? { ...record, fields: { ...record.fields, dual_with: "" } }
      : record,
  );
  const complete = Object.fromEntries(
    Object.entries(held.draft.complete).filter(([key]) => !gone.has(key.split(":")[1] ?? "")),
  );
  return { ...held, draft: { records, complete } };
}

/** The records a Yes made, kept so that a later No removes them again. */
function made(held: AppCase, key: string): string[] {
  const list = held.flow[`made:${key}`];
  return list === undefined || list === "" ? [] : list.split(",");
}

function remember(held: AppCase, key: string, ids: string[]): AppCase {
  return { ...held, flow: { ...held.flow, [`made:${key}`]: ids.join(",") } };
}

function newProgram(held: AppCase): [AppCase, string] {
  return add(held, "program", { where: "us_on_f1" });
}

function newAuth(held: AppCase, program: string, type: string): [AppCase, string[]] {
  if (type === "cpt") {
    const [withEmployer, employer] = add(held, "employer", { name: "" });
    const [next, id] = add(withEmployer, "authorization", { type, program, employer });
    return [next, [employer, id]];
  }
  const [next, id] = add(held, "authorization", { type: "", program });
  return [next, [id]];
}

function newWithEmployer(held: AppCase, kind: RecordKind, fields: DraftRecord["fields"]) {
  const [withEmployer, employer] = add(held, "employer", { name: "" });
  const [next, id] = add(withEmployer, kind, { ...fields, employer });
  return [next, [employer, id]] as const;
}

/**
 * The answer to a flow view, with its effect on the records: a Yes adds the record it
 * opens, a No removes the records an earlier Yes added. A statement that a list is whole
 * is dated with the person's own day.
 */
export function applyFlow(held: AppCase, key: string, answer: string, today: string): AppCase {
  const before = held.flow[key];
  let next: AppCase = { ...held, flow: { ...held.flow, [key]: answer } };
  if (before === answer) return next;
  const [name, subject = ""] = key.split(":");
  const opens = answer === "yes";
  if (!opens && made(next, key).length > 0) {
    next = removeRecords(next, made(next, key));
    next = remember(next, key, []);
  }
  let ids: string[] = [];
  switch (name) {
    case "earlier":
    case "more": {
      if (!opens) break;
      const chain = f1Programs(next);
      const to = name === "earlier" ? (chain[0] ?? "p1") : subject;
      const [withProgram, from] = newProgram(next);
      const [withMove, move] = add(withProgram, "move", { from_program: from, to_program: to });
      next = withMove;
      ids = [from, move];
      break;
    }
    case "outside":
    case "outside-more": {
      if (!opens) break;
      const [withProgram, id] = add(next, "program", { where: "" });
      next = withProgram;
      ids = [id];
      break;
    }
    case "dual": {
      if (!opens) break;
      const [withProgram, id] = add(next, "program", {
        where: "us_on_f1",
        school_name: value(next, subject, "school_name"),
        dual_with: subject,
      });
      next = setField(withProgram, subject, "dual_with", id);
      ids = [id];
      break;
    }
    case "ec":
    case "ec-more": {
      if (!opens) break;
      const program = name === "ec" ? subject : value(next, subject, "program");
      const [withChange, id] = add(next, "end_date_change", { program });
      next = withChange;
      ids = [id];
      break;
    }
    case "cpt":
    case "cpt-more":
    case "opt":
    case "opt-more": {
      if (!opens) break;
      const program = name === "cpt" || name === "opt" ? subject : value(next, subject, "program");
      [next, ids] = newAuth(next, program, name.startsWith("cpt") ? "cpt" : "");
      break;
    }
    case "auth-all": {
      if (answer === "all") {
        next = state(next, `authorization:${subject}`, { on: today });
      } else {
        [next, ids] = newAuth(next, subject, answer === "cpt" ? "cpt" : "");
        next = { ...next, flow: { ...next.flow, [key]: "", [`${answer}:${subject}`]: "yes" } };
      }
      break;
    }
    case "stem": {
      if (!opens) break;
      const program = value(next, subject, "program");
      const [withStem, id] = add(next, "authorization", {
        type: "stem_extension",
        program,
        extends: subject,
      });
      next = withStem;
      ids = [id];
      break;
    }
    case "jobs":
    case "job-more": {
      if (!opens) break;
      const [withJob, made2] = newWithEmployer(next, "work", {});
      next = withJob;
      ids = [...made2];
      break;
    }
    case "still":
      if (opens) next = setField(next, subject, "end", "");
      break;
    case "hours-changed":
      if (!opens) next = setField(next, subject, "hours_changes", []);
      break;
    case "trips":
    case "trip-more": {
      if (!opens) break;
      const [withTrip, id] = add(next, "trip", {});
      next = withTrip;
      ids = [id];
      break;
    }
    case "withdrawals":
    case "withdrawal-more": {
      if (!opens) break;
      // No program is chosen for the student: the view opens with nothing chosen.
      const [withWithdrawal, id] = add(next, "withdrawal", { program: "" });
      next = withWithdrawal;
      ids = [id];
      break;
    }
    case "h1b":
    case "h1b-more": {
      if (!opens) break;
      const [withPetition, made2] = newWithEmployer(next, "petition", { type: "h1b" });
      next = withPetition;
      ids = [...made2];
      break;
    }
    case "review": {
      if (answer !== "everything") break;
      const from = earliestStart(next);
      for (const kind of [
        "program",
        "move",
        "end_date_change",
        "authorization",
        "work",
        "petition",
        "withdrawal",
      ]) {
        next = state(next, kind, { on: today });
      }
      next = state(next, "trip", from === "" ? { on: today } : { on: today, from });
      break;
    }
    default:
      break;
  }
  if (ids.length > 0) next = remember(next, key, ids);
  return next;
}

function state(held: AppCase, key: string, statement: { on: string; from?: string }): AppCase {
  return {
    ...held,
    draft: { ...held.draft, complete: { ...held.draft.complete, [key]: statement } },
  };
}

/**
 * A record's field, as entered. A choice of "campus:<program>" for a job is its on-campus
 * program, with no permission; "campus" alone is the current program.
 */
export function setField(
  held: AppCase,
  id: string,
  name: string,
  entered: string | DraftRecord["fields"][string],
): AppCase {
  const records = held.draft.records.map((record) => {
    if (record.id !== id) return record;
    const fields = { ...record.fields };
    if (record.kind === "work" && name === "under") {
      const text = typeof entered === "string" ? entered : "";
      const campus = text === "campus" || text.startsWith(CAMPUS);
      const program = text.startsWith(CAMPUS) ? text.slice(CAMPUS.length) : "";
      fields.under = campus ? "" : entered;
      fields.on_campus = campus ? program || (f1Programs(held)[0] ?? "") : "";
    } else if (record.kind === "work" && (name === "change_start" || name === "change_hours")) {
      if (name === "change_start") fields.change_start = entered;
      if (name === "change_hours") fields.change_hours = entered;
      const start = typeof fields.change_start === "string" ? fields.change_start : "";
      const hours = typeof fields.change_hours === "string" ? fields.change_hours.trim() : "";
      const number = Number(hours);
      fields.hours_changes =
        /^\d{4}-\d{2}-\d{2}$/.test(start) && hours !== "" && Number.isFinite(number)
          ? [{ start, hours_per_week: number }]
          : [];
    } else if (name === "basis_program" && entered === NOT_SURE) {
      // A link has no not_sure in the pack: left out, it is not known, and the engine asks.
      fields.basis_program = "";
    } else {
      fields[name] = entered;
    }
    return { ...record, fields };
  });
  return { ...held, draft: { ...held.draft, records } };
}

// Choice fields the engine may ask for that no Onboarding view asks in every case.
const ASKED_CHOICES: Record<string, { options: Option[]; notSure: boolean }> = {
  "authorization.time": {
    options: [
      { value: "full_time", title: "Full time" },
      { value: "part_time", title: "Part time" },
    ],
    notSure: true,
  },
  "authorization.decision": {
    options: [
      { value: "pending", title: "Waiting for a decision" },
      { value: "approved", title: "Approved" },
      { value: "denied", title: "Denied" },
      { value: "withdrawn", title: "Withdrawn" },
    ],
    notSure: true,
  },
  // resolutions point 18: whether a petition belongs to the F-1 status held now turns on its
  // outcome, so a petition entered without one is asked about, never read as not belonging.
  "petition.outcome": { options: PETITION_OUTCOMES, notSure: true },
};

const ASKED_WORDS: Record<string, string> = {
  "authorization.time": "full or part time",
  "authorization.decision": "the decision",
  "petition.outcome": "what has happened with it so far",
};

function recordLabel(held: AppCase, id: string, kind: RecordKind): string {
  return kind === "petition" ? petitionLabel(held, id) : authLabel(held, id);
}

/**
 * programs.md section 10: the engine asks for a record's field as <record id>.<field>. The
 * question is answered by entering the field, in the view that asks it in Onboarding.
 */
export function fieldQuestion(held: AppCase, question: string): View | null {
  const match = /^([a-z]{1,3}[0-9]{1,4})\.([a-z][a-z0-9_]*)$/.exec(question);
  if (match === null) return null;
  const [, id = "", field = ""] = match;
  const record = held.draft.records.find((r) => r.id === id);
  if (record === undefined) return null;
  const base = { id: `ask:${question}`, section: 5, why: "Duly needs this to go on." };
  const choice = onboardingSteps(held, 0).find((v) => v.record === id && v.field === field);
  if (choice !== undefined) return { ...choice, ...base };
  const spec = onboardingSteps(held, 0)
    .flatMap((v) => v.fields ?? [])
    .find((f) => f.record === id && f.name === field);
  if (spec !== undefined) {
    // A day asked later may still not be known: "I'm not sure" leaves it out again.
    const field = { ...spec, optional: false, notSure: spec.type === "date" };
    return { ...base, kind: "fields", title: spec.label, fields: [field] };
  }
  const known = ASKED_CHOICES[`${record.kind}.${field}`];
  if (known !== undefined) {
    const words = ASKED_WORDS[`${record.kind}.${field}`] ?? field.replaceAll("_", " ");
    return {
      ...base,
      kind: "choice",
      title: `${recordLabel(held, id, record.kind)}: ${words}`,
      record: id,
      field,
      options: known.options,
      notSure: known.notSure,
    };
  }
  if (isDateField(record.kind, field)) {
    const label =
      DATE_WORDS[`${record.kind}.${field}`] ?? DATE_WORDS[field] ?? field.replaceAll("_", " ");
    return {
      ...base,
      kind: "fields",
      title: `The ${label}`,
      fields: [{ record: id, name: field, label: `The ${label}`, type: "date", notSure: true }],
    };
  }
  return null;
}

// The words for a date the engine may ask for with no Onboarding view in the case.
const DATE_WORDS: Record<string, string> = {
  coursework_done_on: "day all course requirements were done",
  conferred_on: "day the degree was conferred",
  filed_on: "day your I-765 was filed",
  decided_on: "day of the decision",
  first_year_done_on: "day the first full academic year was done",
  outcome_on: "day it happened",
  // resolutions point 18: the validity start decides whether a petition belongs to the F-1
  // status held now, so it is asked for even before the outcome is entered.
  "petition.validity_start": "approved start date of the H-1B petition",
  "petition.filed_on": "day the H-1B petition was filed",
  "petition.requested_start": "start date the H-1B petition asks for",
};

const LIST_WORDS: Record<string, string> = {
  end_date_change: "change to a program end date",
  withdrawal: "withdrawal from a program",
  report: "report made to your DSO",
};

/** programs.md section 12: the engine asks whether a list is whole as complete.<kind>. */
export function listQuestion(question: string): { kind: string; title: string } | null {
  const match = /^complete\.([a-z_]+)$/.exec(question);
  if (match === null) return null;
  const kind = match[1] ?? "";
  const words = LIST_WORDS[kind] ?? `${kind.replaceAll("_", " ")} record`;
  return { kind, title: `Is every ${words} in what you entered?` };
}

/** The person's statement that a list is whole, with their own day. */
export function stateWhole(held: AppCase, kind: string, today: string): AppCase {
  return state(held, kind, { on: today });
}
