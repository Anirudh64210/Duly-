// resolutions point 11: a development page that draws one built screen from an engine
// sample, for the design shots. The production build takes index.html alone.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";

import { CaseProvider } from "./app/caseStore";
import { createAppRouter } from "./app/Shell";
import { engineOutputSchema } from "./lib/compute";
import type { RecordsCase } from "./lib/records";
import { SHOT_SIZE, heldFromCase, shotAsked } from "./lib/shots";
import "./app/app.css";

const files = import.meta.glob<{ default: unknown }>("../samples/*.json", { eager: true });
const sample = (name: string): unknown => files[`../samples/${name}.json`]?.default;
const names = Object.keys(files)
  .map((path) => path.replace("../samples/", "").replace(".json", ""))
  .filter((name) => !name.endsWith(".case"));

const root = document.getElementById("root");
if (!root) throw new Error("no root element");
const asked = shotAsked(window.location.search, names);
if (asked === null) throw new Error("no such screen or sample");

const output = engineOutputSchema.parse(sample(asked.sample));
const held = heldFromCase(sample(`${asked.sample}.case`) as RecordsCase);
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const router = createAppRouter(createMemoryHistory({ initialEntries: [asked.screen] }));
root.style.width = `${SHOT_SIZE.width}px`;
root.style.height = `${SHOT_SIZE.height}px`;

createRoot(root).render(
  <QueryClientProvider client={client}>
    <CaseProvider initial={held} compute={() => Promise.resolve(output)}>
      <RouterProvider router={router} />
    </CaseProvider>
  </QueryClientProvider>,
);
