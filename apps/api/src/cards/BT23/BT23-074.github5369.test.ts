import { Zone, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../index.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";

describe("GitHub #5369 BT23-074 Eater Legion public actions", () => {
  for (const seat of [0, 1] as const) {
    function board(motherSeat: Seat | null = seat, breeding = true, freshErika = false) {
      const s = setupEngine(
        {
          [seat]: {
            hand: [
              { card: "BT23-074", as: "legion" },
              { card: "BT23-073", as: "bit1" },
              { card: "BT23-073", as: "bit2" },
              { card: "BT23-073", as: "bit3" },
              { card: "BT1-009", as: "nonEater" },
            ],
            battleArea: freshErika ? [] : [{ card: "BT23-084", as: "erika" }],
            deck: ["BT1-010", "BT1-011", "BT1-012"],
            ...(motherSeat === seat && breeding ? { breeding: "BT22-007" } : {}),
          },
          [seat === 0 ? 1 : 0]: {
            deck: ["BT1-010", "BT1-011"],
            ...(motherSeat !== null && motherSeat !== seat && breeding ? { breeding: "BT22-007" } : {}),
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      if (motherSeat !== null && !breeding) s.putOnBoard(motherSeat, { card: "BT22-007", as: "mother" });
      s.state.turnSeat = seat;
      s.state.memory = 10;
      return s;
    }

    it(`seat ${seat}: offers the printed play budget after Erika digivolves with own Mother in breeding`, async () => {
      const s = board();
      await s.ready();
      expect(
        s.engine.applyIntent(seat, {
          type: "digivolve",
          permanentId: s.perm("erika").permanentId,
          instanceId: s.inst("legion").instanceId,
        }),
      ).toEqual({ ok: true });
      await drainMicrotasks(200);
      expect(s.perm("erika").topCard.cardId).toBe("BT23-074");
      expect(s.perm("erika").stack.map(({ cardId }) => cardId)).toEqual(["BT23-084"]);
      expect(s.state.players[seat]!.deck.length).toBe(2);
      expect(s.state.players[seat]!.battleArea.filter(({ topCard }) => topCard.cardId === "BT23-073")).toHaveLength(2);
      expect(s.state.memory).toBe(7);
      expect(s.state.pendingDecision).toBeUndefined();
      assertNoLoudGap(s);
    });

    it(`seat ${seat}: On Play uses the same six-cost budget`, async () => {
      const s = board();
      await s.ready();
      expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("legion").instanceId })).toEqual({
        ok: true,
      });
      await drainMicrotasks(200);
      expect(s.state.players[seat]!.battleArea.filter(({ topCard }) => topCard.cardId === "BT23-073")).toHaveLength(2);
      expect(s.state.memory).toBe(2);
      expect(s.state.pendingDecision).toBeUndefined();
      assertNoLoudGap(s);
    });

    it(`seat ${seat}: a real turn resolves Legion before passing after a freshly played Erika evolves at zero memory`, async () => {
      const s = board(seat, true, true);
      s.give(seat, Zone.Hand, { card: "BT23-084", as: "freshErika" });
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(seat);
      s.state.memory = 4;
      expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("freshErika").instanceId })).toEqual({
        ok: true,
      });
      await drainMicrotasks(200);
      expect(s.state.memory).toBe(0);
      const erika = s.state.players[seat]!.battleArea.find(
        ({ topCard }) => topCard.instanceId === s.inst("freshErika").instanceId,
      )!;
      expect(
        s.engine.applyIntent(seat, {
          type: "digivolve",
          permanentId: erika.permanentId,
          instanceId: s.inst("legion").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.turnSeat !== seat && s.state.pendingDecision === undefined);
      expect(erika.topCard.cardId).toBe("BT23-074");
      expect(s.state.players[seat]!.battleArea.filter(({ topCard }) => topCard.cardId === "BT23-073")).toHaveLength(2);
      expect(s.decisions.some(({ seat: owner, req }) => owner === seat && req.sourceCardId === "BT23-074")).toBe(true);
      const legionTrigger = s.events.findIndex(
        (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT23-074",
      );
      const playedBits = s.events.flatMap((event, index) =>
        event.kind === "cardPlayed" && event.cardId === "BT23-073" ? [index] : [],
      );
      const turnEnded = s.events.findIndex((event) => event.kind === "turnEnded" && event.endingSeat === seat);
      expect(legionTrigger).toBeGreaterThan(-1);
      expect(playedBits).toHaveLength(2);
      expect(playedBits.every((index) => index > legionTrigger && index < turnEnded)).toBe(true);
      assertNoLoudGap(s);
      expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    });

    for (const prerequisite of ["absent", "opponent", "battle"] as const) {
      it(`seat ${seat}: no play offer when Mother is ${prerequisite}`, async () => {
        const s = board(
          prerequisite === "absent" ? null : prerequisite === "opponent" ? (seat === 0 ? 1 : 0) : seat,
          prerequisite !== "battle",
        );
        await s.ready();
        expect(
          s.engine.applyIntent(seat, {
            type: "digivolve",
            permanentId: s.perm("erika").permanentId,
            instanceId: s.inst("legion").instanceId,
          }),
        ).toEqual({ ok: true });
        await drainMicrotasks(200);
        expect(s.perm("erika").topCard.cardId).toBe("BT23-074");
        expect(s.state.players[seat]!.battleArea.filter(({ topCard }) => topCard.cardId === "BT23-073")).toHaveLength(
          0,
        );
        expect(s.decisions).toHaveLength(0);
        expect(s.state.players[seat]!.deck.length).toBe(2);
        expect(s.state.memory).toBe(7);
        expect(s.state.pendingDecision).toBeUndefined();
        assertNoLoudGap(s);
      });
    }
  }
});
