import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { CaseForm } from "./components/CaseForm";
import { Items, Verdict } from "./components/Result";
import { EMPTY_CASE, buildCase, type CaseFields } from "./lib/caseForm";
import { CaseRefused, computeF1, type F1Case } from "./lib/compute";
import { fetchStatus, headline, reasonLine } from "./lib/status";

function CannotTell({ lines }: { lines: readonly string[] }) {
  return (
    <section className="verdict" data-state="cannot_tell">
      <h1>{headline("cannot_tell")}</h1>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </section>
  );
}

function refusalLines(error: Error): string[] {
  if (error instanceof CaseRefused) {
    const lines = ["The server did not accept the case."];
    if (error.problem) lines.push(error.problem);
    return lines;
  }
  if (error.name === "ZodError") return ["Duly could not read the answer from its server."];
  return ["Duly could not reach its server."];
}

export function App() {
  const status = useQuery({ queryKey: ["status"], queryFn: () => fetchStatus() });
  const compute = useMutation({ mutationFn: (body: F1Case) => computeF1(body) });
  const [fields, setFields] = useState<CaseFields>(EMPTY_CASE);
  const [problems, setProblems] = useState<string[]>([]);

  // A result belongs to the dates it was computed from. Once they change, it goes.
  const change = (changed: CaseFields) => {
    setFields(changed);
    setProblems([]);
    if (!compute.isIdle) compute.reset();
  };

  const run = () => {
    const built = buildCase(fields);
    if (built.ok) {
      setProblems([]);
      compute.mutate(built.body);
    } else {
      setProblems(built.problems);
      compute.reset();
    }
  };

  let verdict;
  if (compute.isPending) {
    verdict = <section className="verdict" aria-busy="true" />;
  } else if (compute.isError) {
    verdict = <CannotTell lines={refusalLines(compute.error)} />;
  } else if (compute.isSuccess) {
    verdict = <Verdict output={compute.data} />;
  } else if (status.isPending) {
    verdict = <section className="verdict" aria-busy="true" />;
  } else if (status.isError) {
    verdict = <CannotTell lines={["Duly could not reach its server."]} />;
  } else {
    const checked = new Date(status.data.checked_at).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    verdict = (
      <section className="verdict" data-state={status.data.verdict.state}>
        <h1>{headline(status.data.verdict.state)}</h1>
        {status.data.verdict.reasons.map((reason) => (
          <p key={reason}>{reasonLine(reason)}</p>
        ))}
        <p className="scope">Based on 0 documents you added. Checked {checked}.</p>
      </section>
    );
  }

  return (
    <main className="page">
      <CaseForm
        fields={fields}
        problems={problems}
        busy={compute.isPending}
        onChange={change}
        onCompute={run}
      />

      <div className="result" aria-live="polite">
        {verdict}
        {compute.isSuccess && <Items output={compute.data} />}
      </div>

      <p className="footer">
        Records and computations, not legal advice. Confirm with your DSO or an attorney.
      </p>
    </main>
  );
}
