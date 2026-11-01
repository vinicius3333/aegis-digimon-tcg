import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CardInstance, Permanent } from "@aegis/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { PermanentView } from "@/game/piece/PermanentView";

afterEach(cleanup);

type ProtectedDigimonParams = {
  heldDeltas: readonly number[];
  currentDP?: number;
};

function buildProtectedDigimon({ heldDeltas, currentDP = 5000 }: ProtectedDigimonParams): Permanent {
  const permanent = new Permanent();
  permanent.permanentId = "greymon";
  permanent.controllerSeat = 0;
  permanent.topCard = Object.assign(new CardInstance(), { instanceId: "greymon-top", cardId: "ST1-07" });
  permanent.baseDP = 5000;
  permanent.currentDP = currentDP;
  permanent.heldDpEffectsJson =
    heldDeltas.length > 0
      ? JSON.stringify(heldDeltas.map((value) => ({ kind: "dp", value, duration: 0, ownerSeat: 1 })))
      : "";
  return permanent;
}

function renderPermanent(permanent: Permanent, onClick = vi.fn<() => void>()) {
  render(
    <I18nProvider>
      <PermanentView perm={permanent} onClick={onClick} />
    </I18nProvider>,
  );
  return onClick;
}

function findHeldDpBadge(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".game-held-dp");
}

describe("held DP on the board card", () => {
  it("shows a blocked DP reduction struck through above the DP readout", () => {
    renderPermanent(buildProtectedDigimon({ heldDeltas: [-3000] }));
    const badge = findHeldDpBadge();
    expect(badge?.dataset.heldDp).toBe("down");
    expect(badge?.querySelector("s")?.textContent).toBe("−3K");
    expect(badge?.closest("[data-dp-annotation]")?.closest('[data-dp-layout="stacked"]')).toBeTruthy();
  });

  it("explains the blocked reduction on tap without acting on the card", () => {
    const onClick = renderPermanent(buildProtectedDigimon({ heldDeltas: [-3000] }));
    fireEvent.click(findHeldDpBadge()!);
    const hint = screen.getByRole("tooltip");
    expect(hint.textContent).toContain("−3,000 DP blocked while protected");
    expect(hint.textContent).toContain("It applies if the protection ends while the change still lasts.");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("adds up several blocked changes into one net figure", () => {
    renderPermanent(buildProtectedDigimon({ heldDeltas: [-3000, -2000] }));
    expect(findHeldDpBadge()?.querySelector("s")?.textContent).toBe("−5K");
  });

  it("announces the blocked reduction in the card's accessible name", () => {
    renderPermanent(buildProtectedDigimon({ heldDeltas: [-3000] }));
    expect(screen.getByRole("button", { name: /−3,000 DP blocked while protected/ })).toBeTruthy();
  });

  it("keeps the applied DP change and the blocked one as separate readouts", () => {
    renderPermanent(buildProtectedDigimon({ heldDeltas: [-3000], currentDP: 7000 }));
    const appliedChange = screen.getByTitle("DP +2K");
    const heldBadge = findHeldDpBadge();
    expect(heldBadge).toBeTruthy();
    expect(heldBadge?.contains(appliedChange)).toBe(false);
    expect(appliedChange.contains(heldBadge)).toBe(false);
  });

  it("shows nothing while no DP change is blocked", () => {
    renderPermanent(buildProtectedDigimon({ heldDeltas: [] }));
    expect(findHeldDpBadge()).toBeNull();
    expect(document.querySelector("[data-dp-annotation]")).toBeNull();
  });
});
