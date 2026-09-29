import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("EX12 Virus Busters Discord arena scenario", () => {
  it("offers Virus Busters in the same order prompt as the DNA attack's pending effects", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: false },
    );
    layDevScenario("arena-ex12-virus-busters-effect-attack", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");

    const options = s.decisions.at(-1)!.req.options as { triggerCardIds: string[] };
    expect(options.triggerCardIds.slice().sort()).toEqual(["EX12-024", "EX12-032", "EX12-032", "EX12-069"]);
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX12-069")).toBe(false);

    expect(s.engine.applyIntent(s.state.turnSeat, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
