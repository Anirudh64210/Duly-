import type { Confirmation, Confirmations, EngineOutput, F1Case } from "./compute";

// SPEC-resolutions point 33, with point 7: an answer holds for the values it was given
// for. Once the facts entered no longer match them, the engine does not read it, so the
// form drops it and the screen never shows it as standing.

const NOT_A_FACT = Symbol("not a fact");
type Found = { value: unknown } | typeof NOT_A_FACT;

const BLOCKS = new Set(["opt", "stem", "cap_gap"]);
const TOP = new Set(["program_end_date", "degree_level", "documents_count", "cpt_full_time_days"]);
const PERIOD_DAY = /^employment\.(\d+)\.(start|end)$/;

function fieldOf(block: object | null, field: string): Found {
  if (block === null) return { value: null };
  if (!Object.hasOwn(block, field)) return NOT_A_FACT;
  const value: unknown = (block as Record<string, unknown>)[field];
  return { value: value ?? null };
}

/** The value an about key names in the facts entered, as the engine writes it. */
function factValue(entered: F1Case, key: string): Found {
  if (TOP.has(key)) return { value: entered[key as keyof F1Case] };
  if (key === "employment") return { value: entered.employment };
  // A whole block is named as true when it is entered and null when it is not.
  if (BLOCKS.has(key)) {
    return { value: entered[key as "opt" | "stem" | "cap_gap"] === null ? null : true };
  }
  const day = PERIOD_DAY.exec(key);
  if (day) {
    const period = entered.employment[Number(day[1]) - 1];
    return { value: period === undefined ? null : period[day[2] === "end" ? "end" : "start"] };
  }
  const split = key.indexOf(".");
  const part = key.slice(0, split);
  if (split > 0 && BLOCKS.has(part)) {
    return fieldOf(entered[part as "opt" | "stem" | "cap_gap"], key.slice(split + 1));
  }
  return NOT_A_FACT;
}

/** A key that names an item, such as a report date: its value in the output. */
function itemValue(output: EngineOutput, key: string): Found {
  const item = output.computed.find((entry) => entry.id === key);
  if (item) return { value: item.value };
  const ahead = output.upcoming.find((entry) => entry.id === key);
  if (ahead) return { value: ahead.date };
  return NOT_A_FACT;
}

function same(left: unknown, right: unknown): boolean {
  // A number that could not be read is not the null it would print as.
  if (Number.isNaN(left) || Number.isNaN(right)) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Whether an answer was given for the values in front of the engine now. A key the
 * facts do not hold is looked up in the output; with no output it is left standing,
 * for the engine to judge. An answer with no about is never an answer (point 7).
 */
export function answerFits(
  given: Confirmation,
  entered: F1Case,
  output: EngineOutput | undefined = undefined,
): boolean {
  if (given.about === undefined) return false;
  return Object.entries(given.about).every(([key, value]) => {
    let found = factValue(entered, key);
    if (found === NOT_A_FACT) {
      if (output === undefined) return true;
      found = itemValue(output, key);
      if (found === NOT_A_FACT) return false;
    }
    return same(found.value, value);
  });
}

/** The answers that still fit the facts entered. The rest are removed. */
export function fittingAnswers(confirmations: Confirmations, entered: F1Case): Confirmations {
  return Object.fromEntries(
    Object.entries(confirmations).filter(([, given]) => answerFits(given, entered)),
  );
}
