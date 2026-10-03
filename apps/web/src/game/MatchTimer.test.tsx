// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { GameState, PendingDecision } from "@aegis/shared";
import { I18nProvider } from "../i18n";
import { DecisionMatchTimer, MatchTimer, formatMatchTime } from "./MatchTimer";

afterEach(cleanup);
describe("match timer readouts", () => {
  it("shows only the required responder, and hides both clocks while paused", () => {
    const state = new GameState();
    state.matchTimer = true;
    const view = () => (
      <I18nProvider>
        <MatchTimer state={state} seat={0} />
        <MatchTimer state={state} seat={1} opponent />
      </I18nProvider>
    );
    const { rerender } = render(view());
    expect(screen.queryAllByRole("timer")).toHaveLength(0);
    state.timerActiveSeat = 0;
    rerender(view());
    expect(screen.getAllByRole("timer")).toHaveLength(1);
    expect(screen.getByRole("timer").getAttribute("aria-label")).toContain("Your time");
    state.timerActiveSeat = 1;
    rerender(view());
    expect(screen.getAllByRole("timer")).toHaveLength(1);
    expect(screen.getByRole("timer").getAttribute("aria-label")).toContain("Opponent");
    state.timerActiveSeat = -1;
    rerender(view());
    expect(screen.queryAllByRole("timer")).toHaveLength(0);
  });
  it("keeps a decision clock above the sheet only for its responder until the match ends", () => {
    const state = new GameState();
    state.matchTimer = true;
    state.timerActiveSeat = 1;
    const decision = new PendingDecision();
    decision.seat = 1;
    state.pendingDecision = decision;
    const view = (seat: 0 | 1) => (
      <I18nProvider>
        <DecisionMatchTimer state={state} seat={seat} />
      </I18nProvider>
    );
    const { rerender } = render(view(0));
    expect(screen.queryByRole("timer")).toBeNull();
    rerender(view(1));
    expect(document.body.querySelector(".game-decision-clock")?.contains(screen.getByRole("timer"))).toBe(true);
    state.gameOver = true;
    rerender(view(1));
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
    expect(screen.getByText("Time running low")).toBeTruthy();
  });
});
