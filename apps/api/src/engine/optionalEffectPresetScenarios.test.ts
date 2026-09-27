import { Phase, type Intent, type IntentResult } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settleAcrossTimers, type EngineSetup } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

const cases = [
  ["arena-davis-optional-effect-presets", "BT8-088"],
  ["arena-ukkomon-optional-effect-presets", "BT16-082"],
  ["arena-drasil-optional-effect-presets", "BT23-072"],
] as const;

function send(s: EngineSetup, intent: Intent): void {
  const result: IntentResult = s.engine.applyIntent(0, intent);
  expect(result).toEqual({ ok: true });
}

describe.each(cases)("%s live arena", (scenario, cardId) => {
  it.each(["yes", "no", "mixed", "ask", "reverse"] as const)("honors %s", async (mode) => {
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
    s.engine.startDevScenario(scenario);
    try {
      await settleAcrossTimers(() => s.state.phase === Phase.Breeding);
      const human = s.state.players[0]!;
      const sources = human.battleArea.filter(({ topCard }) => topCard.cardId === cardId);
      const initialHand = human.hand.length;
      if (cardId === "BT16-082") {
        send(s, { type: "moveFromBreeding", permanentId: human.breeding!.permanentId });
      } else {
        send(s, { type: "endPhase" });
        await advance(s.engine).waitForMainPhase(0);
        if (cardId === "BT23-072") {
          send(s, { type: "playCard", instanceId: "dev-preset-drasil-played" });
        } else {
          const base = human.battleArea.find(({ topCard }) => topCard.cardId === "BT8-010")!;
          send(s, { type: "attack", attackerPermanentId: base.permanentId, target: { kind: "player" } });
          await settleAcrossTimers(() => base.isSuspended && !observe(s.engine).isAttacking());
          send(s, {
            type: "digivolve",
            permanentId: base.permanentId,
            instanceId: "dev-preset-davis-evolving",
          });
        }
      }
      await settleAcrossTimers(() => s.state.pendingDecision?.kind === "orderTriggers");
      const prompt = s.decisions.findLast(({ req }) => req.kind === "orderTriggers")!.req;
      const keys = prompt.options!.triggerKeys!;
      const offered = keys.filter((_, index) => prompt.options!.triggerCardIds![index] === cardId);
      expect(offered).toHaveLength(2);
      expect(new Set(offered).size).toBe(2);
      const chosen = mode === "reverse" ? [...offered].reverse() : offered;
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: prompt.decisionId,
          response: {
            kind: "orderTriggers",
            order: [...chosen, ...keys.filter((key) => !offered.includes(key))],
            optionalAnswers:
              mode === "ask"
                ? {}
                : Object.fromEntries(
                    chosen.map((key, index) => [
                      key,
                      mode === "yes" || ((mode === "mixed" || mode === "reverse") && index === 1),
                    ]),
                  ),
          },
        }),
      ).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const optional = s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === cardId);
      expect(optional.length > 0).toBe(mode === "ask");
      expect(s.decisions.filter(({ req }) => req.kind === "orderTriggers")).toHaveLength(1);
      expect(s.state.pendingDecision).toBeUndefined();
      let outcome: Record<string, unknown>;
      let expectedOutcome: Record<string, unknown>;
      if (cardId === "BT16-082") {
        outcome = { hand: human.hand.length, hatched: human.breeding?.topCard.cardId };
        expectedOutcome = { hand: initialHand + 2, hatched: mode === "no" ? undefined : "BT1-001" };
      } else {
        const expectedSuspended =
          mode === "mixed" ? [false, true] : mode === "reverse" ? [true, false] : [mode !== "no", mode !== "no"];
        outcome = { suspended: sources.map((source) => source.isSuspended) };
        expectedOutcome = { suspended: expectedSuspended };
        if (cardId === "BT8-088") {
          outcome.evolvedSuspended = human.battleArea.find(({ topCard }) => topCard.cardId === "BT8-015")!.isSuspended;
          expectedOutcome.evolvedSuspended = mode === "no";
        } else {
          const played = human.battleArea.find(({ topCard }) => topCard.cardId === "BT23-062")!;
          const keywords = ["Rush", "Raid", "Reboot", "Blocker"] as const;
          outcome.keywords = keywords.map((keyword) => observe(s.engine).hasKeyword(played, keyword));
          expectedOutcome.keywords = keywords.map(() => mode !== "no");
        }
      }
      expect(outcome).toEqual(expectedOutcome);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });
});

// Keep the historical URL working, but prove the corrected single simultaneous event.
describe("arena-matt-repeated-effect-presets simultaneous discard", () => {
  it.each([true, false])("asks Matt exactly once (accept: %s)", async (accept) => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoSelectCards: true,
        autoAcceptOptional: accept,
        autoDeclineOptional: !accept,
        autoOrderTriggers: false,
      },
    );
    s.engine.stagedDecks[0] = RED_DECK;
    s.engine.stagedDecks[1] = BLUE_DECK;
    s.engine.startDevScenario("arena-matt-repeated-effect-presets");
    try {
      await settleAcrossTimers(() => s.state.phase === Phase.Breeding);
      send(s, { type: "endPhase" });
      await advance(s.engine).waitForMainPhase(0);
      const human = s.state.players[0]!;
      const base = human.battleArea.find(({ topCard }) => topCard.cardId === "ST6-08")!;
      const matt = human.battleArea.find(({ topCard }) => topCard.cardId === "ST16-14")!;
      send(s, { type: "digivolve", permanentId: base.permanentId, instanceId: "dev-preset-matt-lady" });
      await settleAcrossTimers(() =>
        s.decisions.some(({ req }) => req.kind === "optional" && req.sourceCardId === "ST16-14"),
      );
      await advance(s.engine).waitForMainPhase(0);
      expect(s.decisions.filter(({ req }) => req.kind === "orderTriggers")).toHaveLength(0);
      expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "ST16-14")).toHaveLength(
        1,
      );
      expect(s.state.memory).toBe(accept ? 8 : 7);
      expect(matt.isSuspended).toBe(accept);
      expect(human.trash).toHaveLength(2);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });
});
