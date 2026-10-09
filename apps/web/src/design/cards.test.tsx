// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CardFull, CardMini } from "./cards";

afterEach(() => cleanup());

describe("CardMini orientation", () => {
  it("turns a suspended permanent sideways so the state is unambiguous", () => {
    render(<CardMini cardId="ST1-02" suspended zoomOnHover={false} />);

    const card = screen.getByTitle("Biyomon");
    expect(card.dataset.state).toBe("suspended");
    expect(card.style.rotate).toBe("90deg");
    expect(card.style.transformOrigin).toBe("center");
  });
});

// The arena uses pointer gestures even while play is gated between phases.
it.each([CardFull, CardMini])("#5394: artwork cannot start a browser-native image drag", (Card) => {
  render(<Card cardId="ST1-02" zoomOnHover={false} />);
  expect((screen.getByRole("img") as HTMLImageElement).draggable).toBe(false);
});
