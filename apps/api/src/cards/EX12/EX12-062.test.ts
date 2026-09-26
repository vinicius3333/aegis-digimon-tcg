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

  it("publicly plays for 4, pays with the chosen ally, and deletes only an opposing level 4", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "source" }],
          battleArea: [{ card: "EX12-061", as: "sacrifice" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "levelFour" },
            { card: "BT1-021", as: "levelFive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("sacrifice").permanentId);
    s.state.memory = 4;
    const levelFourId = s.perm("levelFour").permanentId;
    const levelFiveId = s.perm("levelFive").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("source").instanceId) &&
        s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX12-061") &&
        s.state.players[1]!.battleArea.every(({ permanentId }) => permanentId !== levelFourId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX12-061"]);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === levelFourId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === levelFiveId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("publicly triggers When Digivolving and pays with one ally for an opposing level 4", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX12-061", as: "base" },
            { card: "BT1-009", as: "sacrifice" },
          ],
          hand: [{ card: CARD_ID, as: "source" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "levelFour" },
            { card: "BT1-021", as: "levelFive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 2;
    await s.ready();
    preferred.push(s.perm("sacrifice").permanentId);
    const sacrificeInstanceId = s.perm("sacrifice").topCard.instanceId;
    const levelFourId = s.perm("levelFour").permanentId;
    const levelFiveId = s.perm("levelFive").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard.instanceId === s.inst("source").instanceId &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === sacrificeInstanceId) &&
        s.state.players[1]!.battleArea.every(({ permanentId }) => permanentId !== levelFourId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["EX12-061"]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(sacrificeInstanceId);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === levelFourId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === levelFiveId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("publicly declines the optional own-Digimon deletion cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "source" }],
          battleArea: [{ card: "EX12-061", as: "sacrifice" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 4;
    const sourceInstanceId = s.inst("source").instanceId;
    const sacrificeId = s.perm("sacrifice").permanentId;
    const opponentId = s.perm("opponent").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: sourceInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === sourceInstanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === sacrificeId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === opponentId)).toBe(true);
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

  it("draws then trashes through a real attack with Kokeshimon in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-063", as: "host", under: [{ card: CARD_ID, as: "source" }] }],
          hand: [{ card: "BT1-009", as: "discard" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0]!;
    const discardId = s.inst("discard").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("host").isSuspended &&
        player.deck.length === 0 &&
        player.trash.some(({ instanceId }) => instanceId === discardId) &&
        player.hand.some(({ instanceId }) => instanceId === drawnId),
    );

    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toContain(CARD_ID);
    expect(player.hand.map(({ instanceId }) => instanceId)).toContain(drawnId);
    expect(player.hand.map(({ instanceId }) => instanceId)).not.toContain(discardId);
    expect(player.trash.map(({ instanceId }) => instanceId)).toEqual([discardId]);
    expect(player.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
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
