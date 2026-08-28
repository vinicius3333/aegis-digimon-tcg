import { describe } from "vitest";

/** Groups an end-to-end scenario driven through the real UI and room. */
export function scenario(id: string, fn: () => void): void {
  describe(`scenario:${id}`, () => {
    fn();
  });
}

/**
 * Mobile counterpart of `scenario`.  Its tests must drive the rendered
 * MobileBoard through the tap/sheet controls that a phone user sees; the
 * This keeps mobile evidence independent from the desktop scenario.
 */
export function mobileScenario(id: string, fn: () => void): void {
  describe(`mobile-scenario:${id}`, () => {
    fn();
  });
}
