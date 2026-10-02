import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("BT20 Unleash the Dragon Gene skip-play arena scenario", () => {
  it("places the Option without playing after the accepted pick is answered with no card (Discord 1555073882145423380)", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true });
    layDevScenario("arena-bt20-dragon-gene-skip-play", s.state, [RED_DECK, BLUE_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-dragon-gene-option" })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards" && req.sourceCardId === "BT20-093"));
    const pick = s.decisions.find(({ req }) => req.kind === "selectCards" && req.sourceCardId === "BT20-093")!.req;
    expect(pick.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining(["dev-dragon-gene-coredramon", "dev-dragon-gene-examon"]),
    );
    expect(pick.options?.min).toBe(0);
    expect(pick.options?.purpose).toBe("acceptedOptional");

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pick.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === "dev-dragon-gene-option") &&
        s.state.pendingDecision === undefined,
    );

    const hand = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
    const memory = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(hand).toEqual(expect.arrayContaining(["dev-dragon-gene-coredramon", "dev-dragon-gene-examon"]));
    expect(memory).toBe(10 - 2);
  });
});
