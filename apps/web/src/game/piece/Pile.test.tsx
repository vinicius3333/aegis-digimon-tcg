// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Pile } from "./Pile";

beforeEach(() => {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        matches: query === "(hover: hover) and (pointer: fine)",
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as MediaQueryList,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Pile", () => {
  it("does not expand its top card on hover", () => {
    render(<Pile count={1} label="Trash" topCardId="ST1-02" />);

    fireEvent.mouseMove(screen.getByTitle("Biyomon"), { clientX: 100, clientY: 100 });

    expect(screen.getAllByAltText("Biyomon")).toHaveLength(1);
  });
});
