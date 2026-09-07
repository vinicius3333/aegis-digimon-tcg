import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../P/P-105.js";
import "../index.js";
import { compiled } from "./BT23-026.js";

describe("BT23-026 Lopmon", () => {
  it("during your turn may digivolve this Digimon into Antylamon for 3 with Makiko Date", () => {
    expect(getCardDefinition("BT23-026")).toMatchObject({
      cardId: "BT23-026",
      nameEn: "Lopmon",
      colors: ["Yellow", "Green"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Yellow", level: 2, memoryCost: 1 },
        { color: "Green", level: 2, memoryCost: 1 },
      ],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Beast", "CS"],
    });
    expect(compiled.effects.some((entry) => entry.trigger === "YourTurn")).toBe(false);
    expect(compiled.baseGrantedDigivolve).toEqual([
      expect.objectContaining({
        target: { namesExact: ["Antylamon"] },
        cost: 3,
        condition: { kind: "tamerHasExactName", name: "Makiko Date" },
      }),
    ]);
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
          actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }],
        },
      ],
    });
  });

  it("digivolves into Antylamon for exactly 3 while Makiko Date is present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-026", as: "lopmon" },
            { card: "BT23-082", as: "makiko" },
          ],
          hand: [{ card: "BT23-029", as: "antylamon" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lopmon").permanentId,
        instanceId: s.inst("antylamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lopmon").topCard.instanceId === s.inst("antylamon").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("lopmon").topCard.instanceId).toBe(s.inst("antylamon").instanceId);
    expect(s.perm("lopmon").stack.map((card) => card.instanceId)).toEqual([s.inst("lopmon").instanceId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("antylamon").instanceId)).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("publicly uses the compiled base grant with exact target projection and normal draw", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-026", as: "lopmon" },
          { card: "BT23-082", as: "makiko" },
        ],
        hand: [{ card: "BT23-029", as: "antylamon" }],
        deck: [
          { card: "BT1-009", as: "revealedYellow" },
          { card: "BT1-010", as: "revealedBottom" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await s.ready();
    s.state.memory = 3;
    const target = s.perm("lopmon");
    const evolving = s.inst("antylamon");
    expect(evolving.digivolveTargetPermanentIds).toContain(target.permanentId);
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: target.permanentId, instanceId: evolving.instanceId }),
    ).toEqual({ ok: true });
    await settle(() => target.topCard.instanceId === evolving.instanceId && s.state.pendingDecision === undefined);
    expect(target.topCard.instanceId).toBe(evolving.instanceId);
    expect(target.stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("lopmon").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).not.toContain(evolving.instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("revealedYellow").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("revealedBottom").instanceId]);
  });

  it("rejects a trash Antylamon source even when a same-ID copy is in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-026", as: "lopmon" },
          { card: "BT23-082", as: "makiko" },
        ],
        hand: [{ card: "BT23-029", as: "handCopy" }],
        trash: [{ card: "BT23-029", as: "trashCopy" }],
        deck: [
          { card: "BT1-009", as: "untouchedDraw" },
          { card: "BT1-010", as: "untouchedNext" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await s.ready();
    const beforeMemory = s.state.memory;
    const beforeHand = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    const beforeTrash = s.state.players[0]!.trash.map(({ instanceId }) => instanceId);
    // Mechanism seam: printed hand permission must not authorize a different loose zone.
    await advance(s.engine).verb.digivolveFromInstance(s.perm("lopmon").permanentId, s.inst("trashCopy").instanceId, {
      payCost: true,
    });
    expect(s.state.memory).toBe(beforeMemory);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(beforeHand);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(beforeTrash);
    expect(s.perm("lopmon").topCard.instanceId).toBe(s.inst("lopmon").instanceId);
    expect(s.perm("lopmon").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("untouchedDraw").instanceId,
      s.inst("untouchedNext").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["missing Makiko", "opponent Makiko", "wrong target"] as const)(
    "public grant rejects %s",
    async (caseName) => {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: "BT23-026", as: "lopmon" },
            ...(caseName === "wrong target" ? [{ card: "BT23-082", as: "makiko" }] : []),
          ],
          hand: [{ card: caseName === "wrong target" ? "BT23-007" : "BT23-029", as: "evo" }],
        },
        ...(caseName === "opponent Makiko" ? { 1: { battleArea: [{ card: "BT23-082", as: "opponentMakiko" }] } } : {}),
      });
      await s.ready();
      const target = s.perm("lopmon");
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: target.permanentId,
          instanceId: s.inst("evo").instanceId,
        }),
      ).toMatchObject({ ok: false });
      expect(target.topCard.cardId).toBe("BT23-026");
    },
  );

  it.each(["opponent turn", "breeding base", "trash source"] as const)(
    "rejects the base grant from %s",
    async (caseName) => {
      const s = setupEngine({
        0: {
          ...(caseName === "breeding base"
            ? { breeding: { card: "BT23-026", as: "lopmon" }, battleArea: [{ card: "BT23-082", as: "makiko" }] }
            : {
                battleArea: [
                  { card: "BT23-026", as: "lopmon" },
                  { card: "BT23-082", as: "makiko" },
                ],
              }),
          ...(caseName === "trash source"
            ? { trash: [{ card: "BT23-029", as: "antylamon" }] }
            : { hand: [{ card: "BT23-029", as: "antylamon" }] }),
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      });
      await s.ready();
      if (caseName === "opponent turn") s.state.turnSeat = 1;
      const target = caseName === "breeding base" ? s.state.players[0]!.breeding! : s.perm("lopmon");
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: target.permanentId,
          instanceId: s.inst("antylamon").instanceId,
        }),
      ).toMatchObject({ ok: false });
    },
  );

  it.each([
    ["BT7-006", true, 0, "alternate"],
    ["ST3-01", true, 1, "normal"],
    ["ST4-01", true, 1, "normal"],
    ["BT1-003", false, 3, "normal"],
  ] as const)("publicly handles %s as a legal level-2 source path", async (sourceCard, legal, cost, path) => {
    const s = setupEngine({
      0: {
        breeding: { card: sourceCard, as: "source" },
        hand: [{ card: "BT23-026", as: "lopmon" }],
        deck: [
          { card: "BT1-009", as: "matrixDraw" },
          { card: "BT1-010", as: "matrixBottom" },
        ],
      },
    });
    await s.ready();
    s.state.memory = 3;
    const source = s.state.players[0]!.breeding!;
    const beforeMemory = s.state.memory;
    const intent = {
      type: "digivolve" as const,
      permanentId: source.permanentId,
      instanceId: s.inst("lopmon").instanceId,
      ...(path === "alternate" ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
    };
    expect(s.engine.applyIntent(0, intent)).toMatchObject({ ok: legal });
    await settle();
    expect(source.topCard.instanceId).toBe(s.inst(legal ? "lopmon" : "source").instanceId);
    expect(source.stack.map(({ instanceId }) => instanceId)).toEqual(legal ? [s.inst("source").instanceId] : []);
    expect(s.state.memory).toBe(beforeMemory - (legal ? cost : 0));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst(legal ? "matrixDraw" : "lopmon").instanceId,
    ]);
    const expectedDeck = legal
      ? [s.inst("matrixBottom").instanceId]
      : [s.inst("matrixDraw").instanceId, s.inst("matrixBottom").instanceId];
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(expectedDeck);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("publicly evolves a legal level-2 CS source into Lopmon for zero", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT22-004", as: "source" },
        hand: [{ card: "BT23-026", as: "lopmon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    const sourceId = s.state.players[0]!.breeding!.topCard.instanceId;
    const lopmonId = s.inst("lopmon").instanceId;
    const memoryBefore = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: lopmonId,
        useAlternateCost: true,
        alternateRequirementIndex: 1,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.instanceId === lopmonId);
    expect(s.perm("source").topCard.instanceId).toBe(lopmonId);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.memory).toBe(memoryBefore);
  });

  it.each([false, true])(
    "refuses the Your Turn alternate evolution without controller Makiko Date (opponentOnly=%s)",
    async (opponentOnly) => {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT23-026", as: "lopmon" }], hand: [{ card: "BT23-029", as: "antylamon" }] },
        ...(opponentOnly ? { 1: { battleArea: [{ card: "BT23-082", as: "opponentMakiko" }] } } : {}),
      });
      s.state.memory = 3;
      const lopmonId = s.inst("lopmon").instanceId;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("lopmon").permanentId,
          instanceId: s.inst("antylamon").instanceId,
        }),
      ).toMatchObject({ ok: false });
      expect(s.perm("lopmon").topCard.instanceId).toBe(lopmonId);
      expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("antylamon").instanceId)).toBe(true);
      expect(s.state.memory).toBe(3);
    },
  );

  it("suppresses the inherited reaction on a second same-turn public suspension", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-029", as: "carrier", under: ["BT23-026"] },
          { card: "BT23-017", as: "first" },
          { card: "BT23-018", as: "second" },
        ],
        deck: Array(8).fill("BT1-009"),
      },
      1: {
        battleArea: [{ card: "BT23-018", as: "target" }],
        security: ["BT1-009", "BT1-010", "BT1-011"],
        deck: Array(8).fill("BT1-010"),
      },
    });
    const base = s.perm("target").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(base - 2000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("target").currentDP).toBe(base - 2000);
  });

  it("allows P-105 Delay to publicly evolve Lopmon with its two-cost reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-105", as: "training" },
            { card: "BT23-026", as: "lopmon" },
            { card: "BT23-082", as: "makiko" },
          ],
          hand: [{ card: "BT23-029", as: "antylamon" }],
          deck: [
            { card: "BT1-009", as: "trainingReveal" },
            { card: "BT1-010", as: "trainingBottom" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnCount = 1;
    await s.ready();
    s.state.memory = 5;
    const before = s.state.memory;
    const advertised = s.perm("training").activatableEffectsJson;
    expect(advertised).not.toBe("");
    const effects = JSON.parse(advertised) as { effectKey: string }[];
    expect(effects).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("training").instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lopmon").topCard.instanceId === s.inst("antylamon").instanceId);
    expect(s.perm("lopmon").topCard.instanceId).toBe(s.inst("antylamon").instanceId);
    expect(s.perm("lopmon").stack.map((card) => card.instanceId)).toEqual([s.inst("lopmon").instanceId]);
    expect(s.state.memory).toBe(before - 1);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("training").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("trainingReveal").instanceId);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("trainingBottom").instanceId]);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("training").instanceId)).toBe(
      false,
    );
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherits a once-per-turn -2000 DP reaction only for another friendly suspension", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-029", as: "carrier", under: ["BT23-026"] },
            { card: "BT23-017", as: "other" },
          ],
        },
        1: { battleArea: [{ card: "BT23-018", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const base = s.perm("target").currentDP;
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("carrier").permanentId });
    expect(s.perm("target").currentDP).toBe(base);
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("other").permanentId });
    expect(s.perm("target").currentDP).toBe(base - 2000);
    await advance(s.engine).fireSubTrigger("whenSuspended", { subjectPermanentId: s.perm("other").permanentId });
    expect(s.perm("target").currentDP).toBe(base - 2000);
  });

  it("publicly applies the inherited -2000 DP when another friendly Digimon attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-029", as: "carrier", under: ["BT23-026"] },
          { card: "BT23-018", as: "other" },
        ],
        deck: Array(6).fill("BT1-009"),
      },
      1: {
        battleArea: [{ card: "BT23-018", as: "target" }],
        security: ["BT1-009", "BT1-010"],
        deck: Array(6).fill("BT1-010"),
      },
    });
    const base = s.perm("target").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("other").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(base - 2000);
  });

  it("applies the inherited reaction during the opponent's turn through a public green Option", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT23-017", as: "other" },
          { card: "BT23-029", as: "carrier", under: ["BT23-026"] },
          { card: "BT23-018", as: "otherAgain" },
        ],
        deck: Array(8).fill("BT1-009"),
      },
      1: {
        hand: [{ card: "BT1-110", as: "flowerCannon" }],
        battleArea: [{ card: "BT1-064", as: "greenEnabler" }],
        security: ["BT1-009", "BT1-010"],
        deck: Array(8).fill("BT1-010"),
      },
    });
    s.state.memory = 10;
    const base = s.perm("carrier").currentDP;
    const opponentBase = s.state.players[1]!.battleArea[0]!.currentDP;
    expect(s.perm("carrier").stack.map((card) => card.cardId)).toEqual(["BT23-026"]);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flowerCannon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const choice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: choice.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("other").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === s.inst("other").instanceId)!.isSuspended,
    );
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("flowerCannon").instanceId)).toBe(false);
    expect(s.state.memory).toBe(1);
    let sawReducedDP = false;
    await settle(() => {
      sawReducedDP = sawReducedDP || s.state.players[1]!.battleArea[0]!.currentDP === opponentBase - 2000;
      return sawReducedDP;
    });
    expect(s.state.turnSeat).toBe(1);
    expect(sawReducedDP).toBe(true);
    expect(s.perm("carrier").currentDP).toBe(base);
    expect(
      s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === s.inst("other").instanceId)!.isSuspended,
    ).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("carrier").currentDP).toBe(base);
    expect(s.perm("greenEnabler").currentDP).toBe(opponentBase);
    expect(s.state.turnSeat).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("otherAgain").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(opponentBase - 2000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
