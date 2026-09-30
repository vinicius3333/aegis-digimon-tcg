import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("P-206 Digital Gate Open Discord arena scenario", () => {
  it("plays a Tamer matching a breeding-area Digimon's color (Discord 1554891698088185917)", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
    layDevScenario("arena-p206-digital-gate-breeding-color", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const human = s.state.players[0]!;
    expect(human.breeding?.topCard.instanceId).toBe("dev-field-0-p206-breeding");
    const gate = human.battleArea.find(({ topCard }) => topCard.instanceId === "dev-field-0-p206-gate")!;
    const delay = observe(s.engine)
      .activatableEffects(gate)
      .find((effect) => /delay/i.test(effect.description ?? ""))!;
    expect(delay).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: delay.instanceId!,
        effectKey: delay.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        human.battleArea.some(({ topCard }) => topCard.instanceId === "dev-p206-tai") &&
        s.state.pendingDecision === undefined,
    );

    const taiPlayed = human.battleArea.some(({ topCard }) => topCard.instanceId === "dev-p206-tai");
    const mattInHand = human.hand.some(({ instanceId }) => instanceId === "dev-p206-matt");
    const gateTrashed = human.trash.some(({ instanceId }) => instanceId === "dev-field-0-p206-gate");

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(taiPlayed).toBe(true);
    expect(mattInHand).toBe(true);
    expect(gateTrashed).toBe(true);
  });
});
