import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
      { namesExact: ["Shoutmon"], basePlayCostMax: 4, cost: 0, isAlternate: true },
      { namesExact: ["Dorulumon"], basePlayCostMax: 4, cost: 0, isAlternate: true },
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

  it.each([
    ["BT10-008", 0],
    ["BT10-034", 1],
  ] as const)("publicly evolves at cost 0 from %s and retains the exact source", async (baseCard, requirementIndex) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [
            { card: "P-152", as: "cannon" },
            { card: "BT1-009", as: "playable" },
          ],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const sourceId = s.inst("base").instanceId;
    const permanentId = s.perm("base").permanentId;
    s.state.memory = 5;
    await s.ready();
    const loop = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: s.inst("cannon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: requirementIndex,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("cannon").instanceId);
    expect(s.state.memory).toBe(5);
    expect(s.perm("base").permanentId).toBe(permanentId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await loop;
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
          hand: [{ card: "BT1-009", as: "playable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }],
          hand: [{ card: "BT1-009", as: "opponentPlayable" }],
          deck: Array(20).fill("BT1-013"),
          security: Array(3).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 5;
    await s.ready();
    const targetId = s.perm("target").permanentId;
    const sourceId = s.perm("cannon").stack[0]!.instanceId;
    const tamerId = s.perm("tamer").permanentId;
    const loop = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("cannon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== targetId) &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === tamerId) &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.perm("cannon").stack.map((card) => card.instanceId)).not.toContain(sourceId);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
