// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { hoverZoomPreference } from "@/design/hoverZoomPreference";
import { TrashSourceCard } from "@/game/piece/TrashSourceCard";
import { readStylesheet } from "@/game/style/stylesheetSource";

beforeEach(() => {
  hoverZoomPreference.setEnabled(true);
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    matches: query === "(hover: hover) and (pointer: fine)",
    media: query,
    onchange: null,
    addEventListener: vi.fn<MediaQueryList["addEventListener"]>(),
    removeEventListener: vi.fn<MediaQueryList["removeEventListener"]>(),
    addListener: vi.fn<MediaQueryList["addListener"]>(),
    removeListener: vi.fn<MediaQueryList["removeListener"]>(),
    dispatchEvent: vi.fn<MediaQueryList["dispatchEvent"]>(),
  }));
});

afterEach(() => {
  cleanup();
  hoverZoomPreference.setEnabled(false);
  vi.restoreAllMocks();
});

it("previews the raised trash source card under the pointer", () => {
  render(<TrashSourceCard card={{ key: 1, cardId: "BT1-010", instanceId: "source", linked: true }} width={60} />);
  const face = document.querySelector<HTMLElement>(".game-pile__effect-card > div")!;
  fireEvent.mouseMove(face, { clientX: 240, clientY: 320 });
  expect(screen.getByTestId("card-zoom-preview")).toBeTruthy();
});

it("lets the pointer reach the raised trash source card", () => {
  const rules = [...readStylesheet("game.css").matchAll(/\n\.game-pile__effect-card \{[^}]*\}/g)].map(([rule]) => rule);
  expect(rules.length).toBeGreaterThan(0);
  expect(rules.filter((rule) => rule.includes("pointer-events: none"))).toEqual([]);
});
