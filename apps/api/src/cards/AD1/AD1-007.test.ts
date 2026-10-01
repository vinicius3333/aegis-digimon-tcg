import { describe, expect, it } from "vitest";
import { Zone, getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "../../cards/index.js";

describe("AD1-007 Siriusmon", () => {
  async function answerSinglePlacement(s: ReturnType<typeof setupEngine>, optionIndex: number) {
    const placementPrompts = () => s.decisions.filter(({ req }) => req.kind === "chooseOption");
    await settle(() => placementPrompts().length > 0);
    const decision = placementPrompts()[0]!;
    expect(decision.req.options?.choices).toEqual(["top", "bottom"]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.req.decisionId,
        response: { kind: "chooseOption", optionIndex },
      }),
    ).toEqual({ ok: true });
  }

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-007");
    const compiled = registeredCompiledCards.get("AD1-007") ?? getCompiledCard("AD1-007");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-007");
    expect(definition?.nameEn).toBe("Siriusmon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });

  it("places three qualifying Gammamon-text Digimon and deletes only within its DP ceiling", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-011", as: "base" }],
          hand: [
            { card: "AD1-007", as: "siriusmon" },
            { card: "BT10-011", as: "canoweissmon" },
            { card: "BT10-050", as: "wezen" },
            { card: "BT10-078", as: "gulus" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 12000 },
            { card: "BT1-010", as: "over-ceiling", dp: 12001 },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("siriusmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await answerSinglePlacement(s, 0);
    await settle(() => s.perm("base").stack.length === 4);

    expect(s.perm("base").stack).toHaveLength(4);
    expect(s.state.players[1]!.battleArea[0]?.permanentId).toBe(s.perm("over-ceiling").permanentId);
  });

  it("uses the alternate level-5 Gammamon-text evolution requirement for cost 3", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-011", as: "canoweissmon" }], hand: [{ card: "AD1-007", as: "siriusmon" }] },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("canoweissmon").permanentId,
        instanceId: s.inst("siriusmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("canoweissmon").topCard?.cardId === "AD1-007");

    expect(s.state.memory).toBe(2);
  });

  it("accepts qualifying cards from trash and places exactly three", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-011", as: "base" }],
          hand: [{ card: "AD1-007", as: "siriusmon" }],
          trash: ["BT10-011", "BT10-050", "BT10-078"],
          deck: [
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 12000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("siriusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await answerSinglePlacement(s, 1);
    await settle(() => s.perm("base").stack.length === 4);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("base").stack).toHaveLength(4);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does nothing when fewer than three qualifying cards remain, including decline", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-011", as: "base" }],
          hand: [
            { card: "AD1-007", as: "siriusmon" },
            { card: "BT10-011", as: "only-material" },
          ],
          security: [
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
          deck: [
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 12000 }] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("siriusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "AD1-007");

    expect(s.perm("base").stack).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("can place all three Gammamon-text cards at the bottom of its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-011", as: "base", under: ["BT1-009"] }],
          hand: [
            { card: "AD1-007", as: "siriusmon" },
            { card: "BT10-011", as: "gamma-1" },
            { card: "BT10-050", as: "gamma-2" },
            { card: "BT10-078", as: "gamma-3" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 12000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("siriusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await answerSinglePlacement(s, 1);
    await settle(() => s.perm("base").stack.length === 5);

    expect(
      s
        .perm("base")
        .stack.slice(3)
        .map((card) => card.cardId),
    ).toEqual(["BT1-009", "BT10-011"]);
    expect(
      s
        .perm("base")
        .stack.slice(0, 3)
        .map((card) => card.cardId),
    ).toEqual(expect.arrayContaining(["BT10-011", "BT10-050", "BT10-078"]));
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("target").permanentId),
    ).toBe(false);
  });

  it("Discord 1555224478416633927: places all three cards at one chosen end, in the controller's order, in one move", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-011", as: "base", under: ["BT1-009"] }],
          hand: [
            { card: "AD1-007", as: "siriusmon" },
            { card: "BT10-011", as: "gamma-1" },
            { card: "BT10-050", as: "gamma-2" },
            { card: "BT10-078", as: "gamma-3" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 12000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderCards: false },
    );
    s.state.memory = 5;
    const gamma1Id = s.inst("gamma-1").instanceId;
    const gamma2Id = s.inst("gamma-2").instanceId;
    const gamma3Id = s.inst("gamma-3").instanceId;
    const placementPrompts = () => s.decisions.filter(({ req }) => req.kind === "chooseOption");
    const orderPrompts = () => s.decisions.filter(({ req }) => req.kind === "orderCards");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("siriusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await answerSinglePlacement(s, 1);
    await settle(() => placementPrompts().length > 1 || orderPrompts().length > 0);
    expect(placementPrompts()).toHaveLength(1);
    const ordering = orderPrompts()[0]!;
    expect(ordering.req.options?.orderDestination).toBe("stackBottom");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.req.decisionId,
        response: { kind: "orderCards", order: [gamma3Id, gamma1Id, gamma2Id] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.length === 5 && s.state.pendingDecision === undefined);

    expect(
      s
        .perm("base")
        .stack.slice(0, 3)
        .map((card) => card.instanceId),
    ).toEqual([gamma3Id, gamma1Id, gamma2Id]);
    expect(
      s
        .perm("base")
        .stack.slice(3)
        .map((card) => card.cardId),
    ).toEqual(["BT1-009", "BT10-011"]);
    const materialIds = [gamma1Id, gamma2Id, gamma3Id];
    const moves = s.events.filter(
      (event) =>
        event.kind === "cardsMoved" &&
        event.to === "battleArea" &&
        event.instanceIds.some((instanceId) => materialIds.includes(instanceId)),
    );
    expect(moves).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("shares one use between its when-digivolving and when-attacking timings", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-011", as: "base" }],
          hand: [
            { card: "AD1-007", as: "siriusmon" },
            { card: "BT10-011", as: "gamma-1" },
            { card: "BT10-050", as: "gamma-2" },
            { card: "BT10-078", as: "gamma-3" },
          ],
          trash: ["BT10-011", "BT10-050", "BT10-078"],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "first-target", dp: 12000 },
            { card: "BT1-010", as: "second-target", dp: 12000, suspended: true },
          ],
          security: [
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
          deck: [
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
            "BT1-009",
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    for (const seat of [0, 1] as const) {
      for (let n = 0; n < 10; n += 1) {
        s.give(seat, Zone.Deck, "BT1-009");
        s.give(seat, Zone.Security, "BT1-009");
      }
      s.give(seat, Zone.Hand, "BT1-010");
    }
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("siriusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.length === 4);
    await settle();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("base").stack).toHaveLength(4);
    const survivorId = s.state.players[1]!.battleArea[0]!.permanentId;
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === survivorId)).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("attacks without suspending at end of turn only with five digivolution cards", async () => {
    const qualified = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "AD1-007",
              as: "qualified",
              suspended: true,
              under: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
            },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await qualified.ready();

    const qualifiedTurn = qualified.engine.runOneTurn();
    const qualifiedMain = (qualified.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    for (let i = 0; i < 500 && !qualifiedMain.isOpen; i += 1) await Promise.resolve();
    qualified.perm("qualified").isSuspended = true;
    expect(qualified.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await qualifiedTurn;
    expect(qualified.perm("qualified").isSuspended).toBe(true);

    const unqualified = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "AD1-007",
              as: "unqualified",
              suspended: true,
              under: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
            },
          ],
        },
        1: { security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await unqualified.ready();

    const unqualifiedTurn = unqualified.engine.runOneTurn();
    const unqualifiedMain = (unqualified.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    for (let i = 0; i < 500 && !unqualifiedMain.isOpen; i += 1) await Promise.resolve();
    unqualified.perm("unqualified").isSuspended = true;
    expect(unqualified.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await unqualifiedTurn;
    expect(unqualified.state.players[1]!.security).toHaveLength(1);
  });
});

describe("AD1-007 Siriusmon — KB Q&A rulings", () => {
  const FILLER_DECK = ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"];

  it("counts a card with [Gammamon] in its effect text or as part of its name as a card with [Gammamon] in its text (Q6064)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-011", as: "base" }],
          hand: [
            { card: "AD1-007", as: "siriusmon" },
            { card: "BT10-011", as: "gammamonInEffectText" },
            { card: "BT10-050", as: "gammamonInName" },
            { card: "BT10-078", as: "gammamonInOtherName" },
            { card: "BT1-010", as: "noGammamonText" },
          ],
          deck: [...FILLER_DECK],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 12000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true, preferInstanceIds },
    );
    await s.ready();
    s.state.memory = 5;
    const qualifyingIds = [
      s.inst("gammamonInEffectText").instanceId,
      s.inst("gammamonInName").instanceId,
      s.inst("gammamonInOtherName").instanceId,
    ];
    const decoyId = s.inst("noGammamonText").instanceId;
    preferInstanceIds.push(decoyId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("siriusmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.length === 4);
    await settle();

    const offeredIds = s.decisions.flatMap(({ req }) => req.options?.candidateInstanceIds ?? []);
    expect(offeredIds).not.toContain(decoyId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining(qualifyingIds));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(decoyId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).not.toContain(decoyId);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("cannot pay the placement cost with only some of the 3 required [Gammamon]-text cards, so nothing is placed or deleted (Q6065)", async () => {
    const digivolveWithMaterials = async (materials: { hand: string[]; trash: string[] }) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT10-011", as: "base" }],
            hand: [{ card: "AD1-007", as: "siriusmon" }, ...materials.hand],
            trash: materials.trash,
            deck: [...FILLER_DECK],
          },
          1: { battleArea: [{ card: "BT1-010", as: "target", dp: 12000 }] },
        },
        { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true },
      );
      await s.ready();
      s.state.memory = 5;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("siriusmon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "AD1-007");
      await settle();
      return s;
    };

    const onlyOne = await digivolveWithMaterials({ hand: ["BT10-050"], trash: [] });
    expect(onlyOne.perm("base").stack.map((card) => card.cardId)).toEqual(["BT10-011"]);
    expect(onlyOne.state.players[0]!.hand.some((card) => card.cardId === "BT10-050")).toBe(true);
    expect(onlyOne.state.players[1]!.battleArea).toHaveLength(1);

    const onlyTwo = await digivolveWithMaterials({ hand: ["BT10-050"], trash: ["BT10-078"] });
    expect(onlyTwo.perm("base").stack.map((card) => card.cardId)).toEqual(["BT10-011"]);
    expect(onlyTwo.state.players[0]!.hand.some((card) => card.cardId === "BT10-050")).toBe(true);
    expect(onlyTwo.state.players[0]!.trash.some((card) => card.cardId === "BT10-078")).toBe(true);
    expect(onlyTwo.state.players[1]!.battleArea).toHaveLength(1);

    const allThree = await digivolveWithMaterials({ hand: ["BT10-050"], trash: ["BT10-078", "BT10-011"] });
    expect(allThree.perm("base").stack).toHaveLength(4);
    expect(allThree.state.players[1]!.battleArea).toHaveLength(0);
  });
});
