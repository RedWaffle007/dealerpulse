import type { Locator, Page } from "@playwright/test";

/**
 * A component object wraps one reusable piece of UI (a filter bar, a KPI card,
 * a sortable table) behind a root locator. Pages compose components; tests
 * talk to pages. Selectors live in exactly one class.
 */
export abstract class BaseComponent {
  protected readonly page: Page;

  constructor(readonly root: Locator) {
    this.page = root.page();
  }
}
