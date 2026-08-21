import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "./EX7-014.js";

describe("EX7-014 Volcanicdramon", () => {
  it("registers play/digivolving effects, attack deletion, and once-per-turn leave replacement", () => {
    const source = { instanceId: "source", cardId: "EX7-014", ownerSeat: 0, definition: {}, permanent: () => undefined, isOnBattleArea: () => true, isOwnersTurn: () => true, hasColor: () => true } as never;
    const module = getEffectModule("EX7-014")!;
    expect(module.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source)).toHaveLength(2);
    expect(module.effectsForTiming(EffectTiming.OnAllyAttack, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.None, source)[0]?.maxPerTurn).toBe(1);
  });

  it("deletes the opponent's lowest-DP Digimon on play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-014", as: "volcanic" }] },
      1: { battleArea: [{ card: "BT1-009", as: "low" }, { card: "BT1-010", as: "high" }] },
    }, { autoSelectCards: true });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("volcanic"));
    await settle(() => s.state.players[1].battleArea.length === 1);
    expect(s.state.players[1].battleArea[0]!.topCard.cardId).toBe("BT1-009");
  });
});
