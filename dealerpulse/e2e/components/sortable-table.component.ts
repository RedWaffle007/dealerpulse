import { expect, type Download, type Locator } from "@playwright/test";
import { step } from "../support/step";
import { BaseComponent } from "./base.component";

export type SortDirection = "asc" | "desc";

/** Parses a rendered cell back to a number: "₹1.23 Cr", "45%", "1,234" → 1.23, 45, 1234. */
export function parseNumericCell(text: string): number {
  const cleaned = text.replace(/[₹,%\s]|Cr/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) throw new Error(`Not a numeric cell: "${text}"`);
  return n;
}

/** The shared SortableTable primitive: click-to-sort headers and CSV export. */
export class SortableTable extends BaseComponent {
  private get headerCells(): Locator {
    return this.root.locator("thead th");
  }

  get rows(): Locator {
    return this.root.locator("tbody tr");
  }

  sortButton(column: string): Locator {
    return this.root.getByRole("button", { name: `Sort by ${column}`, exact: true });
  }

  async columnIndex(column: string): Promise<number> {
    const headers = (await this.headerCells.allInnerTexts()).map((t) => t.trim());
    const i = headers.indexOf(column);
    if (i < 0) throw new Error(`No column "${column}" in [${headers.join(", ")}]`);
    return i;
  }

  async columnTexts(column: string): Promise<string[]> {
    const i = await this.columnIndex(column);
    return this.rows.evaluateAll(
      (trs, idx) => trs.map((tr) => (tr.children[idx]?.firstChild?.textContent ?? tr.children[idx]?.textContent ?? "").trim()),
      i,
    );
  }

  async columnNumbers(column: string): Promise<number[]> {
    return (await this.columnTexts(column)).map(parseNumericCell);
  }

  /** Clicks a header until the table is sorted the requested way. */
  @step("{0} {1}")
  async sortBy(column: string, direction: SortDirection): Promise<void> {
    const button = this.sortButton(column);
    for (let attempt = 0; attempt < 2; attempt++) {
      await button.click();
      const icon = await button.locator("svg").getAttribute("class");
      const current: SortDirection | null = icon?.includes("chevron-up")
        ? "asc"
        : icon?.includes("chevron-down")
          ? "desc"
          : null;
      if (current === direction) return;
    }
    throw new Error(`Could not sort "${column}" ${direction}`);
  }

  @step()
  async downloadCsv(): Promise<{ download: Download; rows: string[][] }> {
    const [download] = await Promise.all([
      this.page.waitForEvent("download"),
      this.root.getByRole("button", { name: "Download CSV" }).click(),
    ]);
    const path = await download.path();
    const { readFile } = await import("node:fs/promises");
    const text = await readFile(path, "utf8");
    return { download, rows: parseCsv(text) };
  }

  async expectRowCount(n: number): Promise<void> {
    await expect(this.rows).toHaveCount(n);
  }
}

/** Minimal RFC 4180 reader, enough for the app's own exporter. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
