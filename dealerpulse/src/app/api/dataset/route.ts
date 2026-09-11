import { revalidatePath } from "next/cache";
import { getDataset, setMergedDataset, resetDataset } from "@/lib/data";
import { PartialDatasetSchema, mergeDatasets } from "@/lib/merge";
import { DatasetSchema } from "@/lib/types";

/** Merge an uploaded continuation into the live dataset. */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Body is not valid JSON." }, { status: 400 });
  }

  const parsed = PartialDatasetSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Upload failed validation.", issues: parsed.error.issues.slice(0, 5) },
      { status: 422 },
    );
  }

  // Merge onto the current dataset so successive uploads accumulate.
  const { merged, summary } = mergeDatasets(await getDataset(), parsed.data);

  // Re-validate the merged whole before committing it.
  const check = DatasetSchema.safeParse(merged);
  if (!check.success) {
    return Response.json(
      { error: "Merged dataset is invalid.", issues: check.error.issues.slice(0, 5) },
      { status: 422 },
    );
  }

  await setMergedDataset(check.data);
  revalidatePath("/", "layout");
  return Response.json({ ok: true, summary });
}

/** Reset back to the pristine bundled dataset. */
export async function DELETE() {
  await resetDataset();
  revalidatePath("/", "layout");
  return Response.json({ ok: true });
}
