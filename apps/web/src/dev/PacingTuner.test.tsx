// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { activePacing, DEFAULT_PACING, setBasePacing, setEffectSpeed } from "../game/pacing";
import { PacingTuner, useLabPacing } from "./PacingTuner";

afterEach(() => {
  cleanup();
  setBasePacing(DEFAULT_PACING);
  setEffectSpeed("normal");
  localStorage.clear();
});

function LabControls() {
  useLabPacing();
  return <PacingTuner portuguese={false} />;
}

it("uses the match's stacked timing even when obsolete lab settings request truncated single-clause effects", () => {
  setEffectSpeed("normal");
  localStorage.setItem(
    "aegis.dev.effects-lab.pacing",
    JSON.stringify({
      ...DEFAULT_PACING,
      sourceHoldMs: 120,
      shortSourceHoldMs: 80,
      clauseStackMs: 0,
    }),
  );
  render(<LabControls />);

  expect(activePacing()).toEqual(DEFAULT_PACING);
  expect(screen.queryByRole("button", { name: "Sequential" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Current-like" })).toBeNull();
  expect(screen.queryByRole("spinbutton", { name: "Clause stack (ms)" })).toBeNull();
  expect(screen.getByRole("combobox", { name: "Effect speed" })).toBeDefined();
});
