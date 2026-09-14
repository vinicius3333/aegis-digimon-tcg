// @vitest-environment jsdom
import { CardInstance } from "@aegis/shared";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { Pile } from "./boardPieces";
import { TrashViewerOverlay } from "./overlays";

afterEach(cleanup);

it("renders public security art in its slot without exposing hidden identities", () => {
  const revealed = new CardInstance();
  revealed.cardId = "BT1-009";
  revealed.faceUp = true;
  const hidden = new CardInstance();
  hidden.cardId = "BT1-010";
  hidden.faceUp = false;
  const { container } = render(<Pile shield="you" count={2} label="Security" securityCards={[hidden, revealed]} />);
  const slots = container.querySelectorAll(".game-security-cards i");
  expect(slots).toHaveLength(2);
  expect(slots[0]!.querySelector("img")).toBeNull();
  expect(slots[1]!.querySelector("img")?.getAttribute("src")).toContain("BT1-009");
  expect(container.innerHTML).not.toContain("BT1-010");
});

it("shows hidden security positions and selects revealed cards in stack order", () => {
  const { container } = render(
    <I18nProvider>
      <TrashViewerOverlay title="Security" cardIds={["", "BT1-009", ""]} preserveOrder onClose={() => {}} />
    </I18nProvider>,
  );
  expect(container.querySelectorAll("button[title]")).toHaveLength(3);
  fireEvent.focus(container.querySelectorAll("button[title]")[1]!);
  expect(container.querySelector('img[src*="BT1-009"]')).toBeTruthy();
  expect(screen.getByRole("dialog")).toBeTruthy();
});
