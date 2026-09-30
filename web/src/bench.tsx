// programs.md section 9: the engine test bench. A development page only; the production
// build takes index.html alone, so bench.html and this file never reach it.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles.css";

const client = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });
const root = document.getElementById("root");
if (!root) throw new Error("no root element");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
