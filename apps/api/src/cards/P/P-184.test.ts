import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-184.js";

describe("P-184 Dorugoramon", () => {
  it("encodes DoruGreymon and SoC alternate digivolution requirements", () => {
    expect(runtimeCompiledCard("P-184")!.digivolutionRequirement).toEqual([
      { level: 5, names: ["DoruGreymon"], cost: 3, isAlternate: true },
      { traits: ["SoC"], cost: 3, isAlternate: true, level: 5 },
    ]);
  });

  it("encodes Collision, Security Attack +1, and the conditional SoC unsuspend", () => {
    const card = runtimeCompiledCard("P-184")!;
    expect(card.effects.flatMap((effect) => effect.keywords ?? [])).toEqual([
      { keyword: "Collision", raw: "＜Collision＞" },
      { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
    ]);
    expect(card.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        { kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd", target: { isSelf: true, count: 1 } },
        {
          kind: "Unsuspend",
          target: {
            count: "all",
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["SoC"], match: "trait" }] },
          },
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Kosuke Kisakata"], match: "name" }] },
          },
        },
      ],
    });
  });

  it("exposes Collision and Security Attack +1 on the live Dorugoramon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-184", as: "doru" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("doru"), "Collision")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("doru"), "SecurityAttack")).toBe(1);
  });

  it("boosts DP and unsuspends every allied SoC Digimon when Kosuke is in its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-184", as: "doru", under: ["BT16-087"] },
            { card: "BT14-071", suspended: true, as: "soc" },
          ],
        },
        1: { battleArea: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("doru"));
    await settle();
    expect(s.perm("doru").currentDP).toBe(15000);
    expect(s.perm("soc").isSuspended).toBe(false);
  });
});
