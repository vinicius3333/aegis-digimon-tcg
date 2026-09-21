import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as EX13_074 } from "./EX13-074.js";
import "../index.js";

const CARD_ID = "EX13-074";

function mainEffectKey(s: ReturnType<typeof setupEngine>, alias = "rie"): string {
  const source = (s.engine as unknown as { cardSourceOf(instance: unknown): unknown }).cardSourceOf(
    s.perm(alias).topCard!,
  ) as never;
  const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) =>
    entry.effectKey.startsWith(`${CARD_ID}/`),
  );
  if (effect === undefined) throw new Error("EX13-074 did not surface its Main effect");
  return effect.effectKey;
}

function activateMain(s: ReturnType<typeof setupEngine>, alias = "rie"): { ok: boolean; reason?: string } {
  return s.engine.applyIntent(0, {
    type: "activateEffect",
    sourceInstanceId: s.perm(alias).topCard!.instanceId,
    effectKey: mainEffectKey(s, alias),
  }) as { ok: boolean; reason?: string };
}

describe("EX13-074 Rie Kishibe", () => {
  it("matches the printed catalog entry", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Rie Kishibe",
      colors: ["Purple", "Black"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["CS"],
      effectText: expect.stringContaining("[Main] [Once Per Turn] If this Tamer has 3 or more [Knightmon] text cards"),
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
  });

  it("maps every printed clause onto IR", () => {
    expect(EX13_074.coverage).toBe("full");
    expect(EX13_074.residual).toEqual([]);

    expect(EX13_074.effects.find((effect) => effect.trigger === "StartOfYourTurn")?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2 },
    });

    const watcher = EX13_074.effects.find((effect) => effect.trigger === "AllTurns");
    expect(watcher?.frequency).toBe("OncePerTurn");
    expect(watcher?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "whenPlayed",
        sourceFilter: {
          controller: "mine",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }],
          printedTextOnly: true,
        },
        actions: [
          {
            kind: "Draw",
            amount: 1,
            optional: true,
            abortOnDecline: true,
            cost: {
              kind: "place",
              destination: "digivolutionStack",
              position: "bottom",
              host: "target",
              underFilter: { isSelfRef: true },
              target: {
                count: 1,
                from: ["hand", "trash"],
                filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }] },
              },
            },
          },
        ],
      },
      { kind: "SubTrigger", event: "onDeletionOf" },
    ]);
    const keys = (watcher?.actions ?? []).map((action) =>
      action.kind === "SubTrigger" ? action.oncePerTurnKey : undefined,
    );
    expect(keys[0]).toBeDefined();
    expect(keys[0]).toBe(keys[1]);

    const main = EX13_074.effects.find((effect) => effect.trigger === "Main");
    expect(main?.frequency).toBe("OncePerTurn");
    expect(main?.condition).toMatchObject({
      kind: "selfDigivolutionStackCountAtLeast",
      count: 3,
      filter: { nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }] },
    });
    expect(main?.actions[0]).toMatchObject({
      kind: "Digivolve",
      target: { filter: { isSelfRef: true }, isSelf: true },
      into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["LordKnightmon"], match: "nameExact" }] },
      from: ["hand", "trash"],
      payCost: true,
      costOverride: 3,
      ignoreRequirements: true,
      optional: true,
    });

    expect(EX13_074.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { filter: { isSelfRef: true } } }],
    });
  });

  it("raises the memory floor to 3 through a real turn when at 2 or less", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "rie" }], hand: [{ card: "BT1-009", as: "spare" }], deck: ["BT1-010"] },
      1: { deck: ["BT1-011", "BT1-012"] },
    });
    s.state.memory = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("rie").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("raises memory from exactly 2 (boundary, inclusive)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "rie" }], hand: [{ card: "BT1-009", as: "spare" }], deck: ["BT1-010"] },
      1: { deck: ["BT1-011", "BT1-012"] },
    });
    s.state.memory = 2;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("leaves memory alone at 3 or more — it sets, never adds", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "rie" }], hand: [{ card: "BT1-009", as: "spare" }], deck: ["BT1-010"] },
      1: { deck: ["BT1-011", "BT1-012"] },
    });
    s.state.memory = 7;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(7);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not raise memory on the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "rie" }], deck: ["BT1-010", "BT1-011", "BT1-012"] },
      1: { hand: [{ card: "BT1-009", as: "spare" }], deck: ["BT1-010", "BT1-011", "BT1-012"] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.memory).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("places a [Knightmon] text card from hand under itself and draws 1 when such a Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie" }],
          hand: [
            { card: "ST13-12", as: "knightmon" },
            { card: "BT18-058", as: "kotemon" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knightmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("rie").stack.length === 1);
    await settle();

    expect(s.perm("rie").stack.map((card) => card.instanceId)).toEqual([s.inst("kotemon").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId).sort()).toEqual([
      "EX13-074",
      "ST13-12",
    ]);
    expect(s.state.memory).toBe(3);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("Q7454: places the paid card at the bottom of an existing Tamer stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie", under: ["BT1-009", "BT1-010"] }],
          hand: [
            { card: "ST13-12", as: "playedKnightmon" },
            { card: "BT18-058", as: "placedCard" },
          ],
          deck: ["BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    const existingStack = s.perm("rie").stack.map(({ instanceId }) => instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedKnightmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("rie").stack.length === 3);
    await settle();

    expect(s.perm("rie").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("placedCard").instanceId,
      ...existingStack,
    ]);
    expect(s.perm("rie").stack.map(({ cardId }) => cardId)).toEqual(["BT18-058", "BT1-009", "BT1-010"]);
  });

  it("Q7453: fires for a Digimon that only mentions [Knightmon] in its whole printed text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie" }],
          hand: [{ card: "EX4-042", as: "darkMaildramon" }],
          trash: [{ card: "EX10-026", as: "skullKnightmon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkMaildramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("rie").stack.length === 1);
    await settle();

    expect(s.perm("rie").stack.map((card) => card.instanceId)).toEqual([s.inst("skullKnightmon").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
  });

  it("does not fire for a Digimon with no [Knightmon] anywhere in its text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie" }],
          hand: [
            { card: "BT1-009", as: "monodramon" },
            { card: "BT18-058", as: "kotemon" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("monodramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 300);

    expect(s.perm("rie").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("kotemon").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not fire for the OPPONENT's [Knightmon] text Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie" }],
          hand: [{ card: "BT18-058", as: "kotemon" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          hand: [
            { card: "ST13-12", as: "theirKnightmon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("theirKnightmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 300);

    expect(s.perm("rie").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("kotemon").instanceId]);
  });

  it("fires when your [Knightmon] text Digimon is DELETED in a real battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "rie" },
            { card: "ST13-12", as: "knightmon" },
          ],
          hand: [
            { card: "BT18-058", as: "kotemon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "wall", suspended: true }],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("knightmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.perm("rie").stack.length === 1);
    await settle();

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["ST13-12"]);
    expect(s.perm("rie").stack.map((card) => card.instanceId)).toEqual([s.inst("kotemon").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT1-010"]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("Q7455: choosing Rie first moves the deleted source and invalidates its pending On Deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "rie" },
            { card: "EX10-026", as: "skullKnightmon" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("skullKnightmon").permanentId], "byEffect");
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)?.req;
    expect(request?.options?.triggerKeys).toHaveLength(2);
    const rieIndex = request?.options?.triggerCardIds?.findIndex((id) => id === CARD_ID) ?? -1;
    const rieKey = rieIndex >= 0 ? request?.options?.triggerKeys?.[rieIndex] : undefined;
    expect(rieKey).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "orderTriggers", order: [rieKey!] },
      }),
    ).toEqual({ ok: true });
    expect(await deletion).toBe(1);
    await settle(() => s.perm("rie").stack.some(({ cardId }) => cardId === "EX10-026"));
    await settle();

    expect(s.perm("rie").stack.map(({ cardId }) => cardId)).toEqual(["EX10-026"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain("EX10-026");
    expect(
      s.events.some(
        (event) =>
          event.kind === "effectResolved" && event.sourceCardId === "EX10-026" && event.timing === "OnDeletion",
      ),
    ).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not treat a Digimon that merely CARRIES a [Knightmon] card in its stack as a [Knightmon] text Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "rie" },
            { card: "BT1-024", as: "carrier", under: ["ST13-12"] },
          ],
          hand: [
            { card: "BT18-058", as: "kotemon" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT1-080", as: "wall", suspended: true }],
          deck: ["BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("carrier").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 300);

    expect(s.state.players[0]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-024", "ST13-12"]);
    expect(s.perm("rie").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("kotemon").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("declining the placement cost draws nothing and leaves the stack empty", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie" }],
          hand: [
            { card: "ST13-12", as: "knightmon" },
            { card: "BT18-058", as: "kotemon" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 8;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knightmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 300);

    expect(s.perm("rie").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("kotemon").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011"]);
  });

  it("spends ONE use per turn across both event forms, and resets on your next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "rie" },
            { card: "ST13-12", as: "knightmon" },
          ],
          hand: [
            { card: "ST13-12", as: "secondKnightmon" },
            { card: "BT18-058", as: "firstPlacement" },
            { card: "EX10-026", as: "secondPlacement" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-024", as: "wall", suspended: true }],
          hand: [{ card: "BT1-009", as: "theirSpare" }],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondKnightmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("rie").stack.length === 1);
    await settle();
    expect(s.perm("rie").stack.map((card) => card.instanceId)).toEqual([s.inst("firstPlacement").instanceId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("knightmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 300);

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["ST13-12"]);
    expect(s.perm("rie").stack.map((card) => card.instanceId)).toEqual([s.inst("firstPlacement").instanceId]);
    const handAfterFirstTurn = s.state.players[0]!.hand.map((card) => card.instanceId);
    expect(handAfterFirstTurn).toContain(s.inst("secondPlacement").instanceId);

    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;

    s.state.turnSeat = 1;
    s.state.memory = 8;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 8;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    const anotherKnightmon = s.state.players[0]!.hand.find((card) => card.cardId === "ST13-12");
    expect(anotherKnightmon).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondPlacement").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("rie").stack.length === 2);
    await settle();

    expect(s.perm("rie").stack).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
  });

  it("digivolves itself into [LordKnightmon] for exactly 3, ignoring every printed requirement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie", under: ["ST13-12", "BT18-058", "EX10-026"] }],
          hand: [{ card: "BT5-045", as: "lord" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(activateMain(s)).toEqual({ ok: true });
    await settle(() => s.perm("rie").topCard?.cardId === "BT5-045");
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.perm("rie").topCard?.instanceId).toBe(s.inst("lord").instanceId);
    expect(s.perm("rie").stack.map((card) => card.cardId)).toEqual(["ST13-12", "BT18-058", "EX10-026", "EX13-074"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("takes the printed cost-3 route rather than its set-mate's own [Rie Kishibe] cost-5 route", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie", under: ["ST13-12", "BT18-058", "EX10-026"] }],
          hand: [{ card: "EX13-064", as: "lord" }],
          security: [{ card: "BT1-010", as: "sec" }],
          deck: ["BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(activateMain(s)).toEqual({ ok: true });
    await settle(() => s.perm("rie").topCard?.cardId === "EX13-064");
    await settle();

    expect(s.state.memory).toBe(3);
    expect(s.perm("rie").topCard?.instanceId).toBe(s.inst("lord").instanceId);
  });

  it("refuses to digivolve with only 2 [Knightmon] text cards under it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie", under: ["ST13-12", "BT18-058", "BT1-009"] }],
          hand: [{ card: "BT5-045", as: "lord" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    activateMain(s);
    await settle(() => false, 300);

    expect(s.perm("rie").topCard?.cardId).toBe(CARD_ID);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("lord").instanceId]);
  });

  it("counts three [Knightmon] text cards that are not all named Knightmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie", under: ["BT18-058", "EX10-026", "EX4-042"] }],
          hand: [{ card: "BT5-045", as: "lord" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(activateMain(s)).toEqual({ ok: true });
    await settle(() => s.perm("rie").topCard?.cardId === "BT5-045");
    await settle();

    expect(s.state.memory).toBe(3);
  });

  it("refuses [LordKnightmon (X Antibody)] — the bracketed name is exact", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie", under: ["ST13-12", "BT18-058", "EX10-026"] }],
          hand: [{ card: "BT19-073", as: "xAntibody" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    activateMain(s);
    await settle(() => false, 300);

    expect(s.perm("rie").topCard?.cardId).toBe(CARD_ID);
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("xAntibody").instanceId]);
  });

  it("digivolves from the TRASH half of 'in the hand or trash'", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "rie", under: ["ST13-12", "BT18-058", "EX10-026"] }],
          trash: [{ card: "BT5-045", as: "lord" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 9;
    await s.ready();

    const key = mainEffectKey(s);
    const tamerInstanceId = s.perm("rie").topCard!.instanceId;
    expect(activateMain(s)).toEqual({ ok: true });
    await settle(() => s.perm("rie").topCard?.cardId === "BT5-045");
    await settle();

    expect(s.perm("rie").topCard?.instanceId).toBe(s.inst("lord").instanceId);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.memory).toBe(6);

    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: tamerInstanceId, effectKey: key }).ok,
    ).toBe(false);
    await settle(() => false, 300);
    expect(s.perm("rie").topCard?.cardId).toBe("BT5-045");
    expect(s.state.memory).toBe(6);
  });

  it("plays itself from security without paying the cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: CARD_ID, as: "rie" }] } });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.Security, s.inst("rie"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("rie").instanceId),
    );

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("rie").instanceId,
    ]);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).not.toContain(s.inst("rie").instanceId);
  });

  it("publicly plays itself from security after an opponent attack, free of memory cost", async () => {
    const s = setupEngine(
      {
        0: {
          security: [
            { card: CARD_ID, as: "rie" },
            { card: "BT1-011", as: "remainingSecurity" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          hand: [{ card: "BT1-012", as: "spare" }],
          deck: ["BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const rieId = s.inst("rie").instanceId;
    await s.ready();

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "securityChecked").length === 1);
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(rieId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("remainingSecurity").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(rieId);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });
});
