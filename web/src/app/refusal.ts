import { CaseRefused } from "../lib/compute";

/** design-1 section 3.11: the error state's lines, in plain words. Never the quiet state. */
export function refusalLines(error: Error): string[] {
  if (error instanceof CaseRefused) {
    const lines = ["The server did not accept the case."];
    if (error.problem) lines.push(error.problem);
    return lines;
  }
  if (error.name === "ZodError") return ["Duly could not read the answer from its server."];
  return ["Duly could not reach its server."];
}
