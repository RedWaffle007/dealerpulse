import { test } from "@playwright/test";

/**
 * Wraps a page-object method in a boxed `test.step`, so the HTML report and
 * traces read as user actions ("FilterBar.selectBranch: Highway Toyota")
 * instead of raw locator calls, and a failure points at the calling test line.
 *
 * `{0}`, `{1}`… in the title are replaced with the call's arguments.
 */
export function step(title?: string) {
  return function <This extends object, Args extends unknown[], Return>(
    target: (this: This, ...args: Args) => Promise<Return>,
    context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<Return>>,
  ) {
    return function (this: This, ...args: Args): Promise<Return> {
      const name = `${this.constructor.name}.${String(context.name)}`;
      const label = title
        ? `${name}: ${title.replace(/\{(\d+)\}/g, (_, i: string) => String(args[Number(i)]))}`
        : name;
      return test.step(label, () => target.call(this, ...args), { box: true });
    };
  };
}
