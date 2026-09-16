import { Phase, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { drainMicrotasks, settle, setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { compiled } from "./EX13-004.js";
import "../index.js";

const CARD_ID = "EX13-004";

// Fixtures.
//   BT1-045 Tsukaimon — YELLOW Lv.3, 3000 DP, NO printed text at all: the carrier the Digi-Egg
//     sits under. Yellow so the public breeding route (yellow Digi-Egg -> Lv.3) is legal, and
//     textless so every observed delta is attributable to this card.
//   BT18-036 Wizardmon — YELLOW Lv.4, EvoCost Yellow Lv.3 for 2, printed TYPES
//     ["Wizard","Witchelny"]. The legal, matching destination. It carries its own
//     "[When Digivolving] By trashing the top card of your security stack, ＜Draw 1＞ and gain 1
//     memory", which the automation accepts, so every assertion below states the COMBINED
//     endpoint and names which half each delta came from.
//   BT18-039 Mistymon — YELLOW Lv.5, EvoCost Yellow Lv.4 for 3, ["Wizard","Witchelny"]: the
//     second, higher-level destination the once-per-turn reset needs.
//   BT9-035 Starmon — YELLOW Lv.4, EvoCost Yellow Lv.3 for 2, ["Star"], NO printed text: the
//     near-match. A perfectly legal evolution over the host at the SAME cost, so an encoding that
//     ignored the printed [Witchelny] gate would take it.
//   BT1-009..BT1-014 are the inert main-deck Digimon used as security and deck filler.
const HOST = "BT1-045";
const WITCHELNY_DESTINATION = "BT18-036";
const WITCHELNY_DESTINATION_LV5 = "BT18-039";
const NON_MATCH_DESTINATION = "BT9-035";
const INERT = "BT1-009";
const DECK = ["BT1-011", "BT1-012", "BT1-013", "BT1-014"];
const AUTOMATION = { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true };

describe("EX13-004 DemiMeramon", () => {
  it("matches the catalog printed text and stats", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      nameEn: "DemiMeramon",
      colors: ["Yellow"],
      kinds: ["DigiEgg"],
      level: 2,
      playCost: -1,
      dp: 0,
      forms: ["In-Training"],
      evoCosts: [],
      inheritedEffectText:
        "[When Attacking] [Once Per Turn] This Digimon may digivolve into a Digimon card with [Witchelny] in its text in the hand with the cost reduced by 1. If this effect digivolved, trash your top security card.",
    });
    // A Digi-Egg prints no main box and no security text.
    expect(getCardDefinition(CARD_ID)?.effectText).toBeUndefined();
  });

  it("compiles every printed clause", () => {
    expect(runtimeCompiledCard(CARD_ID)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        // A plain [When Attacking] tag, so the window IS the trigger — no SubTrigger wrapper.
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "Digivolve",
            target: expect.objectContaining({ isSelf: true, filter: { isSelfRef: true } }),
            into: expect.objectContaining({
              kind: ["Digimon"],
              // "in its text" is the name ∪ traits ∪ printed-text union (§4-22-1), NOT `trait`.
              nameOrTrait: [{ tokens: ["Witchelny"], match: "text" }],
            }),
            from: ["hand"],
            reduceCost: 1,
            payCost: true,
            optional: true,
          }),
          expect.objectContaining({
            // A consequence, not a payment: an empty security stack must not make the
            // digivolution illegal.
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
    // 5 - 1 (printed EvoCost Yellow Lv.3 for 2, reduced by 1 by THIS card) + 1 (Wizardmon's own
    // [When Digivolving] memory gain).
    expect(s.state.memory).toBe(5);
    // Two security cards leave from the TOP: one to Wizardmon's own cost, one to this card's
    // "If this effect digivolved, trash your top security card". The bottom card survives.
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
    // Nothing digivolved, so the conditional security trash never runs.
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
    // 5 - 1 for the reduced evolution cost. Wizardmon's own rider needs a security card it does
    // not have, so it contributes neither the draw nor the memory.
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

    // The carrier suspended to attack; unsuspend it so a SECOND attack in the same turn is legal.
    // Its Lv.5 [Witchelny] destination is in hand and affordable, so only the spent [Once Per
    // Turn] quota can stop it.
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

    // Next own turn through the real turn loop: the quota is back and the Lv.5 card is taken.
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
    // 10 - 1 (reduced evolution cost) + 1 (Wizardmon's own memory gain).
    expect(s.state.memory).toBe(10);
    // Both security cards leave from the top: one to Wizardmon's cost, one to this card's trash.
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
