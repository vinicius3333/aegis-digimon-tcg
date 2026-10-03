// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { GameState, PendingDecision } from "@aegis/shared";
import { I18nProvider } from "../i18n";
import { DecisionMatchTimer, MatchTimer, formatMatchTime } from "./MatchTimer";

afterEach(cleanup);
describe("match timer readouts", () => {
  it("keeps both banks visible while ownership changes, pauses and the game ends", () => {
    const state = new GameState();
    state.matchTimer = true;
    const view = () => (
      <I18nProvider>
        <MatchTimer state={state} seat={0} />
        <MatchTimer state={state} seat={1} opponent />
      </I18nProvider>
    );
    const { rerender } = render(view());
    for (const seat of [0, 1, -1]) {
      state.timerActiveSeat = seat;
      rerender(view());
      expect(screen.getAllByRole("timer")).toHaveLength(2);
      expect(document.querySelectorAll("[data-active=true]")).toHaveLength(seat === -1 ? 0 : 1);
    }
    state.gameOver = true;
    rerender(view());
    expect(screen.getAllByRole("timer")).toHaveLength(2);
    expect(screen.queryByText("Your action")).toBeNull();
    expect(screen.getAllByText("300")).toHaveLength(2);
  });
  it("keeps both clocks above decision sheets without disappearing during pauses", () => {
    const state = new GameState();
    state.matchTimer = true;
    const decision = new PendingDecision();
    decision.seat = 1;
    state.pendingDecision = decision;
    const view = () => (
      <I18nProvider>
        <DecisionMatchTimer state={state} seat={0} />
      </I18nProvider>
    );
    const { rerender } = render(view());
    expect(document.body.querySelector(".game-decision-clocks")?.querySelectorAll("[role=timer]")).toHaveLength(2);
    state.pendingDecision = undefined;
    rerender(view());
    expect(screen.queryByRole("timer")).toBeNull();
  });
  it("prints minute boundaries and clamps expired clocks", () => {
    expect([300, 60, 59, 0, -1].map(formatMatchTime)).toEqual(["05:00", "01:00", "00:59", "00:00", "00:00"]);
  });
  it("hides disabled clocks and shows the live owner's low-time warning", () => {
    const state = new GameState();
    const { rerender } = render(
      <I18nProvider>
        <MatchTimer state={state} seat={1} />
      </I18nProvider>,
    );
    expect(screen.queryByRole("timer")).toBeNull();
    state.matchTimer = true;
    state.timerRemaining1 = 20;
    state.timerActiveSeat = 1;
    rerender(
      <I18nProvider>
        <MatchTimer state={state} seat={1} />
      </I18nProvider>,
    );
    expect(screen.getByRole("timer").getAttribute("aria-label")).toContain("00:20");
    expect(screen.getByRole("timer").getAttribute("data-low")).toBe("true");
    expect(screen.getByRole("timer").getAttribute("data-active")).toBe("true");
    expect(screen.getByText("20")).toBeTruthy();
    expect(screen.queryByText("Your action")).toBeNull();
  });
});
