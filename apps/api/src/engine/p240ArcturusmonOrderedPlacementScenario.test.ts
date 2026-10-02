import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

const GAMMAMON = "dev-arcturusmon-ordered-gammamon";
const BETELGAMMAMON = "dev-arcturusmon-ordered-betelgammamon";

describe("P-240 Arcturusmon ordered placement arena scenario (Discord 1555224478416633927)", () => {
  it("asks the player to order the 2 bottom digivolution cards", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: false });
    layDevScenario("arena-p240-arcturusmon-ordered-placement", s.state, [BLUE_DECK, RED_DECK]);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const base = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "EX12-014")!;
    const target = s.state.players[1]!.battleArea[0]!;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: "dev-arcturusmon-ordered",
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });

    await settle(() => s.decisions.some(({ req }) => req.kind === "orderCards"));
    const ordering = s.decisions.find(({ req }) => req.kind === "orderCards")!;
    expect(ordering.req.options?.orderDestination).toBe("stackBottom");
    expect([...(ordering.req.options?.candidateInstanceIds ?? [])].sort()).toEqual([BETELGAMMAMON, GAMMAMON].sort());
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.req.decisionId,
        response: { kind: "orderCards", order: [BETELGAMMAMON, GAMMAMON] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && base.stack.length === 4);

    expect(base.topCard.cardId).toBe("P-240");
    expect(base.stack.slice(0, 2).map(({ instanceId }) => instanceId)).toEqual([BETELGAMMAMON, GAMMAMON]);
    expect(target.stack).toHaveLength(0);
  });
});
