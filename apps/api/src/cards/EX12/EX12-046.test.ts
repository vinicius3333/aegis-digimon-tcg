import {
  assemblyRequirementFor,
  compiledEffects,
  digivolutionRequirementsFor,
  EffectTiming,
  getCardDefinition,
  Zone,
} from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const cardId = "EX12-046";

describe("EX12-046 Shishimamon", () => {
  it("matches the catalog, bound debuffs, watcher, evolution, Assembly, and inherited play", () => {
    const card = getCardDefinition(cardId);
    const compiled = registeredCompiledCards.get(cardId)!;

    expect(card).toMatchObject({
      nameEn: "Shishimamon",
      colors: ["Yellow", "Red"],
      playCost: 7,
      dp: 7000,
      level: 5,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Holy Beast", "Shambala", "TB"],
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Red", level: 4, memoryCost: 4 },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["Shambala"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.assemblyRequirement).toEqual([
      { reduceCost: 2, materials: [{ traits: ["TB"], levelMax: 4, count: 1 }] },
    ]);
    expect(assemblyRequirementFor(cardId)).toEqual(compiled.assemblyRequirement);

    for (const [trigger, binding] of [
      ["OnPlay", "shishimamonOnPlayTarget"],
      ["WhenDigivolving", "shishimamonWhenDigivolvingTarget"],
    ] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, bindAs: binding },
            amount: -3000,
            duration: "untilOpponentTurnEnd",
          },
          {
            kind: "GainKeyword",
            target: { fromSelectionRef: binding },
            keyword: { keyword: "SecurityAttack", amount: -1, raw: "＜Security A. -1＞" },
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "opponent" },
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              payCost: true,
              reduceCost: 2,
              optional: true,
              into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["TB"], match: "trait" }] },
            },
          ],
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "EndOfAttack",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              kind: ["Digimon"],
              dp: { op: "lte", value: 5000 },
              nameOrTrait: [{ tokens: ["TB"], match: "trait" }],
            },
          },
        },
      ],
    });
    expect(compiledEffects[cardId]).toEqual(compiled);
  });

  it("applies both debuffs to the same chosen Digimon on both printed timings", async () => {
    for (const timing of [EffectTiming.OnPlay, EffectTiming.WhenDigivolving]) {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: cardId, as: "source" }] },
          1: {
            battleArea: [
              { card: "BT1-009", as: "other", dp: 6000 },
              { card: "BT1-011", as: "chosen", dp: 6000 },
            ],
          },
        },
        { autoSelectCards: true },
      );
      await s.ready();
      await advance(s.engine).fire(timing, s.perm("source"));

      const affected = ["other", "chosen"].filter((alias) => s.perm(alias).currentDP === 3000);
      const unaffected = ["other", "chosen"].filter((alias) => s.perm(alias).currentDP === 6000);
      expect(affected).toHaveLength(1);
      expect(unaffected).toHaveLength(1);
      expect(observe(s.engine).keywordAmount(s.perm(affected[0]!), "SecurityAttack")).toBe(-1);
      expect(observe(s.engine).keywordAmount(s.perm(unaffected[0]!), "SecurityAttack")).toBe(0);
    }
  });

  it("assembles with one level-4-or-lower TB card for the printed reduction", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: cardId, as: "source" }],
        trash: [{ card: "BT26-012", as: "material" }],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        assembly: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === cardId));

    const played = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === cardId)!;
    expect(s.state.memory).toBe(0);
    expect(played.stack.map(({ cardId: id }) => id)).toEqual(["BT26-012"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("rejects an Assembly material above level 4", () => {
    const s = setupEngine({
      0: { hand: [{ card: cardId, as: "source" }], trash: [{ card: "BT26-014", as: "material" }] },
    });
    s.state.memory = 7;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        assembly: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("digivolves only after opposing security removal and pays cost minus two", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], hand: [{ card: "EX12-047", as: "target" }] },
        1: { security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.perm("source").topCard.cardId).toBe(cardId);
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await settle(() => s.perm("source").topCard.cardId === "EX12-047");

    expect(s.state.memory).toBe(0);
  });

  it("can react to a later opposing removal when an earlier one had no legal evolution", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: cardId, as: "source" }] }, 1: { security: ["BT1-011"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.perm("source").topCard.cardId).toBe(cardId);

    s.give(0, Zone.Hand, { card: "EX12-047", as: "target" });
    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    await settle(() => s.perm("source").topCard.cardId === "EX12-047");
    expect(s.state.memory).toBe(0);
  });

  it("plays a qualifying TB Digimon at End of Attack only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-058", as: "source", under: [cardId] }],
          hand: [
            { card: "EX12-009", as: "first" },
            { card: "EX12-020", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(getEffectModule(cardId)?.effectsForTiming(EffectTiming.OnEndAttack, s.perm("source") as never)).toHaveLength(
      1,
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("source"), {
      attackerPermanentId: s.perm("source").permanentId,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("source"), {
      attackerPermanentId: s.perm("source").permanentId,
    });

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("rejects TB Digimon above the inherited 5000 DP ceiling", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-058", as: "source", under: [cardId] }], hand: ["BT26-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnEndAttack, s.perm("source"), {
      attackerPermanentId: s.perm("source").permanentId,
    });

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toEqual(["BT26-012"]);
  });

  it("retains the inherited End of Attack effect after evolving during that attack (Q6814)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "attacker" }],
          hand: [
            { card: "EX12-047", as: "evolution" },
            { card: "EX12-009", as: "played" },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("attacker").topCard.cardId === "EX12-047" &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("played").instanceId),
      1_000,
    );

    expect(s.perm("attacker").stack.map(({ cardId: id }) => id)).toContain(cardId);
    expect(s.state.memory).toBe(0);
  });

  it("uses both normal colors and an off-color Shambala route and rejects a nonmatch", async () => {
    for (const [baseCardId, useAlternateCost, memory] of [
      ["BT1-051", false, 4],
      ["EX12-011", false, 4],
      ["EX12-025", true, 3],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "source" }] },
      });
      s.state.memory = memory;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("source").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === cardId);
      expect(s.state.memory).toBe(0);
    }
    const invalid = setupEngine({
      0: { battleArea: [{ card: "AD1-010", as: "base" }], hand: [{ card: cardId, as: "source" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("source").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
