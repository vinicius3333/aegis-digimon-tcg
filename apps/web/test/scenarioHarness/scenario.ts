import { afterAll, beforeAll, describe } from "vitest";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Scenarios prove engine-to-UI flows, not animation timing: reduced motion puts the
 * presentation queue in drain mode, so a busy machine cannot stretch the queue past a
 * step's wait and hide the controls the scenario is about to use. Scoped to scenarios
 * because the global jsdom setup also serves the animation unit tests.
 */
function preferReducedMotion(): void {
  let original: typeof window.matchMedia;
  beforeAll(() => {
    original = window.matchMedia;
    window.matchMedia = ((query: string) =>
      query === REDUCED_MOTION_QUERY
        ? { ...original(query), matches: true }
        : original(query)) as typeof window.matchMedia;
  });
  afterAll(() => {
    window.matchMedia = original;
  });
}

/** Groups an end-to-end scenario driven through the real UI and room. */
export function scenario(id: string, fn: () => void): void {
  describe(`scenario:${id}`, () => {
    preferReducedMotion();
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
    preferReducedMotion();
    fn();
  });
}
