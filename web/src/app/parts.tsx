import { createContext, useContext, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { ComputedItem, EngineOutput, ShownRule } from "../lib/compute";
import {
  EXACT_BUTTON,
  FOOTER_LINE,
  READING_LABEL,
  READING_TAG,
  VERBATIM_LINE,
  formatDate,
  formatValue,
  inputName,
  statusTag,
} from "../lib/labels";

// design-1 section 3.11: the parts the canvas did not draw.

/** One open row at a time across the page (design-1 section 6). */
const OpenContext = createContext<{ open: string | null; toggle: (id: string) => void } | null>(
  null,
);

export function OneOpen({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string) => setOpen((now) => (now === id ? null : id));
  return <OpenContext.Provider value={{ open, toggle }}>{children}</OpenContext.Provider>;
}

function useOpen(id: string): [boolean, () => void] {
  const shared = useContext(OpenContext);
  const [alone, setAlone] = useState(false);
  if (shared === null) return [alone, () => setAlone((now) => !now)];
  return [shared.open === id, () => shared.toggle(id)];
}

export function Chevron({ size = 14 }: { size?: number }) {
  return (
    <svg className="chevron" width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
      <path d="M5 3l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** design-1 section 3.10: only the header toggles; the open part sits outside it. */
export function Row(props: {
  id: string;
  title: string;
  meta?: string | undefined;
  children: ReactNode;
}) {
  const [open, toggle] = useOpen(props.id);
  const panel = useId();
  return (
    <div className="row" data-open={open}>
      <button
        type="button"
        className="row-head"
        aria-expanded={open}
        aria-controls={panel}
        onClick={toggle}
      >
        <span className="row-text">
          <span className="row-title">{props.title}</span>
          {props.meta !== undefined && <span className="row-meta">{props.meta}</span>}
        </span>
        <Chevron />
      </button>
      {open && (
        <div className="row-open drop-in" id={panel}>
          {props.children}
        </div>
      )}
    </div>
  );
}

/** A text button that opens something in place, with a turning chevron. */
export function Disclose(props: { label: string; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  return (
    <div className={props.className}>
      <button
        type="button"
        className="text-button disclose"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((now) => !now)}
      >
        {props.label} <Chevron size={10} />
      </button>
      {open && (
        <div className="drop-in" id={panel}>
          {props.children}
        </div>
      )}
    </div>
  );
}

/** The rule block: plain words first, the exact words one tap away (D56). */
export function RuleBlock({ rule }: { rule: ShownRule }) {
  const meta = [
    rule.unit === "flag" ? null : formatValue(rule.value as number | string, rule.unit),
    statusTag(rule.status),
    rule.citation,
    rule.derivation === "reading" ? READING_TAG : null,
  ].filter((part): part is string => part !== null && part !== "");
  const exact = (
    <>
      {rule.quote !== undefined && <blockquote className="quote">{rule.quote}</blockquote>}
      {rule.derivation === "reading" && (
        <>
          <p className="meta">{READING_LABEL}</p>
          {rule.note !== undefined && <p className="note">{rule.note}</p>}
        </>
      )}
      {rule.derivation === "verbatim" && <p className="meta">{VERBATIM_LINE}</p>}
      <a className="source" href={rule.url} target="_blank" rel="noreferrer">
        {rule.citation}
      </a>
      <p className="meta">Checked {formatDate(rule.checked_on)}.</p>
    </>
  );
  return (
    <div className="rule-block">
      <p className="meta">{meta.join(" · ")}</p>
      {rule.plain !== undefined ? (
        <>
          <p className="plain">{rule.plain}</p>
          <Disclose label={EXACT_BUTTON}>{exact}</Disclose>
        </>
      ) : (
        exact
      )}
    </div>
  );
}

export function RuleBlocks({ ids, output }: { ids: readonly string[]; output: EngineOutput }) {
  const shown = [...new Set(ids)].flatMap((id) => {
    const rule = output.rules[id];
    return rule === undefined ? [] : [{ id, rule }];
  });
  return (
    <div className="rule-blocks">
      {shown.map(({ id, rule }) => (
        <RuleBlock key={id} rule={rule} />
      ))}
    </div>
  );
}

function inputValue(value: unknown): string {
  if (value === null || value === undefined) return "Not entered";
  if (typeof value === "string")
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDate(value) : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "Entered";
}

/** The working of an item: the inputs it read and the rules it used (design-1 section 3.11). */
export function Working({ item, output }: { item: ComputedItem; output: EngineOutput }) {
  const inputs = Object.entries(item.inputs);
  return (
    <div className="working">
      {inputs.length > 0 && (
        <>
          <h4>Inputs used</h4>
          <dl className="inputs">
            {inputs.map(([key, value]) => (
              <div key={key}>
                <dt>{inputName(key)}</dt>
                <dd>{inputValue(value)}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      <h4>Rules used</h4>
      <RuleBlocks ids={item.rule_ids} output={output} />
    </div>
  );
}

/** The DSO draft view (D57): opens in place, editable, never sent by Duly. */
export function DraftView({ text }: { text: string }) {
  const [draft, setDraft] = useState(text);
  const [copied, setCopied] = useState<"no" | "yes" | "refused">("no");
  const id = useId();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied("yes");
    } catch {
      setCopied("refused");
    }
  };
  return (
    <div className="draft-view drop-in">
      <h4 id={`${id}-h`}>An email you can send to your DSO</h4>
      <p className="meta">
        Duly drafted it from the dates you entered, in your words. It holds no date Duly computed.
        Duly never sends it.
      </p>
      <textarea
        className="field text-box"
        aria-labelledby={`${id}-h`}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setCopied("no");
        }}
      />
      <div className="pill-row">
        <button type="button" className="pill-secondary" onClick={() => void copy()}>
          Copy the email
        </button>
        <span role="status" className="meta">
          {copied === "yes" && "Copied."}
          {copied === "refused" && "The browser did not allow the copy. Select the words above."}
        </span>
      </div>
    </div>
  );
}

/** The secondary pill that opens a draft directly under itself. */
export function DraftPill({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="draft-pill">
      <button
        type="button"
        className="pill-secondary"
        aria-expanded={open}
        onClick={() => setOpen((now) => !now)}
      >
        Draft the question for your DSO
      </button>
      {open && <DraftView text={text} />}
    </div>
  );
}

export function Footer({ line }: { line?: string }) {
  return (
    <footer className="page-footer">
      {line !== undefined && <p>{line}</p>}
      <p>{FOOTER_LINE}</p>
    </footer>
  );
}

/** Option cards: a radio group; the arrow keys move between them (design-1 section 3.10). */
export function OptionCards<T extends string>(props: {
  label: string;
  options: readonly { value: T; title: string; line?: string }[];
  value: T | "";
  onChange: (value: T) => void;
  compact?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = props.options.findIndex((option) => option.value === props.value);
  const move = (from: number, by: number) => {
    const next = (from + by + props.options.length) % props.options.length;
    const option = props.options[next];
    if (option === undefined) return;
    props.onChange(option.value);
    refs.current[next]?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={props.label}
      className={props.compact === true ? "options compact" : "options"}
    >
      {props.options.map((option, index) => {
        const checked = option.value === props.value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked || (selected === -1 && index === 0) ? 0 : -1}
            className="option"
            onClick={() => props.onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                event.preventDefault();
                move(index, 1);
              } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                event.preventDefault();
                move(index, -1);
              }
            }}
          >
            <span className="option-text">
              <span className="option-title">{option.title}</span>
              {option.line !== undefined && <span className="option-line">{option.line}</span>}
            </span>
            {checked && (
              <svg
                className="option-check"
                width="17"
                height="17"
                viewBox="0 0 17 17"
                aria-hidden="true"
              >
                <circle cx="8.5" cy="8.5" r="8.5" className="mark-fill" />
                <path d="M5 8.7l2.3 2.3L12 6.3" className="mark-stroke" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

const DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/** Month, day and year typed apart, composed into an ISO date for buildCase. */
export function composeDate(month: string, day: string, year: string): string {
  const m = month.trim();
  const d = day.trim();
  const y = year.trim();
  if (m === "" && d === "" && y === "") return "";
  if (!DATE.test(`${m}/${d}/${y}`)) return `${m}/${d}/${y}`;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function splitDate(iso: string): [string, string, string] {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (parts) return [String(Number(parts[2])), String(Number(parts[3])), parts[1] ?? ""];
  const typed = iso.split("/");
  return [typed[0] ?? "", typed[1] ?? "", typed[2] ?? ""];
}

export function DateField(props: {
  id: string;
  label: string;
  value: string;
  problem?: string | undefined;
  onChange: (value: string) => void;
  /** A day the student may not know: a quiet "I'm not sure" beside the parts. */
  notSure?: { pressed: boolean; onPress: () => void };
  /** What leaving it empty states (SPEC-W2-UNKNOWN point 2). */
  empty?: string | undefined;
}) {
  const [month, day, year] = splitDate(props.value);
  const set = (part: 0 | 1 | 2, text: string) => {
    const next: [string, string, string] = [month, day, year];
    next[part] = text;
    props.onChange(composeDate(...next));
  };
  const problemId = `${props.id}-problem`;
  const described = props.problem === undefined ? {} : { "aria-describedby": problemId };
  return (
    <fieldset className="field-group" data-problem={props.problem !== undefined}>
      <legend className="field-label">{props.label}</legend>
      <div className="date-parts">
        {(["Month", "Day", "Year"] as const).map((name, index) => (
          <label key={name} className={`date-part date-${name.toLowerCase()}`}>
            <span className="date-name">{name}</span>
            <input
              id={index === 0 ? props.id : `${props.id}-${name.toLowerCase()}`}
              className="field"
              inputMode="numeric"
              value={[month, day, year][index] ?? ""}
              {...described}
              onChange={(event) => set(index as 0 | 1 | 2, event.target.value)}
            />
          </label>
        ))}
      </div>
      {props.empty !== undefined && <p className="meta">{props.empty}</p>}
      {props.notSure !== undefined && (
        <p className="not-sure">
          <button
            type="button"
            className="text-button quiet"
            aria-pressed={props.notSure.pressed}
            onClick={props.notSure.onPress}
          >
            I'm not sure
          </button>
        </p>
      )}
      {props.problem !== undefined && (
        <p className="problem" id={problemId}>
          {props.problem}
        </p>
      )}
    </fieldset>
  );
}

export function TextField(props: {
  id: string;
  label: string;
  value: string;
  maxLength?: number;
  inputMode?: "numeric" | "decimal";
  problem?: string | undefined;
  narrow?: boolean;
  onChange: (value: string) => void;
}) {
  const problemId = `${props.id}-problem`;
  const extra = {
    ...(props.problem === undefined ? {} : { "aria-describedby": problemId }),
    ...(props.maxLength === undefined ? {} : { maxLength: props.maxLength }),
    ...(props.inputMode === undefined ? {} : { inputMode: props.inputMode }),
  };
  return (
    <div className="field-group" data-problem={props.problem !== undefined}>
      <label className="field-label" htmlFor={props.id}>
        {props.label}
      </label>
      <input
        id={props.id}
        className={props.narrow === true ? "field narrow" : "field"}
        value={props.value}
        {...extra}
        onChange={(event) => props.onChange(event.target.value)}
      />
      {props.problem !== undefined && (
        <p className="problem" id={problemId}>
          {props.problem}
        </p>
      )}
    </div>
  );
}

/** The four hero marks, each named by its headline (design-1 section 3.10). */
export function HeroMark({ state, name }: { state: string; name: string }) {
  return (
    <svg
      className="hero-mark"
      data-mark={state}
      width="15"
      height="15"
      viewBox="0 0 15 15"
      role="img"
      aria-label={name}
    >
      <circle cx="7.5" cy="7.5" r="6.75" className="mark-ring" />
      {state === "needs_you" && <circle cx="7.5" cy="7.5" r="3.5" className="mark-fill" />}
      {state === "talk_to_dso" && (
        <text x="7.5" y="10.5" textAnchor="middle" className="mark-text">
          ?
        </text>
      )}
      {state === "cannot_tell" && <path d="M4.5 7.5h6" className="mark-bar" />}
    </svg>
  );
}

/** design-1 section 3.6: the quiet completion moment. A filled mark, a drawn check. */
export function CompletionMark() {
  return (
    <svg className="completion" width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
      <circle cx="7.5" cy="7.5" r="7.5" className="mark-fill" />
      <path d="M4.3 7.7l2.1 2.1 4.3-4.4" className="mark-stroke completion-check" />
    </svg>
  );
}
