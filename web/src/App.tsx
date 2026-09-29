import { useQuery } from "@tanstack/react-query";

import { fetchStatus, headline, reasonLine } from "./lib/status";

export function App() {
  const status = useQuery({ queryKey: ["status"], queryFn: () => fetchStatus() });

  if (status.isPending) return <main className="page" aria-busy="true" />;

  if (status.isError) {
    return (
      <main className="page">
        <section className="verdict" data-state="cannot_tell">
          <h1>Can't tell yet</h1>
          <p>Duly could not reach its server.</p>
        </section>
      </main>
    );
  }

  const { verdict, rulepacks, database, checked_at } = status.data;
  const checked = new Date(checked_at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <main className="page">
      <section className="verdict" data-state={verdict.state}>
        <h1>{headline(verdict.state)}</h1>
        {verdict.reasons.map((reason) => (
          <p key={reason}>{reasonLine(reason)}</p>
        ))}
        <p className="scope">Based on 0 documents you added. Checked {checked}.</p>
      </section>

      <ul className="rows">
        <li>
          <span>Database</span>
          <span>{database}</span>
        </li>
        {rulepacks.map((pack) => (
          <li key={pack.category}>
            <span>Rules, {pack.category.toUpperCase()}</span>
            <span>
              {pack.version}, {pack.parameters} rules
            </span>
          </li>
        ))}
      </ul>

      <p className="footer">
        Records and computations, not legal advice. Confirm with your DSO or an attorney.
      </p>
    </main>
  );
}
