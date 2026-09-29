import { useId, useState } from "react";
import { z } from "zod";

import type { ComputedItem, EngineOutput, ShownRule } from "../lib/compute";
import {
  GROUPS,
  formatDate,
  formatValue,
  groupOf,
  inputName,
  itemName,
  legalStatusWords,
  reasonText,
  scopeLine,
  statusTag,
} from "../lib/labels";
import { headline } from "../lib/status";

const periodSchema = z.object({
  start: z.string(),
  end: z.string().nullable(),
  hours_per_week: z.number(),
  employer_reported: z.boolean(),
});

const NOT_ENTERED = "Not entered";

function periodLine(raw: unknown): string {
  const period = periodSchema.safeParse(raw);
  if (!period.success) return "This entry could not be shown.";
  const { start, end, hours_per_week, employer_reported } = period.data;
  const until = end === null ? "no end date" : `to ${formatDate(end)}`;
  const reported = employer_reported ? "reported" : "not marked as reported";
  return `${formatDate(start)}, ${until}, ${formatValue(hours_per_week, "hours_per_week")}, ${reported}`;
}

function InputValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <>{NOT_ENTERED}</>;
  if (typeof value === "string") return <>{formatDate(value)}</>;
  if (typeof value === "number") return <>{String(value)}</>;
  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <>None entered</>;
    return (
      <ol className="periods">
        {value.map((entry, index) => (
          <li key={index}>{periodLine(entry)}</li>
        ))}
      </ol>
    );
  }
  return <>This entry could not be shown.</>;
}

function RuleCard({ id, rule }: { id: string; rule: ShownRule }) {
  const tag = statusTag(rule.status);
  return (
    <li className="rule">
      <p className="rule-head">
        <span className="rule-value">{formatValue(rule.value, rule.unit)}</span>
        <span className="rule-id">{id}</span>
        {tag && <span className="tag">{tag}</span>}
      </p>
      {rule.quote && <blockquote>{rule.quote}</blockquote>}
      <p>
        <a href={rule.url} target="_blank" rel="noreferrer">
          {rule.citation}
        </a>
      </p>
      <p className="checked">Checked {formatDate(rule.checked_on)}.</p>
    </li>
  );
}

function Values({ item }: { item: ComputedItem }) {
  const alternates = item.alternates ?? [];
  if (alternates.length === 0) {
    return <span className="value">{formatValue(item.value, item.unit)}</span>;
  }
  // The status is the one the engine read from the pack. The screen holds none of its own.
  const operative = item.operative?.legal_status ?? "";
  return (
    <span className="regimes">
      <span className="regime">
        <span className="value">{formatValue(item.value, item.unit)}</span>
        <span className="legal">{legalStatusWords(operative)}</span>
      </span>
      {alternates.map((alternate) => (
        <span className="regime" key={alternate.regime}>
          <span className="value">{formatValue(alternate.value, item.unit)}</span>
          <span className="legal">{legalStatusWords(alternate.legal_status)}</span>
        </span>
      ))}
    </span>
  );
}

function ItemRow({ item, rules }: { item: ComputedItem; rules: EngineOutput["rules"] }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  const tag = statusTag(item.status);

  return (
    <li className="item">
      <button
        type="button"
        className="item-row"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen(!open)}
      >
        <span className="item-name">
          {itemName(item.id)}
          {tag && <span className="tag">{tag}</span>}
        </span>
        <Values item={item} />
      </button>
      {open && (
        <div className="working" id={panel}>
          <h4>Inputs used</h4>
          <dl>
            {Object.entries(item.inputs).map(([key, value]) => (
              <div key={key}>
                <dt>{inputName(key)}</dt>
                <dd>
                  <InputValue value={value} />
                </dd>
              </div>
            ))}
          </dl>
          <h4>Rules used</h4>
          <ul className="rules">
            {item.rule_ids.map((id) => {
              const rule = rules[id];
              return rule ? <RuleCard key={id} id={id} rule={rule} /> : null;
            })}
          </ul>
        </div>
      )}
    </li>
  );
}

export function Verdict({ output }: { output: EngineOutput }) {
  const { verdict, scope, computed } = output;
  return (
    <section className="verdict" data-state={verdict.state}>
      <h1>{headline(verdict.state)}</h1>
      {verdict.reasons.map((reason) => (
        <p key={reason}>{reasonText(reason, computed)}</p>
      ))}
      <p className="scope">{scopeLine(scope.documents_count, scope.rules_checked_on)}</p>
    </section>
  );
}

export function Items({ output }: { output: EngineOutput }) {
  return (
    <>
      {GROUPS.map((group) => {
        const items = output.computed.filter((item) => groupOf(item.id) === group);
        if (items.length === 0) return null;
        return (
          <section className="group" key={group}>
            <h3>{group}</h3>
            <ul className="items">
              {items.map((item) => (
                <ItemRow key={item.id} item={item} rules={output.rules} />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
