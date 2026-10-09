import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "../testkit/harness.js";

const WARGROWLMON = "dev-perm-0-takato-blitz-wargrowlmon";
const GALLANTMON = "dev-takato-blitz-gallantmon";

describe("EX2 Takato granted Blitz order dev scenario", () => {
  it.each([true, false])("GitHub #5043: selects Blitz first and accepts=%s through public intents", async (accept) => {
    const s = setupEngine({ 0: {}, 1: {} }, { preferTriggerKeys: ["Blitz"] });
    layDevScenario("arena-ex2-takato-blitz-order", s.state, [BLUE_DECK, RED_DECK]);
    s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const security = [...s.state.players[1]!.security];
      const firstEvent = s.events.length;
      expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: WARGROWLMON, instanceId: GALLANTMON })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      const order = s.decisions.find(({ req }) => req.kind === "orderTriggers")!.req;
      const blitzIndex = order.options!.triggerDescriptions!.indexOf("[When Digivolving] ＜Blitz＞");
      expect(blitzIndex).toBeGreaterThanOrEqual(0);
      expect(order.options!.triggerKeys).toHaveLength(2);
      expect(s.state.memory).toBe(-2);
      expect(s.state.players[1]!.security).toHaveLength(5);
      expect(s.decisions.at(-1)!.req.promptText).toBe("Activate Blitz?");
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: s.state.pendingDecision!.decisionId,
          response: { kind: "optional", accept },
        }),
      ).toEqual({ ok: true });
      if (accept) {
        await settle(() => s.engine.hasAcceptedBlitzAttack(WARGROWLMON));
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: WARGROWLMON,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
      }
      await settleAcrossTimers(
        () => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding && !s.state.pendingDecision,
      );
      const events = s.events.slice(firstEvent);
      const declaration = events.findIndex((event) => event.kind === "attackDeclared");
      const printedResolution = events.findIndex(
        (event) => event.kind === "effectResolved" && event.effectKey === "EX13-015/ir-shared-0",
      );
      const securityCheck = events.findIndex((event) => event.kind === "securityChecked");
      expect(printedResolution).toBeGreaterThanOrEqual(0);
      if (accept) {
        expect(declaration).toBeGreaterThanOrEqual(0);
        expect(printedResolution).toBeGreaterThan(declaration);
        expect(securityCheck).toBeGreaterThan(printedResolution);
      } else {
        expect(declaration).toBe(-1);
        expect(securityCheck).toBe(-1);
      }
      expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual(
        security.slice(accept ? 2 : 1).map((card) => card.instanceId),
      );
      const host = s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === WARGROWLMON)!;
      expect(host.topCard.instanceId).toBe(GALLANTMON);
      expect(host.stack.map((card) => card.cardId)).toEqual(["EX2-010"]);
      expect(host.isSuspended).toBe(accept);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      if (!s.state.gameOver) s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    }
  });
});
