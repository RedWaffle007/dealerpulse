import type { Page } from "@playwright/test";
import {
  ActionsPage,
  BranchPage,
  LeadPage,
  OverviewPage,
  RepPage,
  RepsPage,
  ScenariosPage,
  UploadPage,
} from "./dashboard.pages";

/**
 * One place that knows how to build each page object. Tests ask for
 * `app.branch("B2")` instead of constructing classes, so a page's constructor
 * can change without touching a single spec.
 */
export class PageFactory {
  constructor(private readonly page: Page) {}

  overview = (): OverviewPage => new OverviewPage(this.page);
  branch = (id: string): BranchPage => new BranchPage(this.page, id);
  reps = (): RepsPage => new RepsPage(this.page);
  rep = (id: string): RepPage => new RepPage(this.page, id);
  lead = (id: string): LeadPage => new LeadPage(this.page, id);
  actions = (): ActionsPage => new ActionsPage(this.page);
  scenarios = (): ScenariosPage => new ScenariosPage(this.page);
  upload = (): UploadPage => new UploadPage(this.page);
}
