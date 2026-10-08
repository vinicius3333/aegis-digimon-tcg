import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, drainMicrotasks } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT20-091.js";
import "./index.js";

const ROYAL_KNIGHT_CARD = "AD1-008";
const NON_ROYAL_KNIGHT_CARD = "BT3-073";
const COOL_BOY = "BT20-091";
const OMEKAMON = "BT20-083";

describe("BT20-091 [Your Turn] when Royal Knight played/digivolves, suspend to draw+memory", () => {
  it("encodes all printed clauses without residuals", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        { kind: "SubTrigger", event: "whenPlayed", turnScope: "yourTurn", sourceFilter: { kind: ["Digimon"] } },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          turnScope: "yourTurn",
          sourceFilter: { kind: ["Digimon"] },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "instead",
          sourceFilter: { zone: "battleArea", nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }] },
        },
      ],
    });
    for (const watcher of compiled.effects[0]?.actions ?? []) {
      expect((watcher as { actions?: unknown[] }).actions).toMatchObject([
        { kind: "Draw", cost: { kind: "suspend", target: { isSelf: true } }, abortOnDecline: true },
        { kind: "GainMemory", condition: { kind: "ifThisEffectActed" } },
      ]);
    }
    expect(compiled.effects[2]).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });

  it("publishes the white Tamer stats and exact printed identity", () => {
    expect(getCardDefinition(COOL_BOY)).toMatchObject({
      nameEn: "Cool Boy",
      colors: ["White"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
    });
  });

  it("publicly plays a [Royal Knight] and pays Cool Boy's suspension cost for draw and memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: COOL_BOY, dp: 0, as: "coolBoy" }],
          hand: [{ card: ROYAL_KNIGHT_CARD, as: "royalKnight" }, "BT1-010"],
          deck: [{ card: "BT1-010", faceUp: false }, "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("royalKnight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("royalKnight").instanceId),
    );
    expect(s.perm("coolBoy").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.length).toBe(handBefore);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.memory).toBe(-1);
  });

  it("publicly evolves into a [Royal Knight] and pays Cool Boy's suspension cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: COOL_BOY, dp: 0, as: "coolBoy" },
            { card: "AD1-003", as: "base" },
          ],
          hand: [{ card: ROYAL_KNIGHT_CARD, as: "royalKnight" }],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 4;
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("royalKnight").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === ROYAL_KNIGHT_CARD);
    expect(s.perm("coolBoy").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore + 1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-010"]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.memory).toBe(1);
  });

  it.each(["play", "digivolve"] as const)(
    "honors separate physical Cool Boy presets after public %s",
    async (trigger) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: COOL_BOY, as: "firstCoolBoy" },
              { card: COOL_BOY, as: "secondCoolBoy" },
              { card: "BT2-027", as: "zudomon" },
            ],
            hand: [{ card: "ST8-10", as: "ulforce" }],
            deck: Array(8).fill("BT1-009"),
          },
          1: { security: 5 },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
      );
      s.state.memory = 10;
      await s.ready();
      expect(
        s.engine.applyIntent(
          0,
          trigger === "play"
            ? { type: "playCard", instanceId: s.inst("ulforce").instanceId }
            : {
                type: "digivolve",
                permanentId: s.perm("zudomon").permanentId,
                instanceId: s.inst("ulforce").instanceId,
              },
        ),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
      const request = s.decisions.at(-1)!.req;
      const keys = request.options!.triggerKeys!;
      const first = keys.find((key) => key.startsWith(`${s.inst("firstCoolBoy").instanceId}::`))!;
      const second = keys.find((key) => key.startsWith(`${s.inst("secondCoolBoy").instanceId}::`))!;
      expect(first).toBeDefined();
      expect(second).toBeDefined();
      expect(first).not.toBe(second);
      const before = {
        memory: s.state.memory,
        hand: s.state.players[0]!.hand.length,
        deck: s.state.players[0]!.deck.length,
      };
      // Resolve the declined physical copy first; its refusal must pay nothing.
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: request.decisionId,
          response: {
            kind: "orderTriggers",
            order: [second, first, ...keys.filter((key) => key !== first && key !== second)],
            optionalAnswers: { [first]: true, [second]: false },
          },
        }),
      ).toEqual({ ok: true });
      await drainMicrotasks(200);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.perm("firstCoolBoy").isSuspended).toBe(true);
      expect(s.perm("secondCoolBoy").isSuspended).toBe(false);
      expect(s.state.memory).toBe(before.memory + 1);
      expect(s.state.players[0]!.hand).toHaveLength(before.hand + 1);
      expect(s.state.players[0]!.deck).toHaveLength(before.deck - 1);
      expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === COOL_BOY)).toHaveLength(0);
    },
  );

  it("Ask offers the suspension cost and an explicit refusal keeps Cool Boy active", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: COOL_BOY, as: "coolBoy" }],
          hand: [{ card: "ST8-10", as: "ulforce" }],
          deck: Array(4).fill("BT1-009"),
        },
        1: { security: 5 },
      },
      { autoOrderTriggers: false },
    );
    s.state.memory = 10;
    await s.ready();
    const before = s.state.players[0]!.deck.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ulforce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const request = s.decisions.at(-1)!.req;
    expect(request.sourceCardId).toBe(COOL_BOY);
    expect(s.perm("coolBoy").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await drainMicrotasks(200);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.perm("coolBoy").isSuspended).toBe(false);
    expect(s.state.memory).toBe(-2);
    expect(s.state.players[0]!.deck).toHaveLength(before);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does NOT draw when a played Digimon has no [Royal Knight] trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: COOL_BOY, dp: 0, as: "coolBoy" }],
          hand: [{ card: NON_ROYAL_KNIGHT_CARD, as: "nonRoyalKnight" }, "BT1-010"],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nonRoyalKnight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("nonRoyalKnight").instanceId),
    );
    expect(s.perm("coolBoy").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore - 1);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.memory).toBe(-1);
  });
});

describe("BT20-091 [Opponent's Turn][Once Per Turn] play Omekamon when a Royal Knight leaves", () => {
  it("plays Omekamon from hand when a [Royal Knight] Digimon is deleted on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ROYAL_KNIGHT_CARD, dp: 5000, as: "royalKnight" }],
          hand: [
            { card: COOL_BOY, as: "coolBoy" },
            { card: OMEKAMON, as: "omekamon" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    const royalKnightId = s.perm("royalKnight").permanentId;
    const omekamonInstanceId = s.inst("omekamon").instanceId;

    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("coolBoy").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("coolBoy").instanceId),
    );

    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).verb.deletePermanent([royalKnightId], "byEffect");
    await settle(() => !(p0?.hand.some((c) => c.instanceId === omekamonInstanceId) ?? true));
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    expect(p0?.battleArea.some((p) => p.permanentId === royalKnightId)).toBe(false);
    expect(p0?.hand.some((c) => c.instanceId === omekamonInstanceId)).toBe(false);
    expect(p0?.battleArea.some((p) => p.topCard?.cardId === OMEKAMON)).toBe(true);
  });

  it("does NOT play Omekamon on the [Royal Knight]'s OWN controller's turn (opponent's-turn gate)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ROYAL_KNIGHT_CARD, dp: 5000, as: "royalKnight" }],
          hand: [
            { card: COOL_BOY, as: "coolBoy" },
            { card: OMEKAMON, as: "omekamon" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: { deck: ["BT1-010", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0];
    const royalKnightId = s.perm("royalKnight").permanentId;
    const omekamonInstanceId = s.inst("omekamon").instanceId;

    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("coolBoy").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("coolBoy").instanceId),
    );

    await advance(s.engine).verb.deletePermanent([royalKnightId], "byEffect");

    expect(p0?.battleArea.some((p) => p.permanentId === royalKnightId)).toBe(false);
    expect(p0?.hand.some((c) => c.instanceId === omekamonInstanceId)).toBe(true);
  });
  it("lets each Cool Boy play its own Omekamon when an opponent's attack deletes a [Royal Knight] (Discord 1555487329328693248)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: ROYAL_KNIGHT_CARD, dp: 5000, as: "royalKnight" },
            { card: COOL_BOY, dp: 0, as: "firstCoolBoy" },
            { card: COOL_BOY, dp: 0, as: "secondCoolBoy" },
          ],
          hand: [
            { card: OMEKAMON, as: "firstOmekamon" },
            { card: OMEKAMON, as: "secondOmekamon" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
        1: {
          battleArea: [{ card: "BT20-010", dp: 15000, as: "attacker" }],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const royalKnightId = s.perm("royalKnight").permanentId;
    const omekamonIds = [s.inst("firstOmekamon").instanceId, s.inst("secondOmekamon").instanceId];
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    s.perm("royalKnight").isSuspended = true;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: royalKnightId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const battleArea = s.state.players[0]!.battleArea;
    expect(battleArea.some((permanent) => permanent.permanentId === royalKnightId)).toBe(false);
    for (const omekamonId of omekamonIds) {
      expect(battleArea.some((permanent) => permanent.topCard?.instanceId === omekamonId)).toBe(true);
    }
    expect(s.state.players[0]!.hand).toHaveLength(0);
    // Omekamon is no [Royal Knight] and this is not Cool Boy's turn: its draw watcher stays silent.
    const offeredKeys = s.decisions.flatMap(({ req }) => req.options?.triggerKeys ?? []);
    expect(offeredKeys.filter((key) => key.includes("whenPlayed"))).toEqual([]);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("BT20-091 Security deployment", () => {
  it("plays itself from security through a public security check", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-010", as: "attacker" }] },
      1: { security: [{ card: COOL_BOY, as: "securityCoolBoy" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === COOL_BOY));
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === COOL_BOY)).toBe(true);
  });
});
