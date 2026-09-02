import { describe, expect, it } from "vitest";
import { digiXrosRequirementFor, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const cardId = "EX12-029";

describe("EX12-029 Sagomon", () => {
  it("records the catalog digivolution and DigiXros requirements", () => {
    const card = getCardDefinition(cardId);
    const compiled = registeredCompiledCards.get(cardId)!;
    expect(card).toMatchObject({
      nameEn: "Sagomon",
      colors: ["Blue", "Yellow"],
      playCost: 7,
      dp: 7000,
      level: 5,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Wizard", "Shambala", "SW"],
      evoCosts: [
        { color: "Blue", level: 4, memoryCost: 4 },
        { color: "Yellow", level: 4, memoryCost: 4 },
      ],
    });
    expect(card?.effectText).toContain("[DigiXros -2] 1 Lv.5 or lower Digimon card");
    expect(card?.inheritedEffectText).toContain("bottom 2 digivolution cards");
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["Shambala"], cost: 3, isAlternate: true }]);
    expect(compiled.digiXrosRequirement).toEqual([
      {
        materials: [
          {
            levelMax: 5,
            nameOrTrait: [
              { tokens: ["Gokuumon"], match: "text" },
              { tokens: ["SW"], match: "trait" },
            ],
          },
        ],
        count: 2,
        maxMaterials: 1,
      },
    ]);
    expect(digiXrosRequirementFor(cardId)).toEqual(compiled.digiXrosRequirement);
  });

  it("makes Alliance selection optional but makes the resulting attack mandatory (Q6761)", () => {
    const compiled = registeredCompiledCards.get(cardId)!;
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({
        kind: "Restrict",
        restriction: "suspend",
        duration: "untilOpponentTurnEnd",
        target: { count: 1, filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
      });
      expect(effect.actions[1]).toMatchObject({
        kind: "GainKeyword",
        optional: true,
        keyword: { keyword: "Alliance" },
        duration: "forTheTurn",
        target: {
          count: 1,
          filter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["SW"], match: "trait" }],
          },
        },
      });
      expect(effect.actions[2]).toMatchObject({
        kind: "Attack",
        mandatory: true,
        condition: { kind: "ifThisEffectActed" },
        target: { count: 1, sameTarget: true },
        withoutSuspending: false,
      });
    }
  });

  it("accepts a level-5-or-lower SW DigiXros material and pays the -2 reduction", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "EX12-006", as: "material" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === cardId));

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === cardId)!;
    expect(played.stack.map((card) => card.cardId)).toEqual(["EX12-006"]);
    expect(s.state.memory).toBe(0);
  });

  it("applies Q6760 by accepting a non-SW card that mentions Gokuumon only in printed text", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "EX6-024", as: "material" },
          ],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === cardId));

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === cardId)!;
    expect(played.stack.map((card) => card.cardId)).toEqual(["EX6-024"]);
    expect(s.state.memory).toBe(0);
  });

  it("applies Q6762's level ceiling to both DigiXros alternatives", () => {
    for (const invalidMaterial of ["EX12-048", "EX6-031"] as const) {
      const s = setupEngine({
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: invalidMaterial, as: "material" },
          ],
        },
      });
      expect(
        s.engine.applyIntent(0, {
          type: "playCard",
          instanceId: s.inst("source").instanceId,
          digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
        }),
      ).toEqual(expect.objectContaining({ ok: false }));
    }
  });

  it("rejects two DigiXros materials because the printed recipe allows exactly one", () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: cardId, as: "source" },
          { card: "EX12-006", as: "first" },
          { card: "EX12-039", as: "second" },
        ],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        digiXros: { materialInstanceIds: [s.inst("first").instanceId, s.inst("second").instanceId] },
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("restricts an opposing permanent and grants Alliance to an SW Digimon on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "ally" }],
          hand: [{ card: cardId, as: "source" }],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent" }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent").permanentId, "beSuspended"));
    await s.ready();

    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    expect(observe(s.engine).isRestricted(s.perm("opponent").permanentId, "beSuspended")).toBe(true);
    expect(continuous.hasKeyword(s.perm("ally").permanentId, "Alliance")).toBe(true);
  });

  it("forces the selected Alliance recipient to attack on play (Q6761)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "ally" }],
          hand: [{ card: cardId, as: "source" }],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent" }], security: ["BT1-090"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const allyId = s.perm("ally").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.events.some((event) => event.kind === "attackDeclared" && event.attackerPermanentId === allyId),
    );
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.events).toContainEqual(expect.objectContaining({ kind: "attackDeclared", attackerPermanentId: allyId }));
  });

  it("may decline granting Alliance, in which case no forced attack occurs", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-006", as: "ally" }],
          hand: [{ card: cardId, as: "source" }],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent" }], security: ["BT1-090"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved"));

    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
    expect(s.perm("ally").isSuspended).toBe(false);
  });

  it("excludes itself and non-SW allies from the Alliance grant, so no forced attack happens", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", as: "nonSw" }],
          hand: [{ card: cardId, as: "source" }],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent" }], security: ["BT1-090"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent").permanentId, "beSuspended"));
    await settle();

    const continuous = (s.engine as unknown as { continuous: { hasKeyword(id: string, keyword: string): boolean } })
      .continuous;
    const sagomon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === cardId)!;
    expect(continuous.hasKeyword(sagomon.permanentId, "Alliance")).toBe(false);
    expect(continuous.hasKeyword(s.perm("nonSw").permanentId, "Alliance")).toBe(false);
    expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(false);
  });

  it("applies the same restriction, Alliance grant, and forced attack on digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-006", as: "ally" },
            { card: "EX12-011", as: "base" },
          ],
          hand: [{ card: cardId, as: "source" }],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent" }], security: ["BT1-090"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const allyId = s.perm("ally").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.events.some((event) => event.kind === "attackDeclared" && event.attackerPermanentId === allyId),
    );
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("base").topCard?.cardId).toBe(cardId);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "beSuspended")).toBe(true);
  });

  it("trashes bottom sources and restricts a source-less opposing Digimon once per turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-011", as: "host", under: [{ card: cardId, as: "source" }] }] },
        1: {
          battleArea: [
            { card: "BT1-011", as: "empty" },
            { card: "BT1-011", as: "stacked", under: ["BT1-001", "BT1-002", "BT1-003"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(
      () =>
        s.perm("stacked").stack.length === 1 && observe(s.engine).isRestricted(s.perm("empty").permanentId, "suspend"),
    );

    expect(s.perm("stacked").stack).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("empty").permanentId, "beSuspended")).toBe(true);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();
    expect(s.perm("stacked").stack).toHaveLength(1);
  });

  it("uses both normal colors and the alternate Shambala evolution route", async () => {
    expect(digivolutionRequirementsFor(cardId)).toEqual([
      { level: 4, traits: ["Shambala"], cost: 3, isAlternate: true },
    ]);

    for (const [baseCardId, useAlternateCost, startingMemory] of [
      ["AD1-010", false, 4],
      ["BT1-051", false, 4],
      ["EX12-011", true, 3],
    ] as const) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCardId, as: "base" }],
          hand: [{ card: cardId, as: "sagomon" }],
        },
      });
      s.state.memory = startingMemory;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("sagomon").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === cardId);
      expect(s.state.memory).toBe(0);
    }
  });

  it("rejects an off-color level-4 Digimon without Shambala", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-074", as: "base" }],
        hand: [{ card: cardId, as: "sagomon" }],
      },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("sagomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("exposes Blocker only while Sagomon is the top card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: cardId, as: "source" },
          { card: "BT1-010", as: "plainHost", under: [cardId] },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plainHost"), "Blocker")).toBe(false);
  });
});
