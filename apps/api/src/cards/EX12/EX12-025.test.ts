import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-025 Gawappamon", () => {
  it("optionally returns one opposing level 4 or lower Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-025", as: "source" }] },
        1: {
          battleArea: [
            { card: "EX12-024", as: "low" },
            { card: "EX12-032", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[1]!.hand.length === 1);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.cardId).toBe("EX12-032");
  });

  it("does not return a target when the optional On Play effect is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-025", as: "source" }] },
        1: { battleArea: [{ card: "EX12-024", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("optionally returns one opposing level 4 or lower Digimon on deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-025", as: "source" }] },
        1: {
          battleArea: [
            { card: "EX12-024", as: "low" },
            { card: "EX12-032", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId]);
    await settle(() => s.state.players[1]!.hand.length === 1);
    expect(s.state.players[1]!.hand).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.cardId).toBe("EX12-032");
  });

  it("has printed Blocker without inheriting it, and inherits Draw 1 at seven or fewer cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-025", as: "source" },
            { card: "BT1-010", as: "host", under: ["EX12-025"] },
          ],
          hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(false);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[0]!.hand.length === 8);
    expect(s.state.players[0]!.hand).toHaveLength(8);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.hand).toHaveLength(8);

    const card = getCardDefinition("EX12-025");
    const compiled = registeredCompiledCards.get("EX12-025")!;
    expect(card).toMatchObject({
      nameEn: "Gawappamon",
      colors: ["Blue"],
      playCost: 5,
      dp: 5000,
      level: 4,
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Cyborg", "Shambala", "SW"],
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
    });
    expect(card?.effectText).toContain("[On Play] [On Deletion]");
    expect(card?.inheritedEffectText).toContain("7 or fewer cards");
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Shambala"], cost: 2, isAlternate: true }]);
    expect(compiled.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", controller: "mine", amount: 1, condition: { kind: "handAtMost", value: 7 } }],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("opens a real block window and intercepts an attack with Blocker", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      1: {
        battleArea: [{ card: "EX12-025", as: "blocker" }],
        security: ["BT1-011"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: [s.perm("blocker").permanentId],
    });

    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("does not draw from the inherited effect when the hand starts above seven cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "host", under: ["EX12-025"] }],
        hand: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: ["BT1-010"],
      },
    });

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[0]!.hand).toHaveLength(8);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });

  it("uses the normal blue and alternate Shambala level-3 evolution routes for two", async () => {
    expect(digivolutionRequirementsFor("EX12-025")).toEqual([
      { level: 3, traits: ["Shambala"], cost: 2, isAlternate: true },
    ]);

    for (const [baseCardId, useAlternateCost] of [
      ["BT1-027", false],
      ["EX12-006", true],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: "EX12-025", as: "gawappamon" }],
        },
      });
      s.state.memory = 2;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("gawappamon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "EX12-025");
      expect(s.state.memory).toBe(0);
    }
  });

  it("rejects an off-color level-3 Digimon without Shambala", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "base" }],
        hand: [{ card: "EX12-025", as: "gawappamon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gawappamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
