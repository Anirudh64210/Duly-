import type { FormEvent, ReactNode } from "react";

import {
  addPeriod,
  removePeriod,
  type CapGapFields,
  type CaseFields,
  type EadFields,
  type PeriodFields,
} from "../lib/caseForm";
import {
  DEGREE_LEVELS,
  PETITION_STATUSES,
  type DegreeLevel,
  type PetitionStatus,
} from "../lib/compute";

const DEGREE_NAMES: Record<DegreeLevel, string> = {
  bachelor: "Bachelor's",
  master: "Master's",
  doctorate: "Doctorate",
};

const PETITION_NAMES: Record<PetitionStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  denied: "Denied",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  revoked: "Revoked",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function DateField(props: {
  label: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={props.label}>
      <input
        type="date"
        value={props.value}
        required={props.required ?? false}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </Field>
  );
}

function Check(props: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="check">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      <span>{props.label}</span>
    </label>
  );
}

function EadSection(props: {
  part: string;
  on: boolean;
  fields: EadFields;
  onToggle: (on: boolean) => void;
  onChange: (fields: EadFields) => void;
}) {
  const { part, on, fields, onToggle, onChange } = props;
  return (
    <fieldset className="section">
      <legend>{part}</legend>
      <Check label={`Include ${part}`} checked={on} onChange={onToggle} />
      {on && (
        <div className="grid">
          <DateField
            label={`${part} DSO recommendation date`}
            value={fields.dso_recommendation_date}
            onChange={(value) => onChange({ ...fields, dso_recommendation_date: value })}
          />
          <DateField
            label={`${part} I-765 filed date`}
            value={fields.i765_filed_date}
            onChange={(value) => onChange({ ...fields, i765_filed_date: value })}
          />
          <DateField
            label={`${part} EAD start date`}
            value={fields.ead_start}
            onChange={(value) => onChange({ ...fields, ead_start: value })}
          />
          <DateField
            label={`${part} EAD end date`}
            value={fields.ead_end}
            onChange={(value) => onChange({ ...fields, ead_end: value })}
          />
        </div>
      )}
    </fieldset>
  );
}

function PeriodRows(props: {
  number: number;
  fields: PeriodFields;
  onChange: (fields: PeriodFields) => void;
  onRemove: () => void;
}) {
  const { number, fields, onChange, onRemove } = props;
  return (
    <div className="period" role="group" aria-label={`Employment period ${number}`}>
      <div className="grid">
        <DateField
          label={`Period ${number} start date`}
          value={fields.start}
          required
          onChange={(value) => onChange({ ...fields, start: value })}
        />
        <DateField
          label={`Period ${number} end date, empty if it has not ended`}
          value={fields.end}
          onChange={(value) => onChange({ ...fields, end: value })}
        />
        <Field label={`Period ${number} hours per week`}>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={168}
            step="any"
            required
            value={fields.hours_per_week}
            onChange={(event) => onChange({ ...fields, hours_per_week: event.target.value })}
          />
        </Field>
      </div>
      <Check
        label={`Period ${number} employer has been reported`}
        checked={fields.employer_reported}
        onChange={(checked) => onChange({ ...fields, employer_reported: checked })}
      />
      <button type="button" className="quiet" onClick={onRemove}>
        Remove period {number}
      </button>
    </div>
  );
}

function CapGapSection(props: {
  on: boolean;
  fields: CapGapFields;
  onToggle: (on: boolean) => void;
  onChange: (fields: CapGapFields) => void;
}) {
  const { on, fields, onToggle, onChange } = props;
  return (
    <fieldset className="section">
      <legend>Cap-gap</legend>
      <Check label="Include cap-gap" checked={on} onChange={onToggle} />
      {on && (
        <>
          <div className="grid">
            <DateField
              label="H-1B petition filed date"
              value={fields.petition_filed_on}
              required
              onChange={(value) => onChange({ ...fields, petition_filed_on: value })}
            />
            <DateField
              label="Requested start date"
              value={fields.requested_start}
              required
              onChange={(value) => onChange({ ...fields, requested_start: value })}
            />
            <Field label="Petition status">
              <select
                value={fields.status}
                onChange={(event) =>
                  onChange({
                    ...fields,
                    status:
                      PETITION_STATUSES.find((status) => status === event.target.value) ??
                      fields.status,
                  })
                }
              >
                {PETITION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PETITION_NAMES[status]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Check
            label="The petition asks for a change of status"
            checked={fields.change_of_status}
            onChange={(checked) => onChange({ ...fields, change_of_status: checked })}
          />
        </>
      )}
    </fieldset>
  );
}

export function CaseForm(props: {
  fields: CaseFields;
  problems: readonly string[];
  busy: boolean;
  onChange: (fields: CaseFields) => void;
  onCompute: () => void;
}) {
  const { fields, problems, busy, onChange, onCompute } = props;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onCompute();
  };

  return (
    <form className="case" onSubmit={submit} noValidate>
      <h2>Dates from your documents</h2>

      <fieldset className="section">
        <legend>Program</legend>
        <div className="grid">
          <DateField
            label="Program end date"
            value={fields.program_end_date}
            required
            onChange={(value) => onChange({ ...fields, program_end_date: value })}
          />
          <Field label="Degree level">
            <select
              value={fields.degree_level}
              onChange={(event) =>
                onChange({
                  ...fields,
                  degree_level:
                    DEGREE_LEVELS.find((level) => level === event.target.value) ??
                    fields.degree_level,
                })
              }
            >
              {DEGREE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {DEGREE_NAMES[level]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Documents added">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              required
              value={fields.documents_count}
              onChange={(event) => onChange({ ...fields, documents_count: event.target.value })}
            />
          </Field>
          <Field label="Full-time CPT days">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={fields.cpt_full_time_days}
              onChange={(event) => onChange({ ...fields, cpt_full_time_days: event.target.value })}
            />
          </Field>
        </div>
      </fieldset>

      <EadSection
        part="OPT"
        on={fields.opt_on}
        fields={fields.opt}
        onToggle={(on) => onChange({ ...fields, opt_on: on })}
        onChange={(opt) => onChange({ ...fields, opt })}
      />

      <EadSection
        part="STEM OPT"
        on={fields.stem_on}
        fields={fields.stem}
        onToggle={(on) => onChange({ ...fields, stem_on: on })}
        onChange={(stem) => onChange({ ...fields, stem })}
      />

      <fieldset className="section">
        <legend>Employment</legend>
        {fields.employment.map((period, index) => (
          <PeriodRows
            key={period.key}
            number={index + 1}
            fields={period}
            onChange={(changed) =>
              onChange({
                ...fields,
                employment: fields.employment.map((p) => (p.key === changed.key ? changed : p)),
              })
            }
            onRemove={() => onChange(removePeriod(fields, period.key))}
          />
        ))}
        <button type="button" className="quiet" onClick={() => onChange(addPeriod(fields))}>
          Add an employment period
        </button>
      </fieldset>

      <CapGapSection
        on={fields.cap_gap_on}
        fields={fields.cap_gap}
        onToggle={(on) => onChange({ ...fields, cap_gap_on: on })}
        onChange={(cap_gap) => onChange({ ...fields, cap_gap })}
      />

      {problems.length > 0 && (
        <ul className="problems" role="alert">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}

      <button type="submit" className="primary" disabled={busy}>
        Compute
      </button>
    </form>
  );
}
