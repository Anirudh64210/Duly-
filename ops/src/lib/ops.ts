import { z } from "zod";

import type { components } from "./api-types";

export const opsStatusSchema = z.strictObject({
  caller: z.string(),
  allowlist: z.array(z.string()),
});

export type OpsStatus = z.infer<typeof opsStatusSchema>;

type Contract = components["schemas"]["OpsStatus"];
export const contractMatches: OpsStatus extends Contract ? true : never = true;

export type OpsAccess = { allowed: true; status: OpsStatus } | { allowed: false };

export async function fetchOpsAccess(get: typeof fetch = fetch): Promise<OpsAccess> {
  const response = await get("/api/ops/v1/status");
  if (response.status === 403) return { allowed: false };
  if (!response.ok) throw new Error(`status ${response.status}`);
  return { allowed: true, status: opsStatusSchema.parse(await response.json()) };
}
