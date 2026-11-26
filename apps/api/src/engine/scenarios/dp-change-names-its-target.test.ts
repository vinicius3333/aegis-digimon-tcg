import { describe, expect, it } from "vitest";
import { setupScenario } from "#api/engine/testkit/scenario";
import { advance } from "#api/engine/testkit/advance";
import { settle } from "#api/engine/testkit/harness";
import fixture from "#api/engine/scenarios/dp-change-names-its-target.fixture";
import "#api/cards/ST22/ST22-10";

describe("DP changes from effects", () => {
  it("name the Digimon that got the DP change", async () => {
    const s = setupScenario(fixture, { autoDeclineOptional: true, autoSelectCards: true });
    const attacker = s.perm("attacker");
    const loop = s.engine.startTurnLoop();
    try {
      await advance(s.engine).waitForMainPhase(0);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: attacker.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((event) => event.kind === "attackEnded") && !s.state.pendingDecision);

      const mandala = s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "ST22-10");
      expect(mandala.map((event) => (event.kind === "effectResolved" ? event.dpChanges : undefined))).toEqual([
        [{ permanentId: attacker.permanentId, cardId: "BT1-020", delta: -9000 }],
      ]);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
