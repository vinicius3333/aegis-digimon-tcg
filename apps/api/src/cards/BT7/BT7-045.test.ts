import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT7-045.js";

describe("BT7-045 Tortomon", () => {
  it("places a green Digimon from hand on top of the deck to give its host +3000 DP when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-049", under: ["BT7-045"], as: "host" }], hand: [{ card: "BT6-049", as: "greenCard" }], deck: [{ card: "BT1-011", as: "existing" }] },
      1: { security: ["BT1-101"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();
    const baseDP = s.perm("host").currentDP;
    const greenCardId = s.inst("greenCard").instanceId;
    expect(compiled.effects[0]).toMatchObject({ trigger: "WhenAttacking", isInherited: true });

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === baseDP + 3000);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === greenCardId)).toBe(false);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(greenCardId);
  });
});
