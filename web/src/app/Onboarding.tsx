import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { PETITION_STATUSES, type DegreeLevel, type PetitionStatus } from "../lib/compute";
import { reportedZone, zoneChoices, type EadFields } from "../lib/caseForm";
import {
  becauseLine,
  categoryName,
  formatDate,
  groupOf,
  levelName,
  questionCopy,
  zoneName,
} from "../lib/labels";
import { fetchStatus } from "../lib/status";
import {
  SECTIONS,
  onboardingSteps,
  programLabel,
  stepLabel,
  type View,
} from "../lib/views/onboarding";
import { emptyProgram, newCase, useStore, type AppCase } from "./caseStore";
import { CompletionMark, DateField, OptionCards, TextField } from "./parts";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const WHOLE = /^\d+$/;
const HOURS = /^\d+(\.\d+)?$/;

function isDay(text: string): boolean {
  if (!ISO.test(text)) return false;
  const made = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(made.getTime()) && made.toISOString().startsWith(text);
}

const YES_NO = [
  { value: "yes", title: "Yes" },
  { value: "no", title: "No" },
] as const;

function yesNo(value: boolean | null | undefined): "yes" | "no" | "" {
  return value === true ? "yes" : value === false ? "no" : "";
}

const PETITION_WORDS: Record<PetitionStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  denied: "Denied",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  revoked: "Revoked",
};

type Problems = Record<string, string>;

/** The problems of one view, by field id. Continue stays enabled (design-1 section 3.11). */
function viewProblems(view: View, held: AppCase): Problems {
  const found: Problems = {};
  const program = view.index === undefined ? undefined : held.programs[view.index];
  const job = view.index === undefined ? undefined : held.fields.employment[view.index];
  const need = (id: string, ok: boolean, sentence: string) => {
    if (!ok) found[id] = sentence;
  };
  const optional = (id: string, text: string, name: string) =>
    need(id, text === "" || isDay(text), `Enter ${name} as a date, or leave it empty.`);
  switch (view.kind) {
    case "status":
      need("choice", held.status !== "", "Choose the status you hold now.");
      break;
    case "level":
      need("choice", program?.level !== "", "Choose the level on your I-20.");
      break;
    case "dates":
      need("start", isDay(program?.start ?? ""), "Enter the start date on your I-20.");
      need("end", isDay(program?.end ?? ""), "Enter the program end date on your I-20.");
      break;
    case "earlier":
      need("choice", program?.earlier !== null, "Choose Yes or No.");
      break;
    case "cpt":
      need("choice", program?.cpt !== null, "Choose Yes or No.");
      break;
    case "cpt-days":
      need(
        "days",
        WHOLE.test((program?.cptDays ?? "").trim()),
        "Enter the days as a whole number, 0 or more.",
      );
      break;
    case "opt":
    case "stem":
    case "capgap":
    case "jobs":
      need("choice", view.id in held.flow, "Choose Yes or No.");
      break;
    case "opt-dates":
    case "stem-dates": {
      const block = view.kind === "opt-dates" ? held.fields.opt : held.fields.stem;
      optional("recommended", block.dso_recommendation_date, "the recommendation date");
      optional("filed", block.i765_filed_date, "the I-765 filed date");
      break;
    }
    case "opt-card":
    case "stem-card": {
      const block = view.kind === "opt-card" ? held.fields.opt : held.fields.stem;
      optional("card-start", block.ead_start, "the card start date");
      optional("card-end", block.ead_end, "the card end date");
      break;
    }
    case "capgap-petition":
      need(
        "filed",
        isDay(held.fields.cap_gap.petition_filed_on),
        "Enter the date the petition was filed.",
      );
      need(
        "requested",
        isDay(held.fields.cap_gap.requested_start),
        "Enter the requested start date.",
      );
      break;
    case "capgap-status":
      need("choice", held.fields.cap_gap.status !== "", "Choose the petition status.");
      break;
    case "capgap-cos":
      need("choice", held.fields.cap_gap.change_of_status !== null, "Choose Yes or No.");
      break;
    case "job":
      need("start", isDay(job?.start ?? ""), "Enter the day the job started.");
      if (held.flow[`still:${job?.key ?? 0}`] !== true) {
        need(
          "end",
          isDay(job?.end ?? ""),
          "Enter the day the job ended, or choose that you still work here.",
        );
      }
      break;
    case "job-hours": {
      const hours = (job?.hours_per_week ?? "").trim();
      need(
        "hours",
        HOURS.test(hours) && Number(hours) <= 168,
        "Enter the hours a week as a number from 0 to 168.",
      );
      break;
    }
    case "job-reported":
    case "job-another":
      need("choice", `${view.kind}:${job?.key ?? 0}` in held.flow, "Choose Yes or No.");
      break;
    default:
      break;
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
  const [zoneOpen, setZoneOpen] = useState(false);
  const output = store.output;
  const questions = held.status === "f1" && output !== undefined ? output.questions : [];
  const views = onboardingSteps(held, questions.length);
  const at = Math.max(
    0,
    views.findIndex((view) => view.id === viewId),
  );
  const view = views[at] as View;

  const update = (changed: AppCase) => {
    setProblems({});
    store.save(changed);
  };
  const setProgram = (index: number, patch: Partial<AppCase["programs"][number]>) => {
    const programs = held.programs.map((program, i) =>
      i === index ? { ...program, ...patch } : program,
    );
    update({ ...held, programs });
  };
  const setFields = (patch: Partial<AppCase["fields"]>) =>
    update({ ...held, fields: { ...held.fields, ...patch } });
  const setFlow = (key: string, value: boolean) =>
    update({ ...held, flow: { ...held.flow, [key]: value } });
  const setEad = (which: "opt" | "stem", patch: Partial<EadFields>) =>
    setFields({ [which]: { ...held.fields[which], ...patch } });

  const go = (index: number) => {
    const next = views[index];
    if (next !== undefined) setViewId(next.id);
    setProblems({});
  };
  const onContinue = () => {
    if (view.kind === "done") {
      const finished = { ...held, onboarded: true };
      update(finished);
      void navigate({ to: "/" });
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
        store.answer(question.id, chosen, question.about);
        if (questions.length > 1) return;
      }
      go(at + 1);
      return;
    }
    const found = viewProblems(view, held);
    if (Object.keys(found).length > 0) {
      setProblems(found);
      const first = Object.keys(found)[0] ?? "";
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    go(at + 1);
  };

  const problem = (id: string) => problems[id];
  const index = view.index ?? 0;
  const program = held.programs[index];
  const job = held.fields.employment[index];

  let body: React.ReactNode = null;
  switch (view.kind) {
    case "status": {
      const packs = status.data?.rulepacks.map((pack) => pack.category) ?? [];
      const options = [
        ...[...new Set(packs)].map((category) => ({
          value: category,
          title: categoryName(category),
        })),
        { value: "other", title: "Another status" },
      ];
      body = (
        <>
          <OptionCards
            label={view.title}
            options={options}
            value={held.status}
            onChange={(value) => update({ ...held, status: value })}
          />
          <p className="zone-line">
            Dates are counted in {zoneName(held.fields.time_zone) || "no time zone yet"}.{" "}
            <button type="button" className="text-button" onClick={() => setZoneOpen(true)}>
              Change
            </button>
          </p>
          {zoneOpen && (
            <div className="field-group">
              <label className="field-label" htmlFor="f-zone">
                Time zone
              </label>
              <select
                id="f-zone"
                className="field select"
                value={held.fields.time_zone}
                onChange={(event) => setFields({ time_zone: event.target.value })}
              >
                {zoneChoices(held.fields.time_zone).map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
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
          onChange={(value) => update({ ...held, statusName: value })}
        />
      );
      break;
    case "level":
      body = (
        <OptionCards<DegreeLevel>
          label={view.title}
          options={(["bachelor", "master", "doctorate"] as const).map((level) => ({
            value: level,
            title: levelName(level),
          }))}
          value={program?.level ?? ""}
          onChange={(level) => setProgram(index, { level })}
        />
      );
      break;
    case "dates":
      body = (
        <div className="field-stack">
          <DateField
            id="f-start"
            label="Start date on the I-20"
            value={program?.start ?? ""}
            problem={problem("start")}
            onChange={(start) => setProgram(index, { start })}
          />
          <DateField
            id="f-end"
            label="Program end date on the I-20"
            value={program?.end ?? ""}
            problem={problem("end")}
            onChange={(end) => setProgram(index, { end })}
          />
        </div>
      );
      break;
    case "name":
      body = (
        <TextField
          id="f-name"
          label="The program's name, in your words"
          value={program?.name ?? ""}
          maxLength={80}
          onChange={(name) => setProgram(index, { name })}
        />
      );
      break;
    case "earlier":
      body = (
        <OptionCards
          label={view.title}
          options={YES_NO}
          value={yesNo(program?.earlier)}
          onChange={(value) => {
            const earlier = value === "yes";
            let programs = held.programs.map((p, i) => (i === index ? { ...p, earlier } : p));
            if (earlier && programs.length === index + 1) {
              const key = Math.max(...programs.map((p) => p.key)) + 1;
              programs = [...programs, emptyProgram(key)];
            }
            if (!earlier) programs = programs.slice(0, index + 1);
            update({ ...held, programs });
          }}
        />
      );
      break;
    case "cpt":
      body = (
        <OptionCards
          label={view.title}
          options={YES_NO}
          value={yesNo(program?.cpt)}
          onChange={(value) => setProgram(index, { cpt: value === "yes" })}
        />
      );
      break;
    case "cpt-days":
      body = (
        <TextField
          id="f-days"
          label="Days of full-time CPT"
          value={program?.cptDays ?? ""}
          inputMode="numeric"
          narrow
          problem={problem("days")}
          onChange={(cptDays) => setProgram(index, { cptDays })}
        />
      );
      break;
    case "opt":
    case "stem":
    case "capgap":
    case "jobs": {
      const key = view.kind;
      body = (
        <OptionCards
          label={view.title}
          options={YES_NO}
          value={yesNo(held.flow[key])}
          onChange={(value) => {
            const on = value === "yes";
            const flow = { ...held.flow, [key]: on };
            const fields = { ...held.fields };
            if (key === "opt") fields.opt_on = on;
            if (key === "opt" && !on) fields.stem_on = false;
            if (key === "stem") fields.stem_on = on;
            if (key === "capgap") fields.cap_gap_on = on;
            if (key === "jobs") {
              fields.employment =
                on && fields.employment.length === 0
                  ? [
                      {
                        key: fields.next_key,
                        start: "",
                        end: "",
                        hours_per_week: "",
                        employer_reported: false,
                      },
                    ]
                  : on
                    ? fields.employment
                    : [];
              if (on && held.fields.employment.length === 0) fields.next_key += 1;
            }
            update({ ...held, flow, fields });
          }}
        />
      );
      break;
    }
    case "opt-dates":
    case "stem-dates": {
      const which = view.kind === "opt-dates" ? "opt" : "stem";
      const block = held.fields[which];
      body = (
        <div className="field-stack">
          <DateField
            id="f-recommended"
            label="The day your DSO recommended it"
            value={block.dso_recommendation_date}
            problem={problem("recommended")}
            onChange={(d) => setEad(which, { dso_recommendation_date: d })}
          />
          <DateField
            id="f-filed"
            label="The day your I-765 was filed"
            value={block.i765_filed_date}
            problem={problem("filed")}
            onChange={(d) => setEad(which, { i765_filed_date: d })}
          />
        </div>
      );
      break;
    }
    case "opt-card":
    case "stem-card": {
      const which = view.kind === "opt-card" ? "opt" : "stem";
      const block = held.fields[which];
      body = (
        <div className="field-stack">
          <DateField
            id="f-card-start"
            label="Card start date"
            value={block.ead_start}
            problem={problem("card-start")}
            onChange={(d) => setEad(which, { ead_start: d })}
          />
          <DateField
            id="f-card-end"
            label="Card end date"
            value={block.ead_end}
            problem={problem("card-end")}
            onChange={(d) => setEad(which, { ead_end: d })}
          />
        </div>
      );
      break;
    }
    case "capgap-petition": {
      const gap = held.fields.cap_gap;
      body = (
        <div className="field-stack">
          <DateField
            id="f-filed"
            label="The day it was filed"
            value={gap.petition_filed_on}
            problem={problem("filed")}
            onChange={(d) => setFields({ cap_gap: { ...gap, petition_filed_on: d } })}
          />
          <DateField
            id="f-requested"
            label="The start date it asks for"
            value={gap.requested_start}
            problem={problem("requested")}
            onChange={(d) => setFields({ cap_gap: { ...gap, requested_start: d } })}
          />
        </div>
      );
      break;
    }
    case "capgap-status": {
      const gap = held.fields.cap_gap;
      body = (
        <OptionCards<PetitionStatus>
          label={view.title}
          options={PETITION_STATUSES.map((value) => ({ value, title: PETITION_WORDS[value] }))}
          value={gap.status}
          onChange={(value) => setFields({ cap_gap: { ...gap, status: value } })}
        />
      );
      break;
    }
    case "capgap-cos": {
      const gap = held.fields.cap_gap;
      body = (
        <OptionCards
          label={view.title}
          options={YES_NO}
          value={yesNo(gap.change_of_status)}
          onChange={(value) =>
            setFields({ cap_gap: { ...gap, change_of_status: value === "yes" } })
          }
        />
      );
      break;
    }
    case "job": {
      const key = job?.key ?? 0;
      const still = held.flow[`still:${key}`] === true;
      const setJob = (patch: Partial<NonNullable<typeof job>>) =>
        setFields({
          employment: held.fields.employment.map((j, i) => (i === index ? { ...j, ...patch } : j)),
        });
      body = (
        <div className="field-stack">
          <DateField
            id="f-start"
            label="The day it started"
            value={job?.start ?? ""}
            problem={problem("start")}
            onChange={(start) => setJob({ start })}
          />
          {!still && (
            <DateField
              id="f-end"
              label="The day it ended"
              value={job?.end ?? ""}
              problem={problem("end")}
              onChange={(end) => setJob({ end })}
            />
          )}
          <OptionCards
            label="Do you still work here?"
            compact
            options={[
              { value: "still", title: "I still work here" },
              { value: "ended", title: "It ended" },
            ]}
            value={held.flow[`still:${key}`] === undefined ? "" : still ? "still" : "ended"}
            onChange={(value) => {
              const employment = held.fields.employment.map((j, i) =>
                i === index && value === "still" ? { ...j, end: "" } : j,
              );
              update({
                ...held,
                flow: { ...held.flow, [`still:${key}`]: value === "still" },
                fields: { ...held.fields, employment },
              });
            }}
          />
        </div>
      );
      break;
    }
    case "job-hours":
      body = (
        <TextField
          id="f-hours"
          label="Hours a week"
          value={job?.hours_per_week ?? ""}
          inputMode="decimal"
          narrow
          problem={problem("hours")}
          onChange={(hours) =>
            setFields({
              employment: held.fields.employment.map((j, i) =>
                i === index ? { ...j, hours_per_week: hours } : j,
              ),
            })
          }
        />
      );
      break;
    case "job-reported": {
      const key = `job-reported:${job?.key ?? 0}`;
      body = (
        <OptionCards
          label={view.title}
          options={YES_NO}
          value={yesNo(held.flow[key])}
          onChange={(value) =>
            update({
              ...held,
              flow: { ...held.flow, [key]: value === "yes" },
              fields: {
                ...held.fields,
                employment: held.fields.employment.map((j, i) =>
                  i === index ? { ...j, employer_reported: value === "yes" } : j,
                ),
              },
            })
          }
        />
      );
      break;
    }
    case "job-another": {
      const key = `job-another:${job?.key ?? 0}`;
      body = (
        <OptionCards
          label={view.title}
          options={YES_NO}
          value={yesNo(held.flow[key])}
          onChange={(value) => {
            const more = value === "yes";
            let employment = held.fields.employment;
            let next = held.fields.next_key;
            if (more && employment.length === index + 1) {
              employment = [
                ...employment,
                { key: next, start: "", end: "", hours_per_week: "", employer_reported: false },
              ];
              next += 1;
            }
            if (!more) employment = employment.slice(0, index + 1);
            update({
              ...held,
              flow: { ...held.flow, [key]: more },
              fields: { ...held.fields, employment, next_key: next },
            });
          }}
        />
      );
      break;
    }
    case "questions": {
      const question = questions[0];
      const copy = question === undefined ? null : questionCopy(question.id);
      if (question === undefined || store.busy) {
        body = <p className="busy-line">Working it out from your dates.</p>;
      } else {
        body = (
          <>
            <p className="because">{becauseLine(question.because)}</p>
            <OptionCards
              label={copy?.ask ?? "Duly's question"}
              options={[
                { value: "yes", title: copy?.yes ?? "Yes" },
                { value: "no", title: copy?.no ?? "No" },
              ]}
              value={yesNo(held.flow[`question:${question.id}`])}
              onChange={(value) => setFlow(`question:${question.id}`, value === "yes")}
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
    question !== undefined
      ? (questionCopy(question.id)?.ask ?? "Duly has a question about what you entered.")
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
          <span className="step-label">{stepLabel(view)}</span>
        </div>
      </header>
      <main className="onb-view step-drop" key={view.id}>
        <h1 className="onb-title">{title}</h1>
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

function DoneLines({ held }: { held: AppCase }) {
  const { output } = useStore();
  const lines: string[] = [];
  if (held.status === "f1") {
    lines.push("F-1");
    for (const program of held.programs) {
      const name = program.name.trim() !== "" ? program.name.trim() : programLabel(program);
      const span =
        isDay(program.start) && isDay(program.end)
          ? ` · ${formatDate(program.start)} to ${formatDate(program.end)}`
          : "";
      lines.push(`${name}${span}`);
    }
    if (output !== undefined && output.computed.length > 0) {
      const groups = [...new Set(output.computed.map((item) => groupOf(item.id)))];
      lines.push(`Duly computes: ${groups.join(", ")}`);
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
