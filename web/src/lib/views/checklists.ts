import type { Checklist, EngineOutput, Stage } from "../compute";
import { READING_TAG, formatDate, formatValue, statusTag } from "../labels";
import {
  B2_LINE,
  factLines,
  filingWindow,
  opensWords,
  spanWords,
  stageFact,
  stageKind,
  stagesOf,
} from "./stages";

// design-1 section 8: Checklists, from the output's checklists. The engine counts; the
// screen never does, and nothing here orders the steps as actions.

export const CHECKLIST_FOOTER = "Every step cites its source. Nothing files itself.";
export const SCHOOL_LINE =
  "This step varies by university. Your school's process is the authority here.";
export const CPT_LINE = "The authorizations, with the dates you entered.";

const FINISHED_KINDS = new Set(["opt_post", "stem", "cpt"]);

export type Chip = { key: string; label: string; finished: boolean; nextFiling: boolean };

export type StepView = {
  id: string;
  /** The confirmation id: step.<checklist>.<step> (RQ-P4). */
  question: string;
  label: string;
  meta: string;
  rule_ids: string[];
  confirmedOn: string | null;
  school: boolean;
};

export type StepsView = {
  kind: "steps";
  eyebrow: string;
  title: string;
  b2: boolean;
  confirmed: number;
  total: number;
  barLine: string;
  steps: StepView[];
  allConfirmed: string | null;
};

export type FinishedView = { kind: "finished"; title: string; line: string; lines: string[] };

export type ChecklistView = {
  chips: Chip[];
  selected: string | null;
  view: StepsView | FinishedView | null;
};

function checklistOf(output: EngineOutput, stage: Stage): Checklist | null {
  if (!stage.checklist) return null;
  return (output.checklists ?? []).find((list) => list.id === stage.checklist) ?? null;
}

/** The pack's checklist id, without the record the output adds to it. */
export function checklistBase(list: Pick<Checklist, "id" | "record">): string {
  const tail = list.record ? `.${list.record}` : "";
  return tail && list.id.endsWith(tail) ? list.id.slice(0, -tail.length) : list.id;
}

export function stepQuestion(list: Pick<Checklist, "id" | "record">, stepId: string): string {
  return `step.${checklistBase(list)}.${stepId}`;
}

function chipLabel(stage: Stage): string {
  return stageKind(stage) === "cpt" ? "CPT" : stage.label;
}

function chipsOf(output: EngineOutput): { chips: Chip[]; stages: Map<string, Stage[]> } {
  const chips: Chip[] = [];
  const stages = new Map<string, Stage[]>();
  const next = nextFilingStage(output);
  for (const stage of stagesOf(output)) {
    const list = checklistOf(output, stage);
    const finished = stage.state === "done" && FINISHED_KINDS.has(stageKind(stage));
    if (list === null && !finished) continue;
    const key = stageKind(stage) === "cpt" && list === null ? "cpt" : stage.id;
    const held = stages.get(key);
    if (held !== undefined) {
      held.push(stage);
      continue;
    }
    stages.set(key, [stage]);
    chips.push({
      key,
      label: chipLabel(stage),
      finished: list === null && finished,
      nextFiling: next !== null && next.id === stage.id,
    });
  }
  return { chips, stages };
}

/** The stage with the next filing: a next stage with a checklist, else a current one. */
function nextFilingStage(output: EngineOutput): Stage | null {
  const withList = stagesOf(output).filter((stage) => checklistOf(output, stage) !== null);
  return (
    withList.find((stage) => stage.state === "next") ??
    withList.find((stage) => stage.state === "current") ??
    null
  );
}

function stepMeta(output: EngineOutput, ruleIds: readonly string[]): string {
  const rule = ruleIds.map((id) => output.rules[id]).find((found) => found !== undefined);
  if (rule === undefined) return "";
  return [statusTag(rule.status), rule.citation, rule.derivation === "reading" ? READING_TAG : ""]
    .filter(Boolean)
    .join(" · ");
}

function stepsView(output: EngineOutput, stage: Stage, list: Checklist): StepsView {
  const window = filingWindow(stage);
  const read = new Set(output.answers_read ?? []);
  const steps = list.steps.map((step) => {
    const question = stepQuestion(list, step.id);
    // A confirmation stands only when the engine read it (design-1 section 8).
    const standing = step.confirmed_on !== null && read.has(question);
    return {
      id: step.id,
      question,
      label: step.label,
      meta: stepMeta(output, step.rule_ids),
      rule_ids: step.rule_ids,
      confirmedOn: standing ? step.confirmed_on : null,
      school: step.school === true,
    };
  });
  const reading = list.reading ? ` · ${READING_TAG} of the rules cited on each step` : "";
  const opens = window === null ? "" : opensWords(window);
  return {
    kind: "steps",
    eyebrow: opens === "" ? "" : `Filing window in the rule ${opens}`.toUpperCase(),
    title: stage.label,
    b2: stage.state === "next",
    confirmed: list.confirmed,
    total: list.total,
    barLine: `${list.confirmed} of ${list.total} confirmed by you${reading}`,
    steps,
    allConfirmed:
      list.total > 0 && list.confirmed === list.total
        ? `${list.total} of ${list.total} steps confirmed by you.` +
          (opens === "" ? "" : ` The filing window in the rule ${opens}.`)
        : null,
  };
}

function finishedView(output: EngineOutput, stages: Stage[]): FinishedView {
  const first = stages[0] as Stage;
  if (stageKind(first) === "cpt") {
    return {
      kind: "finished",
      title: "CPT",
      line: CPT_LINE,
      lines: stages.map((stage) => spanWords(stage.starts, stage.ends)).filter(Boolean),
    };
  }
  const filed = stageFact(first, "filed_on");
  const decided = stageFact(first, "decided_on");
  const kind = stageKind(first) === "stem" ? "STEM OPT" : "OPT";
  const parts = [
    typeof filed === "string" ? `filed ${formatDate(filed)}` : "",
    typeof decided === "string" && stageFact(first, "decision") === "approved"
      ? `approved ${formatDate(decided)}`
      : "",
  ].filter(Boolean);
  const prefix = kind === "OPT" ? "opt" : "stem";
  const value = (id: string) => {
    const item = output.computed.find(
      (entry) => entry.id === id && (entry.record === undefined || entry.record === first.record),
    );
    return item === undefined || item.value === null ? null : formatValue(item.value, "");
  };
  const day = value(`${prefix}.filed_day_of_window`);
  const days = value(`${prefix}.days_filed_to_approval`);
  const sentences = [
    day === null ? "" : `Filed on day ${day} of the window.`,
    days === null ? "" : `Approved ${days} days after filing.`,
  ].filter(Boolean);
  return {
    kind: "finished",
    title: parts.length > 0 ? `${kind}: ${parts.join(", ")}` : kind,
    line: sentences.join(" "),
    lines: factLines(first),
  };
}

export function checklistView(output: EngineOutput, selected: string | null): ChecklistView {
  const { chips, stages } = chipsOf(output);
  const fallback =
    chips.find((chip) => chip.nextFiling)?.key ?? chips.find((chip) => !chip.finished)?.key;
  const key =
    selected !== null && stages.has(selected) ? selected : (fallback ?? chips[0]?.key ?? null);
  if (key === null) return { chips, selected: null, view: null };
  const held = stages.get(key) ?? [];
  const stage = held[0];
  if (stage === undefined) return { chips, selected: key, view: null };
  const list = checklistOf(output, stage);
  return {
    chips,
    selected: key,
    view: list === null ? finishedView(output, held) : stepsView(output, stage, list),
  };
}

export { B2_LINE };
