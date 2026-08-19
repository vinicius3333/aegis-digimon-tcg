import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { module } from "./BT26-003.js";
import "../index.js";

describe("BT26-003 Kyaromon", () => {
  it("allows the inherited cost to activate without a Glowing Dawn target (Q6953)", () => {
    const source = {
      ownerSeat: 0,
      permanent: () => ({ permanentId: "kyaro", isSuspended: false }),
      isOnBattleArea: () => true,
      isOwnersTurn: () => false,
    } as any;
    const effect = module.effectsForTiming(EffectTiming.OnAllyAttack, source)[0]!;
    const tamer = {
      permanentId: "tamer",
      inBreeding: false,
      topCard: { cardId: "BT26-010" },
      stack: [{ instanceId: "face-down", faceUp: false }],
    };
    const ctx = {
      source,
      trigger: { attackerPermanentId: "opponent-attacker" },
      game: {
        permanentById: (id: string) =>
          id === "opponent-attacker" ? { controllerSeat: 1 } : id === "tamer" ? tamer : undefined,
        opponentOf: () => 1,
        player: () => ({ battleArea: [tamer] }),
        definitionOf: () => ({ kinds: ["Tamer"] }),
      },
    } as any;

    expect(effect.canActivate(ctx)).toBe(true);
  });
});
