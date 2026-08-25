// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CardMini } from "./cards";

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
