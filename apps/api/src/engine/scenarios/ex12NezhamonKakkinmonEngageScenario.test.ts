import { Phase, Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settleAcrossTimers, settle } from "../testkit/harness.js";

describe("Nezhamon/Kakkinmon Engage Discord arena", () => {
  it.each([false, true])(
    "spare ST5-08 control settles Kakkinmon before a real Counter and security (decline=%s)",
    async (decline) => {
      const s = setupEngine(
        { 0: {}, 1: {} },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          preferTriggerKeys: ["EX12-019"],
          declinePrompts: decline ? ["ConditionalBranch"] : [],
        },
      );
      layDevScenario("arena-ex12-nezhamon-kakkinmon-engage-spare-blocker", s.state, [BLUE_DECK, RED_DECK]);
      const human = s.state.players[0]!;
      const spare = human.battleArea.find((permanent) => permanent.topCard.cardId === "ST5-08")!;
      expect(spare.isSuspended).toBe(false);
      // Expose Counter Timing with a legal red Lv.4 base and BT14-014 in hand.
      // This defender is test-only; the browser fixture keeps the original quiet bot board.
      s.putOnBoard(1, { card: "BT20-012", as: "counterBase" });
      s.give(1, Zone.Hand, { card: "BT14-014", as: "counter" });
      const turn = s.engine.runOneTurn();
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const handBefore = human.hand.length;
      const eventsBefore = s.events.length;
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settleAcrossTimers(() => s.events.some((event) => event.kind === "counterWindowOpened"));
      const counterIndex = s.events.findIndex((event) => event.kind === "counterWindowOpened");
      const beforeCounter = s.events.slice(eventsBefore, counterIndex);
      expect(beforeCounter.filter((event) => event.kind === "securityRevealed")).toHaveLength(0);
      expect(beforeCounter.filter((event) => event.kind === "securityChecked")).toHaveLength(0);
      expect(
        beforeCounter.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "P-245"),
      ).toHaveLength(decline ? 0 : 1);
      expect(spare.isSuspended).toBe(!decline);
      expect(human.hand).toHaveLength(handBefore + (decline ? 0 : 1));
      expect(s.state.players[1]!.security).toHaveLength(5);
      expect(s.engine.applyIntent(1, { type: "respondCounter" })).toEqual({ ok: true });
      // Collision forces the Counter base to block; Piercing then reaches security.
      await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
      expect(
        s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("counterBase").permanentId }),
      ).toEqual({ ok: true });
      await turn;
      const events = s.events.slice(eventsBefore);
      expect(events.filter((event) => event.kind === "attackDeclared")).toHaveLength(1);
      expect(events.filter((event) => event.kind === "securityChecked")).toHaveLength(1);
      expect(events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "P-245")).toHaveLength(
        decline ? 0 : 1,
      );
      expect(human.hand).toHaveLength(handBefore + (decline ? 0 : 1));
      expect(human.battleArea[0]!.isSuspended).toBe(false);
      expect(spare.isSuspended).toBe(!decline);
      expect(s.state.players[1]!.security).toHaveLength(4);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it.each(["EX12-019", "P-245"])(
    "Discord 1557557257129037844: %s first exhausts the end-of-turn window through public intents",
    async (first) => {
      const s = setupEngine(
        { 0: {}, 1: {} },
        { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: [first] },
      );
      layDevScenario("arena-ex12-nezhamon-kakkinmon-engage", s.state, [BLUE_DECK, RED_DECK]);
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        const handBefore = s.state.players[0]!.hand.length;
        const eventsBefore = s.events.length;
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await settleAcrossTimers(
          () => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && !s.state.pendingDecision,
        );
        const events = s.events.slice(eventsBefore);
        const checks = events.filter((event) => event.kind === "securityChecked");
        const kakkinmon = events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "P-245");
        const engageFirst = first === "EX12-019";
        expect(checks).toHaveLength(engageFirst ? 1 : 0);
        expect(kakkinmon).toHaveLength(engageFirst ? 0 : 1);
        expect(s.state.players[0]!.hand).toHaveLength(handBefore + (engageFirst ? 0 : 1));
        expect(s.state.players[1]!.security).toHaveLength(engageFirst ? 4 : 5);
        expect(s.state.players[0]!.battleArea[0]!.isSuspended).toBe(!engageFirst);
        expect(s.state.pendingDecision).toBeUndefined();
      } finally {
        if (!s.state.gameOver) {
          if (s.state.phase === Phase.Breeding) {
            s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
            await advance(s.engine).waitForMainPhase(s.state.turnSeat);
          }
          s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
        }
        await loop;
      }
    },
  );
});
