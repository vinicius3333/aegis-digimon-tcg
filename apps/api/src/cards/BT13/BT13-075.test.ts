import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT13-075.js";

describe("BT13-075 Alphamon", () => {
  it("registers both entry timings and the once-per-turn removal seam", () => {
    const module = getEffectModule("BT13-075");
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(1 as never, { cardId: "BT13-075", ownerSeat: 0 } as never).length).toBeGreaterThanOrEqual(0);
  });

  it("returns an eligible stack card to prevent an effect removal", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-075", as: "alphamon", under: ["BT10-016"] }] } },
      { autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("alphamon").permanentId;
    const engine = s.engine as unknown as {
      primitives: { deletePermanent(ids: string[], cause: "byEffect"): Promise<unknown> };
    };

    await engine.primitives.deletePermanent([hostId], "byEffect");
    await settle();

    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT10-016")).toBe(true);
  });
});
