// design-1 section 9: the Updates screen reads the route's response. No route serves one
// yet (updates-3 wires it), so the page passes an empty list.

export type UpdateRow = { id: string; headline: string; plain: string; source: string };
export type UpdatesResponse = { updates: UpdateRow[]; matching: number };

/** The title reads the route's matching count, never the length of a list (F7). */
export function updatesTitle(matching: number): string {
  if (matching === 1) return "One update matches your status.";
  if (matching > 1) return `${matching} updates match your status.`;
  return "No published update matches your status.";
}
