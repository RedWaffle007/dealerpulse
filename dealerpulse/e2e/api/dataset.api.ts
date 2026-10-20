import type { APIRequestContext, APIResponse } from "@playwright/test";
import { z } from "zod";

/** Response contracts for /api/dataset. A drifted shape fails the test, not the user. */
const SectionDiff = z.object({ added: z.number().int().nonnegative(), updated: z.number().int().nonnegative() });

export const MergeSuccess = z.object({
  ok: z.literal(true),
  summary: z.object({
    branches: SectionDiff,
    sales_reps: SectionDiff,
    leads: SectionDiff,
    targets: SectionDiff,
    deliveries: SectionDiff,
    newMonths: z.array(z.string().regex(/^\d{4}-\d{2}$/)),
  }),
});

export const ResetSuccess = z.object({ ok: z.literal(true) });

export const ApiError = z.object({
  error: z.string().min(1),
  issues: z.array(z.object({ path: z.array(z.union([z.string(), z.number()])), message: z.string() }).loose()).optional(),
});

export type ApiResult<T> =
  | { ok: true; status: number; body: T }
  | { ok: false; status: number; body: z.infer<typeof ApiError> };

/**
 * Typed client for the dataset route. Every call parses the body against the
 * contract for its status, so tests assert on typed data, not loose JSON.
 */
export class DatasetApi {
  constructor(private readonly request: APIRequestContext) {}

  merge(payload: unknown): Promise<ApiResult<z.infer<typeof MergeSuccess>>> {
    return this.call(this.request.post("/api/dataset", { data: payload }), MergeSuccess);
  }

  /**
   * Sends bytes as-is, for malformed-body cases the typed `merge` can't express.
   * A Buffer, because Playwright JSON-encodes a string body sent as JSON.
   */
  mergeRaw(body: string): Promise<ApiResult<z.infer<typeof MergeSuccess>>> {
    return this.call(
      this.request.post("/api/dataset", { data: Buffer.from(body), headers: { "content-type": "application/json" } }),
      MergeSuccess,
    );
  }

  reset(): Promise<ApiResult<z.infer<typeof ResetSuccess>>> {
    return this.call(this.request.delete("/api/dataset"), ResetSuccess);
  }

  private async call<S extends z.ZodType>(pending: Promise<APIResponse>, success: S): Promise<ApiResult<z.infer<S>>> {
    const res = await pending;
    const json: unknown = await res.json();
    if (res.ok()) return { ok: true, status: res.status(), body: success.parse(json) };
    return { ok: false, status: res.status(), body: ApiError.parse(json) };
  }
}
