import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-046.js";

describe("BT2-046 MetalTyrannomon", () => {
  it("unsuspends its host after deleting an opposing level 6 Digimon in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-047", as: "attacker", dp: 20000, under: ["BT2-046"] }] },
      1: { battleArea: [{ card: "BT2-031", as: "defender", suspended: true, dp: 1000 }] },
    });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "permanent", permanentId: s.perm("defender").permanentId } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !s.perm("attacker").isSuspended);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("attacker").isSuspended).toBe(false);
  });

  it("does not unsuspend its host when a different Digimon deletes a level 6 Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-047", as: "host", suspended: true, under: ["BT2-046"] },
          { card: "BT2-047", as: "otherWinner", dp: 20_000 },
        ],
      },
      1: { battleArea: [{ card: "BT2-031", as: "level6", suspended: true, dp: 1_000 }] },
    });

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("otherWinner").permanentId,
      target: { kind: "permanent", permanentId: s.perm("level6").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("host").isSuspended).toBe(true);
  });

  it("does not unsuspend after its host deletes a level 5 Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-047", as: "host", dp: 20_000, under: ["BT2-046"] }] },
      1: { battleArea: [{ card: "BT2-047", as: "level5", suspended: true, dp: 1_000 }] },
    });

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "permanent", permanentId: s.perm("level5").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("host").isSuspended).toBe(true);
  });
});
