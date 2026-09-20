import { Phase, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, settle, setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./EX13-004.js";
import "../index.js";

const CARD_ID = "EX13-004";

const HOST = "BT1-045";
const WITCHELNY_DESTINATION = "BT18-036";
const WITCHELNY_DESTINATION_LV5 = "BT18-039";
const NON_MATCH_DESTINATION = "BT9-035";
const TEXT_ONLY_WITCHELNY = "EX13-034";
const INERT = "BT1-009";
const DECK = ["BT1-011", "BT1-012", "BT1-013", "BT1-014"];
const AUTOMATION = { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true };

describe("EX13-004 DemiMeramon", () => {
  it("matches the catalog printed text and stats", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "DemiMeramon",
      colors: ["Yellow"],
      types: ["Flame"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      forms: ["In-Training"],
      evoCosts: [],
      inheritedEffectText:
        "[When Attacking] [Once Per Turn] This Digimon may digivolve into a Digimon card with [Witchelny] in its text in the hand with the cost reduced by 1. If this effect digivolved, trash your top security card.",
    });
    expect(getCardDefinition(CARD_ID)?.effectText).toBeUndefined();
  });

  it("compiles every printed clause", () => {
    expect(runtimeCompiledCard(CARD_ID)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "Digivolve",
            target: expect.objectContaining({ isSelf: true, filter: { isSelfRef: true } }),
            into: expect.objectContaining({
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Witchelny"], match: "text" }],
            }),
            from: ["hand"],
            reduceCost: 1,
            payCost: true,
            optional: true,
          }),
          expect.objectContaining({
            kind: "trashSecurityTop",
            controller: "mine",
            count: 1,
            condition: expect.objectContaining({ kind: "ifThisEffectDigivolved" }),
          }),
        ],
      }),
    ]);
    expect(compiled.digivolutionRequirement).toBeUndefined();
  });

  it("digivolves into the [Witchelny] hand card for the reduced cost and trashes the top security card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: HOST, as: "host", under: [CARD_ID] }],
          hand: [
            { card: WITCHELNY_DESTINATION, as: "sorcermon" },
            { card: INERT, as: "spare" },
          ],
          security: [
            { card: "BT1-010", as: "topSecurity" },
            { card: "BT1-011", as: "midSecurity" },
            { card: "BT1-012", as: "bottomSecurity" },
          ],
          deck: DECK,
        },
        1: { security: [INERT, INERT], deck: DECK },
      },
      AUTOMATION,
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === WITCHELNY_DESTINATION);

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("sorcermon").instanceId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual([CARD_ID, HOST]);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("bottomSecurity").instanceId]);
    const trashIds = s.state.players[0]!.trash.map((card) => card.instanceId);
    expect(trashIds).toContain(s.inst("topSecurity").instanceId);
    expect(trashIds).toContain(s.inst("midSecurity").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not offer a legal-but-cheaper evolution with no [Witchelny] anywhere in its text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: HOST, as: "host", under: [CARD_ID], dp: 20_000 }],
          hand: [
            { card: NON_MATCH_DESTINATION, as: "nearMatch" },
            { card: INERT, as: "spare" },
          ],
          security: [{ card: "BT1-010", as: "topSecurity" }],
          deck: DECK,
        },
        1: { security: [INERT, INERT], deck: DECK },
      },
      AUTOMATION,
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.perm("host").topCard.cardId).toBe(HOST);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("nearMatch").instanceId);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("topSecurity").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("accepts a destination that carries [Witchelny] only in its printed effect text", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: NON_MATCH_DESTINATION, as: "host", under: [CARD_ID] }],
          hand: [
            { card: TEXT_ONLY_WITCHELNY, as: "wisemon" },
            { card: INERT, as: "spare" },
          ],
          security: [
            { card: "BT1-010", as: "topSecurity" },
            { card: "BT1-011", as: "bottomSecurity" },
          ],
          deck: DECK,
        },
        1: { security: [INERT, INERT], deck: DECK },
      },
      AUTOMATION,
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === TEXT_ONLY_WITCHELNY);

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("wisemon").instanceId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual([CARD_ID, NON_MATCH_DESTINATION]);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("bottomSecurity").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("topSecurity").instanceId);
  });

  it("refuses a [Witchelny] hand card that is an illegal evolution over this carrier", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: HOST, as: "host", under: [CARD_ID], dp: 20_000 }],
          hand: [
            { card: WITCHELNY_DESTINATION_LV5, as: "lv5" },
            { card: INERT, as: "spare" },
          ],
          security: [{ card: "BT1-010", as: "topSecurity" }],
          deck: DECK,
        },
        1: { security: [INERT, INERT], deck: DECK },
      },
      AUTOMATION,
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.perm("host").topCard.cardId).toBe(HOST);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("lv5").instanceId);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("topSecurity").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("leaves the hand, the stack and the security stack untouched when declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: HOST, as: "host", under: [CARD_ID], dp: 20_000 }],
          hand: [{ card: WITCHELNY_DESTINATION, as: "sorcermon" }],
          security: [{ card: "BT1-010", as: "topSecurity" }],
          deck: DECK,
        },
        1: { security: [INERT, INERT], deck: DECK },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.perm("host").topCard.cardId).toBe(HOST);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("sorcermon").instanceId]);
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("topSecurity").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("still digivolves with an empty security stack — the trash is a consequence, not a cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: HOST, as: "host", under: [CARD_ID] }],
          hand: [{ card: WITCHELNY_DESTINATION, as: "sorcermon" }],
          security: [],
          deck: DECK,
        },
        1: { security: [INERT, INERT], deck: DECK },
      },
      AUTOMATION,
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === WITCHELNY_DESTINATION);

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("sorcermon").instanceId);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses a second activation on the same carrier in one turn and resets on its next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: HOST, as: "host", under: [CARD_ID] }],
          hand: [
            { card: WITCHELNY_DESTINATION, as: "lv4" },
            { card: WITCHELNY_DESTINATION_LV5, as: "lv5" },
          ],
          security: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", INERT, INERT, INERT],
          deck: DECK,
        },
        1: { security: [INERT, INERT, INERT, INERT, INERT, INERT], deck: DECK },
      },
      AUTOMATION,
    );
    await s.ready();
    s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 20;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === WITCHELNY_DESTINATION);
    const securityAfterFirst = s.state.players[0]!.security.length;

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await drainMicrotasks();

    expect(s.perm("host").topCard.cardId).toBe(WITCHELNY_DESTINATION);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("lv5").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(securityAfterFirst);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 20;

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === WITCHELNY_DESTINATION_LV5);

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("lv5").instanceId);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual([CARD_ID, HOST, WITCHELNY_DESTINATION]);
    expect(s.state.players[0]!.security.length).toBeLessThan(securityAfterFirst);
  });

  it("carries the inherited clause through a public hatch, breeding digivolution and promotion", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: CARD_ID, as: "egg" }],
          hand: [
            { card: HOST, as: "armadillomon" },
            { card: WITCHELNY_DESTINATION, as: "sorcermon" },
          ],
          security: ["BT1-010", "BT1-011"],
          deck: DECK,
        },
        1: { security: [INERT, INERT, INERT], deck: DECK },
      },
      AUTOMATION,
    );
    s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === CARD_ID);
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("armadillomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === HOST);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: breedingPermanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;
    const carrier = s.state.players[0]!.battleArea[0]!;
    expect(carrier.topCard!.cardId).toBe(HOST);
    expect(carrier.stack.map((card) => card.instanceId)).toEqual([eggInstanceId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: carrier.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea[0]!.topCard!.cardId === WITCHELNY_DESTINATION);

    const evolved = s.state.players[0]!.battleArea[0]!;
    expect(evolved.topCard!.instanceId).toBe(s.inst("sorcermon").instanceId);
    expect(evolved.stack.map((card) => card.cardId)).toEqual([CARD_ID, HOST]);
    expect(evolved.stack[0]!.instanceId).toBe(eggInstanceId);
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
