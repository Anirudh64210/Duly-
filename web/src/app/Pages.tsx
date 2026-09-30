import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { zoneChoices } from "../lib/caseForm";
import {
  answerLine,
  categoryName,
  formatDate,
  levelName,
  questionCopy,
  zoneName,
} from "../lib/labels";
import { STORAGE_SENTENCE } from "../lib/privacy";
import { fetchStatus } from "../lib/status";
import { updatesTitle, type UpdatesResponse } from "../lib/views/updates";
import { useStore, type AppCase, type Program } from "./caseStore";
import { DateField, Footer, OneOpen, OptionCards, Row, TextField } from "./parts";

export const UPDATES_EMPTY =
  "Duly shows an update only after its words are found in a primary source, two checks pass and a person at Duly approves it. Every item links to its original source.";
export const UPDATES_FOOTER =
  "Updates that match your status come first. Every item links to its original source.";

/** design-1 section 9. No approved update exists and no route serves one yet. */
export function Updates({
  response = { updates: [], matching: 0 },
}: {
  response?: UpdatesResponse;
}) {
  return (
    <OneOpen>
      <div className="page">
        <h1 className="page-title rise">{updatesTitle(response.matching)}</h1>
        {response.updates.length === 0 ? (
          <p className="page-lead rise d1">{UPDATES_EMPTY}</p>
        ) : (
          <section className="section rise d1" aria-labelledby="published">
            <h2 className="eyebrow" id="published">
              {response.matching > 0 ? "EVERYTHING ELSE" : "PUBLISHED UPDATES"}
            </h2>
            {response.updates.map((update) => (
              <Row key={update.id} id={update.id} title={update.headline} meta={update.source}>
                <p>{update.plain}</p>
              </Row>
            ))}
          </section>
        )}
        <div className="spacer" />
        <Footer line={UPDATES_FOOTER} />
      </div>
    </OneOpen>
  );
}

function programMeta(program: Program): string {
  const days = [program.start, program.end].filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day));
  return days.length === 2
    ? `${formatDate(days[0] ?? "")} to ${formatDate(days[1] ?? "")}`
    : "Dates not entered";
}

function ProgramRow(props: { held: AppCase; index: number }) {
  const { save } = useStore();
  const program = props.held.programs[props.index] as Program;
  const [editing, setEditing] = useState<Program | null>(null);
  const [removing, setRemoving] = useState(false);
  const title =
    program.name.trim() !== ""
      ? program.name.trim()
      : program.level === ""
        ? "Program"
        : `${levelName(program.level)} program`;
  const put = (programs: Program[]) => save({ ...props.held, programs });
  return (
    <div className="row case-row">
      <div className="row-head static">
        <span className="row-text">
          <span className="row-title">{title}</span>
          <span className="row-meta">{programMeta(program)}</span>
        </span>
        {editing === null && (
          <button
            type="button"
            className="text-button"
            aria-label={`Change ${title}`}
            onClick={() => setEditing(program)}
          >
            Change
          </button>
        )}
      </div>
      {editing !== null && (
        <div className="row-open edit">
          <TextField
            id={`p-name-${program.key}`}
            label="The program's name, in your words"
            value={editing.name}
            maxLength={80}
            onChange={(name) => setEditing({ ...editing, name })}
          />
          <DateField
            id={`p-start-${program.key}`}
            label="Start date on the I-20"
            value={editing.start}
            onChange={(start) => setEditing({ ...editing, start })}
          />
          <DateField
            id={`p-end-${program.key}`}
            label="Program end date on the I-20"
            value={editing.end}
            onChange={(end) => setEditing({ ...editing, end })}
          />
          <div className="edit-actions">
            {props.held.programs.length > 1 && (
              <button type="button" className="text-button quiet" onClick={() => setRemoving(true)}>
                Remove
              </button>
            )}
            <span className="spacer-inline" />
            <button type="button" className="text-button" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="pill-primary small"
              onClick={() => {
                put(props.held.programs.map((p, i) => (i === props.index ? editing : p)));
                setEditing(null);
              }}
            >
              Save
            </button>
          </div>
          {removing && (
            <div className="confirm" role="group" aria-label="Remove this program?">
              <p>Remove this program?</p>
              <button
                type="button"
                className="text-button quiet"
                onClick={() => put(props.held.programs.filter((_, i) => i !== props.index))}
              >
                Remove
              </button>
              <button type="button" className="text-button" onClick={() => setRemoving(false)}>
                Keep
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** design-1 section 10: Your case, as entered, edited in place. */
export function YourCase() {
  const { held, save, output, withdraw } = useStore();
  if (held === null) return null;
  const f = held.fields;
  const read = new Set(output?.answers_read ?? []);
  const answers = Object.entries(f.confirmations);
  const ead = (on: boolean, start: string, end: string) =>
    !on
      ? "No"
      : start !== "" && end !== ""
        ? `${formatDate(start)} to ${formatDate(end)}`
        : "Yes, card dates not entered";
  const choice = (label: string, on: boolean, set: (on: boolean) => void) => (
    <div className="choice-row">
      <p>{label}</p>
      <OptionCards
        label={label}
        compact
        options={[
          { value: "yes", title: "Yes" },
          { value: "no", title: "No" },
        ]}
        value={on ? "yes" : "no"}
        onChange={(value) => set(value === "yes")}
      />
    </div>
  );
  return (
    <OneOpen>
      <div className="page">
        <h1 className="page-title rise">Your case</h1>
        <p className="page-lead rise">Everything here is as you entered it.</p>
        <section className="section" aria-labelledby="c-status">
          <h2 className="eyebrow" id="c-status">
            STATUS
          </h2>
          <div className="row case-row">
            <div className="row-head static">
              <span className="row-text">
                <span className="row-title">
                  {held.status === "other"
                    ? held.statusName || "Another status"
                    : categoryName(held.status)}
                </span>
                <span className="row-meta">Dates are counted in {zoneName(f.time_zone)}.</span>
              </span>
            </div>
          </div>
        </section>
        {held.status === "f1" && (
          <>
            <section className="section" aria-labelledby="c-programs">
              <h2 className="eyebrow" id="c-programs">
                PROGRAMS
              </h2>
              {held.programs.map((program, index) => (
                <ProgramRow key={program.key} held={held} index={index} />
              ))}
            </section>
            <section className="section" aria-labelledby="c-training">
              <h2 className="eyebrow" id="c-training">
                PRACTICAL TRAINING
              </h2>
              {choice("Did you apply for post-completion OPT?", f.opt_on, (on) =>
                save({ ...held, fields: { ...f, opt_on: on, stem_on: on && f.stem_on } }),
              )}
              <p className="row-meta">OPT card: {ead(f.opt_on, f.opt.ead_start, f.opt.ead_end)}</p>
              {choice("Did you apply for a STEM OPT extension?", f.stem_on, (on) =>
                save({ ...held, fields: { ...f, stem_on: on } }),
              )}
              <p className="row-meta">
                STEM OPT card: {ead(f.stem_on, f.stem.ead_start, f.stem.ead_end)}
              </p>
            </section>
            <section className="section" aria-labelledby="c-jobs">
              <h2 className="eyebrow" id="c-jobs">
                JOBS
              </h2>
              {f.employment.map((job) => (
                <div key={job.key} className="row case-row">
                  <div className="row-head static">
                    <span className="row-text">
                      <span className="row-title">
                        Job from {job.start === "" ? "a day not entered" : formatDate(job.start)}
                      </span>
                      <span className="row-meta">
                        {job.end === "" ? "Still working here" : `Ended ${formatDate(job.end)}`}
                        {job.employer_reported
                          ? ", marked as reported"
                          : ", not marked as reported"}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </section>
            <section className="section" aria-labelledby="c-capgap">
              <h2 className="eyebrow" id="c-capgap">
                CAP-GAP
              </h2>
              {choice("Did an employer file an H-1B petition for you?", f.cap_gap_on, (on) =>
                save({ ...held, fields: { ...f, cap_gap_on: on } }),
              )}
            </section>
            <section className="section" aria-labelledby="c-answers">
              <h2 className="eyebrow" id="c-answers">
                YOUR ANSWERS
              </h2>
              {answers
                .filter(([id]) => output === undefined || read.has(id))
                .map(([id, given]) => {
                  const copy = questionCopy(id);
                  return (
                    <Row
                      key={id}
                      id={`a:${id}`}
                      title={copy?.ask ?? "An answer you gave"}
                      meta={copy === null ? undefined : `Your answer: ${answerLine(copy, given)}`}
                    >
                      <button
                        type="button"
                        className="text-button"
                        onClick={() =>
                          save({
                            ...held,
                            fields: {
                              ...f,
                              confirmations: {
                                ...f.confirmations,
                                [id]: { ...given, answer: !given.answer },
                              },
                            },
                          })
                        }
                      >
                        Change the answer to{" "}
                        {given.answer ? (copy?.no ?? "No") : (copy?.yes ?? "Yes")}
                      </button>
                      <button
                        type="button"
                        className="text-button quiet"
                        onClick={() => withdraw(id)}
                      >
                        Remove the answer
                      </button>
                    </Row>
                  );
                })}
              {output !== undefined && answers.some(([id]) => !read.has(id)) && (
                <Row id="a:unread" title="Answers not used for the facts entered now">
                  {answers
                    .filter(([id]) => !read.has(id))
                    .map(([id]) => (
                      <p key={id}>
                        {questionCopy(id)?.ask ?? "An answer you gave"}{" "}
                        <button
                          type="button"
                          className="text-button quiet"
                          onClick={() => withdraw(id)}
                        >
                          Remove
                        </button>
                      </p>
                    ))}
                </Row>
              )}
            </section>
          </>
        )}
        <div className="spacer" />
        <Footer />
      </div>
    </OneOpen>
  );
}

/** design-1 section 10: Settings. */
export function Settings() {
  const { held, save, clear } = useStore();
  const navigate = useNavigate();
  const status = useQuery({ queryKey: ["status"], queryFn: () => fetchStatus(), retry: false });
  const [zoneOpen, setZoneOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const zone = held?.fields.time_zone ?? "";
  return (
    <div className="page">
      <h1 className="page-title rise">Settings</h1>
      <section className="section" aria-labelledby="s-zone">
        <h2 className="eyebrow" id="s-zone">
          TIME ZONE
        </h2>
        <p>
          Dates are counted in {zoneName(zone)}.{" "}
          <button type="button" className="text-button" onClick={() => setZoneOpen(true)}>
            Change
          </button>
        </p>
        {zoneOpen && held !== null && (
          <div className="field-group">
            <label className="field-label" htmlFor="s-zone-field">
              Time zone
            </label>
            <select
              id="s-zone-field"
              className="field select"
              value={zone}
              onChange={(event) =>
                save({ ...held, fields: { ...held.fields, time_zone: event.target.value } })
              }
            >
              {zoneChoices(zone).map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>
      <section className="section" aria-labelledby="s-stored">
        <h2 className="eyebrow" id="s-stored">
          WHERE YOUR ANSWERS ARE STORED
        </h2>
        <p>{STORAGE_SENTENCE}</p>
      </section>
      <section className="section" aria-labelledby="s-rules">
        <h2 className="eyebrow" id="s-rules">
          RULES
        </h2>
        {status.isError && <p>Duly could not reach its server.</p>}
        {status.data?.rulepacks.map((pack) => (
          <p key={pack.category} className="row-meta">
            {categoryName(pack.category)} · {pack.version}
            {pack.rules_checked_on ? ` · Checked ${formatDate(pack.rules_checked_on)}` : ""}
          </p>
        ))}
        <p>Motion and appearance follow your system settings.</p>
      </section>
      <section className="section">
        <button type="button" className="text-button quiet" onClick={() => setDeleting(true)}>
          Delete what you entered
        </button>
        {deleting && (
          <div className="confirm" role="group" aria-label="Delete what you entered?">
            <button
              type="button"
              className="text-button quiet"
              onClick={() => {
                clear();
                void navigate({ to: "/welcome" });
              }}
            >
              Delete
            </button>
            <button type="button" className="text-button" onClick={() => setDeleting(false)}>
              Keep
            </button>
          </div>
        )}
      </section>
      <div className="spacer" />
      <Footer />
    </div>
  );
}

/** design-1 section 10: Feedback. Nothing is sent by Duly. */
export function Feedback() {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState("");
  return (
    <div className="page">
      <h1 className="page-title rise">Feedback</h1>
      <p className="page-lead">
        Tell us what works and what does not. Nothing from your record is attached.
      </p>
      <label className="field-label" htmlFor="feedback">
        Your feedback
      </label>
      <textarea
        id="feedback"
        className="field text-box"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setCopied("");
        }}
      />
      <div className="pill-row">
        <button
          type="button"
          className="pill-primary small"
          onClick={() =>
            void navigator.clipboard.writeText(text).then(
              () => setCopied("Copied."),
              () => setCopied("The browser did not allow the copy. Select the words above."),
            )
          }
        >
          Copy feedback
        </button>
        <span role="status" className="meta">
          {copied}
        </span>
      </div>
      <div className="spacer" />
      <Footer />
    </div>
  );
}
