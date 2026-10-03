import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("EX13 FlameWizardmon optional cost arena scenario", () => {
  it("Discord 1555472780571705354 asks before trashing security and keeps the use after a decline", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, autoChooseOption: true });
    layDevScenario("arena-ex13-flamewizardmon-optional-cost", s.state, [BLUE_DECK, RED_DECK]);
    s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const [human, opponent] = [s.state.players[0]!, s.state.players[1]!];
    const security = human.security.map(({ instanceId }) => instanceId);
    expect(security).toHaveLength(4);
    const hostId = "dev-perm-0-flamewizardmon-base";

    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: hostId, instanceId: "dev-ex13-flamewizardmon" }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(human.security.map(({ instanceId }) => instanceId)).toEqual(security);
    expect(opponent.battleArea.map(({ currentDP }) => currentDP)).toEqual([6000]);

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => opponent.battleArea.length === 0 && s.state.pendingDecision === undefined);

    expect(human.security.map(({ instanceId }) => instanceId)).toEqual(security.slice(1));
    expect(human.trash.map(({ instanceId }) => instanceId)).toContain(security[0]);
  });
});
