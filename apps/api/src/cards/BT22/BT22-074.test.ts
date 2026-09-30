import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-074.js";
import "../index.js";
import { CARD_OF_LEVEL } from "./sameLevel.testSupport.js";

describe("BT22-074 SkullMeramon", () => {
  it("keeps the ordinary purple and red evolution routes", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, colors: ["Purple"], cost: 4, isAlternate: false },
      { level: 4, colors: ["Red"], cost: 4, isAlternate: false },
      { level: 4, traits: ["Flame", "CS"], cost: 3, isAlternate: true },
    ]);
  });
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
          deck: ["BT1-009", "BT1-010"],
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
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-009", "BT1-010"]));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT22-003")).toBe(true);
  });
});

describe("BT22-074 SkullMeramon — KB Q&A rulings", () => {
  const PROTECTED_LEVEL_5 = { card: "BT22-073", as: "target", under: ["BT22-072", CARD_OF_LEVEL[4]] };

  async function activateMain(opponentBattleArea: PermanentSpec[], memory: number, memoryAtActivation = memory) {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-074", as: "skull" }], deck: ["BT1-010", "BT1-011"] },
        1: { battleArea: opponentBattleArea, security: ["BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = memory;
    await s.ready();
    const main = observe(s.engine)
      .activatableEffects(s.perm("skull"))
      .find((entry) => entry.effectKey.startsWith("BT22-074/"));
    expect(main).toBeDefined();
    s.state.memory = memoryAtActivation;
    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("skull").topCard.instanceId,
      effectKey: main!.effectKey,
    });
    await settle(() => s.state.pendingDecision === undefined);
    await advance(s.engine).finishAttack();
    return Object.assign(s, { result });
  }

  const attacked = (s: EngineSetup) => s.events.some((event) => event.kind === "attackDeclared");
  const securityAttack = (s: EngineSetup) => observe(s.engine).keywordAmount(s.perm("skull"), "SecurityAttack");

  it("activates with no deletable opposing Digimon, gains Security A. +1, and may still attack (Q4933, Q6248)", async () => {
    const s = await activateMain([], 5);

    expect(s.result).toEqual({ ok: true });
    expect(s.state.memory).toBe(2);
    expect(securityAttack(s)).toBe(1);
    expect(attacked(s)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("cannot pay only part of the 3 cost, so it neither deletes nor attacks (Q4934, Q4935)", async () => {
    const s = await activateMain([{ card: CARD_OF_LEVEL[5], as: "target" }], 5, -8);

    expect(s.result).toMatchObject({ ok: false });
    expect(observe(s.engine).activatableEffects(s.perm("skull"))).toEqual([]);
    expect(s.state.memory).toBe(-8);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(securityAttack(s)).toBe(0);
    expect(attacked(s)).toBe(false);
  });

  it("must choose and delete an opposing level 5 or lower Digimon, so it gains no Security A. +1 (Q4936)", async () => {
    const s = await activateMain([{ card: CARD_OF_LEVEL[5], as: "target" }], 5);

    const choice = s.decisions.find(({ seat, req }) => seat === 0 && req.kind === "chooseTargets");
    expect(choice?.req.options?.min ?? 1).toBeGreaterThanOrEqual(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(securityAttack(s)).toBe(0);
    expect(attacked(s)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("gains Security A. +1 when the chosen level 5 Digimon avoids deletion by its own effect (Q4937)", async () => {
    const s = await activateMain([PROTECTED_LEVEL_5], 5);

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT22-073"]);
    expect(securityAttack(s)).toBe(1);
    expect(attacked(s)).toBe(true);
  });
});
