import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
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

  it("publicly digivolves from catalog DoruGreymon, pays 3, and resolves the Kosuke SoC branch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT16-061", as: "base", under: [{ card: "BT16-087", as: "kosuke" }] },
            { card: "BT14-071", suspended: true, as: "soc" },
            { card: "BT1-009", suspended: true, as: "nonSoc" },
          ],
          hand: [{ card: "P-184", as: "doru" }, "BT1-013"],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: ["BT1-009", "BT1-013", "BT1-014"],
        },
        1: { battleArea: ["BT1-009"], hand: ["BT1-013"], deck: Array.from({ length: 20 }, () => "BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const originalSourceId = s.perm("base").topCard.instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("doru").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "P-184" && !s.perm("soc").isSuspended);
    expect(s.state.memory).toBe(7);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("kosuke").instanceId,
      originalSourceId,
    ]);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("doru").instanceId);
    expect(s.perm("base").currentDP).toBe(15000);
    expect(s.perm("nonSoc").isSuspended).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });
});
