/** What the smoke run decides: where it writes, when it gives up, and what it records. */

/** How long the smoke run waits for the verdict heading. */
export const SMOKE_WAIT_MS = 40_000;
export const SMOKE_POLL_MS = 500;

/** The verdict heading on Duly's screen. */
export const VERDICT_HEADING = "section.verdict[data-state] h1";

/**
 * The folder after `--smoke` (or `--smoke=<folder>`), or null when this is not a smoke
 * run. `--smoke` with no folder is an error, not a normal launch.
 */
export function smokeFolder(argv: readonly string[]): string | null {
  for (const [index, argument] of argv.entries()) {
    if (argument.startsWith("--smoke=")) {
      const folder = argument.slice("--smoke=".length);
      if (folder === "") throw new Error("--smoke needs a folder");
      return folder;
    }
    if (argument === "--smoke") {
      const folder = argv[index + 1];
      if (folder === undefined || folder === "" || folder.startsWith("--")) {
        throw new Error("--smoke needs a folder");
      }
      return folder;
    }
  }
  return null;
}

/** What the page shows, as the smoke run reads it. */
export interface ScreenReport {
  title: string;
  headings: string[];
  footer: string;
}

export interface ScreenRead extends ScreenReport {
  verdict: string;
}

/** Run inside the page. It only reads; it changes nothing. */
export const READ_SCREEN = `(() => {
  const text = (node) => (node.textContent || "").replace(/\\s+/g, " ").trim();
  const verdict = document.querySelector(${JSON.stringify(VERDICT_HEADING)});
  return {
    title: document.title,
    headings: Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map(text),
    footer: Array.from(document.querySelectorAll("footer")).map(text).join(" "),
    verdict: verdict ? text(verdict) : "",
  };
})()`;

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Makes whatever the page gave back into a read of the screen, without trusting its shape. */
export function toScreenRead(raw: unknown): ScreenRead {
  const record = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const headings = Array.isArray(record["headings"]) ? record["headings"].map(asText) : [];
  return {
    title: asText(record["title"]),
    headings,
    footer: asText(record["footer"]),
    verdict: asText(record["verdict"]),
  };
}

/** Has the verdict heading appeared? */
export function headingShown(read: ScreenRead): boolean {
  return read.verdict !== "";
}

/** screen.json: the title, the text of every heading, and the text of the footer. */
export function screenJson(read: ScreenRead): string {
  const report: ScreenReport = { title: read.title, headings: read.headings, footer: read.footer };
  return `${JSON.stringify(report, null, 2)}\n`;
}

/** The exit code of a smoke run. */
export function smokeExitCode(shown: boolean): 0 | 1 {
  return shown ? 0 : 1;
}
