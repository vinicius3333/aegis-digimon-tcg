import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("BT22 Mirei Mikagura Discord arena scenario", () => {
  it("offers only the play cost 4 Tamer at the start of the main phase (Discord 1555135721101197382)", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: ["dev-mirei-cost-three"] },
    );
    layDevScenario("arena-bt22-mirei-play-cost-floor", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;

    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await settle(
      () =>
        human.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-093") &&
        s.state.pendingDecision === undefined,
    );

    const offered = s.decisions.flatMap(({ req }) =>
      req.kind === "selectCards" && req.sourceCardId === "BT22-089" ? (req.options?.candidateInstanceIds ?? []) : [],
    );
    expect(offered).not.toContain("dev-mirei-cost-three");
    expect(human.hand.map(({ instanceId }) => instanceId)).toContain("dev-mirei-cost-three");
    expect(human.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT22-093"]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
