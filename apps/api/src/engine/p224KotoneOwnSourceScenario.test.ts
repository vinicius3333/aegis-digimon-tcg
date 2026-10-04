import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

it("Discord bug 1556113288599834624: plays X7 stored by Kotone's On Play at zero memory", async () => {
  const automation = { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: ["dev-p224-x7"] };
  const s = setupEngine({ 0: {}, 1: {} }, automation);
  layDevScenario("arena-p224-kotone-own-source", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-p224-kotone" })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.stack.some((c) => c.instanceId === "dev-p224-x7")) &&
        s.state.pendingDecision === undefined,
    );
    const kotone = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === "dev-p224-kotone")!;
    expect(kotone.stack.map((c) => c.instanceId)).toEqual(["dev-p224-x7"]);
    expect(s.state.memory).toBe(0);
    const effect = observe(s.engine).activatableEffects(kotone)[0]!;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: kotone.topCard.instanceId,
        effectKey: effect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === "dev-p224-x7") &&
        s.state.pendingDecision === undefined,
    );
    expect(kotone.isSuspended).toBe(true);
    expect(kotone.stack).toHaveLength(0);
    const x7 = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === "dev-p224-x7")!;
    expect(x7.stack.map((c) => c.instanceId)).toEqual(["dev-p224-omni"]);
    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "memoryChanged", from: 0, to: -10, reason: "playCard" }),
    );
    await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.memory).toBe(10);
    expect(s.state.pendingDecision).toBeUndefined();
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
