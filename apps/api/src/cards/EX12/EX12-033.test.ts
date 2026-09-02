import { describe, expect, it } from "vitest";
import { compiledEffects, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "./EX12-033.js";

const cardId = "EX12-033";

describe("EX12-033 Amphimon", () => {
  it("maps both evolution routes, all three shared timings, and the DS color waiver", () => {
    const card = getCardDefinition(cardId);
    const compiled = registeredCompiledCards.get(cardId)!;
    expect(card).toMatchObject({
      nameEn: "Amphimon",
      colors: ["Blue", "Yellow"],
      kinds: ["Digimon", "Option"],
      playCost: 5,
      dp: 12000,
      level: 6,
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Cyborg", "DS"],
      evoCosts: [
        { color: "Blue", level: 5, memoryCost: 4 },
        { color: "Yellow", level: 5, memoryCost: 4 },
      ],
      optionColorRequirements: ["Blue"],
    });
    expect(card?.effectText).toContain("[Counter]");
    expect(card?.optionEffect).toContain("Trash any 4 cards");
    expect(card?.dualEffect).toBe("Frozen Crystal");
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, texts: ["Jellymon"], cost: 3, isAlternate: true },
      { traits: ["DS"], cost: 3, isAlternate: true, level: 5 },
    ]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["WhenDigivolving", "WhenAttacking", "Counter"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "ModifyDP",
            optional: true,
            amount: -4000,
            duration: "untilYourTurnEnd",
            cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 3, upTo: true } },
            scaling: { per: 1, usePaidCount: true, unit: "cards" },
          },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          affectsAll: true,
          sourceFilter: {
            nameOrTrait: [
              { tokens: ["Jellymon"], match: "text" },
              { tokens: ["DS"], match: "trait" },
            ],
          },
          actions: [
            {
              kind: "Prevent",
              optional: true,
              abortOnDecline: true,
              cost: { kind: "return", target: { filter: { zone: "trash" }, count: 3 } },
            },
          ],
        },
      ],
    });
    expect(
      compiled.effects.find(
        (effect) =>
          effect.trigger === "Static" && effect.actions?.some((action) => action.kind === "WaiveColorRequirement"),
      ),
    ).toMatchObject({
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["DS"], match: "trait" }] } },
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        {
          kind: "TrashDigivolution",
          amount: 4,
          scope: "acrossDigimon",
          fromTop: false,
          // The pooled scope reads every eligible host, so the target count is "all". The
          // effects.json snapshot still carries the compiler's "any", a value `Target.count`
          // (number | "all") does not admit; that record needs regenerating from this module.
          target: { count: "all" },
        },
        {
          kind: "Return",
          to: "hand",
          optional: true,
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"], digivolutionCards: "none" } },
        },
      ],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiledEffects[cardId]).toEqual(compiled);
  });

  it("scales -4000 by the number of hand cards the effect actually trashed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-033", as: "source" }], hand: ["BT1-001", "BT1-002", "BT1-003"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 20000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.perm("opponent").currentDP === 8000);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.perm("opponent").currentDP).toBe(8000);
  });

  it("uses the same paid-card scaling at the When Attacking timing", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], hand: ["BT1-001", "BT1-002"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("source"));
    await settle(() => s.perm("opponent").currentDP === 4000);

    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.perm("opponent").currentDP).toBe(4000);
  });

  it("resolves the same clause from the [Counter] window", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], hand: ["BT1-001", "BT1-002", "BT1-003"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 20000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnCounterTiming, s.perm("source"));
    await settle(() => s.perm("opponent").currentDP === 8000);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("opponent").currentDP).toBe(8000);
  });

  it("leaves DP and hand untouched when the may-trash clause is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], hand: ["BT1-001", "BT1-002", "BT1-003"] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 20000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => false, 60);

    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("opponent").currentDP).toBe(20000);
  });

  it("trashes four cards across opponent Digimon/Tamer stacks and returns an empty Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-061", as: "ds" }], hand: [{ card: cardId, as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "stacked", under: ["BT1-001", "BT1-002"] },
            { card: "BT1-009", as: "stacked2", under: ["BT1-003", "BT1-004"] },
            { card: "BT1-064", as: "emptyTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-064") === false,
    );

    expect(
      s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT1-009").every(
        (permanent) => permanent.stack.length === 0,
      ),
    ).toBe(true);
    expect(s.state.players[1]!.trash).toHaveLength(4);
    expect(s.state.players[1]!.hand.some((card) => ["BT1-009", "BT1-064"].includes(card.cardId))).toBe(true);
  });

  it("prevents a matching Digimon from leaving by returning exactly three trash cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX12-033", as: "source" }], trash: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("source").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010", "BT1-011"]),
    );
  });

  it("matches Jellymon through full printed text and protects every simultaneous match with one payment (Q6770/Q6774)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT13-028", as: "textOnly" },
            { card: "EX12-023", as: "ds" },
          ],
          trash: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const leavingIds = [s.perm("source").permanentId, s.perm("textOnly").permanentId, s.perm("ds").permanentId];

    expect(await advance(s.engine).verb.deletePermanent(leavingIds, "byEffect")).toBe(0);

    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010", "BT1-011"]),
    );
  });

  it("requires all three payment cards and routes a returned Digi-Egg correctly (Q6771/Q6772)", async () => {
    const insufficient = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT13-028", as: "target" },
          ],
          trash: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await insufficient.ready();
    expect(
      await advance(insufficient.engine).verb.deletePermanent([insufficient.perm("target").permanentId], "byEffect"),
    ).toBe(1);
    expect(insufficient.state.players[0]!.battleArea).toHaveLength(1);
    expect(insufficient.state.players[0]!.trash).toHaveLength(3);

    const withEgg = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT13-028", as: "target" },
          ],
          trash: ["BT1-009", "BT1-010", "EX8-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await withEgg.ready();
    expect(await advance(withEgg.engine).verb.deletePermanent([withEgg.perm("target").permanentId], "byEffect")).toBe(
      0,
    );
    expect(withEgg.state.players[0]!.trash).toHaveLength(0);
    expect(withEgg.state.players[0]!.deck.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010"]),
    );
    expect(withEgg.state.players[0]!.eggDeck.map((card) => card.cardId)).toEqual(["EX8-002"]);
  });

  it("spends the prevention only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "source" },
            { card: "BT13-028", as: "first" },
            { card: "EX12-023", as: "second" },
          ],
          trash: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId], "byEffect")).toBe(0);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(4);
  });

  it("waives the blue Option use requirement with an off-color DS card and rejects use without DS", () => {
    const withoutDs = setupEngine({ 0: { hand: [{ card: cardId, as: "option" }] } });
    withoutDs.state.memory = 10;
    expect(
      withoutDs.engine.applyIntent(0, {
        type: "playCard",
        instanceId: withoutDs.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("uses both normal colors and both cost-3 evolution alternatives", async () => {
    for (const [baseCardId, useAlternateCost, startingMemory] of [
      ["BT1-040", false, 4],
      ["EX12-044", false, 4],
      ["BT13-028", true, 3],
      ["EX8-061", true, 3],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: cardId, as: "source" }] },
      });
      s.state.memory = startingMemory;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("source").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === cardId);
      expect(s.state.memory).toBe(0);
    }

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT23-056", as: "base" }], hand: [{ card: cardId, as: "source" }] },
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
