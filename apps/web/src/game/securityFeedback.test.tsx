// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CardInstance, Permanent } from "@aegis/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NoticeStack } from "./NoticeStack";
import { I18nProvider } from "../i18n";
import { BoardInputLock, PermanentView } from "./boardPieces";
import { PermanentDetailInspector, StackViewerOverlay } from "./overlays";
import { buildPermanentDetail } from "./permanentDetail";
import { SecurityClash } from "./SecurityClashView";
import { buildSecurityClashScene, buildSecurityDestructionScene } from "./securityClash";

afterEach(() => cleanup());

function card(instanceId: string, cardId: string): CardInstance {
  const instance = new CardInstance();
  instance.instanceId = instanceId;
  instance.cardId = cardId;
  return instance;
}

function permanent(): Permanent {
  const perm = new Permanent();
  perm.permanentId = "opponent-agumon";
  perm.controllerSeat = 1;
  perm.topCard = card("top", "BT1-010");
  perm.stack.push(card("source", "AD1-001"));
  perm.baseDP = 2000;
  perm.currentDP = 2000;
  return perm;
}

describe("security feedback", () => {
  it("summarizes a revealed security card without a blocking dialog", () => {
    render(
      <I18nProvider>
        <SecurityClash
          scene={buildSecurityClashScene({
            key: 1,
            revealedCardId: "BT1-010",
            resolution: "effect",
            defenderSeat: 1,
            viewerSeat: 0,
          })}
        />
      </I18nProvider>,
    );

    const scene = screen.getByRole("status");
    expect(scene.textContent).toContain("Security check");
    expect(scene.textContent).toContain("Agumon");
    expect(scene.textContent).toContain("Security effect triggers");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stages the attacker opposite the revealed card and compares their DP", () => {
    render(
      <I18nProvider>
        <SecurityClash
          scene={buildSecurityClashScene({
            key: 2,
            revealedCardId: "BT1-010",
            resolution: "battle",
            defenderSeat: 1,
            viewerSeat: 0,
            attacker: { seat: 0, cardId: "BT1-019" },
          })}
        />
      </I18nProvider>,
    );

    const scene = screen.getByTestId("security-clash");
    expect(scene.getAttribute("data-resolution")).toBe("battle");
    expect(scene.querySelector('[data-role="attacker"][data-side="you"]')).toBeTruthy();
    expect(scene.querySelector('[data-role="revealed"][data-side="opp"]')).toBeTruthy();
    expect(screen.getAllByText(/DP$/).length).toBe(2);
  });

  it("stages a destroyed security card alone, cracked, with nothing printed around it", () => {
    render(
      <I18nProvider>
        <SecurityClash
          scene={buildSecurityDestructionScene({ key: 3, cardId: "BT1-010", trashedSeat: 1, viewerSeat: 0 })}
        />
      </I18nProvider>,
    );

    const scene = screen.getByTestId("security-clash");
    expect(scene.getAttribute("data-cause")).toBe("destruction");
    expect(scene.querySelector(".battle-clash__badge")).toBeNull();
    expect(scene.querySelector(".battle-clash__caption")).toBeNull();
    expect(scene.querySelector(".battle-clash__outcome")).toBeNull();
    expect(scene.textContent).toBe("");
    expect(scene.querySelector(".game-card-cracks")).toBeTruthy();
    expect(scene.querySelector(".battle-clash__shatter")).toBeTruthy();
    expect(scene.getAttribute("aria-label")).toContain("Agumon");
  });

  it("announces recovery without exposing a card identity", () => {
    render(
      <I18nProvider>
        <NoticeStack
          notices={[
            { id: "n1", side: "you", fromSecurity: false, createdAt: 0, body: { variant: "recovery", amount: 2 } },
          ]}
          nowMs={0}
          onDismiss={() => undefined}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("status").textContent).toContain("Recovery +2");
    expect(screen.getByRole("status").textContent).toContain("Your security increased");
  });
});

describe("opponent permanent inspection", () => {
  it("does not show a floating card preview over a permanent", () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn<typeof window.matchMedia>().mockReturnValue({
      matches: true,
      media: "",
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    });
    try {
      render(
        <I18nProvider>
          <PermanentView perm={permanent()} />
        </I18nProvider>,
      );

      fireEvent.mouseMove(screen.getByTitle("Agumon"), { clientX: 120, clientY: 120 });

      expect(screen.getAllByAltText("Agumon")).toHaveLength(1);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it("keeps the large preview inside the stack viewer", () => {
    render(
      <I18nProvider>
        <StackViewerOverlay
          title="Agumon"
          cards={[
            { cardId: "BT1-010", role: "top" },
            { cardId: "AD1-001", role: "stack" },
          ]}
          canAttack={false}
          onAttack={() => undefined}
          onClose={() => undefined}
        />
      </I18nProvider>,
    );

    fireEvent.mouseEnter(screen.getByRole("button", { name: /Greymon/ }));

    const previews = screen.getAllByAltText("Greymon");
    expect(previews.some((image) => image.getAttribute("style")?.includes("width: 260px"))).toBe(true);
  });

  it("opens through pointer hover and keyboard focus hooks", () => {
    const onInspectStart = vi.fn<(element: HTMLDivElement, immediate: boolean) => void>();
    const onInspectEnd = vi.fn<() => void>();
    render(
      <I18nProvider>
        <PermanentView perm={permanent()} onInspectStart={onInspectStart} onInspectEnd={onInspectEnd} />
      </I18nProvider>,
    );

    const target = screen.getByLabelText("Inspect opponent Digimon: Agumon");
    fireEvent.mouseEnter(target);
    expect(onInspectStart).toHaveBeenLastCalledWith(target, false);
    fireEvent.focus(target);
    expect(onInspectStart).toHaveBeenLastCalledWith(target, true);
    fireEvent.blur(target);
    expect(onInspectEnd).toHaveBeenCalled();
  });

  it("shows the top effect and inherited effects in stack order", () => {
    render(
      <I18nProvider>
        <PermanentDetailInspector detail={buildPermanentDetail(permanent())} anchorX={100} anchorY={100} />
      </I18nProvider>,
    );

    const inspector = screen.getByRole("tooltip");
    expect(inspector.textContent).toContain("Agumon");
    expect(inspector.textContent).toContain("Reveal 5 cards from the top of your deck");
    expect(inspector.textContent).toContain("Greymon");
    expect(inspector.textContent).toContain("＜Raid＞");
  });
});

describe("board input lock", () => {
  it("covers its surface without drawing anything on it", () => {
    render(<BoardInputLock />);

    const lock = screen.getByTestId("board-input-lock");
    expect(lock.textContent).toBe("");
    expect(lock.getAttribute("aria-hidden")).toBe("true");
  });
});
