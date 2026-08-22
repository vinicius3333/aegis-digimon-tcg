import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST2-06.js";

describe("ST2-06 Garurumon", () => {
  it("trashes the bottom source of any opposing Digimon when attacking", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-08", as: "attacker", under: ["ST2-06"] }] },
      1: {
        battleArea: [{ card: "ST1-10", as: "target", under: [{ card: "ST1-03", as: "bottom" }, { card: "ST1-07", as: "top" }] }],
        security: ["BT1-001"],
      },
    }, { autoSelectCards: true });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("bottom").instanceId));
    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([
      s.inst("top").instanceId,
    ]);
  });
});
