import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";

import type { EngineOutput, Stage } from "../lib/compute";
import { READING_TAG, formatDate, formatValue } from "../lib/labels";
import { fetchStatus } from "../lib/status";
import { stageItemName } from "../lib/views/stages";
import {
  CHECKLIST_LINK,
  MARK_NAMES,
  SETTINGS_LINK,
  TIMELINE_FOOTER,
  TIMELINE_META,
  timelineView,
  type Mark,
  type TimelineRow,
} from "../lib/views/timeline";
import { barShare } from "./Home";
import { useStore } from "./caseStore";
import { Chevron, Disclose, Footer, HeroMark, RuleBlocks, Working } from "./parts";

// design-1 section 7: Timeline.

const EMPLOYER_REPORT_RULE = "opt.report_employer_within_days";

function PhaseMark({ mark }: { mark: Mark }) {
  const name = MARK_NAMES[mark];
  if (mark === "now") {
    return (
      <span className="now-tag" role="img" aria-label={name}>
        NOW
      </span>
    );
  }
  if (mark === "dso") return <HeroMark state="talk_to_dso" name={name} />;
  if (mark === "done") {
    return (
      <svg
        className="phase-mark"
        data-mark="done"
        width="15"
        height="15"
        viewBox="0 0 15 15"
        role="img"
        aria-label={name}
      >
        <circle cx="7.5" cy="7.5" r="7.5" className="mark-fill" />
        <path d="M4.3 7.7l2.1 2.1 4.3-4.4" className="mark-stroke" />
      </svg>
    );
  }
  return (
    <svg
      className="phase-mark"
      data-mark={mark}
      width="15"
      height="15"
      viewBox="0 0 15 15"
      role="img"
      aria-label={name}
    >
      <circle cx="7.5" cy="7.5" r="3.25" className={mark === "next" ? "ring-next" : "ring-later"} />
    </svg>
  );
}

function ItemLines({ ids, stage, output }: { ids: string[]; stage: Stage; output: EngineOutput }) {
  return (
    <>
      {ids.map((id) => {
        const item = output.computed.find((entry) => entry.id === id);
        if (item !== undefined) {
          return (
            <div key={id} className="item">
              <p className="item-line">
                <span className="item-name">{stageItemName(id, stage)}</span>
                <span className="item-value">
                  {formatValue(item.value, item.unit)}
                  {item.reading && <span className="reading"> · {READING_TAG}</span>}
                </span>
              </p>
              <Disclose label="How Duly counted">
                <Working item={item} output={output} />
              </Disclose>
            </div>
          );
        }
        const entry = output.upcoming.find((ahead) => ahead.id === id);
        if (entry === undefined) return null;
        return (
          <div key={id} className="item">
            <p className="item-line">
              <span className="item-name">{stageItemName(id, stage)}</span>
              <span className="item-value">
                {formatDate(entry.date)}
                {entry.reading && <span className="reading"> · {READING_TAG}</span>}
              </span>
            </p>
            <Disclose label="Rules used">
              <RuleBlocks ids={entry.rule_ids} output={output} />
            </Disclose>
          </div>
        );
      })}
    </>
  );
}

function PhaseRow(props: {
  row: TimelineRow;
  output: EngineOutput;
  open: boolean;
  toggle: () => void;
}) {
  const { row, output, open } = props;
  const panel = useId();
  const current = row.mark === "now" || row.mark === "dso";
  return (
    <div className="phase" data-mark={row.mark} data-open={open}>
      <button
        type="button"
        className="phase-head"
        aria-expanded={open}
        aria-controls={panel}
        onClick={props.toggle}
      >
        <span className="phase-mark-col">
          <PhaseMark mark={row.mark} />
        </span>
        <span className="row-text">
          <span className="phase-title">{row.title}</span>
          {row.meta !== "" && <span className="row-meta">{row.meta}</span>}
          {row.bar !== null && (
            <span className="bar phase-bar" aria-hidden="true">
              <span
                className="bar-fill"
                style={{ width: `${barShare(row.bar.days_in, row.bar.days_total) * 100}%` }}
              />
            </span>
          )}
        </span>
        <Chevron />
      </button>
      {open && (
        <div className={current ? "phase-open current drop-in" : "phase-open drop-in"} id={panel}>
          {row.application !== null && (
            <>
              <p className="application-eyebrow">APPLICATION</p>
              <p>{row.application}</p>
            </>
          )}
          {row.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {row.stage !== null && row.items.length > 0 && (
            <ItemLines ids={row.items} stage={row.stage} output={output} />
          )}
          {current && row.stage?.rule_ids.includes(EMPLOYER_REPORT_RULE) && (
            <RuleBlocks ids={[EMPLOYER_REPORT_RULE]} output={output} />
          )}
          {row.checklist && (
            <a className="link" href="#/checklists">
              {CHECKLIST_LINK}
            </a>
          )}
          {row.settings && (
            <a className="link" href="#/settings">
              {SETTINGS_LINK}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function Phases({ output }: { output: EngineOutput }) {
  const status = useQuery({ queryKey: ["status"], queryFn: () => fetchStatus(), retry: false });
  const view = timelineView(output, status.data ?? null);
  const first = view.rows.find((row) => row.mark === "now" || row.mark === "dso");
  const [open, setOpen] = useState<string | null>(first?.key ?? null);
  return (
    <div className="phases rise d1">
      {view.rows.map((row) => (
        <PhaseRow
          key={row.key}
          row={row}
          output={output}
          open={open === row.key}
          toggle={() => setOpen((now) => (now === row.key ? null : row.key))}
        />
      ))}
    </div>
  );
}

export function Timeline() {
  const { output, busy } = useStore();
  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Timeline</h1>
        <p className="page-meta">{TIMELINE_META}</p>
      </header>
      {busy || output === undefined ? (
        <p className="busy-line">Working it out from your dates.</p>
      ) : (
        <Phases output={output} />
      )}
      <div className="spacer" />
      <Footer line={TIMELINE_FOOTER} />
    </div>
  );
}
