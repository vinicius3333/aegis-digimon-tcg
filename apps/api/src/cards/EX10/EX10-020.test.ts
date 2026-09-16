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

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).not.toContain(CARD_ID);
    expect(s.state.pendingDecision).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(0);
    await settleAcrossTimers(() => s.state.players[0]!.battleArea.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId: CARD_ID, faceUp: true });

    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  });

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

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[1]!.deck.at(-1)!.instanceId).toBe(returnedInstanceId);
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

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT15-027");
    expect(s.state.players[1]!.hand.map(({ cardId }) => cardId)).not.toContain("BT15-027");
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(attackerInstanceId);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

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

      expect(s.state.players[1]!.hand.map(({ cardId }) => cardId)).toEqual(
        expect.arrayContaining(["BT15-027", "BT15-102", "BT1-071"]),
      );
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
    }
  });

  const orderingBoard = (): BoardSpec => ({
    0: {
      hand: [{ card: CARD_ID, as: "puppetmon" }, { card: "BT15-102", as: "apocalymon" }, "BT1-013"],
      deck: ["BT1-013", "BT1-014", "BT1-009"],
      trash: [{ card: "BT1-009", as: "fodder" }],
    },
    1: { deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-012"] },
  });

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
    const request = s.decisions.find(({ req }) => req.kind === "orderTriggers")!;
    expect(request.seat).toBe(0);
    const payload = orderPayload(decision.payloadJson);
    expect(payload.triggerKeys).toHaveLength(2);
    expect(payload.triggerTimings).toEqual(["EndOfYourTurn", "endOfTurn"]);
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

    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["BT1-013", "BT1-014"]);
    expect(s.state.players[1]!.deck).toHaveLength(1);
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

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("fodder").instanceId);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    expect(s.state.players[1]!.deck).toHaveLength(3);

    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  });

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
  });
});
