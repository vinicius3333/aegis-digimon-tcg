import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-053.js";

describe("BT12-053 MetallifeKuwagamon", () => {
  it("digivolves from an off-color level 4 with Save text and rejects an off-color near-match", async () => {
    const valid = setupEngine({
      0: {
        battleArea: [{ card: "BT10-019", as: "saveBase" }],
        hand: [{ card: "BT12-053", as: "metal" }],
        deck: ["BT1-009"],
      },
    });
    valid.state.memory = 3;
    expect(
      valid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: valid.perm("saveBase").permanentId,
        instanceId: valid.inst("metal").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => valid.perm("saveBase").topCard.cardId === "BT12-053");
    expect(valid.state.memory).toBe(0);
    expect(valid.perm("saveBase").stack.map(({ cardId }) => cardId)).toEqual(["BT10-019"]);
    expect(valid.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-032", as: "plainBase" }], hand: [{ card: "BT12-053", as: "metal" }] },
    });
    invalid.state.memory = 3;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("plainBase").permanentId,
        instanceId: invalid.inst("metal").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.state.memory).toBe(3);
    expect(invalid.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT12-053"]);
  });

  it("gains 1 memory when the inherited Digimon deletes an opponent in battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-022", as: "host", under: ["BT12-053"] }] },
    });
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnBattleDeleteOpponent, s.perm("host"));
    expect(s.state.memory).toBe(1);
  });

  it("gains memory from a real battle deletion, not an unrelated timing drive", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-022", as: "host", under: ["BT12-053"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 1000, suspended: true }] },
    });
    await s.ready();
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.memory === 1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(1);
  });

  it("limits the inherited memory gain to once per turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-022", as: "host", under: ["BT12-053"] }] },
    });
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnBattleDeleteOpponent, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnBattleDeleteOpponent, s.perm("host"));
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when its inherited host wins as the defender on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT12-022", as: "host", under: ["BT12-053"], suspended: true }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 1000 }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT12-022"]);
    expect(s.state.memory).toBe(0);
  });
});
