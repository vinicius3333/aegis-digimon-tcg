import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-114.js";

describe("BT4-114 AncientGarurumon", () => {
  it("unsuspends an own Hybrid Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-114", as: "ancient" },
            { card: "BT4-025", as: "hybrid", suspended: true },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ancient").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("hybrid").isSuspended);
    expect(s.perm("hybrid").isSuspended).toBe(false);
  });

  it("may play a blue level 4 or lower Hybrid from hand when deleted", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT4-114", as: "ancient" }], hand: [{ card: "BT4-025", as: "hybrid" }] } },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await (s.engine as any).primitives.deletePermanent([s.perm("ancient").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT4-025"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT4-025")).toBe(true);
  });
});
