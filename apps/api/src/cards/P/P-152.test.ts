import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-152.js";

describe("P-152 Shoutmon + Dorulu Cannon", () => {
  it("encodes the attack DP reduction and Xros Heart placement cost", () => {
    const compiled = runtimeCompiledCard("P-152")!;
    const attacking = compiled.effects.find((effect) => effect.trigger === "WhenAttacking")!;
    expect(attacking.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -2000,
      duration: "forTheTurn",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(attacking.actions[1]).toMatchObject({
      kind: "Delete",
      optional: true,
      abortOnDecline: true,
      target: {
        filter: { controllerDefault: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } },
        count: 1,
      },
      cost: {
        kind: "place",
        underFilter: { controller: "mine", kind: ["Tamer"] },
        target: {
          filter: {
            zone: "digivolutionCards",
            hostFilter: { isSelfRef: true },
            nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }],
          },
          count: 1,
          from: ["digivolutionCards"],
        },
      },
    });
  });

  it("encodes both zero-cost named digivolution paths, Rule names, and DigiXros materials", () => {
    const compiled = runtimeCompiledCard("P-152")!;
    expect(compiled.digivolutionRequirement).toEqual([
      { names: ["Shoutmon"], playCostLte: 4, cost: 0, isAlternate: true },
      { names: ["Dorulumon"], playCostLte: 4, cost: 0, isAlternate: true },
    ]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Rule",
          actions: [
            {
              kind: "GrantStatic",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              grant: "name",
              tokens: ["Shoutmon", "Dorulumon"],
            },
          ],
        }),
      ]),
    );
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["Shoutmon"] }], count: 1 },
      { materials: [{ names: ["Dorulumon"] }], count: 1 },
    ]);
  });

  it("reduces an opposing Digimon by 2000, then deletes it at the post-reduction boundary", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-152", as: "cannon", under: ["BT10-008"] },
            { card: "BT10-089", as: "tamer" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    await s.ready();
    const targetId = s.perm("target").permanentId;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("cannon"));
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== targetId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toContain("BT10-008");
    expect(s.perm("cannon").stack.map((card) => card.cardId)).not.toContain("BT10-008");
  });
});
