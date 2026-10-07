import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { Phase } from "@aegis/shared";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("Discord bug 1557475935962398842: preset [When Attacking] effects resolve without further clicks", () => {
  it("resolves a mixed Yes/No plan after the single order submit", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoSelectCards: false, autoAcceptOptional: false, autoOrderTriggers: false },
    );
    layDevScenario("arena-preset-order-no-clicks", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const handBefore = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: "dev-perm-0-preset-examon",
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const prompt = s.decisions.find(({ req }) => req.kind === "orderTriggers")!.req;
    const keys = prompt.options!.triggerKeys!;
    const cardIds = prompt.options!.triggerCardIds!;
    const answerFor = (index: number): boolean => {
      if (keys[index]!.endsWith("/keyword/Raid")) return true;
      return cardIds[index] === "EX2-040";
    };
    const decisionsBefore = s.decisions.length;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: prompt.decisionId,
        response: {
          kind: "orderTriggers",
          order: [...keys],
          optionalAnswers: Object.fromEntries(keys.map((key, index) => [key, answerFor(index)])),
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined || !observe(s.engine).isAttacking());

    const later = s.decisions.slice(decisionsBefore).map(({ req }) => `${req.kind}: ${req.promptText}`);
    const handAfter = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    const targetDeleted = s.state.players[1]!.trash.some(
      ({ instanceId }) => instanceId === "dev-field-1-preset-target",
    );
    const deckTrashed = s.state.players[0]!.trash.length;
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(later).toEqual([]);
    expect(handAfter).toEqual(handBefore);
    expect(targetDeleted).toBe(true);
    expect(deckTrashed).toBe(2);
  });
});
