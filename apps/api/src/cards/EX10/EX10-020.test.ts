import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../index.js";
import "./EX10-020.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import type { BoardSpec } from "../../engine/testkit/harness.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";

const CARD_ID = "EX10-020";

type Activatable = { effectKey: string; instanceId: string };

function activatable(s: ReturnType<typeof setupEngine>, alias: string): Activatable[] {
  return JSON.parse(s.inst(alias).activatableEffectsJson || "[]") as Activatable[];
}

type OrderPayload = { triggerKeys: string[]; triggerCardIds?: string[]; triggerTimings?: string[] };

function orderPayload(payloadJson: string): OrderPayload {
  return JSON.parse(payloadJson) as OrderPayload;
}

// Both pending turn-end processings hang off the SAME permanent (EX10-020's delayed delete is
// anchored to the permanent it played, which is now topped by BT15-102), so `triggerCardIds`
// reports BT15-102 twice and the effect key is the only discriminator. The delayed delete is
// the sub-trigger key; the other key is Apocalymon's own [End of Your Turn] IR effect.
const DELAYED_DELETE = "delayed-delete-played";

function triggerKeyFor(payload: OrderPayload, which: "delete" | "apocalymon"): string {
  const key = payload.triggerKeys.find((entry) =>
    which === "delete" ? entry.includes(DELAYED_DELETE) : !entry.includes(DELAYED_DELETE),
  );
  expect(key).toBeDefined();
  return key!;
}

describe("EX10-020 Puppetmon", () => {
  it("records the exact catalog and complete compiled clauses", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Puppetmon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Puppet", "Dark Masters"],
      effectText:
        "[Hand] [Main] If you don't have any Digimon other than Digimon with [Dark Masters] in their texts, you may play this card with the play cost reduced by 5. At turn end, delete the Digimon this effect played.\n[On Play] [When Attacking] Return 1 of your opponent's suspended Digimon to the bottom of the deck.\n[All Turns] This Digimon can only digivolve into [Apocalymon].\n[On Deletion] If you have no green face-up security cards, place this Digimon face up as the bottom security card.",
      securityEffectText:
        "[Security] If this card was face-up, you may play 1 level 5 or lower card with [Dark Masters] in its text from your hand or trash without paying the cost.",
    });
    expect(runtimeCompiledCard(CARD_ID)).toMatchObject({ coverage: "full", residual: [] });
  });

  // --- [Hand] [Main] reduced-cost play + turn-end deletion -------------------

  // KB Q5062: the condition is "no Digimon other than [Dark Masters]-text Digimon", so an
  // empty battle area satisfies it. KB Q5735: the played Digimon is deleted at turn end.
  // The deletion here runs through the real turn loop, not an injected OnEndTurn window.
  it("plays itself for 6 with no Digimon at all and is deleted at turn end (Q5062, Q5735)", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: CARD_ID, as: "puppetmon" }, "BT1-013"], deck: ["BT1-013", "BT1-014", "BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    expect(s.state.players[0]!.battleArea).toHaveLength(0);

    const entry = activatable(s, "puppetmon").find(({ instanceId }) => instanceId === s.inst("puppetmon").instanceId);
    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("puppetmon").instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));

    // Play cost 11 reduced by 5 = 6, paid out of exactly 6 memory.
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain(CARD_ID);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    await settleAcrossTimers(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    // Deleted -> [On Deletion] with no green face-up security -> bottom security, face up.
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId: CARD_ID, faceUp: true });

    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  });

  // KB Q5057: "[X] in its text" spans name, traits and effect text. BT15-027 Scorpiomon is a
  // Blue [Ancient Crustacean] whose only [Dark Masters] reference is inside its effect text,
  // so it must NOT block the clause; AD1-001 Greymon carries the token nowhere and must.
  it("allows a Dark-Masters-text Digimon on the board and is blocked by any other (Q5057)", async () => {
    const allowed = setupEngine(
      { 0: { hand: [{ card: CARD_ID, as: "puppetmon" }], battleArea: ["BT15-027"] } },
      { autoAcceptOptional: true },
    );
    allowed.state.memory = 6;
    await allowed.ready();
    expect(getCardDefinition("BT15-027")!.effectText).toContain("[Dark Masters]");
    expect(getCardDefinition("BT15-027")!.types).not.toContain("Dark Masters");
    expect(activatable(allowed, "puppetmon")).toHaveLength(1);

    const blocked = setupEngine(
      { 0: { hand: [{ card: CARD_ID, as: "puppetmon" }], battleArea: ["BT15-027", "AD1-001"] } },
      { autoAcceptOptional: true },
    );
    blocked.state.memory = 6;
    await blocked.ready();
    expect(activatable(blocked, "puppetmon")).toHaveLength(0);
  });

  it('"you may": declining leaves the card in hand and spends no memory', async () => {
    const s = setupEngine({ 0: { hand: [{ card: CARD_ID, as: "puppetmon" }] } }, { autoDeclineOptional: true });
    s.state.memory = 6;
    await s.ready();
    expect(activatable(s, "puppetmon")).toHaveLength(1);
    await settle(() => false, 30);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain(CARD_ID);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(6);
  });

  // The turn-end deletion belongs to the [Hand] [Main] effect, not to the card: a Puppetmon
  // played the normal way (or already on the board) survives the turn.
  it("a normal play does not arm the delayed deletion", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: CARD_ID, as: "puppetmon" }, "BT1-013"], deck: ["BT1-013", "BT1-014"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("puppetmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    expect(s.state.memory).toBe(0);

    advance(s.engine).endMainPhaseIfOpen(0);
    await settleAcrossTimers(() => s.state.turnSeat === 1);
    expect(s.state.turnSeat).toBe(1);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).not.toContain(CARD_ID);

    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  });

  // --- [On Play] [When Attacking] return 1 suspended opposing Digimon --------

  it("returns 1 suspended OPPOSING Digimon to the deck bottom on a real play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "puppetmon" }, "BT1-013"],
          deck: ["BT1-013", "BT1-014"],
          battleArea: [{ card: "BT15-027", as: "mine", suspended: true }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "theirSuspended", suspended: true },
            { card: "BT1-010", as: "theirStanding" },
          ],
          deck: ["BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 11;
    const returnedInstanceId = s.inst("theirSuspended").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("puppetmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => !s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === returnedInstanceId),
    );

    // Exactly the opponent's suspended Digimon left, and it is now the bottom deck card.
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.deck.at(-1)!.instanceId).toBe(returnedInstanceId);
    // My own suspended Digimon is not a legal target ("your opponent's").
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT15-027", CARD_ID]);
    expect(s.state.pendingDecision).toBeUndefined();

    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  });

  it("returns exactly 1 suspended Digimon when attacking and ignores unsuspended targets", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "puppetmon" }], security: ["BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", suspended: true },
            { card: "BT1-010", as: "second", suspended: true },
            { card: "BT1-011", as: "standing" },
          ],
          security: ["BT1-010"],
          deck: ["BT1-012"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("first").instanceId, s.inst("standing").instanceId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("puppetmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => !s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("first").instanceId),
    );
    await settle();

    const remaining = s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId);
    expect(remaining).not.toContain(s.inst("first").instanceId);
    expect(remaining).toContain(s.inst("second").instanceId);
    expect(remaining).toContain(s.inst("standing").instanceId);
    expect(s.state.players[1]!.deck.at(-1)!.instanceId).toBe(s.inst("first").instanceId);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  // --- [All Turns] digivolve restriction ------------------------------------

  // Proved through the public digivolve intent, so the assertion covers the card's own IR
  // registration of the constraint rather than the ledger primitive in isolation. Both
  // candidates are Lv.7 with a legal "Green Lv.6, cost 6" evolution requirement; only
  // BT15-102 Apocalymon may be reached.
  it("can only digivolve into [Apocalymon]", async () => {
    const routes = getCardDefinition("BT12-057")!.evoCosts;
    expect(routes).toContainEqual({ color: "Green", level: 6, memoryCost: 6 });

    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "puppetmon" }],
          hand: [
            { card: "BT12-057", as: "quartzmon" },
            { card: "BT15-102", as: "apocalymon" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("puppetmon").permanentId,
        instanceId: s.inst("quartzmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("puppetmon").topCard.cardId).toBe(CARD_ID);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT12-057");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("puppetmon").permanentId,
        instanceId: s.inst("apocalymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("puppetmon").topCard.cardId === "BT15-102");
    expect(s.perm("puppetmon").stack.map(({ cardId }) => cardId)).toEqual([CARD_ID]);
  });

  // --- [On Deletion] place face up as bottom security ------------------------

  // A production battle deletion: Puppetmon (11000) attacks a 20000 DP suspended Digimon and
  // loses. Its [When Attacking] return is steered onto the decoy so the battle target stays.
  it("places itself face up as the BOTTOM security card when deleted in battle", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "puppetmon" }],
          security: [{ card: "BT1-009", faceUp: false }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "decoy", suspended: true },
            { card: "BT1-013", as: "wall", dp: 20_000, suspended: true },
          ],
          deck: ["BT1-012"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("decoy").instanceId);
    await s.ready();
    const puppetInstanceId = s.inst("puppetmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("puppetmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some(({ instanceId }) => instanceId === puppetInstanceId));
    await settle();

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    // Bottom of the stack, revealed. KB Q5058: it stays a normal security card otherwise.
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ instanceId: puppetInstanceId, faceUp: true });
    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-009", CARD_ID]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).not.toContain(CARD_ID);
  });

  it("goes to the trash instead when a green face-up security card already exists", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "puppetmon" }],
          // BT1-071 Vegiemon is Green; face up, so the condition fails.
          security: [{ card: "BT1-071", faceUp: true }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "decoy", suspended: true },
            { card: "BT1-013", as: "wall", dp: 20_000, suspended: true },
          ],
          deck: ["BT1-012"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("decoy").instanceId);
    await s.ready();
    expect(getCardDefinition("BT1-071")!.colors).toEqual(["Green"]);
    const puppetInstanceId = s.inst("puppetmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("puppetmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === puppetInstanceId));

    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-071"]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain(CARD_ID);
  });

  // A face-DOWN green security card does not satisfy "green face-up security cards", so the
  // placement still happens.
  it("still places itself when the only green security card is face down", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "puppetmon" }],
          security: [{ card: "BT1-071", faceUp: false }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "decoy", suspended: true },
            { card: "BT1-013", as: "wall", dp: 20_000, suspended: true },
          ],
          deck: ["BT1-012"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("decoy").instanceId);
    await s.ready();
    const puppetInstanceId = s.inst("puppetmon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("puppetmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some(({ instanceId }) => instanceId === puppetInstanceId));

    expect(s.state.players[0]!.security.map(({ cardId }) => cardId)).toEqual(["BT1-071", CARD_ID]);
  });

  // --- [Security] --------------------------------------------------------------

  // KB Q5059/Q5060: a face-up security card is checked normally and its [Security] effect
  // triggers. KB Q6511: the effect resolves, THEN the Digimon battles the attacker — the
  // 3000 DP attacker loses to Puppetmon's 11000 DP.
  it("plays a level 5 [Dark Masters]-text card and then battles the attacker (Q5060, Q6511)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          hand: [{ card: "BT15-027", as: "eligible" }],
          security: [{ card: CARD_ID, faceUp: true }],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attackerInstanceId = s.inst("attacker").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT15-027"));
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await settle();

    // The [Security] effect played the level 5 card for free.
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT15-027");
    expect(s.state.players[1]!.hand.map(({ cardId }) => cardId)).not.toContain("BT15-027");
    // Then the security Digimon battled: the 3000 DP attacker is deleted, Puppetmon is not
    // on the battle area (a checked security Digimon goes to the trash after the battle).
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(attackerInstanceId);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  // KB Q5064: "if this card was face-up" means face up in the security stack when checked.
  it("does nothing when checked face down, when refused, or with no eligible card (Q5064)", async () => {
    const run = async (faceUp: boolean, autoDeclineOptional: boolean) =>
      setupEngine(
        {
          0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
          1: {
            hand: [
              { card: "BT15-027", as: "eligible" },
              { card: "BT15-102", as: "tooHigh" },
              { card: "BT1-071", as: "noText" },
            ],
            security: [{ card: CARD_ID, faceUp }],
            deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
          },
        },
        { autoDeclineOptional, autoAcceptOptional: !autoDeclineOptional, autoSelectCards: true },
      );

    for (const [faceUp, decline] of [
      [false, false],
      [true, true],
    ] as const) {
      const s = await run(faceUp, decline);
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[1]!.security.length === 0);
      await settle();

      // No [Security] play happened, so every hand card is still in hand. BT15-102 is level 7
      // and BT1-071 has no [Dark Masters] text, so neither is ever eligible.
      expect(s.state.players[1]!.hand.map(({ cardId }) => cardId)).toEqual(
        expect.arrayContaining(["BT15-027", "BT15-102", "BT1-071"]),
      );
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
    }
  });
  // --- Q5063 / Q5736: the turn player orders simultaneous turn-end processing ----

  // Board: Puppetmon is played by its own [Hand] [Main] effect (arming the turn-end delete on
  // the permanent it played) and then digivolves into BT15-102 Apocalymon in the SAME turn.
  // Apocalymon prints "[End of Your Turn] [Once Per Turn] By placing 1 level 6 or lower card
  // from your trash as this Digimon's bottom digivolution card, ... Then, trash the top 2 cards
  // of your opponent's deck for each of this Digimon's level 6 digivolution cards." So at that
  // turn end the same controller has two pending processings on one permanent: EX10-020's
  // delayed delete and BT15-102's [End of Your Turn]. `autoOrderTriggers: false` leaves the
  // `orderTriggers` decision pending so the test answers it itself and drives BOTH orders.
  const orderingBoard = (): BoardSpec => ({
    0: {
      hand: [{ card: CARD_ID, as: "puppetmon" }, { card: "BT15-102", as: "apocalymon" }, "BT1-013"],
      deck: ["BT1-013", "BT1-014", "BT1-009"],
      trash: [{ card: "BT1-009", as: "fodder" }],
    },
    1: { deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-012"] },
  });

  // Bring the board to "Puppetmon played by C1, digivolved into Apocalymon, main phase ended"
  // and stop on the pending `orderTriggers` decision.
  async function reachTurnEndOrdering(s: ReturnType<typeof setupEngine>) {
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    s.state.memory = 6;
    const entry = activatable(s, "puppetmon").find(({ instanceId }) => instanceId === s.inst("puppetmon").instanceId);
    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("puppetmon").instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    expect(s.state.memory).toBe(0);

    // Same turn, same permanent: the restriction of C3 permits exactly this route.
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("puppetmon").permanentId,
        instanceId: s.inst("apocalymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("puppetmon").topCard.cardId === "BT15-102");
    expect(s.perm("puppetmon").stack.map(({ cardId }) => cardId)).toEqual([CARD_ID]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await settleAcrossTimers(() => s.state.pendingDecision?.kind === "orderTriggers");

    const decision = s.state.pendingDecision!;
    expect(decision.kind).toBe("orderTriggers");
    // The choice belongs to the turn player, seat 0.
    const request = s.decisions.find(({ req }) => req.kind === "orderTriggers")!;
    expect(request.seat).toBe(0);
    const payload = orderPayload(decision.payloadJson);
    expect(payload.triggerKeys).toHaveLength(2);
    // One key per pending processing, both in the turn-end window, both on this permanent.
    expect(payload.triggerTimings).toEqual(["OnEndTurn", "OnEndTurn"]);
    expect(payload.triggerCardIds).toEqual(["BT15-102", "BT15-102"]);
    expect(triggerKeyFor(payload, "delete")).toContain(DELAYED_DELETE);
    expect(triggerKeyFor(payload, "apocalymon")).toContain("BT15-102/");
    expect(triggerKeyFor(payload, "delete")).not.toBe(triggerKeyFor(payload, "apocalymon"));
    return { loop, decision, payload };
  }

  it("Q5063/Q5736: raises the turn-end ordering choice to the turn player with both keys, Apocalymon first", async () => {
    const s = setupEngine(orderingBoard(), {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: false,
    });
    const { loop, decision, payload } = await reachTurnEndOrdering(s);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "orderTriggers", order: [triggerKeyFor(payload, "apocalymon")] },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.state.turnSeat === 1);

    // Apocalymon resolved BEFORE the delete: the trash fodder was placed under it and the
    // opponent lost the top 2 deck cards (one level 6 digivolution card: EX10-020).
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-013", "BT1-014"]);
    // 4 seeded - 2 trashed by Apocalymon - 1 drawn on seat 1's turn start.
    expect(s.state.players[1]!.deck).toHaveLength(1);
    // Then the delayed delete still removed the whole stack.
    expect(s.state.players[0]!.battleArea).toHaveLength(0);

    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  });

  it("Q5063/Q5736: choosing the delete first denies Apocalymon its [End of Your Turn]", async () => {
    const s = setupEngine(orderingBoard(), {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: false,
    });
    const { loop, decision, payload } = await reachTurnEndOrdering(s);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "orderTriggers", order: [triggerKeyFor(payload, "delete")] },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.state.turnSeat === 1);

    // Delete first: the permanent left the battle area, so the same-turn-end [End of Your Turn]
    // never placed the fodder and never trashed the opponent's deck. Order-dependent endpoint.
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("fodder").instanceId);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    // 4 seeded - 0 trashed - 1 drawn on seat 1's turn start.
    expect(s.state.players[1]!.deck).toHaveLength(3);

    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  });

  // --- Comparative peer: another Green Lv.6 "can only digivolve into" restriction ---

  // BT15-052 Puppetmon prints "[Your Turn] This Digimon can only digivolve into white Digimon"
  // — the same RestrictDigivolveInto shape scoped by COLOR, where EX10-020 scopes it by NAME.
  // BT4-090 Chaosmon is White Lv.7 with a legal { Green, 6, cost 6 } route, so it separates the
  // two restrictions: legal for the peer, refused by EX10-020 because it is not [Apocalymon].
  it("peer: BT15-052's colour restriction admits a White Lv.7 that EX10-020's name restriction refuses", async () => {
    expect(getCardDefinition("BT4-090")!.colors).toEqual(["White"]);
    expect(getCardDefinition("BT4-090")!.evoCosts).toContainEqual({ color: "Green", level: 6, memoryCost: 6 });

    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "ex10" },
            { card: "BT15-052", as: "peer" },
          ],
          hand: [
            { card: "BT4-090", as: "chaosA" },
            { card: "BT4-090", as: "chaosB" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009"],
        },
        1: { deck: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ex10").permanentId,
        instanceId: s.inst("chaosA").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("ex10").topCard.cardId).toBe(CARD_ID);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("peer").permanentId,
        instanceId: s.inst("chaosB").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("peer").topCard.cardId === "BT4-090");
    expect(s.perm("peer").stack.map(({ cardId }) => cardId)).toEqual(["BT15-052"]);
    // The digivolve consumed exactly one of the two copies (the other hand card is the\n    // digivolution bonus draw).\n    expect(s.state.players[0]!.hand.filter(({ cardId }) => cardId === "BT4-090")).toHaveLength(1);
  });
});
