import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { reportedZone, zoneChoices } from "../lib/caseForm";
import {
  becauseLine,
  categoryName,
  formatDate,
  groupOf,
  questionCopy,
  questionTitle,
} from "../lib/labels";
import { typedDates } from "../lib/records";
import { LANDMARKS } from "../lib/shots";
import { fetchStatus } from "../lib/status";
import {
  NOT_SURE,
  SECTIONS,
  applyFlow,
  authLabel,
  chosen,
  fieldQuestion,
  listQuestion,
  markUnsure,
  onboardingSteps,
  programLabel,
  setField,
  stateWhole,
  unsureKey,
  value,
  type FieldSpec,
  type View,
} from "../lib/views/onboarding";
import { newCase, useStore, type AppCase } from "./caseStore";
import { CompletionMark, DateField, OptionCards, TextField } from "./parts";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const NUMBER = /^\d+(\.\d+)?$/;

function isDay(text: string): boolean {
  if (!ISO.test(text)) return false;
  const made = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(made.getTime()) && made.toISOString().startsWith(text);
}

function yesNo(given: boolean | undefined): "yes" | "no" | "" {
  return given === true ? "yes" : given === false ? "no" : "";
}

type Problems = Record<string, string>;

function fieldId(spec: FieldSpec): string {
  return `f-${spec.record}-${spec.name}`;
}

/** A label inside a sentence: its first word in lower case, names such as DSO and I-20 kept. */
function inSentence(label: string): string {
  const [first = "", ...rest] = label.split(" ");
  const word = /^[A-Z][a-z']*$/.test(first) ? first.toLowerCase() : first;
  return [word, ...rest].join(" ");
}

function fieldProblem(spec: FieldSpec, entered: string, unsure: boolean): string | null {
  const text = entered.trim();
  if (text === "") {
    return spec.optional === true || unsure ? null : `Enter ${inSentence(spec.label)}.`;
  }
  if (spec.type === "date" && !isDay(text)) return `Enter ${inSentence(spec.label)} as a date.`;
  if (spec.type === "number" && !(NUMBER.test(text) && Number(text) <= 168)) {
    return "Enter the hours a week as a number from 0 to 168.";
  }
  if (spec.pattern !== undefined && !spec.pattern.test(text)) {
    return "Enter the code as two digits, a point, and four digits, or leave it empty.";
  }
  return null;
}

/** The problems of one view, by field id. Continue stays enabled (design-1 section 3.11). */
function viewProblems(view: View, held: AppCase): Problems {
  const found: Problems = {};
  if (view.kind === "status" && held.status === "")
    found.choice = "Choose the status you hold now.";
  if (view.kind === "choice" && chosen(held, view) === "") {
    const basis = view.field === "basis_program" && held.flow[`unsure:${view.id}`] === "yes";
    if (!basis) found.choice = "Choose an answer.";
  }
  if (
    (view.kind === "flow" || view.kind === "review") &&
    (held.flow[view.flowKey ?? ""] ?? "") === ""
  ) {
    found.choice = "Choose an answer.";
  }
  for (const spec of view.fields ?? []) {
    const unsure = spec.notSure === true && held.flow[unsureKey(spec)] === "yes";
    const problem = fieldProblem(spec, value(held, spec.record, spec.name), unsure);
    if (problem !== null) found[fieldId(spec)] = problem;
  }
  return found;
}

export function Onboarding() {
  const store = useStore();
  const navigate = useNavigate();
  const status = useQuery({ queryKey: ["status"], queryFn: () => fetchStatus(), retry: false });
  const [fresh] = useState<AppCase>(() => newCase(reportedZone()));
  const held = store.held ?? fresh;
  const [viewId, setViewId] = useState("status");
  const [problems, setProblems] = useState<Problems>({});
  const output = store.output;
  const questions = held.status === "f1" && output !== undefined ? output.questions : [];
  // While an answer is computed the output is not in yet; the questions view stays and
  // shows its busy line instead of the list falling back to the first view.
  const waiting = viewId === "questions" && store.busy;
  const views = onboardingSteps(held, waiting ? Math.max(1, questions.length) : questions.length);
  const at = Math.max(
    0,
    views.findIndex((view) => view.id === viewId),
  );
  const view = views[at] as View;

  const first = view.kind === "questions" && !store.busy ? questions[0] : undefined;
  // SPEC-W2-UNKNOWN point 43: a field is sent as typed, so each keystroke is computed. The
  // view being answered stays while it is, rather than the busy line taking its place.
  const [answering, setAnswering] = useState<string | null>(null);
  const askedId = first?.id ?? (view.kind === "questions" && store.busy ? answering : null);
  const asked = askedId === null ? null : fieldQuestion(held, askedId);
  const whole = first === undefined || asked !== null ? null : listQuestion(first.id);
  // A question about a record's field is answered in the view that asks for that field.
  const shown = asked ?? view;

  const update = (changed: AppCase) => {
    setProblems({});
    setAnswering(asked === null ? null : askedId);
    store.save(changed);
  };
  const go = (index: number) => {
    const next = views[index];
    if (next !== undefined) setViewId(next.id);
    setProblems({});
  };
  const confirm = (changed: AppCase, id: string, given: boolean, about: Record<string, unknown>) =>
    ({
      ...changed,
      confirmations: {
        ...changed.confirmations,
        [id]: { answer: given, on: store.today(), about },
      },
    }) satisfies AppCase;

  const onContinue = () => {
    if (view.kind === "done") {
      update({ ...held, onboarded: true });
      void navigate({ to: "/" });
      return;
    }
    if (view.kind === "review" && held.flow.review === "change") {
      update({ ...held, flow: { ...held.flow, review: "" } });
      go(1);
      return;
    }
    if (view.kind === "questions" && asked !== null) {
      const found = viewProblems(asked, held);
      if (Object.keys(found).length > 0) {
        setProblems(found);
        return;
      }
      // Still not known: the day stays out, the verdict stays Can't tell yet, and Home asks.
      const unknown = (asked.fields ?? []).some(
        (spec) => value(held, spec.record, spec.name) === "",
      );
      if (questions.length > 1 && !unknown) return;
      go(at + 1);
      return;
    }
    if (view.kind === "questions" && whole !== null) {
      const stated = held.draft.complete[whole.kind] !== undefined;
      if (!stated && held.flow[`question:complete.${whole.kind}`] !== "no") {
        setProblems({ choice: "Choose an answer." });
        return;
      }
      // Not yet: the list stays unstated, the verdict stays Can't tell yet, and Home asks.
      if (stated && questions.length > 1) return;
      go(at + 1);
      return;
    }
    if (view.kind === "questions") {
      const question = questions[0];
      const chosen = held.flow[`question:${question?.id ?? ""}`];
      if (question !== undefined && chosen === undefined) {
        setProblems({ choice: "Choose an answer." });
        return;
      }
      if (question !== undefined && chosen !== undefined) {
        store.answer(question.id, chosen === "yes", question.about);
        if (questions.length > 1) return;
      }
      go(at + 1);
      return;
    }
    const found = viewProblems(view, held);
    if (Object.keys(found).length > 0) {
      setProblems(found);
      const first = Object.keys(found)[0] ?? "";
      document.getElementById(first === "choice" ? "" : first)?.focus();
      return;
    }
    go(at + 1);
  };

  const typed = store.body === null ? {} : typedDates(store.body);
  let body: React.ReactNode = null;
  switch (shown.kind) {
    case "status": {
      const packs = status.data?.rulepacks.map((pack) => pack.category) ?? [];
      const options = [
        ...[...new Set(packs)].map((category) => ({
          value: category,
          title: categoryName(category),
        })),
        { value: "other", title: "Another status" },
      ];
      // ui-1 point 4: never "Another status" alone while the rule list is not in.
      body =
        packs.length > 0 ? (
          <OptionCards
            label={view.title}
            options={options}
            value={held.status}
            onChange={(chosen) => update({ ...held, status: chosen })}
          />
        ) : status.isPending ? (
          <p className="meta">Loading the statuses Duly holds rules for.</p>
        ) : (
          <div className="field-group">
            <p>Duly could not load its rules, so it cannot list the statuses it covers.</p>
            <button type="button" className="pill-secondary" onClick={() => void status.refetch()}>
              Try again
            </button>
          </div>
        );
      break;
    }
    case "status-name":
      body = (
        <TextField
          id="f-name"
          label="Your status, in your words"
          value={held.statusName}
          maxLength={40}
          onChange={(name) => update({ ...held, statusName: name })}
        />
      );
      break;
    case "flow":
    case "review": {
      const key = view.flowKey ?? "";
      body = (
        <>
          {view.kind === "review" && <RecordLines held={held} />}
          {key === "i20" && held.flow.i20 === "add" && (
            <p className="meta">
              Reading an I-20 on this computer comes with documents. For now, type each field in.
            </p>
          )}
          <OptionCards
            label={view.title}
            options={view.options ?? []}
            value={held.flow[key] ?? ""}
            onChange={(chosen) => update(applyFlow(held, key, chosen, store.today()))}
          />
        </>
      );
      if (key === "typed") {
        const chosen = held.flow.typed;
        body = (
          <OptionCards
            label={view.title}
            options={view.options ?? []}
            value={chosen ?? ""}
            onChange={(given) =>
              update(
                confirm(
                  applyFlow(held, key, given, store.today()),
                  "typed_dates.from_documents",
                  given === "yes",
                  typed,
                ),
              )
            }
          />
        );
      }
      break;
    }
    case "choice": {
      const record = shown.record ?? "";
      const field = shown.field ?? "";
      const current = chosen(held, shown);
      const unsure = current === NOT_SURE || held.flow[`unsure:${shown.id}`] === "yes";
      body = (
        <>
          <OptionCards
            label={shown.title}
            options={shown.options ?? []}
            value={current === NOT_SURE ? "" : current}
            onChange={(chosen) =>
              update({
                ...setField(held, record, field, chosen),
                flow: { ...held.flow, [`unsure:${shown.id}`]: "" },
              })
            }
          />
          {shown.notSure === true && (
            <p className="not-sure">
              <button
                type="button"
                className="text-button quiet"
                aria-pressed={unsure}
                onClick={() =>
                  update({
                    ...setField(held, record, field, NOT_SURE),
                    flow: { ...held.flow, [`unsure:${shown.id}`]: "yes" },
                  })
                }
              >
                I'm not sure
              </button>
            </p>
          )}
        </>
      );
      break;
    }
    case "fields":
      body = (
        <div className="field-stack">
          {(shown.fields ?? []).map((spec) => {
            const id = fieldId(spec);
            const shown = value(held, spec.record, spec.name);
            const onChange = (entered: string) => {
              const changed = setField(held, spec.record, spec.name, entered);
              update(spec.notSure === true ? markUnsure(changed, spec, false) : changed);
            };
            const notSure =
              spec.notSure === true
                ? {
                    notSure: {
                      pressed: held.flow[unsureKey(spec)] === "yes",
                      onPress: () => update(markUnsure(held, spec, true)),
                    },
                  }
                : {};
            return spec.type === "date" ? (
              <DateField
                key={id}
                id={id}
                label={spec.label}
                value={shown}
                problem={problems[id]}
                onChange={onChange}
                empty={spec.empty}
                {...notSure}
              />
            ) : (
              <TextField
                key={id}
                id={id}
                label={spec.label}
                value={shown}
                maxLength={120}
                {...(spec.type === "number" ? { inputMode: "decimal" as const, narrow: true } : {})}
                problem={problems[id]}
                onChange={onChange}
              />
            );
          })}
        </div>
      );
      break;
    case "typed-check":
      body = (
        <div className="field-stack">
          {Object.entries(typed).map(([name, day]) => {
            const id = `typed_dates.checked.${name}`;
            const given = held.confirmations[id];
            return (
              <OptionCards
                key={name}
                label={`${dateName(held, name)}: ${formatDate(day)}`}
                compact
                options={[
                  { value: "yes", title: `${dateName(held, name)}, ${formatDate(day)}: checked` },
                  { value: "no", title: "Not checked" },
                ]}
                value={yesNo(given?.answer)}
                onChange={(chosen) => update(confirm(held, id, chosen === "yes", { [name]: day }))}
              />
            );
          })}
        </div>
      );
      break;
    case "zone":
      body = (
        <div className="field-group">
          <label className="field-label" htmlFor="f-zone">
            Time zone
          </label>
          <select
            id="f-zone"
            className="field select"
            value={held.time_zone}
            onChange={(event) => update({ ...held, time_zone: event.target.value })}
          >
            {zoneChoices(held.time_zone).map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>
      );
      break;
    case "questions": {
      const question = questions[0];
      const copy = question === undefined ? null : questionCopy(question.id);
      if (question === undefined || store.busy) {
        body = <p className="busy-line">Working it out from your dates.</p>;
      } else if (whole !== null) {
        body = (
          <>
            <p className="because">{becauseLine(question.because, question.about)}</p>
            <OptionCards
              label={whole.title}
              options={[
                { value: "yes", title: "Yes, every one is in" },
                { value: "no", title: "Not yet" },
              ]}
              value={
                held.draft.complete[whole.kind] !== undefined
                  ? "yes"
                  : (held.flow[`question:${question.id}`] ?? "")
              }
              onChange={(chosen) =>
                update(
                  chosen === "yes"
                    ? stateWhole(held, whole.kind, store.today())
                    : { ...held, flow: { ...held.flow, [`question:${question.id}`]: "no" } },
                )
              }
            />
          </>
        );
      } else {
        body = (
          <>
            <p className="because">{becauseLine(question.because, question.about)}</p>
            <OptionCards
              label={copy?.ask ?? "Duly's question"}
              options={[
                { value: "yes", title: copy?.yes ?? "Yes" },
                { value: "no", title: copy?.no ?? "No" },
              ]}
              value={held.flow[`question:${question.id}`] ?? ""}
              onChange={(chosen) =>
                update({ ...held, flow: { ...held.flow, [`question:${question.id}`]: chosen } })
              }
            />
          </>
        );
      }
      break;
    }
    case "done":
      body = <DoneLines held={held} />;
      break;
  }

  const question = view.kind === "questions" ? questions[0] : undefined;
  const title =
    asked !== null
      ? asked.title
      : whole !== null
        ? whole.title
        : question !== undefined
          ? questionTitle(question.id)
          : view.title;
  const sectionFill = view.kind === "done" ? SECTIONS.length : view.section;
  return (
    <div className="onboarding">
      <header className="onb-header rise">
        <p className="wordmark onb-wordmark">
          Duly<span className="dot">.</span>
        </p>
        <div className="pips-row">
          <div className="pips" aria-hidden="true">
            {SECTIONS.map((name, i) => (
              <span key={name} className="pip" data-filled={i < sectionFill} />
            ))}
          </div>
          <span className="step-label">
            {view.kind === "done" ? "Done" : `Step ${view.section} of ${SECTIONS.length}`}
          </span>
        </div>
      </header>
      <main className="onb-view step-drop" key={view.id}>
        <p className="meta">{view.kind === "done" ? "" : SECTIONS[view.section - 1]}</p>
        <h1 className="onb-title" data-landmark={LANDMARKS["/welcome"]}>
          {title}
        </h1>
        {problems.choice !== undefined && (
          <p className="problem" role="alert">
            {problems.choice}
          </p>
        )}
        {Object.keys(problems).length > 0 && problems.choice === undefined && (
          <p className="sr-only" role="alert">
            {Object.values(problems)[0]}
          </p>
        )}
        {body}
        {view.why !== "" && <p className="why">{view.why}</p>}
        {view.kind === "done" && (
          <p className="meta">Everything lives in Your case and can be changed any time.</p>
        )}
        <div className="onb-actions">
          <button
            type="button"
            className="text-button back"
            onClick={() => go(at - 1)}
            disabled={at === 0}
          >
            Back
          </button>
          <button type="button" className="pill-primary" onClick={onContinue}>
            {view.kind === "done" ? "Open Duly" : "Continue"}
          </button>
        </div>
      </main>
    </div>
  );
}

/** A typed date named by what it is and the record it belongs to. */
function dateName(held: AppCase, name: string): string {
  const [id = "", field = ""] = name.split(".");
  const record = held.draft.records.find((r) => r.id === id);
  const what = field.replaceAll("_", " ");
  if (record?.kind === "program") return `${programLabel(held, id)}, ${what}`;
  if (record?.kind === "authorization") return `${authLabel(held, id)}, ${what}`;
  return what;
}

/** Step 5 question 1: the record in order, each date as entered. */
function RecordLines({ held }: { held: AppCase }) {
  const lines: string[] = [];
  for (const record of held.draft.records) {
    const days = Object.entries(record.fields)
      .filter(([, v]) => typeof v === "string" && isDay(v))
      .map(([name, v]) => `${name.replaceAll("_", " ")} ${formatDate(v as string)}`);
    const name =
      record.kind === "program"
        ? programLabel(held, record.id)
        : record.kind === "authorization"
          ? authLabel(held, record.id)
          : record.kind === "employer"
            ? null
            : record.kind.replaceAll("_", " ");
    if (name === null) continue;
    lines.push([name, ...days].join(" · "));
  }
  return (
    <div className="done-lines">
      {lines.map((line, i) => (
        <p key={`${i}:${line}`} className="done-line">
          {line}
        </p>
      ))}
    </div>
  );
}

function DoneLines({ held }: { held: AppCase }) {
  const { output } = useStore();
  const lines: string[] = [];
  if (held.status === "f1") {
    lines.push("F-1");
    for (const record of held.draft.records.filter((r) => r.kind === "program")) {
      const start = value(held, record.id, "start_date");
      const end = value(held, record.id, "end_date");
      const span =
        isDay(start) && isDay(end) ? ` · ${formatDate(start)} to ${formatDate(end)}` : "";
      lines.push(`${programLabel(held, record.id)}${span}`);
    }
    if (output !== undefined && output.upcoming.length > 0) {
      const groups = [...new Set(output.upcoming.map((item) => groupOf(item.id)))];
      lines.push(`Duly watches: ${groups.join(", ")}`);
    }
  } else if (held.status === "other") {
    if (held.statusName.trim() !== "") lines.push(held.statusName.trim());
    lines.push("Duly holds no rules for the status you named.");
  } else {
    lines.push(categoryName(held.status));
    lines.push(`Duly holds no rules for ${categoryName(held.status)} dates.`);
  }
  return (
    <div className="done-lines">
      <p className="completion-line">
        <CompletionMark />
        <span>Every answer is in.</span>
      </p>
      {lines.map((line) => (
        <p key={line} className="done-line">
          {line}
        </p>
      ))}
    </div>
  );
}
