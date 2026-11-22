// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n";
import { SecurityClash } from "@/game/SecurityClashView";
import { buildSecurityRevealScene, type SecurityClashScene } from "@/game/securityClash";
import { CLASH_OUTCOME_AT_MS } from "@/game/timings";
import { readStylesheet } from "@/game/style/stylesheetSource";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const pendingCheck = buildSecurityRevealScene({
  key: 7,
  revealedCardId: "BT1-010",
  defenderSeat: 1,
  viewerSeat: 0,
  attacker: { seat: 0, cardId: "BT1-019" },
});

const battleCheck: SecurityClashScene = { ...pendingCheck, resolution: "battle" };

function renderClash(scene: SecurityClashScene) {
  return render(
    <I18nProvider>
      <SecurityClash scene={scene} />
    </I18nProvider>,
  );
}

function clashElement() {
  return screen.getByTestId("security-clash");
}

describe("a security check that stays open while its effects resolve", () => {
  it("holds center stage through the readable reveal", () => {
    renderClash(pendingCheck);

    act(() => {
      vi.advanceTimersByTime(CLASH_OUTCOME_AT_MS - 1);
    });

    expect(clashElement().getAttribute("data-receded")).toBeNull();
  });

  it("recedes from the board once the reveal has been read and the check is still open", () => {
    renderClash(pendingCheck);

    act(() => {
      vi.advanceTimersByTime(CLASH_OUTCOME_AT_MS);
    });

    expect(clashElement().getAttribute("data-receded")).toBe("true");
  });

  it("stays receded when the check finally closes, so the board is not covered again", () => {
    const view = renderClash(pendingCheck);
    act(() => {
      vi.advanceTimersByTime(CLASH_OUTCOME_AT_MS);
    });

    view.rerender(
      <I18nProvider>
        <SecurityClash scene={battleCheck} />
      </I18nProvider>,
    );

    expect(clashElement().getAttribute("data-receded")).toBe("true");
  });

  it("keeps a check that closes within the reveal at full size", () => {
    const view = renderClash(pendingCheck);
    view.rerender(
      <I18nProvider>
        <SecurityClash scene={battleCheck} />
      </I18nProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(CLASH_OUTCOME_AT_MS * 2);
    });

    expect(clashElement().getAttribute("data-receded")).toBeNull();
  });
});

describe("the receded security check over the board", () => {
  it("never takes pointer input, so board cards under it keep their hover previews", () => {
    const css = readStylesheet("game.css");

    expect(css).toMatch(/\.battle-clash \{[^}]*pointer-events: none;/);
  });

  it("drops the board dim and shrinks its cards", () => {
    const css = readStylesheet("game.css");

    expect(css).toMatch(/\.battle-clash\[data-receded="true"\]::before \{\s*opacity: 0;/);
    expect(css).toMatch(
      /\.battle-clash\[data-receded="true"\] \.battle-clash__art > div \{\s*width: var\(--battle-clash-receded-card-width/,
    );
  });
});
