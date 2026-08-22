import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { module } from "./EX10-034.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";

describe("EX10-034 Blastmon", () => {
  it("pays the real two-card stack cost when any Digimon attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX10-034", as: "blastmon", under: ["BT1-009", "BT1-010"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();

    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("attacker").permanentId });

    expect(s.perm("blastmon").stack).toHaveLength(0);
    expect(observe(s.engine).keywordAmount(s.perm("blastmon"), "SecurityAttack")).toBe(1);
    expect(s.perm("blastmon").currentDP).toBe(16000);
  });

  it("forces the chosen opponent Digimon to attack at its granted main phase", async () => {
    const opponent = { permanentId: "OPP-1", topCard: { cardId: "DUMMY" } };
    let subscription: any;
    const calls: string[] = [];
    const source: any = {
      ownerSeat: 0,
      isOnBattleArea: () => true,
      permanent: () => undefined,
    };
    const ctx: any = {
      source,
      game: {
        state: { turnSeat: 1 },
        opponentOf: () => 1,
        player: () => ({ battleArea: [opponent] }),
        definitionOf: () => ({ kinds: ["Digimon"] }),
      },
      ask: { chooseTargets: async () => [opponent.permanentId] },
      fx: {
        subscribeSubTrigger: (spec: any) => {
          subscription = spec;
        },
      },
    };

    const effect = module.effectsForTiming(EffectTiming.OnEnterFieldAnyone, source)[0]!;
    await effect.resolve(ctx);
    expect(subscription).toBeDefined();
    await subscription.run({ fx: { forceAttack: async (id: string) => calls.push(id) } });
    expect(calls).toEqual([opponent.permanentId]);
  });

  it("exposes Collision, Fragment (3), Blocker, and the two-card All Turns cost", () => {
    const effects: any[] = module.effectsForTiming(EffectTiming.None, {
      ownerSeat: 0,
      isOnBattleArea: () => true,
      permanent: () => undefined,
    } as any);
    expect(effects).toHaveLength(4);
    expect(effects.map((effect) => effect.description)).toEqual([
      "＜Collision＞",
      "＜Fragment (3)＞",
      "＜Blocker＞",
      expect.stringContaining("trashing any 2"),
    ]);
  });
});
