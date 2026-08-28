import { describe, expect, it } from "vitest";
import { compiledEffects, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { compiled } from "./EX12-062.js";

const CARD_ID = "EX12-062";

describe("EX12-062 Kokeshimon", () => {
  it("maps the Puppet/Shambala evolution, both deletion windows, and inherited attack effect", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, traits: ["Puppet", "Shambala"], cost: 2, isAlternate: true },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Delete",
            target: {
              count: 1,
              filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
            },
            cost: { kind: "deleteOwn", target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } } },
            optional: true,
            abortOnDecline: true,
          },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { count: 1, filter: { controller: "mine", zone: "hand" } } },
      ],
    });
    expect(registeredCompiledCards.get(CARD_ID)).toEqual(compiled);
    expect(compiledEffects[CARD_ID]).toEqual(compiled);
  });

  it("deletes a chosen own Digimon before deleting an opposing level 4 Digimon on play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: "EX12-061", as: "sacrifice" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const sacrificeInstanceId = s.perm("sacrifice").topCard!.instanceId;
    const opponentPermanentId = s.perm("opponent").permanentId;
    preferred.push(s.perm("sacrifice").permanentId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === sacrificeInstanceId));

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX12-061")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === opponentPermanentId)).toBe(
      false,
    );
  });

  it("may delete itself as the cost and still deletes the opposing Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const sourceId = s.perm("source").permanentId;
    const opponentId = s.perm("opponent").permanentId;
    preferred.push(sourceId);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === sourceId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === opponentId)).toBe(false);
  });

  it("may decline the deletion cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: "EX12-061", as: "sacrifice" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    const resolution = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await resolution;

    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("may pay the cost but cannot delete an opposing level 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: "EX12-061", as: "sacrifice" },
          ],
        },
        1: { battleArea: [{ card: "BT1-021", as: "levelFive" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("draws and trashes once from the inherited attack effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-063", as: "host", under: [CARD_ID] }],
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0]!;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => player.deck.length === 0 && player.trash.length === 1);
    expect(player.hand).toHaveLength(1);
    expect(player.trash).toHaveLength(1);
    expect(player.hand.some((card) => card.cardId === "BT1-010")).toBe(true);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();
    expect(player.hand).toHaveLength(1);
    expect(player.trash).toHaveLength(1);
  });

  it("uses the normal route and both alternate traits, rejects a nonmatch, and matches the catalog", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toEqual([
      { level: 3, traits: ["Puppet", "Shambala"], cost: 2, isAlternate: true },
    ]);
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Kokeshimon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      playCost: 4,
      dp: 5000,
      level: 4,
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Puppet", "Shambala", "TB"],
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
    });
    for (const [baseCardId, useAlternateCost] of [
      ["EX12-061", false],
      ["BT23-076", true],
      ["EX12-020", true],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: CARD_ID, as: "target" }] },
      });
      s.state.memory = 2;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === CARD_ID);
      expect(s.state.memory).toBe(0);
    }
    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: CARD_ID, as: "target" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("target").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
