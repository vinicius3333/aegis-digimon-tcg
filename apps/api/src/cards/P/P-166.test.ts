import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-166.js";

describe("P-166 Galemon", () => {
  it("encodes optional suspension, conditional Bird/Avian digivolution, and suspended-Digimon cost scaling", () => {
    const compiled = runtimeCompiledCard("P-166")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({
        kind: "Suspend",
        optional: true,
        target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
      });
      expect(effect.actions[1]).toMatchObject({
        kind: "Digivolve",
        optional: true,
        from: ["hand"],
        condition: { kind: "isYourTurn" },
        into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Bird", "Avian"], match: "trait" }] },
      });
      expect(effect.actions[1]).toMatchObject({
        reduceCostScaling: {
          per: 1,
          unit: "cards",
          filter: { controller: "any", excludeSelf: true, suspended: true, kind: ["Digimon"] },
        },
      });
    }
  });

  it("encodes inherited Your Turn +2000 DP", () => {
    expect(runtimeCompiledCard("P-166")!.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "YourTurn",
          isInherited: true,
          actions: [expect.objectContaining({ kind: "ModifyDP", amount: 2000, duration: "permanent" })],
        }),
      ]),
    );
  });

  it("applies inherited +2000 DP to a real host only during its owner's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-064", as: "host", under: ["P-166"] }] },
    });
    const baseDP = s.perm("host").baseDP;
    await s.ready();

    expect(s.perm("host").currentDP).toBe(baseDP + 2000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(baseDP);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(baseDP + 2000);
  });

  it("suspends one Digimon on play when the optional first clause is accepted", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-166", as: "galemon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard!.instanceId);
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("galemon"));
    await settle();
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it.each([0, 1, 2])(
    "digivolves into an Avian and reduces its cost for %s other suspended Digimon",
    async (suspendedHelpers) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            hand: [
              { card: "P-166", as: "galemon" },
              { card: "BT5-053", as: "bird" },
            ],
            battleArea: Array.from({ length: suspendedHelpers }, (_, index) => ({
              card: "BT1-064",
              as: `helper-${index}`,
              suspended: true,
            })),
          },
          1: { battleArea: [{ card: "BT1-009", as: "target" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      const targetPermanentId = s.perm("target").permanentId;
      preferred.push(s.perm("target").topCard!.instanceId);
      await s.ready();
      s.state.memory = 10;
      const playResult = s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("galemon").instanceId });
      expect(playResult).toEqual({ ok: true });
      await settle(() => s.perm("galemon").topCard.cardId === "BT5-053");
      const target = s.state.players[1]!.battleArea.find((permanent) => permanent.permanentId === targetPermanentId);
      expect(target).toBeDefined();
      expect(target!.isSuspended).toBe(true);
      expect(s.perm("galemon").topCard.cardId).toBe("BT5-053");
      // P-166 costs 4 to play; Deramon costs 3 to evolve, reduced once per
      // The optional first clause suspends the opponent's target; all other suspended Digimon
      // (on either side) reduce this effect's digivolution cost.
      expect(s.state.memory).toBe(4 + suspendedHelpers);
    },
  );
});
