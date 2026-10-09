import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("arena-bt25-shutmon-link-prompt dev scenario", () => {
  it("shows Shutmon's link box on the When Linking target prompt (Discord 1557211687998984202)", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-bt25-shutmon-link-prompt", s.state, [BLUE_DECK, RED_DECK]);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: "dev-bt25-shutmon",
        targetPermanentId: "dev-perm-0-bt25-shutmon-host",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const payload = JSON.parse(s.state.pendingDecision!.payloadJson) as { timing?: string; effectText?: string };
    expect(payload.timing).toBe("WhenLinking");
    expect(payload.effectText).toBe(getCardDefinition("BT25-072")!.linkEffect);
  });
});
