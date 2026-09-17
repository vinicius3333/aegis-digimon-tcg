// @vitest-environment jsdom
import { CardInstance } from "@aegis/shared";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Pile } from "./boardPieces";
import { SECURITY_FLIP_DURATION } from "./SecurityCardSlot";
import { Side } from "./side";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("animates an in-place server flip and finishes with no retained identity or buff", () => {
  vi.useFakeTimers();
  const card = new CardInstance();
  card.instanceId = "public-security";
  card.cardId = "BT19-045";
  card.faceUp = true;
  const { container, rerender } = render(
    <Pile shield={Side.Viewer} count={1} label="Security" securityCards={[card]} />,
  );
  expect(container.querySelector(".game-security-card--turning-down")).toBeNull();
  expect(container.querySelector(".game-security-card__buff")?.textContent).toBe("+1000 DP");
  card.faceUp = false;
  card.cardId = "";
  rerender(<Pile shield={Side.Viewer} count={1} label="Security" securityCards={[card]} />);
  expect(container.querySelector(".game-security-card--turning-down")).toBeTruthy();
  expect(container.querySelector('img[src*="BT19-045"]')).toBeTruthy();
  expect(container.querySelector(".game-security-card__back")).toBeTruthy();
  expect(container.querySelector(".game-security-card__buff")).toBeNull();
  act(() => {
    vi.advanceTimersByTime(SECURITY_FLIP_DURATION);
  });
  expect(container.querySelector(".game-security-card--turning-down")).toBeNull();
  expect(container.innerHTML).not.toContain("BT19-045");
});

it("does not treat removing a revealed card as turning the next card face-down", () => {
  const card = new CardInstance();
  card.instanceId = "removed-security";
  card.cardId = "BT19-045";
  const hidden = new CardInstance();
  hidden.instanceId = "hidden-security";
  hidden.faceUp = false;
  const { container, rerender } = render(
    <Pile shield={Side.Viewer} count={2} label="Security" securityCards={[card, hidden]} />,
  );
  rerender(<Pile shield={Side.Viewer} count={1} label="Security" securityCards={[hidden]} />);
  expect(container.querySelector(".game-security-card--turning-down")).toBeNull();
  expect(container.innerHTML).not.toContain("BT19-045");
});
