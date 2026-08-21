import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX9-021.js";

describe("EX9-021", () => {
  const source = { instanceId: "source", cardId: "EX9-021", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
  it("registers the DNA digivolving protection and highest-level deletion effect", () => expect(getEffectModule("EX9-021")!.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source)).toHaveLength(1));
  it("registers a once-per-turn end-of-attack effect", () => expect(getEffectModule("EX9-021")!.effectsForTiming(EffectTiming.OnEndAttack, source)[0]?.maxPerTurn).toBe(1));

  it("DNA digivolving deletes every opposing highest-level Digimon and grants Digimon-effect immunity", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-013", as: "redMaterial" }, { card: "EX9-020", as: "blueMaterial" }],
        hand: [{ card: "EX9-021", as: "alterS" }],
      },
      1: {
        battleArea: [
          { card: "EX9-013", as: "highestA" },
          { card: "BT1-009", as: "lower" },
        ],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      materialPermanentIds: [s.perm("redMaterial").permanentId, s.perm("blueMaterial").permanentId],
      instanceId: s.inst("alterS").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT1-009");
    const alterS = s.state.players[0]!.battleArea[0]!;
    expect(alterS.topCard.cardId).toBe("EX9-021");
    expect(observe(s.engine).hasRestriction(alterS, "beAffected", "Digimon")).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["EX9-013"]),
    );
  });

  it("deletes the highest level even when the DNA condition is false", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-021", as: "alterS" }] },
      1: { battleArea: [{ card: "EX9-013", as: "highest" }, { card: "BT1-009", as: "lower" }] },
    });

    await advance(s.engine).fire(EffectTiming.OnEnterFieldAnyone, s.perm("alterS"));
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-009"]);
    expect(observe(s.engine).hasRestriction(s.perm("alterS"), "beAffected", "Digimon")).toBe(false);
  });
});
