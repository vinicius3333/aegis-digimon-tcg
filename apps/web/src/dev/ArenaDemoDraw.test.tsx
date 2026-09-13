// @vitest-environment jsdom
import { Phase } from "@aegis/shared";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { ArenaDemo, createArenaDemoState } from "./ArenaDemo";

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/dev/arena?hand=20&opponentHand=20");
});
afterEach(() => cleanup());

it("buys both hands, persists through phase and keyword reset, then disables exhausted decks", () => {
  const baseline = createArenaDemoState();
  const { container } = render(
    <I18nProvider>
      <ArenaDemo />
    </I18nProvider>,
  );
  const tools = screen.getByRole("button", { name: "Demo tools" });
  fireEvent.click(tools);
  const yourDraw = screen.getByRole("menuitem", { name: "Draw your card" });
  const opponentDraw = screen.getByRole("menuitem", { name: "Draw opponent card" });
  fireEvent.click(yourDraw);
  fireEvent.click(opponentDraw);
  expect(container.querySelectorAll(".game-hand-card")).toHaveLength(21);
  for (const side of ["You", "Opponent"])
    expect(within(screen.getByRole("group", { name: side })).getByRole("img", { name: "21 cards" })).toBeTruthy();
  fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
  expect(document.activeElement).toBe(tools);
  fireEvent.change(screen.getByRole("combobox", { name: "Phase" }), { target: { value: Phase.End } });
  fireEvent.click(tools);
  fireEvent.click(screen.getByRole("menuitem", { name: "Edit demo keywords" }));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Blocker" } });
  fireEvent.click(screen.getByRole("button", { name: "Grant keyword" }));
  fireEvent.click(screen.getByRole("button", { name: "Reset all" }));
  fireEvent.click(screen.getByRole("button", { name: "View arena" }));
  expect(container.querySelectorAll(".game-hand-card")).toHaveLength(21);
  fireEvent.click(tools);
  for (const [seat, name] of [
    [0, "Draw your card"],
    [1, "Draw opponent card"],
  ] as const) {
    const button = screen.getByRole("menuitem", { name }) as HTMLButtonElement;
    for (let index = 1; index < baseline.players[seat]!.deckCount; index++) fireEvent.click(button);
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain("0 in deck");
    const expectedHand = 20 + baseline.players[seat]!.deckCount;
    expect(
      within(screen.getByRole("group", { name: seat === 0 ? "You" : "Opponent" })).getByRole("img", {
        name: `${expectedHand} cards`,
      }),
    ).toBeTruthy();
  }
  expect(container.querySelectorAll(".game-hand-card")).toHaveLength(20 + baseline.players[0]!.deckCount);
});
