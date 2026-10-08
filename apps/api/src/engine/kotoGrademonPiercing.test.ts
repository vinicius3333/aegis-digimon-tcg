import { Phase, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";

// Named testimony controls, not historical attribution. CR 16-7 and EX13-057 Q7388.
describe("Koto: Monarchlizamon blocked by Alphamon with Grademon prevention", () => {
  for (const seat of [0, 1] as const) {
    it.each([
      { accept: true, empty: false },
      { accept: false, empty: false },
      { accept: false, empty: true },
    ])(`seat ${seat}: %j separates security payment from Piercing`, async ({ accept, empty }) => {
      const defender: Seat = seat === 0 ? 1 : 0;
      const preferred: string[] = [];
      const s = setupEngine(
        {
          [seat]: {
            deck: Array(6).fill("BT1-009"),
            eggDeck: ["BT1-001"],
            security: 5,
            hand: [],
            battleArea: [
              { card: "ST23-08", as: "attacker", under: ["ST23-07"] },
              { card: "EX13-057", as: "ally" },
            ],
          },
          [defender]: {
            deck: Array(6).fill("BT1-009"),
            eggDeck: ["BT1-001"],
            battleArea: [
              { card: "EX13-060", as: "alphamon", under: ["EX13-057"] },
              { card: "EX13-055", as: "feeder" },
            ],
            hand: [{ card: "EX13-057", as: "grant" }],
            security: empty
              ? []
              : [
                  { card: "BT1-009", as: "payment" },
                  { card: "BT1-010", as: "check" },
                  { card: "BT1-011", as: "last" },
                ],
          },
        },
        {
          autoSelectCards: true,
          preferInstanceIds: preferred,
          declinePrompts: ["You may play", "Attack with a Digimon"],
        },
      );
      s.state.turnSeat = defender;
      s.state.memory = 10;
      s.state.isFirstPlayersFirstTurn = false;
      await s.ready();
      preferred.push(s.inst("alphamon").instanceId);
      const loop = s.engine.startTurnLoop();
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(defender, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(defender);
      expect(
        s.engine.applyIntent(defender, {
          type: "digivolve",
          permanentId: s.perm("feeder").permanentId,
          instanceId: s.inst("grant").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          observe(s.engine).hasKeyword(s.perm("alphamon"), "Blocker") &&
          !s.state.pendingDecision &&
          s.engine.mainVerbContinuationsInFlight === 0,
      );
      expect(s.engine.applyIntent(defender, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === seat && s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(seat);
      expect(observe(s.engine).hasPierce(s.perm("attacker"))).toBe(true);
      expect(
        s.engine.applyIntent(seat, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((e) => e.kind === "alliancePrompt"));
      expect(
        s.engine.applyIntent(seat, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId }),
      ).toEqual({ ok: true });
      await settle(() => observe(s.engine).blockingSeat() === defender);
      expect(s.perm("attacker").currentDP).toBe(14000);
      const alphamonId = s.perm("alphamon").permanentId;
      expect(s.engine.applyIntent(defender, { type: "declareBlock", blockerPermanentId: alphamonId })).toEqual({
        ok: true,
      });
      let prevention;
      if (!empty) {
        await settle(() => s.state.pendingDecision?.kind === "optional");
        prevention = {
          sourceCardId: s.decisions.at(-1)!.req.sourceCardId,
          securityCount: s.state.players[defender]!.security.length,
          checks: s.events.filter((e) => e.kind === "securityChecked").length,
          response: s.engine.applyIntent(defender, {
            type: "respondDecision",
            decisionId: s.state.pendingDecision!.decisionId,
            response: { kind: "optional", accept },
          }),
        };
      }
      expect(prevention).toEqual(
        empty ? undefined : { sourceCardId: "EX13-057", securityCount: 3, checks: 0, response: { ok: true } },
      );
      await settle(() => s.events.some((e) => e.kind === "attackEnded") && !observe(s.engine).isAttacking());
      expect(s.state.players[defender]!.battleArea.some((p) => p.permanentId === alphamonId)).toBe(accept);
      expect(s.events.filter((e) => e.kind === "securityChecked")).toHaveLength(empty || accept ? 0 : 2);
      expect(s.state.players[defender]!.security.map((c) => c.instanceId)).toEqual(
        empty ? [] : accept ? [s.inst("check").instanceId, s.inst("last").instanceId] : [s.inst("last").instanceId],
      );
      expect(
        !empty && s.state.players[defender]!.trash.some((c) => c.instanceId === s.inst("payment").instanceId),
      ).toBe(!empty);
      expect(s.decisions.filter((d) => d.req.options?.affectedPermanentIds?.includes(alphamonId))).toHaveLength(
        empty ? 0 : 1,
      );
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    });
  }
});

// Reduced public version of the correlated BT25-057 episode. One ST23-13 DP
// grant replaces the historical two grants; no fabricated DP or keyword grants.
describe("Koto: earlier effect-battle deletion keeps Piercing pending through a protected block", () => {
  for (const seat of [0, 1] as const) {
    it.each([
      { battle: true, pierce: true, protectFirst: false, checks: 2 },
      { battle: false, pierce: true, protectFirst: false, checks: 0 },
      { battle: true, pierce: false, protectFirst: false, checks: 0 },
      { battle: true, pierce: true, protectFirst: true, checks: 2 },
    ])(`seat ${seat}: %j`, async ({ battle, pierce, protectFirst, checks }) => {
      const defender: Seat = seat === 0 ? 1 : 0;
      const preferred: string[] = [];
      const declines = [
        "De-Digivolve",
        "You may play",
        "You may place",
        ...(battle ? [] : ["Battle"]),
        ...(protectFirst ? [] : ["Prevent leaving"]),
      ];
      const s = setupEngine(
        {
          [seat]: {
            deck: Array(8).fill("BT1-009"),
            eggDeck: ["BT1-001"],
            security: 5,
            battleArea: [
              { card: pierce ? "BT25-049" : "BT25-035", as: "base" },
              ...(pierce ? [] : [{ card: "BT25-049", as: "reducer" }]),
              { card: "ST23-13", as: "tamer", under: [{ card: "BT25-046", faceUp: false }] },
            ],
            hand: [{ card: "BT25-057", as: "dual" }],
          },
          [defender]: {
            deck: Array(8).fill("BT1-009"),
            eggDeck: ["BT1-001"],
            battleArea: [
              { card: "EX13-060", as: "alphamon", under: ["EX13-057"] },
              { card: "BT20-053", as: "earlier" },
              { card: "EX13-055", as: "feeder" },
            ],
            hand: [{ card: "EX13-057", as: "grant" }],
            security: [
              { card: "BT1-009", as: "top" },
              { card: "BT1-010", as: "next" },
              { card: "BT1-011", as: "third" },
              { card: "BT1-012", as: "last" },
            ],
          },
        },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          autoChooseOption: true,
          preferInstanceIds: preferred,
          declinePrompts: declines,
        },
      );
      s.state.turnSeat = defender;
      s.state.memory = 10;
      s.state.isFirstPlayersFirstTurn = false;
      await s.ready();
      preferred.push(s.inst("alphamon").instanceId);
      const loop = s.engine.startTurnLoop();
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(defender, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(defender);
      expect(
        s.engine.applyIntent(defender, {
          type: "digivolve",
          permanentId: s.perm("feeder").permanentId,
          instanceId: s.inst("grant").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          observe(s.engine).hasKeyword(s.perm("alphamon"), "Blocker") &&
          !s.state.pendingDecision &&
          s.engine.mainVerbContinuationsInFlight === 0,
      );
      expect(s.engine.applyIntent(defender, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === seat && s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(seat);
      preferred.splice(0, preferred.length, s.inst("base").instanceId, "player", s.perm("earlier").permanentId);
      const before = s.events.length;
      expect(
        s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("dual").instanceId, useAs: "option" }),
      ).toEqual({ ok: true });
      await settle(() => observe(s.engine).blockingSeat() === defender);
      expect(s.perm("base").topCard.cardId).toBe("BT25-057");
      expect(s.perm("base").currentDP).toBe(16000);
      expect(observe(s.engine).hasPierce(s.perm("base"))).toBe(pierce);
      expect(
        s.state.players[defender]!.battleArea.some(
          (p) => p.permanentId === s.perm("alphamon").permanentId && p.topCard.cardId === "EX13-060",
        ),
      ).toBe(true);
      const earlierId = s.state.players[defender]!.battleArea.find((p) => p.topCard.cardId === "BT20-053")?.permanentId;
      expect(earlierId !== undefined).toBe(!battle || protectFirst);
      expect(s.state.players[defender]!.security).toHaveLength(protectFirst ? 3 : 4);
      expect(s.state.players[defender]!.trash.some((c) => c.instanceId === s.inst("earlier").instanceId)).toBe(
        battle && !protectFirst,
      );
      expect(s.events.slice(before).filter((e) => e.kind === "securityChecked")).toHaveLength(0);
      if (!protectFirst) declines.splice(declines.indexOf("Prevent leaving"), 1);
      const alphamonId = s.perm("alphamon").permanentId;
      expect(s.engine.applyIntent(defender, { type: "declareBlock", blockerPermanentId: alphamonId })).toEqual({
        ok: true,
      });
      await settle(
        () => s.events.slice(before).some((e) => e.kind === "attackEnded") && !observe(s.engine).isAttacking(),
      );
      expect(s.state.players[defender]!.battleArea.some((p) => p.permanentId === alphamonId)).toBe(!protectFirst);
      expect(s.events.slice(before).filter((e) => e.kind === "securityChecked")).toHaveLength(checks);
      expect(s.state.players[defender]!.security.map((c) => c.instanceId)).toEqual(
        checks === 0
          ? [s.inst("next").instanceId, s.inst("third").instanceId, s.inst("last").instanceId]
          : [s.inst("last").instanceId],
      );
      const preventionPrompts = s.decisions.filter(
        (d) =>
          d.req.sourceCardId === "EX13-057" &&
          d.req.kind === "optional" &&
          d.req.options?.affectedPermanentIds !== undefined,
      );
      expect(preventionPrompts).toHaveLength(battle && !protectFirst ? 2 : 1);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    });
  }
});
