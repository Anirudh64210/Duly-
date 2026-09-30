import { describe, expect, it } from "vitest";

import { COULD_NOT_START, ENGINE_STOPPED, STARTING, escapeHtml, statusPage } from "./pages";

describe("the engine's pages", () => {
  it("says in one sentence that the engine could not start, with its last lines", () => {
    const html = statusPage({ state: "failed", lines: ["line one", "<script>x</script>"] });
    expect(COULD_NOT_START).toBe("Duly could not start its engine on this Mac.");
    expect(html).toContain(`<h1>${COULD_NOT_START}</h1>`);
    expect(html).toContain("line one\n&lt;script&gt;x&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("says when the engine stopped", () => {
    expect(statusPage({ state: "ended", lines: [] })).toContain(escapeHtml(ENGINE_STOPPED));
  });

  it("says the engine is starting", () => {
    const html = statusPage({ state: "starting" });
    expect(html).toContain(STARTING);
    expect(html).not.toContain("<pre>");
  });

  it("escapes what it prints", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });
});
