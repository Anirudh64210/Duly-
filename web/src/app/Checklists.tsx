import { useState } from "react";

import { stemStepDraft } from "../lib/drafts";
import type { EngineOutput, F1Case } from "../lib/compute";
import { formatDate } from "../lib/labels";
import {
  B2_LINE,
  CHECKLIST_FOOTER,
  SCHOOL_LINE,
  checklistView,
  type StepView,
  type StepsView,
} from "../lib/views/checklists";
import { barShare } from "./Home";
import { useStore } from "./caseStore";
import { CompletionMark, Disclose, DraftPill, Footer, RuleBlocks } from "./parts";

// design-1 section 8: Checklists.

function ChipCheck() {
  return (
    <svg className="chip-check" width="11" height="11" viewBox="0 0 11 11" aria-hidden="true">
      <path d="M2 5.8l2.2 2.2 4.8-5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function StepRow(props: {
  step: StepView;
  ticked: boolean;
  output: EngineOutput;
  sent: F1Case;
  onToggle: (step: StepView, ticked: boolean) => void;
}) {
  const { step, ticked, output } = props;
  const confirmed = step.confirmedOn !== null;
  const citation = step.meta.split(" · ")[1] ?? "the rule";
  return (
    <div className="step" data-confirmed={confirmed}>
      <input
        type="checkbox"
        className="checkbox"
        checked={ticked}
        aria-label={step.label}
        onChange={(event) => props.onToggle(step, event.target.checked)}
      />
      <div className="step-text">
        <Disclose label={step.label} className={confirmed ? "step-label struck" : "step-label"}>
          <RuleBlocks ids={step.rule_ids} output={output} />
        </Disclose>
        {step.meta !== "" && <p className="step-meta">{step.meta}</p>}
        {step.school && (
          <>
            <p className="caution-line">{SCHOOL_LINE}</p>
            <DraftPill text={stemStepDraft(props.sent, citation)} />
          </>
        )}
      </div>
      {confirmed && step.confirmedOn !== null && (
        <span className="step-confirmed">Confirmed by you, {formatDate(step.confirmedOn)}</span>
      )}
    </div>
  );
}

function Steps(props: { view: StepsView; output: EngineOutput; sent: F1Case }) {
  const { view, output } = props;
  const { answer, withdraw } = useStore();
  // The box shows the person's own tick at once; the count follows the engine's answer.
  // Ticks are kept against the output they were made on, so a new output drops them.
  const [held, setHeld] = useState<{ on: EngineOutput; ticks: Record<string, boolean> }>({
    on: output,
    ticks: {},
  });
  const ticks = held.on === output ? held.ticks : {};
  const onToggle = (step: StepView, ticked: boolean) => {
    setHeld({ on: output, ticks: { ...ticks, [step.question]: ticked } });
    if (ticked) answer(step.question, true, undefined);
    else withdraw(step.question);
  };
  return (
    <>
      <div className="checklist-head">
        {view.eyebrow !== "" && <p className="checklist-eyebrow">{view.eyebrow}</p>}
        <h1 className="checklist-title">{view.title}</h1>
        {view.b2 && <p className="b2-line">{B2_LINE}</p>}
        <div className="checklist-bar-row">
          <span className="bar checklist-bar" aria-hidden="true">
            <span
              className="bar-fill"
              style={{ width: `${barShare(view.confirmed, view.total) * 100}%` }}
            />
          </span>
          <span className="checklist-bar-line">{view.barLine}</span>
        </div>
        {view.allConfirmed !== null && (
          <p className="all-confirmed">
            <CompletionMark /> {view.allConfirmed}
          </p>
        )}
      </div>
      <div className="steps">
        {view.steps.map((step) => (
          <StepRow
            key={step.id}
            step={step}
            ticked={ticks[step.question] ?? step.confirmedOn !== null}
            output={output}
            sent={props.sent}
            onToggle={onToggle}
          />
        ))}
      </div>
    </>
  );
}

export function Checklists() {
  const { output, body, busy } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  if (busy || output === undefined || body === null) {
    return (
      <div className="page">
        <p className="busy-line">Working it out from your dates.</p>
        <Footer line={CHECKLIST_FOOTER} />
      </div>
    );
  }
  const shown = checklistView(output, selected);
  return (
    <div className="page">
      <div className="chips" role="group" aria-label="Paths">
        {shown.chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            className="chip"
            aria-pressed={chip.key === shown.selected}
            data-next={chip.nextFiling}
            onClick={() => setSelected(chip.key)}
          >
            {chip.label}
            {chip.finished && <ChipCheck />}
          </button>
        ))}
      </div>
      {shown.view !== null && (
        <section className="checklist drop-in" key={shown.selected}>
          {shown.view.kind === "steps" ? (
            <Steps view={shown.view} output={output} sent={body} />
          ) : (
            <>
              <h1 className="checklist-title">{shown.view.title}</h1>
              {shown.view.line !== "" && <p className="finished-line">{shown.view.line}</p>}
              <div className="finished-lines">
                {shown.view.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </>
          )}
        </section>
      )}
      <div className="spacer" />
      <Footer line={CHECKLIST_FOOTER} />
    </div>
  );
}
