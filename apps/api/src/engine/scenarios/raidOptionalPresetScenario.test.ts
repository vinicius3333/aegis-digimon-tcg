import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { observe } from "../testkit/observe.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("Raid optional preset Discord arena scenario", () => {
  it.each([true, false])("applies a %s Raid preset from the effect order", async (accept) => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    layDevScenario("arena-raid-optional-preset", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: "dev-perm-0-raid-examon",
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const prompt = s.decisions.find(({ req }) => req.kind === "orderTriggers")!.req;
    const keys = prompt.options!.triggerKeys!;
    const raidIndex = keys.findIndex((key) => key.endsWith("/keyword/Raid"));
    expect(prompt.options!.triggerIsOptional![raidIndex]).toBe(true);
    const raidKey = keys[raidIndex]!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: prompt.decisionId,
        response: {
          kind: "orderTriggers",
          order: [raidKey, ...keys.filter((key) => key !== raidKey)],
          optionalAnswers: { [raidKey]: accept },
        },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    const targetSurvived = s.state.players[1]!.battleArea.some(
      ({ permanentId }) => permanentId === "dev-perm-1-raid-target",
    );
    const raidPrompts = s.decisions.filter(({ req }) => req.kind === "selectCards" && req.promptText.includes("Raid"));

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    expect(raidPrompts).toHaveLength(0);
    expect(targetSurvived).toBe(!accept);
  });
});
