import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-031.js";

describe("BT1-031 Monmon", () => {
  it("has Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-031", as: "digimon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("digimon"), "Blocker")).toBe(true);
  });

  it("suspends to redirect an opposing attack away from the player", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-031", as: "blocker" }], security: ["BT1-001"] },
      1: { battleArea: [{ card: "BT1-028", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const blockerId = s.perm("blocker").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === blockerId));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-031")).toBe(true);
  });
});
