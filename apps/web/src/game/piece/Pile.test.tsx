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
        addEventListener: vi.fn<MediaQueryList["addEventListener"]>(),
        removeEventListener: vi.fn<MediaQueryList["removeEventListener"]>(),
        addListener: vi.fn<MediaQueryList["addListener"]>(),
        removeListener: vi.fn<MediaQueryList["removeListener"]>(),
        dispatchEvent: vi.fn<MediaQueryList["dispatchEvent"]>(),
      }) as MediaQueryList,
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Pile", () => {
  it("restarts moving faces for a new shuffle while retaining the stationary count", () => {
    const { container, rerender } = render(<Pile count={40} label="Deck" riffling={1} />);
    const face = container.querySelector(".game-pile__shuffle-face");
    const count = container.querySelector(".game-pile__top span");
    rerender(<Pile count={40} label="Deck" riffling={2} />);
    expect(container.querySelector(".game-pile__shuffle-face")).not.toBe(face);
    expect(container.querySelector(".game-pile__top span")).toBe(count);
    expect(container.querySelector(".game-pile")?.getAttribute("data-deck-riffle-key")).toBe("2");
  });
  it("retains the resting sleeve and accessible count under reduced-motion shuffle", () => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    vi.mocked(window.matchMedia).mockImplementation((query) => ({
      ...media,
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
    }));
    const { container } = render(<Pile count={40} label="Deck" riffling />);
    expect(screen.getByRole("img", { name: "Deck · 40" })).toBeTruthy();
    expect(container.querySelector(".game-pile--riffling")).toBeNull();
    expect(container.querySelectorAll(".game-pile__top img")).toHaveLength(1);
  });
  it("lifts a buried source while leaving the top card, count and accessible pile intact", () => {
    const { container, rerender } = render(
      <Pile
        className="game-pile--effect-source"
        count={2}
        label="Trash"
        topCardId="ST1-03"
        effectCard={{ key: 1, cardId: "ST1-02", instanceId: "buried" }}
      />,
    );
    const source = container.querySelector(".game-pile__effect-card");
    expect(source?.querySelector("img")?.alt).toBe("Biyomon");
    expect(container.querySelector(".game-pile__top img")?.getAttribute("alt")).toBe("Agumon");
    expect(screen.getByRole("img", { name: "Trash · 2" })).toBeTruthy();
    expect(source?.getAttribute("aria-hidden")).toBe("true");
    rerender(
      <Pile
        count={2}
        label="Trash"
        topCardId="ST1-03"
        effectCard={{ key: 1, cardId: "ST1-02", instanceId: "buried", linked: true }}
      />,
    );
    expect(container.querySelector(".game-pile__effect-card")).toBe(source);
    expect(source?.getAttribute("data-linked")).toBe("true");
    expect(source?.classList.contains("game-pile__effect-card--settled")).toBe(false);
    rerender(<Pile count={2} label="Trash" topCardId="ST1-03" />);
    expect(container.querySelector(".game-pile__effect-card")).toBeNull();
    expect(container.querySelector(".game-pile__top img")?.getAttribute("alt")).toBe("Agumon");
  });
  it("shows an already linked occurrence at rest rather than replaying its enlargement", () => {
    const { container } = render(
      <Pile
        count={2}
        label="Trash"
        topCardId="ST1-03"
        effectCard={{ key: 1, cardId: "ST1-02", instanceId: "buried", linked: true }}
      />,
    );
    expect(container.querySelector(".game-pile__effect-card--settled")).toBeTruthy();
  });
  it("keeps an occurrence's captured speed through the reading handoff", () => {
    const card = { key: 1, cardId: "ST1-02", instanceId: "buried", motionScale: 0.55 };
    const { container, rerender } = render(<Pile count={2} label="Trash" topCardId="ST1-03" effectCard={card} />);
    const source = container.querySelector<HTMLElement>(".game-pile__effect-card")!;
    expect(parseFloat(source.style.getPropertyValue("--t-effect-trash-rise"))).toBeCloseTo(456.5, 8);
    rerender(
      <Pile count={2} label="Trash" topCardId="ST1-03" effectCard={{ ...card, linked: true, motionScale: 1 }} />,
    );
    expect(container.querySelector(".game-pile__effect-card")).toBe(source);
    expect(parseFloat(source.style.getPropertyValue("--t-effect-trash-rise"))).toBeCloseTo(456.5, 8);
  });
  it("does not expand its top card on hover", () => {
    render(<Pile count={1} label="Trash" topCardId="ST1-02" />);

    fireEvent.mouseMove(screen.getByTitle("Biyomon"), { clientX: 100, clientY: 100 });

    expect(screen.getAllByAltText("Biyomon")).toHaveLength(1);
  });
});
