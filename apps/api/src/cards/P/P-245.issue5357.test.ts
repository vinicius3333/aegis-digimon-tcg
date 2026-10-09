import { describe, expect, it } from "vitest";
import { EffectTiming, type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle, type SeatSpec } from "../../engine/testkit/harness.js";
import "./P-245.js";

const controls = [
  {
    name: "seven cards",
    handSize: 7,
    blocker: "BT5-061",
    suspended: false,
    source: "inherited",
    pays: true,
    draws: true,
  },
  {
    name: "eight cards",
    handSize: 8,
    blocker: "BT5-061",
    suspended: false,
    source: "inherited",
    pays: true,
    draws: false,
  },
  {
    name: "already suspended Blocker",
    handSize: 7,
    blocker: "BT5-061",
    suspended: true,
    source: "inherited",
    pays: false,
    draws: false,
  },
  {
    name: "black non-Blocker",
    handSize: 7,
    blocker: "BT3-059",
    suspended: false,
    source: "inherited",
    pays: false,
    draws: false,
  },
  {
    name: "purple Blocker",
    handSize: 7,
    blocker: "BT13-082",
    suspended: false,
    source: "inherited",
    pays: false,
    draws: false,
  },
  {
    name: "only payable Blocker in breeding",
    handSize: 7,
    blocker: "BT5-061",
    suspended: false,
    source: "costBreeding",
    pays: false,
    draws: false,
  },
  {
    name: "inherited source in breeding",
    handSize: 7,
    blocker: "BT5-061",
    suspended: false,
    source: "breeding",
    pays: false,
    draws: false,
  },
  {
    name: "naked egg in breeding",
    handSize: 7,
    blocker: "BT5-061",
    suspended: false,
    source: "egg",
    pays: false,
    draws: false,
  },
] as const;

describe("GitHub #5357 P-245 opponent turn end through public intents", () => {
  for (const owner of [0, 1] as const) {
    const opponent: Seat = owner === 0 ? 1 : 0;

    it.each(controls)(`seat ${owner}: $name`, async (control) => {
      const controller: SeatSpec = {
        battleArea: [
          ...(control.source === "inherited" || control.source === "costBreeding"
            ? [{ card: "BT3-060", as: "host", under: ["P-245"] }]
            : []),
          ...(control.source !== "costBreeding"
            ? [{ card: control.blocker, as: "cost", suspended: control.suspended }]
            : []),
        ],
        ...(control.source === "costBreeding" ? { breeding: { card: "BT5-061", as: "cost" } } : {}),
        ...(control.source === "breeding" ? { breeding: { card: "BT3-060", under: ["P-245"] } } : {}),
        ...(control.source === "egg" ? { breeding: "P-245" } : {}),
        hand: Array.from({ length: control.handSize }, () => "BT3-059"),
        deck: [{ card: "BT3-059", as: "effectDraw" }, "BT3-059"],
      };
      const s = setupEngine(
        {
          [owner]: controller,
          [opponent]: {
            battleArea: [{ card: "BT5-061", as: "enemyBlocker" }],
            hand: ["BT3-059"],
            deck: Array.from({ length: 10 }, () => "BT3-059"),
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = opponent;
      s.state.memory = 10;
      await s.ready();
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(opponent);
      expect(s.engine.applyIntent(opponent, { type: "endPhase" })).toEqual({ ok: true });
      await turn;

      expect(s.state.players[owner]!.hand).toHaveLength(control.handSize + Number(control.draws));
      expect(s.state.players[owner]!.hand.some((card) => card.instanceId === s.inst("effectDraw").instanceId)).toBe(
        control.draws,
      );
      expect(s.perm("cost").isSuspended).toBe(control.suspended || control.pays);
      expect(s.perm("enemyBlocker").isSuspended).toBe(false);
      for (const decision of s.decisions.filter(({ req }) => req.sourceCardId === "P-245")) {
        expect(decision.seat).toBe(owner);
      }
      expect(s.state.pendingDecision).toBeUndefined();
      assertNoLoudGap(s);
    });

    it(`seat ${owner}: one inherited source pays on own, opponent, and next own turn without manual unsuspending`, async () => {
      const s = setupEngine(
        {
          [owner]: {
            battleArea: [
              { card: "BT3-060", as: "host", under: [{ card: "P-245", as: "source" }] },
              { card: "BT5-061", as: "firstCost" },
              { card: "BT5-061", as: "secondCost" },
            ],
            hand: Array.from({ length: 3 }, () => "BT3-059"),
            deck: [
              { card: "BT3-059", as: "ownDraw" },
              { card: "BT3-059", as: "opponentDraw" },
              { card: "BT3-059", as: "naturalDraw" },
              { card: "BT3-059", as: "nextOwnDraw" },
              ...Array.from({ length: 16 }, () => "BT3-059"),
            ],
          },
          [opponent]: { hand: ["BT3-059"], deck: Array.from({ length: 20 }, () => "BT3-059") },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = owner;
      s.state.memory = 10;
      await s.ready();
      const sourceId = s.inst("source").instanceId;
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(owner);
      expect(s.engine.applyIntent(owner, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(opponent);
      expect(s.state.players[owner]!.hand).toHaveLength(4);
      expect(s.perm("firstCost").isSuspended).toBe(true);
      expect(s.perm("secondCost").isSuspended).toBe(false);
      expect(s.engine.applyIntent(opponent, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(owner);
      expect(s.state.players[owner]!.hand).toHaveLength(6);
      expect(s.perm("firstCost").isSuspended).toBe(false);
      expect(s.perm("secondCost").isSuspended).toBe(false);
      expect(s.engine.applyIntent(owner, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(opponent);
      expect(s.state.players[owner]!.hand).toHaveLength(7);
      expect(s.perm("firstCost").isSuspended).toBe(true);
      expect(s.perm("secondCost").isSuspended).toBe(false);
      for (const alias of ["ownDraw", "opponentDraw", "naturalDraw", "nextOwnDraw"]) {
        expect(s.state.players[owner]!.hand.some((card) => card.instanceId === s.inst(alias).instanceId)).toBe(true);
      }
      expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(sourceId);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.engine.applyIntent(opponent, { type: "surrender" })).toEqual({ ok: true });
      await loop;
      assertNoLoudGap(s);
    });

    it(`seat ${owner}: a second end window in the same turn cannot spend a second legal cost`, async () => {
      const s = setupEngine(
        {
          [owner]: {
            battleArea: [
              { card: "BT3-060", under: ["P-245"] },
              { card: "BT5-061", as: "firstCost" },
              { card: "BT5-061", as: "secondCost" },
            ],
            deck: Array.from({ length: 10 }, () => "BT3-059"),
          },
          [opponent]: { hand: ["BT3-059"], deck: Array.from({ length: 10 }, () => "BT3-059") },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = opponent;
      s.state.memory = 10;
      await s.ready();
      await advance(s.engine).runTurn(opponent);
      expect(s.state.players[owner]!.hand).toHaveLength(1);
      expect(s.perm("firstCost").isSuspended).toBe(true);
      expect(s.perm("secondCost").isSuspended).toBe(false);
      const decisionCount = s.decisions.length;
      const turnCount = s.state.turnCount;
      // Supplemental mechanism control: no public action repeats an already completed
      // end window without starting another turn. Preserve its turn identity here.
      await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
      await settle();
      expect(s.state.turnCount).toBe(turnCount);
      expect(s.state.players[owner]!.hand).toHaveLength(1);
      expect(s.perm("secondCost").isSuspended).toBe(false);
      expect(s.decisions).toHaveLength(decisionCount);
      assertNoLoudGap(s);
    });
  }
});
