import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./index.js";
import "../BT6/BT6-016.js";

describe("issue #5356: hard-played SaviorHuckmon at end of turn", () => {
  for (const seat of [0, 1] as const) {
    const opponent = seat === 0 ? 1 : 0;
    it.each([
      "eligible",
      "freshAlly",
      "pass",
      "exactZero",
      "decline",
      "suspended",
      "selfOnly",
      "tamerOnly",
      "breedingOnly",
      "noJesmon",
      "illegalJesmon",
    ] as const)(`seat ${seat}: %s suspension/evolution control through public intents`, async (mode) => {
      const hasAlly = [
        "eligible",
        "freshAlly",
        "pass",
        "exactZero",
        "decline",
        "suspended",
        "noJesmon",
        "illegalJesmon",
      ].includes(mode);
      const destination = mode === "illegalJesmon" ? "BT10-112" : "BT6-016";
      const s = setupEngine(
        {
          [seat]: {
            battleArea: [
              ...(hasAlly && mode !== "freshAlly" ? [{ card: "BT1-009", as: "ally" }] : []),
              ...(mode === "tamerOnly" ? [{ card: "BT1-085", as: "tamer" }] : []),
            ],
            ...(mode === "breedingOnly" ? { breeding: { card: "BT1-009", as: "breeding" } } : {}),
            hand: [
              { card: "BT20-014", as: "savior" },
              ...(mode === "freshAlly" ? [{ card: "BT1-009", as: "ally" }] : []),
              ...(mode === "noJesmon" ? [] : [{ card: destination, as: "jesmon" }]),
            ],
            deck: ["BT1-009", "BT1-009", "BT1-009"],
          },
          [opponent]: {
            battleArea: [{ card: "BT1-009", as: "defender", dp: 1000, suspended: true }],
            deck: ["BT1-009", "BT1-009"],
          },
        },
        {
          autoAcceptOptional: mode !== "decline",
          autoDeclineOptional: mode === "decline",
          autoSelectCards: true,
        },
      );
      s.state.turnSeat = seat;
      s.state.memory = mode === "pass" ? 10 : mode === "exactZero" ? 7 : mode === "freshAlly" ? 5 : 3;
      const turn = s.engine.runOneTurn();
      if (mode === "breedingOnly") {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
      }
      await advance(s.engine).waitForMainPhase(seat);
      if (mode === "freshAlly") {
        expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("ally").instanceId })).toEqual({
          ok: true,
        });
        await settle(() => s.perm("ally").topCard.cardId === "BT1-009" && s.state.pendingDecision === undefined);
        expect(s.perm("ally").isSuspended).toBe(false);
      }
      if (mode === "suspended") {
        expect(
          s.engine.applyIntent(seat, {
            type: "attack",
            attackerPermanentId: s.perm("ally").permanentId,
            target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
          }),
        ).toEqual({ ok: true });
        await advance(s.engine).finishAttack();
        expect(s.perm("ally").isSuspended).toBe(true);
      }
      expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("savior").instanceId })).toEqual({
        ok: true,
      });
      if (mode === "pass" || mode === "exactZero") {
        await settle(() => s.perm("savior").topCard.cardId === "BT20-014" && s.state.pendingDecision === undefined);
        expect(s.perm("ally").isSuspended).toBe(false);
        expect(s.state.memory).toBe(mode === "pass" ? 3 : 0);
        expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
      }
      await turn;
      const evolves = ["eligible", "freshAlly", "pass", "exactZero"].includes(mode);
      expect(s.perm("savior").topCard.cardId).toBe(evolves ? "BT6-016" : "BT20-014");
      expect(s.state.memory).toBe(mode === "pass" || mode === "exactZero" ? -3 : -4);
      expect(s.state.pendingDecision).toBeUndefined();
      // CR 15-7-5 permits paying the optional condition even if its payload cannot resolve.
      if (hasAlly) expect(s.perm("ally").isSuspended).toBe(mode !== "decline");
      if (evolves) {
        expect(s.perm("savior").stack.map((card) => card.cardId)).toContain("BT20-014");
        expect(s.state.players[seat]!.hand.some((card) => card.cardId === "BT6-016")).toBe(false);
        expect(s.state.players[seat]!.hand).toHaveLength(1);
        expect(s.decisions.some(({ seat: askedSeat, req }) => askedSeat === seat && req.kind === "optional")).toBe(
          true,
        );
      } else if (mode !== "noJesmon") {
        expect(s.state.players[seat]!.hand.some((card) => card.cardId === destination)).toBe(true);
      }
      if (mode === "tamerOnly") expect(s.perm("tamer").isSuspended).toBe(false);
      if (mode === "breedingOnly") expect(s.perm("breeding").isSuspended).toBe(false);
    });
  }
});
