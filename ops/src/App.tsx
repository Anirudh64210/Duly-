import { useQuery } from "@tanstack/react-query";

import { fetchOpsAccess } from "./lib/ops";

export function App() {
  const access = useQuery({ queryKey: ["ops-access"], queryFn: () => fetchOpsAccess() });

  if (access.isPending) return <main className="page" aria-busy="true" />;

  if (access.isError) {
    return (
      <main className="page">
        <section className="verdict">
          <h1>Ops could not reach the server</h1>
        </section>
      </main>
    );
  }

  if (!access.data.allowed) {
    return (
      <main className="page">
        <section className="verdict">
          <h1>This network is not on the list</h1>
          <p>Ops only opens from addresses the founder has added.</p>
        </section>
      </main>
    );
  }

  const { caller, allowlist } = access.data.status;
  return (
    <main className="page">
      <section className="verdict">
        <h1>Duly Ops</h1>
        <p>You are connected from {caller}.</p>
      </section>
      <ul className="rows">
        {allowlist.map((network) => (
          <li key={network}>
            <span>Allowed network</span>
            <span>{network}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
