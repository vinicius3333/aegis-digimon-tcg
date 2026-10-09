import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import "./index.js";
import "../BT6/BT6-016.js";
import "../ST12/ST12-13.js";
import "../EX13/EX13-075.js";
import "../EX13/EX13-014.js";
import "../AD1/AD1-014.js";
import "../BT1/BT1-085.js";
import "../BT1/BT1-086.js";

describe("issue #5356: hard-played SaviorHuckmon at end of turn", () => {
  for (const seat of [0, 1] as const) {
    const opponent = seat === 0 ? 1 : 0;
    it(`#5356 historical restriction, seat ${seat}: an unsuspended ally that can't suspend cannot pay the cost`, async () => {
      const s = setupEngine({
        [seat]: {
          battleArea: [
            { card: "ST12-13", as: "ciel", suspended: true },
            { card: "EX13-075", as: "tamer" },
            { card: "BT1-009", as: "sacrifice" },
          ],
          hand: [
            { card: "BT20-014", as: "savior" },
            { card: "EX13-014", as: "jesmon" },
          ],
          trash: [{ card: "BT20-084", as: "awakened" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        [opponent]: {
          battleArea: ["BT1-085", "BT1-086"],
          hand: [{ card: "AD1-014", as: "metalgarurumon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      });
      s.state.turnSeat = opponent;
      s.state.memory = 10;
      const loop = s.engine.startTurnLoop();
      try {
        await advance(s.engine).waitForMainPhase(opponent);
        expect(
          s.engine.applyIntent(opponent, { type: "playCard", instanceId: s.inst("metalgarurumon").instanceId }),
        ).toEqual({ ok: true });
        await settleAcrossTimers(() => s.state.pendingDecision?.kind === "chooseTargets");
        const deletion = s.decisions.at(-1)!.req;
        expect(deletion.sourceCardId).toBe("AD1-014");
        expect(
          s.engine.applyIntent(opponent, {
            type: "respondDecision",
            decisionId: deletion.decisionId,
            response: { kind: "chooseTargets", instanceIds: [s.perm("sacrifice").permanentId] },
          }),
        ).toEqual({ ok: true });
        await settleAcrossTimers(
          () =>
            s.state.pendingDecision?.kind === "chooseTargets" &&
            s.decisions.at(-1)!.req.decisionId !== deletion.decisionId,
        );
        const restriction = s.decisions.at(-1)!.req;
        expect(restriction.sourceCardId).toBe("AD1-014");
        expect(
          s.engine.applyIntent(opponent, {
            type: "respondDecision",
            decisionId: restriction.decisionId,
            response: { kind: "chooseTargets", instanceIds: [s.perm("ciel").permanentId] },
          }),
        ).toEqual({ ok: true });
        await settleAcrossTimers(
          () =>
            s.state.pendingDecision?.kind === "optional" &&
            s.decisions.at(-1)!.req.decisionId !== restriction.decisionId,
        );
        const blueTamerOffer = s.decisions.at(-1)!.req;
        expect(blueTamerOffer.sourceCardId).toBe("BT1-086");
        expect(
          s.engine.applyIntent(opponent, {
            type: "respondDecision",
            decisionId: blueTamerOffer.decisionId,
            response: { kind: "optional", accept: false },
          }),
        ).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(seat);
        expect(s.state.memory).toBe(3);
        expect(s.perm("ciel").isSuspended).toBe(false);
        expect(observe(s.engine).isRestricted(s.perm("ciel"), "suspend")).toBe(true);
        expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("savior").instanceId })).toEqual({
          ok: true,
        });
        await settleAcrossTimers(() => s.state.pendingDecision?.kind === "optional");
        const offer = s.decisions.at(-1)!.req;
        expect(offer.sourceCardId).toBe("BT20-084");
        expect(s.state.memory).toBe(-4);
        expect(
          s.engine.applyIntent(seat, {
            type: "respondDecision",
            decisionId: offer.decisionId,
            response: { kind: "optional", accept: false },
          }),
        ).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(opponent);
        expect(s.perm("ciel").isSuspended).toBe(false);
        expect(s.perm("savior").topCard.cardId).toBe("BT20-014");
        expect(s.state.players[seat]!.hand.some((card) => card.cardId === "EX13-014")).toBe(true);
        expect(
          s.decisions.some(({ req }) => req.sourceCardId === "BT20-014" && req.options?.timing === "EndOfYourTurn"),
        ).toBe(false);
        expect(s.state.pendingDecision).toBeUndefined();
      } finally {
        s.engine.applyIntent(seat, { type: "surrender" });
        await loop;
      }
    });
    it(`#5356 matched production sequence, seat ${seat}: declining the trash offer preserves Savior's end-turn effect`, async () => {
      const s = setupEngine(
        {
          [seat]: {
            battleArea: [
              { card: "ST12-13", as: "ciel" },
              { card: "EX13-075", as: "tamer" },
            ],
            hand: [
              { card: "BT20-014", as: "savior" },
              { card: "EX13-014", as: "jesmon" },
            ],
            trash: [{ card: "BT20-084", as: "awakened" }],
            deck: ["BT1-009", "BT1-009", "BT1-009"],
          },
          [opponent]: { deck: ["BT1-009", "BT1-009"] },
        },
        { autoSelectCards: true, autoOrderTriggers: false },
      );
      s.state.turnSeat = seat;
      s.state.memory = 3;
      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(seat);
      expect(s.perm("ciel").isSuspended).toBe(false);
      expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("savior").instanceId })).toEqual({
        ok: true,
      });
      await settleAcrossTimers(() => s.state.pendingDecision?.kind === "orderTriggers");
      const playOrder = s.decisions.at(-1)!.req;
      expect(playOrder.options?.triggerCardIds).toEqual(expect.arrayContaining(["BT20-014", "BT20-084"]));
      const onPlayKey = playOrder.options!.triggerKeys!.find((key) => key.includes(s.inst("savior").instanceId))!;
      expect(
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: playOrder.decisionId,
          response: { kind: "orderTriggers", order: [onPlayKey] },
        }),
      ).toEqual({ ok: true });
      await settleAcrossTimers(() => s.state.pendingDecision?.kind === "optional");
      const trashOffer = s.decisions.at(-1)!.req;
      expect(trashOffer.sourceCardId).toBe("BT20-084");
      expect(s.state.memory).toBe(-4);
      expect(s.perm("ciel").isSuspended).toBe(false);
      expect(
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: trashOffer.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await settleAcrossTimers(
        () => s.state.pendingDecision !== undefined && s.decisions.at(-1)!.req.decisionId !== trashOffer.decisionId,
      );
      const endOrder = s.decisions.at(-1)!.req;
      if (endOrder.kind === "orderTriggers") {
        expect(endOrder.options?.triggerCardIds).toContain("BT20-014");
        expect(
          s.engine.applyIntent(seat, {
            type: "respondDecision",
            decisionId: endOrder.decisionId,
            response: { kind: "orderTriggers", order: endOrder.options!.triggerKeys! },
          }),
        ).toEqual({ ok: true });
      }
      await settleAcrossTimers(() => s.state.pendingDecision?.kind === "optional");
      const saviorOffer = s.decisions.at(-1)!.req;
      expect(saviorOffer.sourceCardId).toBe("BT20-014");
      expect(
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: saviorOffer.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toEqual({ ok: true });
      await settleAcrossTimers(
        () => s.state.pendingDecision !== undefined && s.decisions.at(-1)!.req.decisionId !== saviorOffer.decisionId,
      );
      const suspensionOffer = s.decisions.at(-1)!.req;
      expect(suspensionOffer.kind).toBe("optional");
      expect(suspensionOffer.sourceCardId).toBe("BT20-014");
      expect(
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: suspensionOffer.decisionId,
          response: { kind: "optional", accept: true },
        }),
      ).toEqual({ ok: true });
      // Jesmon's own evolution window remains independently answerable after recovery.
      await settleAcrossTimers(
        () =>
          s.state.pendingDecision !== undefined && s.decisions.at(-1)!.req.decisionId !== suspensionOffer.decisionId,
      );
      const jesmonOrder = s.decisions.at(-1)!.req;
      if (jesmonOrder.kind === "orderTriggers") {
        expect(
          s.engine.applyIntent(seat, {
            type: "respondDecision",
            decisionId: jesmonOrder.decisionId,
            response: { kind: "orderTriggers", order: jesmonOrder.options!.triggerKeys! },
          }),
        ).toEqual({ ok: true });
        await settleAcrossTimers(() => s.state.pendingDecision?.kind === "optional");
      }
      const jesmonOffer = s.decisions.at(-1)!.req;
      expect(jesmonOffer.kind).toBe("optional");
      expect(jesmonOffer.sourceCardId).toBe("EX13-014");
      expect(
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: jesmonOffer.decisionId,
          response: { kind: "optional", accept: false },
        }),
      ).toEqual({ ok: true });
      await turn;
      expect(s.perm("savior").topCard.cardId).toBe("EX13-014");
      expect(s.perm("ciel").isSuspended).toBe(true);
      expect(s.perm("tamer").isSuspended).toBe(false);
      expect(s.state.players[seat]!.trash.some((card) => card.instanceId === s.inst("awakened").instanceId)).toBe(true);
      expect(s.state.memory).toBe(-4);
      expect(s.state.pendingDecision).toBeUndefined();
    });
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
