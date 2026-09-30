import type { EadBlock, EngineOutput, F1Case } from "./compute";
import { factLine, formatDate, reportName } from "./labels";

// plain-1 section 4 (D57): an email the student can send to their DSO, in the student's
// own plain, polite voice. It states only the facts the student entered and asks. It
// never names the tool that drafted it, never states a date that was computed, and never
// says what the law or the student's status is.

type Topic = "program" | "degree" | "cpt" | "opt" | "stem" | "employment" | "cap_gap";

const CARDS: readonly Topic[] = ["program", "opt", "stem"];

const DEGREES: Record<string, string> = {
  bachelor: "a bachelor's",
  master: "a master's",
  doctorate: "a doctoral",
};

/**
 * The student's own facts a draft may state. A records case has no single level or end
 * date; the latest program's are given, or "" when not entered.
 */
export type Sent = Omit<F1Case, "degree_level"> & { degree_level: string };

function card(block: EadBlock | null, name: string): string[] {
  if (block === null) return [];
  const lines: string[] = [];
  const { dso_recommendation_date, i765_filed_date, ead_start, ead_end } = block;
  if (dso_recommendation_date) {
    lines.push(`My DSO recommended ${name} on ${formatDate(dso_recommendation_date)}.`);
  }
  if (i765_filed_date)
    lines.push(`I filed Form I-765 for ${name} on ${formatDate(i765_filed_date)}.`);
  if (ead_start && ead_end) {
    lines.push(`My ${name} EAD card runs from ${formatDate(ead_start)} to ${formatDate(ead_end)}.`);
  } else if (ead_start) {
    lines.push(`My ${name} EAD card starts on ${formatDate(ead_start)}.`);
  } else if (ead_end) {
    lines.push(`My ${name} EAD card ends on ${formatDate(ead_end)}.`);
  }
  return lines;
}

/** The student's own facts on one topic, as entered, in the first person. */
function factsOn(topic: Topic, sent: Sent): string[] {
  switch (topic) {
    case "program":
      return sent.program_end_date === ""
        ? []
        : [`My program end date is ${formatDate(sent.program_end_date)}.`];
    case "degree":
      return DEGREES[sent.degree_level] === undefined
        ? []
        : [`I am in ${DEGREES[sent.degree_level]} program.`];
    case "cpt":
      return sent.cpt_full_time_days === null
        ? []
        : [`I have used ${sent.cpt_full_time_days} days of full-time CPT.`];
    case "opt":
      return card(sent.opt, "OPT");
    case "stem":
      return card(sent.stem, "STEM OPT");
    case "employment":
      return sent.employment.map((period) => {
        const hours = `${period.hours_per_week} hours a week`;
        return period.end === null
          ? `I have worked since ${formatDate(period.start)}, at ${hours}.`
          : `I worked from ${formatDate(period.start)} to ${formatDate(period.end)}, at ${hours}.`;
      });
    case "cap_gap": {
      const gap = sent.cap_gap;
      if (gap === null) return [];
      const change = gap.change_of_status ? "asks" : "does not ask";
      return [
        `An H-1B petition for me was filed on ${formatDate(gap.petition_filed_on)}, with a requested start date of ${formatDate(gap.requested_start)}.`,
        `The petition is ${gap.status}, and it ${change} for a change of status.`,
      ];
    }
  }
}

// Point 61: a report that names an employment period carries that period's number.
type Ask = { topics: readonly Topic[]; ask: string; period?: number };

const NOT_IN_FORCE = "rule_not_in_force_on_event_day";

// One question for each talk_to_dso reason. Each asks, and none says what the answer is.
const ASKS: ReadonlyMap<string, Ask> = new Map(
  Object.entries({
    unemployment_at_or_over_limit: {
      topics: [...CARDS, "employment"],
      ask: "Could you look at my days without employment and tell me what your office needs from me?",
    },
    unemployment_opt_card_at_or_over_limit: {
      topics: [...CARDS, "employment"],
      ask: "Could you look at my days without employment during my OPT EAD dates and tell me what your office needs from me?",
    },
    cpt_full_time_at_or_over_bar: {
      topics: ["cpt"],
      ask: "Could you tell me what my full-time CPT days mean for OPT in my case?",
    },
    cap_gap_petition_not_active: {
      topics: ["opt", "stem", "cap_gap"],
      ask: "Could you tell me whether the cap-gap rules reach my petition?",
    },
    grace_with_cap_gap: {
      topics: [...CARDS, "cap_gap"],
      // Point 61: the petition's date as entered, never the engine's reading of it.
      ask: "Could you tell me what comes after my petition's requested start date, and whether a grace period follows it?",
    },
    report_employer: {
      topics: ["employment"],
      ask: "Could you tell me how to report my employment, or its end, to your office?",
    },
    stem_without_post_completion_opt: {
      topics: ["program", "stem"],
      ask: "I did not have a period of post-completion OPT before my STEM OPT. Could you tell me what that means for my STEM OPT?",
    },
    cap_gap_without_training: {
      topics: ["cap_gap"],
      ask: "I did not have a period of OPT or STEM OPT. Could you tell me whether the cap-gap rules reach my petition?",
    },
    "opt.months_at_this_level": {
      topics: ["degree", "opt"],
      ask: "I used OPT before at this degree level. Could you tell me how many months of OPT I have left at this level?",
    },
    [NOT_IN_FORCE]: {
      topics: [...CARDS, "cap_gap"],
      ask: "Could you tell me which rules apply to these dates in my case?",
    },
  }),
);

const CONFIRMED_ASK =
  "These are the dates on my documents. Could you look at them and tell me whether your office needs anything from me?";
const OTHER_ASK =
  "Could you look at my record and tell me whether your office needs anything from me?";
const ALL: readonly Topic[] = ["program", "degree", "opt", "stem", "employment", "cap_gap", "cpt"];
const NOT_MADE = /^(.+)\.not_made$/;
const PERIOD = /\.(\d+)$/;

/** Point 61: the dates of the numbered employment period, as entered, or none. */
function periodFacts(period: number, sent: Sent): string[] {
  const entered = sent.employment[period - 1];
  if (entered === undefined) return [];
  const name = `My employment period ${period}`;
  return entered.end === null
    ? [`${name} started on ${formatDate(entered.start)} and has no end date.`]
    : [`${name} runs from ${formatDate(entered.start)} to ${formatDate(entered.end)}.`];
}

/** Point 57: the hours as entered, and no comparison with the rule. */
function hoursAsk(sent: Sent): Ask {
  const hours = [...new Set(sent.employment.map((period) => period.hours_per_week))];
  const weeks =
    hours.length === 0
      ? "the hours a week I worked"
      : `my weeks at ${hours.join(" and ")} hours a week`;
  return {
    topics: ["opt", "stem", "employment"],
    ask: `Could you tell me how your office reads ${weeks}?`,
  };
}

// Point 64: the engine gives this count null with the step back when a period starts
// before the rule's row (point 60), so the period is behind the reason.
const PERIOD_COUNT = "employment.periods_not_reported";

/** Point 64: the step back names the periods when the period count is behind it. */
function stepBackAsk(output: EngineOutput): Ask {
  const known = ASKS.get(NOT_IN_FORCE) ?? { topics: ALL, ask: OTHER_ASK };
  const periodBehind = output.computed.some(
    (item) => item.id === PERIOD_COUNT && item.value === null,
  );
  return periodBehind ? { ...known, topics: [...known.topics, "employment"] } : known;
}

function askFor(reason: string, output: EngineOutput, sent: Sent): Ask {
  if (reason === "hours_under_threshold") return hoursAsk(sent);
  if (reason === NOT_IN_FORCE) return stepBackAsk(output);
  const known = ASKS.get(reason);
  if (known) return known;
  const notMade = NOT_MADE.exec(reason);
  const report = notMade ? reportName(notMade[1] ?? "") : null;
  if (report) {
    const numbered = PERIOD.exec(notMade?.[1] ?? "");
    const ask = `I did not submit my ${report}. Could you tell me what your office needs from me?`;
    return numbered
      ? { topics: ["stem"], ask, period: Number(numbered[1]) }
      : { topics: ["stem"], ask };
  }
  // A conflict the student answered yes to: the dates stand as the dates on the documents.
  if (factLine(reason) !== null) return { topics: ALL, ask: CONFIRMED_ASK };
  return { topics: ALL, ask: OTHER_ASK };
}

function letter(subject: string, facts: readonly string[], asks: readonly string[]): string {
  const known = facts.length === 0 ? [] : ["These are my dates as I have them:", ...facts, ""];
  return [
    `Subject: ${subject}`,
    "",
    "Hello,",
    "",
    // Point 57: the opening states no status.
    "I have a question about my F-1 record.",
    "",
    ...known,
    ...asks.flatMap((ask) => [ask, ""]),
    "Thank you,",
    "[Your name]",
  ].join("\n");
}

/** plain-1 section 4: the draft for a talk_to_dso verdict, from the facts behind its reasons. */
export function dsoDraft(output: EngineOutput, sent: Sent): string | null {
  if (output.verdict.state !== "talk_to_dso") return null;
  const topics = new Set<Topic>();
  const periods = new Set<number>();
  const asks: string[] = [];
  for (const reason of output.verdict.reasons) {
    const { topics: on, ask, period } = askFor(reason, output, sent);
    on.forEach((topic) => topics.add(topic));
    if (period !== undefined) periods.add(period);
    if (!asks.includes(ask)) asks.push(ask);
  }
  const facts = [
    ...ALL.filter((topic) => topics.has(topic)).flatMap((topic) => factsOn(topic, sent)),
    ...[...periods].sort((a, b) => a - b).flatMap((period) => periodFacts(period, sent)),
  ];
  return letter("A question about my F-1 record", facts, asks);
}

/** plain-1 section 4: the draft for the STEM OPT step, with the student's own dates only. */
export function stemDraft(sent: Sent, citation: string): string {
  const facts = [...factsOn("program", sent), ...factsOn("opt", sent)];
  return letter("A question about the STEM OPT extension", facts, [
    `Could you tell me whether ${citation} applies to my case, and what your office would need from me for a 24-month STEM OPT extension?`,
  ]);
}

const LITIGATION_ASK = "Could you tell me which rules apply to these dates in my case?";
const CONFLICT_ASK =
  "Some of the dates I have do not fit together. Could you look at them and tell me which dates your office has?";
const GENERAL_ASK = "Could you look at the dates below and tell me what your office needs from me?";
// The reasons that add no ask of their own: the rules' staleness, and no document yet.
const NO_ASK = new Set(["rules_never_checked", "rules_stale", "no_documents"]);

/**
 * design-1 section 13: the draft for any verdict, cannot_tell included, so every
 * abstention has its DSO question drafted (PLAN03-076). A talk_to_dso verdict keeps
 * dsoDraft's asks. It holds the student's own dates only.
 */
export function caseDraft(output: EngineOutput, sent: Sent): string {
  const talk = dsoDraft(output, sent);
  if (talk !== null) return talk;
  const asks: string[] = [];
  const add = (ask: string) => {
    if (!asks.includes(ask)) asks.push(ask);
  };
  for (const reason of output.verdict.reasons) {
    if (NO_ASK.has(reason)) continue;
    if (reason === "rule_in_litigation") add(LITIGATION_ASK);
    else if (reason.startsWith("conflict:")) add(CONFLICT_ASK);
    else if (ASKS.has(reason)) add(askFor(reason, output, sent).ask);
    else add(GENERAL_ASK);
  }
  if (asks.length === 0) add(GENERAL_ASK);
  const facts = ALL.filter((topic) => topic !== "cpt").flatMap((topic) => factsOn(topic, sent));
  return letter("A question about my F-1 record", facts, asks);
}

/** design-1 section 13: the STEM OPT draft, with no month count in its words. */
export function stemStepDraft(sent: Sent, citation: string): string {
  const facts = [...factsOn("program", sent), ...factsOn("opt", sent)];
  return letter("A question about the STEM OPT extension", facts, [
    `Could you tell me whether ${citation} applies to my case, and what your office would need from me for a STEM OPT extension?`,
  ]);
}
