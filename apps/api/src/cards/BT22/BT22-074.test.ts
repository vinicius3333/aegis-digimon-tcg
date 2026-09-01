import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-074.js";

describe("BT22-074 SkullMeramon", () => {
  it("pays 3, deletes up to level 5, conditionally grants Security Attack, then may attack", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ frequency: "OncePerTurn" });
    expect(main?.actions[0]).toMatchObject({
      kind: "CostGatedBlock",
      cost: { kind: "payMemory", memory: 3 },
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
            count: 1,
          },
        },
        {
          kind: "GainKeyword",
          keyword: { keyword: "SecurityAttack", amount: 1 },
          duration: "forTheTurn",
          condition: { kind: "ifThisEffectDidNotDelete" },
        },
        { kind: "Attack", optional: true, target: { filter: { isSelfRef: true }, isSelf: true } },
      ],
    });
  });

  it("draws two and trashes one on deletion, with inherited trash play", () => {
    const deletion = compiled.effects.filter((entry) => entry.trigger === "OnDeletion");
    expect(deletion[0]?.actions).toMatchObject([
      { kind: "Draw", amount: 2 },
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
    ]);
    expect(compiled.effects.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      optional: true,
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          levelComparison: { op: "lte", value: 4 },
          nameOrTrait: [{ tokens: ["Flame", "CS"], match: "trait" }],
        },
        count: 1,
      },
    });
  });

  it("pays exactly 3 and gains Security Attack when public Main activation deletes nothing", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT22-074", as: "skull" }] } }, { autoAcceptOptional: true });
    const source = (
      s.engine as unknown as { cardSourceOf(card: object): Parameters<typeof effectsOf>[1] }
    ).cardSourceOf(s.perm("skull").topCard!);
    const effectKey = effectsOf(EffectTiming.OnDeclaration, source).find((effect) =>
      effect.effectKey.startsWith("BT22-074/"),
    )!.effectKey;
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("skull").topCard!.instanceId,
        effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("skull"), "SecurityAttack"));
    expect(s.state.memory).toBe(2);
    expect(observe(s.engine).hasKeyword(s.perm("skull"), "SecurityAttack")).toBe(true);
  });

  it("draws two and trashes one through a public battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-074", as: "skull", dp: 1000, suspended: true }],
          deck: ["BT22-001", "BT22-002"],
          hand: ["BT22-003"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("skull").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT22-003"));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT22-001", "BT22-002"]),
    );
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT22-003")).toBe(true);
  });
});
