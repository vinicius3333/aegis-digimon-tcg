import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it("Discord 1556882561995644928: Leopardmon offers two targets while a stacked Alphamon stays inspectable", async () => {
  const s = setupEngine({ 0: {}, 1: {} });
  layDevScenario("arena-discord-1556882561995644928-mobile-inspection", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const alphamon = s.state.players[1]!.battleArea.find((p) => p.topCard.cardId === "EX13-060")!;
    expect(alphamon.stack).toHaveLength(4);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-inspection-leopardmon" })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision !== undefined);
    expect(s.state.pendingDecision?.kind).toBe("chooseTargets");
    expect(s.decisions.map(({ req }) => req.kind)).toEqual(["chooseTargets"]);
    const suspend = s.decisions.find(({ req }) => req.options?.targetFate === "suspend")!.req;
    expect(suspend.options?.min).toBe(0);
    expect(suspend.options?.purpose).toBe("optionalTarget");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: suspend.decisionId,
        response: { kind: "chooseTargets", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.options?.targetFate === "returnToDeck"));
    const decision = s.decisions.find(({ req }) => req.options?.targetFate === "returnToDeck")!.req;
    expect(s.decisions.map(({ req }) => req.kind)).toEqual(["chooseTargets", "chooseTargets"]);
    expect(decision.options?.candidateInstanceIds).toHaveLength(2);
    expect(decision.options?.candidateInstanceIds).not.toContain(alphamon.permanentId);
    expect(s.state.pendingDecision?.decisionId).toBe(decision.decisionId);
  } finally {
    s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
    await loop;
  }
});
