// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { hoverZoomPreference } from "@/design/hoverZoomPreference";
import { I18nProvider } from "@/i18n/I18nProvider";
import { SecurityBranch } from "@/game/SecurityClashView";
import { Side } from "@/game/side";
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

it("previews the resolving Option card when the pointer hovers its dock", () => {
  render(
    <I18nProvider>
      <SecurityBranch scene={{ key: 1, cardId: "P-204", side: Side.Viewer, state: "docked", source: "option" }} />
    </I18nProvider>,
  );
  const art = document.querySelector<HTMLElement>(".battle-security-branch__art > div")!;
  fireEvent.mouseMove(art, { clientX: 240, clientY: 320 });
  expect(screen.getByTestId("card-zoom-preview")).toBeTruthy();
});

it("lets the pointer reach the docked card while the rest of the branch stays click-through", () => {
  const css = readStylesheet("game.css");
  expect(css).toMatch(/\.battle-security-branch \{[^}]*pointer-events: none;/);
  expect(css).toMatch(
    /\.battle-security-branch\[data-state="docked"\] \.battle-security-branch__art \{\s*pointer-events: auto;/,
  );
});
