import { describe, expect, it } from "vitest";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/EX9/index.js";

const TRAINING_FINGERPRINT = "b7603283456371a6ab6f29c64ef1a78e2afe6094bf01b1706c0f3fa73f927cf7";

function citeTraining(): void {
  cite(
    "comprehensive-0260",
    "§16-41-1/3: Training suspends the Digimon during the main phase, then mandatorily places the deck top face-down under it.",
    TRAINING_FINGERPRINT,
  );
}

describe("Training public boundaries", () => {
  it("places the exact face-down deck instance during a natural main phase", async () => {
    citeTraining();
    const s = setupEngine({
      0: { battleArea: [{ card: "EX9-008", as: "trainer", under: ["EX9-001"] }], deck: ["BT1-010", "BT1-048"] },
      1: { deck: ["BT1-009"] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const trainer = s.perm("trainer");
    const player = s.state.players[0]!;
    const sourceId = trainer.topCard.instanceId;
    const originalUnderId = trainer.stack.find((card) => card.cardId === "EX9-001")!.instanceId;
    const memoryBefore = s.state.memory;
    const deckIds = player.deck.map((card) => card.instanceId);
    const first = observe(s.engine)
      .activatableEffects(trainer)
      .find((entry) => entry.instanceId === sourceId);
    expect(first).toBeDefined();
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: sourceId, effectKey: first!.effectKey }),
    ).toEqual({
      ok: true,
    });
    await settle(() => trainer.stack.length === 2);
    expect(trainer.stack[0]!.instanceId).toBe(deckIds[0]);
    expect(trainer.stack[0]!.faceUp).toBe(false);
    expect(trainer.stack[1]!.instanceId).toBe(originalUnderId);
    expect(s.state.memory).toBe(memoryBefore);
    expect(trainer.isSuspended).toBe(true);
    expect(player.deck.map((card) => card.instanceId)).toEqual([deckIds[1]]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("rejects a known Training activation key when the mandatory placement has no deck card", async () => {
    citeTraining();
    const control = setupEngine({
      0: { battleArea: [{ card: "EX9-008", as: "trainer" }], deck: ["BT1-010"] },
    });
    await control.ready();
    const controlTrainer = control.perm("trainer");
    const controlEntry = observe(control.engine)
      .activatableEffects(controlTrainer)
      .find((entry) => entry.instanceId === controlTrainer.topCard.instanceId);
    expect(controlEntry).toBeDefined();

    const s = setupEngine({ 0: { battleArea: [{ card: "EX9-008", as: "trainer" }], deck: [] } });
    await s.ready();
    const trainer = s.perm("trainer");
    const sourceId = trainer.topCard.instanceId;
    const result = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: sourceId,
      effectKey: controlEntry!.effectKey,
    });
    expect(result.ok).toBe(false);
    expect(observe(s.engine).activatableEffects(trainer)).toEqual([]);
    expect(trainer.isSuspended).toBe(false);
    expect(trainer.stack.map(({ cardId }) => cardId)).toEqual([]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
