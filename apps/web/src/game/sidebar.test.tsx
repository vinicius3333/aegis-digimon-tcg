// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Phase } from "@aegis/shared";
import { I18nProvider } from "../i18n";
import { Sidebar } from "./GameScreen";

function renderSidebar(overrides: Partial<React.ComponentProps<typeof Sidebar>> = {}) {
  const props = {
    phase: Phase.Main,
    turnCount: 1,
    memory: 0,
    isMyTurn: true,
    canMove: false,
    hasBreeding: false,
    canHatch: true,
    log: [],
    onHatchOrMove: () => undefined,
    onSurrender: () => undefined,
    onReportBug: () => undefined,
    ...overrides,
  };
  return render(
    <I18nProvider>
      <Sidebar {...props} />
    </I18nProvider>,
  );
}

afterEach(cleanup);

describe("the match sidebar", () => {
  // The floating report button the rest of the client shows is hidden during a match, so this is
  // the only way to report the card that just misbehaved without leaving the game.
  it("offers reporting a bug next to surrendering", () => {
    const onReportBug = vi.fn<() => void>();
    renderSidebar({ onReportBug });

    fireEvent.click(screen.getByRole("button", { name: "Report a bug" }));

    expect(onReportBug).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Surrender" })).toBeTruthy();
  });
});
