import { z } from "zod";

/** Canonical funnel order. A lead is "lost" if it exits before "delivered". */
export const STAGES = [
  "new",
  "contacted",
  "test_drive",
  "negotiation",
  "order_placed",
  "delivered",
] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_INDEX: Record<string, number> = Object.fromEntries(
  STAGES.map((s, i) => [s, i]),
);
/** Statuses that mean the lead is still live in the pipeline. */
export const OPEN_STATUSES = new Set<string>([
  "new",
  "contacted",
  "test_drive",
  "negotiation",
  "order_placed",
]);

const StatusEventSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  note: z.string().nullish(),
});

const LeadSchema = z.object({
  id: z.string(),
  customer_name: z.string(),
  phone: z.string(),
  source: z.string(),
  model_interested: z.string(),
  status: z.string(),
  assigned_to: z.string(),
  branch_id: z.string(),
  created_at: z.string(),
  last_activity_at: z.string(),
  status_history: z.array(StatusEventSchema),
  expected_close_date: z.string().nullish(),
  deal_value: z.number(),
  lost_reason: z.string().nullish(),
});

const BranchSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
});

const RepSchema = z.object({
  id: z.string(),
  name: z.string(),
  branch_id: z.string(),
  role: z.string(),
  joined: z.string(),
});

const TargetSchema = z.object({
  branch_id: z.string(),
  month: z.string(),
  target_units: z.number(),
  target_revenue: z.number(),
});

const DeliverySchema = z.object({
  lead_id: z.string(),
  order_date: z.string(),
  delivery_date: z.string(),
  days_to_deliver: z.number(),
  delay_reason: z.string().nullish(),
});

export const DatasetSchema = z.object({
  metadata: z.record(z.string(), z.unknown()),
  branches: z.array(BranchSchema),
  sales_reps: z.array(RepSchema),
  leads: z.array(LeadSchema),
  targets: z.array(TargetSchema),
  deliveries: z.array(DeliverySchema),
});

export type StatusEvent = z.infer<typeof StatusEventSchema>;
export type Lead = z.infer<typeof LeadSchema>;
export type Branch = z.infer<typeof BranchSchema>;
export type Rep = z.infer<typeof RepSchema>;
export type Target = z.infer<typeof TargetSchema>;
export type Delivery = z.infer<typeof DeliverySchema>;
export type Dataset = z.infer<typeof DatasetSchema>;

export type Filter = {
  /** Selected months (YYYY-MM). Empty/undefined = all months. */
  months?: string[];
  /** Selected branch id, or undefined = all branches. */
  branchId?: string;
  /** Selected rep id, or undefined = all reps. */
  repId?: string;
};
