// @vitest-environment jsdom

import { useRef, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../i18n";
import { DecisionBoardReturn } from "./DecisionBoardReturn";
import { DecisionViewBoardButton } from "./DecisionViewBoardButton";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top } as DOMRect;
}

function Decision() {
  const [viewingBoard, setViewingBoard] = useState(false);
  const returnControlRef = useRef<HTMLDivElement>(null);
  return viewingBoard ? (
    <DecisionBoardReturn returnControlRef={returnControlRef} onReturn={() => setViewingBoard(false)} />
  ) : (
    <DecisionViewBoardButton onOpenBoard={() => setViewingBoard(true)} />
  );
}

describe("DecisionBoardReturn", () => {
  it("Discord suggestion 1556325822611333169: opens centred where View board was pressed", () => {
    render(
      <I18nProvider>
        <Decision />
      </I18nProvider>,
    );
    const viewBoard = screen.getByRole("button", { name: /view board/i });
    vi.spyOn(viewBoard, "getBoundingClientRect").mockReturnValue(rect(300, 540, 200, 40));
    vi.spyOn(HTMLDivElement.prototype, "getBoundingClientRect").mockReturnValue(rect(0, 0, 320, 56));

    fireEvent.pointerDown(viewBoard);
    fireEvent.click(viewBoard);

    const control = screen.getByRole("button", { name: /return to decision/i }).parentElement!;
    expect(control.hasAttribute("data-anchored")).toBe(true);
    expect(control.style.getPropertyValue("--decision-return-left")).toBe("240px");
    expect(control.style.getPropertyValue("--decision-return-top")).toBe("532px");
  });

  it("keeps the fixed strip when no press told it where to appear", () => {
    render(
      <I18nProvider>
        <Decision />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /view board/i }));

    const control = screen.getByRole("button", { name: /return to decision/i }).parentElement!;
    expect(control.hasAttribute("data-anchored")).toBe(false);
  });
});
