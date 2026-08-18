// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { MemoryGauge } from "./boardPieces";

afterEach(() => cleanup());

function renderGauge(value: number, compact?: boolean) {
  return render(
    <I18nProvider>
      <MemoryGauge value={value} yourColor="Blue" oppColor="Blue" compact={compact} />
    </I18nProvider>,
  );
}

/** Ticks painted with the danger token — the opponent's half of the gauge. */
function dangerTicks(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>("div")].filter((el) =>
    el.style.background.includes("--ds-danger"),
  );
}

describe.each([
  ["compact", true],
  ["full", false],
])("%s memory gauge", (_label, compact) => {
  it("paints the opponent's side red once memory crosses over", () => {
    const { container } = renderGauge(-3, compact);
    // Ticks -1 and -2 plus the marker on -3. The zero tick stays neutral: it is the
    // boundary, not part of either player's side.
    expect(dangerTicks(container)).toHaveLength(3);
  });

  it("leaves the viewer's side in their own colour", () => {
    const { container } = renderGauge(3, compact);
    expect(dangerTicks(container)).toHaveLength(0);
  });

  it("keeps neutral memory off the warning colour", () => {
    const { container } = renderGauge(0, compact);
    expect(dangerTicks(container)).toHaveLength(0);
  });

  it("does not borrow the opponent's identity colour for the warning", () => {
    // Both players are Blue here: tying the danger side to the opponent's chosen
    // colour would make an ending turn indistinguishable from a healthy one.
    const { container } = renderGauge(-1, compact);
    expect(dangerTicks(container).length).toBeGreaterThan(0);
  });
});
