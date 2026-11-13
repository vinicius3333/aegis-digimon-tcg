import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "#api/cards/index";
import fixture from "#api/engine/scenarios/option-drawn-mid-effect-keeps-color-waiver.fixture";
import { advance } from "#api/engine/testkit/advance";
import { finishTurnLoop } from "#api/engine/testkit/finishTurnLoop";
import { settle } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";

describe("Option drawn earlier in the same effect", () => {
  it("keeps its Tamer color waiver when Sakuyamon offers it for use", async () => {
    const preferred: string[] = [];
    const s = setupScenario(fixture, {
      autoAcceptOptional: true,
      autoSelectCards: true,
      autoOrderTriggers: true,
      preferInstanceIds: preferred,
    });
    const plugIn = s.inst("drawnBluePlugIn");
    preferred.push(plugIn.instanceId);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const host = s.perm("taomon");
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: host.permanentId,
          instanceId: s.inst("sakuyamon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && s.state.pendingDecision === undefined);

      const human = s.state.players[0]!;
      expect(host.topCard.cardId).toBe("BT19-040");
      expect(human.hand.map((card) => card.instanceId)).toContain(s.inst("secondEffectDraw").instanceId);
      expect(human.hand.map((card) => card.instanceId)).not.toContain(plugIn.instanceId);
      expect(host.linked.map((card) => card.instanceId)).toEqual([plugIn.instanceId]);
      expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "ST22-09")).toBe(true);
    } finally {
      await finishTurnLoop({ setup: s, loop });
    }
  });
});
