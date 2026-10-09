import { Phase } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

it("Discord 1556765492197326870: arena offers two Titamon hand-trash effects and keeps protection unused", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
  layDevScenario("arena-bt25-titamon-trigger-text", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const human = s.state.players[0]!;
    const host = human.battleArea.find(({ topCard }) => topCard.cardId === "BT24-015")!;
    const titamons = human.battleArea.filter(({ topCard }) => topCard.cardId === "BT25-084");
    expect(titamons).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: "dev-titamon-text-plutomon",
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        host.topCard.cardId === "BT26-059" &&
        s.state.pendingDecision === undefined &&
        s.state.players[1]!.battleArea.length === 0,
    );
    expect(s.state.memory).toBe(6);
    expect(s.state.pendingDecision).toBeUndefined();
    const order = s.decisions.find(
      ({ req }) =>
        req.kind === "orderTriggers" && req.options?.triggerCardIds?.filter((id) => id === "BT25-084").length === 2,
    )!.req;
    const descriptions = order.options!.triggerDescriptions!.filter(
      (_text, index) => order.options!.triggerCardIds![index] === "BT25-084",
    );
    expect(descriptions).toHaveLength(2);
    expect(descriptions.every((text) => text.includes("When your hand is trashed from"))).toBe(true);
    expect(descriptions.some((text) => text.includes("would leave"))).toBe(false);
    const handSize = human.hand.length;
    // Each real leave reaction remains available after resolving the two hand-trash watchers.
    for (const titamon of titamons) {
      await advance(s.engine).verb.deletePermanent([titamon.permanentId]);
      await settle();
      expect(human.battleArea).toContain(titamon);
    }
    expect(human.hand).toHaveLength(handSize - 4);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
