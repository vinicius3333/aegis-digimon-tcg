import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-203.js";

describe("P-203 Justimon: Accel Arm", () => {
  it("encodes both named evolution paths", () => {
    expect(runtimeCompiledCard("P-203")!.digivolutionRequirement).toEqual([
      { names: ["Justimon: Blitz Arm", "Justimon: Critical Arm"], cost: 1, isAlternate: true },
      { level: 5, names: ["Cyberdramon"], cost: 3, isAlternate: true },
    ]);
  });

  it("shares the once-per-turn De-Digivolve, Option cost, and keyword gain across three timings", () => {
    const card = runtimeCompiledCard("P-203")!;
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "DeDigivolve",
            amount: 1,
            target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          },
          {
            kind: "GainKeyword",
            keyword: { keyword: "Piercing" },
            cost: { kind: "trash", target: { count: 1, filter: { zone: "battleArea", kind: ["Option"] } } },
          },
          { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
        ],
      });
    }
    expect(card.effects.filter((effect) => effect.sharedUseKey === "ir-shared-0")).toHaveLength(3);
  });

  it("restricts one opponent Digimon after either player's battle-area Option is effect-trashed", () => {
    expect(runtimeCompiledCard("P-203")!.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "whenTrashedByEffect",
          sourceFilter: { zone: "battleArea", kind: ["Option"] },
          actions: [
            { kind: "Restrict", restriction: "digivolve" },
            { kind: "Restrict", restriction: "attackPlayers", target: { sameTarget: true } },
          ],
        },
      ],
    });
  });

  it("de-digivolves an opposing stack on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-203", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim", under: ["BT1-001"] }] },
      },
      { autoAcceptOptional: false, autoDeclineOptional: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();
    expect(s.perm("victim").stack).toHaveLength(1);
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    await settle();
    expect(s.perm("victim").stack).toHaveLength(1);
  });
});
