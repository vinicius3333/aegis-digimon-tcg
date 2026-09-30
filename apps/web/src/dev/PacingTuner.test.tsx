// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { basePacingConfig, DEFAULT_PACING } from "../game/pacing";
import { PacingTuner, useLabPacing } from "./PacingTuner";
import { saveTunedPacing } from "./pacingTunerModel";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function Lab({ panelOpen }: { panelOpen: boolean }) {
  useLabPacing();
  return panelOpen ? <PacingTuner portuguese={false} /> : null;
}

it("keeps the tuned pacing while the panel is collapsed and drops it when the lab closes", () => {
  const tuned = { ...DEFAULT_PACING, announceMs: 1234 };
  saveTunedPacing(tuned);
  const { rerender, unmount } = render(<Lab panelOpen />);
  expect(basePacingConfig().announceMs).toBe(1234);
  rerender(<Lab panelOpen={false} />);
  expect(basePacingConfig().announceMs).toBe(1234);
  unmount();
  expect(basePacingConfig()).toBe(DEFAULT_PACING);
});
