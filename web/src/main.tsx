import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createHashHistory } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { CaseProvider } from "./app/caseStore";
import { landFlash } from "./app/launchFlash";
import { createAppRouter } from "./app/Shell";
import "./app/app.css";

// design-1 section 3.1: hash history, so routes load from duly://app/.
const client = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });
const router = createAppRouter(createHashHistory());
const root = document.getElementById("root");
if (!root) throw new Error("no root element");
// Desktop: open on the app's flash and carry it to the logo (launchFlash.ts).
landFlash();

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <CaseProvider>
        <RouterProvider router={router} />
      </CaseProvider>
    </QueryClientProvider>
  </StrictMode>,
);
