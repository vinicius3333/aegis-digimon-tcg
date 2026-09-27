import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settleAcrossTimers } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("arena-rika-optional-effect-presets", () => {
  it.each(["yes", "yes-all", "no", "ask"] as const)("plays the live scenario with %s", async (preset) => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: false,
      },
    );
    s.engine.stagedDecks[0] = RED_DECK;
    s.engine.stagedDecks[1] = BLUE_DECK;
    s.engine.startDevScenario("arena-rika-optional-effect-presets");
    try {
      await settleAcrossTimers(() => s.state.phase === Phase.Breeding);
      expect(s.state.turnSeat).toBe(0);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const human = s.state.players[0]!;
      const sakuyamon = human.battleArea.find(({ topCard }) => topCard.cardId === "BT23-034")!;
      const rika = human.battleArea.find(({ topCard }) => topCard.cardId === "EX2-060")!;
      expect(human.hand.some(({ instanceId }) => instanceId === "dev-rika-plugin")).toBe(true);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: sakuyamon.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settleAcrossTimers(() => s.state.pendingDecision?.kind === "orderTriggers");
      const prompt = s.decisions.find(({ req }) => req.kind === "orderTriggers")!.req;
      expect(prompt.options?.triggerCardIds?.slice().sort()).toEqual(["BT23-034", "EX2-060"]);
      const keys = prompt.options!.triggerKeys!;
      const rikaIndex = prompt.options!.triggerCardIds!.indexOf("EX2-060");
      expect(prompt.options!.triggerIsOptional![rikaIndex]).toBe(true);
      const rikaKey = keys[rikaIndex]!;
      const optionalAnswers =
        preset === "ask"
          ? {}
          : preset === "yes-all"
            ? Object.fromEntries(keys.map((key) => [key, true]))
            : { [rikaKey]: preset === "yes" };
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: prompt.decisionId,
          response: {
            kind: "orderTriggers",
            order: [rikaKey, ...keys.filter((key) => key !== rikaKey)],
            optionalAnswers,
          },
        }),
      ).toEqual({ ok: true });
      await settleAcrossTimers(() => !observe(s.engine).isAttacking());
      const rikaPrompts = s.decisions.filter(({ req }) => req.sourceCardId === "EX2-060");
      expect(rikaPrompts.filter(({ req }) => req.kind === "optional")).toHaveLength(preset === "ask" ? 1 : 0);
      expect(rikaPrompts.filter(({ req }) => req.kind === "selectCards")).toHaveLength(preset === "no" ? 0 : 1);
      expect(rika.isSuspended).toBe(preset !== "no");
      expect(human.trash.some(({ instanceId }) => instanceId === "dev-rika-plugin")).toBe(preset !== "no");
      expect(s.decisions.filter(({ req }) => req.kind === "orderTriggers")).toHaveLength(1);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });
});
