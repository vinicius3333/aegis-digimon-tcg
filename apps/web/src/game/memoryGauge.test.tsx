// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { MemoryGauge } from "./boardPieces";

afterEach(() => cleanup());

function renderGauge(value: number, compact?: boolean) {
  return render(
    <I18nProvider>
      <MemoryGauge value={value} compact={compact} />
    </I18nProvider>,
  );
}

function marker(container: HTMLElement) {
  const el = container.querySelector<HTMLElement>(".game-memory-coin--marker");
  expect(el).not.toBeNull();
  return el!;
}

describe.each([
  ["compact", true],
  ["full", false],
])("%s memory gauge", (_label, compact) => {
  it("keeps the fixed side colours: viewer red, opponent blue", () => {
    const { container } = renderGauge(3, compact);
    const you = container.querySelectorAll('[data-memory-side="you"]');
    const opp = container.querySelectorAll('[data-memory-side="opp"]');
    expect(you).toHaveLength(10);
    expect(opp).toHaveLength(10);
    expect((you[0] as HTMLElement).style.background).toContain("--battle-memory-you");
    expect((opp[0] as HTMLElement).style.background).toContain("--battle-memory-opp");
  });

  it("lights the marker on the viewer's side for positive memory", () => {
    const { container } = renderGauge(3, compact);
    const m = marker(container);
    expect(m.dataset["memorySide"]).toBe("you");
    expect(m.textContent).toBe("3");
  });

  it("lights the marker on the opponent's side once memory crosses over", () => {
    const { container } = renderGauge(-4, compact);
    const m = marker(container);
    expect(m.dataset["memorySide"]).toBe("opp");
    expect(m.textContent).toBe("4");
  });

  it("parks the marker on the neutral zero chip", () => {
    const { container } = renderGauge(0, compact);
    const m = marker(container);
    expect(m.dataset["memorySide"]).toBe("zero");
    expect(m.textContent).toBe("0");
  });

  it("clamps out-of-range memory to the outermost chip", () => {
    const { container } = renderGauge(14, compact);
    expect(marker(container).textContent).toBe("10");
  });
});

describe("memory sweep", () => {
  function renderGauge(value: number) {
    return render(
      <I18nProvider>
        <MemoryGauge value={value} />
      </I18nProvider>,
    );
  }

  function sweptValues(container: HTMLElement): string[] {
    return [...container.querySelectorAll<HTMLElement>(".game-memory-coin--swept")].map((el) => el.textContent ?? "");
  }

  it("lights every chip between the old and the new value", () => {
    const { container, rerender } = renderGauge(1);
    rerender(
      <I18nProvider>
        <MemoryGauge value={4} />
      </I18nProvider>,
    );
    expect(sweptValues(container).sort()).toEqual(["2", "3"]);
  });

  it("lights nothing for a single-step change", () => {
    const { container, rerender } = renderGauge(1);
    rerender(
      <I18nProvider>
        <MemoryGauge value={2} />
      </I18nProvider>,
    );
    expect(sweptValues(container)).toEqual([]);
  });

  it("lights nothing when the value is re-rendered unchanged", () => {
    const { container, rerender } = renderGauge(3);
    rerender(
      <I18nProvider>
        <MemoryGauge value={3} />
      </I18nProvider>,
    );
    expect(sweptValues(container)).toEqual([]);
  });
});
