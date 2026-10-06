// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "../../../i18n";
import { GameOverOverlay } from "./GameOverOverlay";

afterEach(cleanup);

function renderOverlay(cardsRevealed = false) {
  render(
    <I18nProvider>
      <GameOverOverlay
        result="win"
        reason="security"
        stats={[{ value: 7, label: "Turns" }]}
        cardsRevealed={cardsRevealed}
        onMenu={() => {}}
        onRematch={() => {}}
      />
    </I18nProvider>,
  );
}

describe("reviewing the board after the match", () => {
  it("folds the result into a bar and brings it back", () => {
    renderOverlay();
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "View board" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Victory");

    fireEvent.click(screen.getByRole("button", { name: "Show result" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Find rematch" })).toBeTruthy();
  });
});

describe("revealed cards hint", () => {
  it("points at the piles only once the server revealed them", () => {
    renderOverlay(true);
    fireEvent.click(screen.getByRole("button", { name: "View board" }));
    expect(screen.getByRole("status").textContent).toContain("Click a pile to see its cards");
  });
});
