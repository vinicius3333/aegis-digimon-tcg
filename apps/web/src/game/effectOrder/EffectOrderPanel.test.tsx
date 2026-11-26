import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import type { EffectQueueEntry } from "@aegis/shared/protocol/EffectQueueEntry";
import { CardInstance, Permanent } from "@aegis/shared";
import { BreedingSlot } from "@/game/piece/BreedingSlot";
import { EffectOrderPanel } from "@/game/effectOrder/EffectOrderPanel";
import { setEffectOrderEnabled } from "@/game/effectOrder/effectOrderEnabled/setEffectOrderEnabled";
import { PermanentEffectOrderBadges } from "@/game/piece/PermanentEffectOrderBadges";
import { I18nProvider } from "@/i18n/I18nProvider";

beforeEach(() => {
  setEffectOrderEnabled(true);
});

afterEach(() => {
  cleanup();
  setEffectOrderEnabled(false);
});

const entries: EffectQueueEntry[] = [
  { seat: 0, position: 1, isResolving: true, sourceCardId: "BT3-092", sourcePermanentId: "malo", timing: "AllTurns" },
  { seat: 0, position: 2, sourceCardId: "EX1-064", sourcePermanentId: "piedmon" },
  { seat: 1, position: 3, lastPosition: 4 },
  { seat: 1, position: 3, lastPosition: 4, sourceCardId: "BT3-092", sourcePermanentId: "other" },
];

it("lists every pending effect in resolution order and marks the one resolving now", () => {
  render(
    <I18nProvider>
      <EffectOrderPanel entries={entries} viewerSeat={0} />
    </I18nProvider>,
  );

  const panel = screen.getByTestId("effect-order-panel");
  const rows = within(panel).getAllByRole("listitem");
  expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual([
    "Resolving now, step 1",
    "Resolves at step 2",
    "Steps 3–4: the controller has not chosen this order yet",
    "Steps 3–4: the controller has not chosen this order yet",
  ]);
  expect(rows[0]!.dataset.resolving).toBe("true");
  expect(rows[0]!.textContent).toContain("MaloMyotismon");
  expect(rows[2]!.textContent).toContain("Hidden card");
  expect(rows[3]!.dataset.side).toBe("opponent");
  expect(within(panel).getByText("Rulings for the resolving effect")).toBeTruthy();
});

it("renders nothing while no effects are queued", () => {
  render(
    <I18nProvider>
      <EffectOrderPanel entries={[]} viewerSeat={0} />
    </I18nProvider>,
  );

  expect(screen.queryByTestId("effect-order-panel")).toBeNull();
});

it("badges a permanent with its step and a shared range while the order is undecided", () => {
  render(
    <I18nProvider>
      <PermanentEffectOrderBadges entries={[entries[0]!, entries[3]!]} />
    </I18nProvider>,
  );

  const badges = screen.getAllByRole("img");
  expect(badges.map((badge) => badge.textContent)).toEqual(["1Now", "3–4"]);
  expect(badges[1]!.dataset.unordered).toBe("true");
});

it("labels each source's zone and keeps hand and hidden sources in the list", () => {
  render(
    <I18nProvider>
      <EffectOrderPanel
        entries={[
          { ...entries[0]!, sourceZone: "breeding" },
          { seat: 1, position: 2, sourceZone: "hand" },
          { seat: 0, position: 3, sourceCardId: "EX1-064", sourceZone: "trash" },
          { seat: 1, position: 4, sourceZone: "hidden" },
        ]}
        viewerSeat={0}
      />
    </I18nProvider>,
  );

  const rows = within(screen.getByTestId("effect-order-panel")).getAllByRole("listitem");
  expect(rows.map((row) => row.textContent)).toEqual([
    expect.stringContaining("Breeding area"),
    expect.stringContaining("Hand"),
    expect.stringContaining("Trash"),
    expect.stringContaining("Hidden zone"),
  ]);
  expect(rows[1]!.textContent).toContain("Hidden card");
});

it("starts collapsed on a phone and expands on request without covering the hand", () => {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: query === "(max-width: 640px)",
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  try {
    render(
      <I18nProvider>
        <EffectOrderPanel entries={entries} viewerSeat={0} />
      </I18nProvider>,
    );

    const toggle = screen.getByRole("button", { name: /Effect order/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.textContent).toContain("Pending: 4");
    expect(toggle.textContent).toContain("Now: MaloMyotismon");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  } finally {
    window.matchMedia = original;
  }
});

it("badges a raised Digimon in the breeding area", () => {
  render(
    <I18nProvider>
      <BreedingSlot
        perm={Object.assign(new Permanent(), {
          permanentId: "raised",
          topCard: Object.assign(new CardInstance(), { instanceId: "raised-top", cardId: "BT3-092", faceUp: true }),
        })}
        label="Raising"
        effectOrder={[{ ...entries[1]!, sourcePermanentId: "raised", sourceZone: "breeding" }]}
      />
    </I18nProvider>,
  );

  expect(screen.getByTestId("effect-order-badges").textContent).toBe("2");
});
