import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

it("Discord 1557582469409144852: orders three physical mandatory King Drasil triggers in a real turn", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoOrderTriggers: false });
  layDevScenario("arena-ui-king-drasil-mandatory-order", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    // A breeding King Drasil cannot move out; Start of Main adds the third inherited egg.
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined);
    const human = s.state.players[0]!;
    const drasil = human.breeding!;
    const sourceIds = drasil.stack.map(({ instanceId }) => instanceId);
    expect(drasil.topCard.cardId).toBe("BT13-007");
    expect(drasil.stack.map(({ cardId }) => cardId)).toEqual(["BT13-007", "BT13-007", "BT13-007"]);
    expect(new Set(sourceIds).size).toBe(3);
    expect(s.state.memory).toBe(10);
    const eventStart = s.events.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-ui-king-drasil-royal-purge" })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const placeUnder = s.decisions.at(-1)!.req;
    expect(placeUnder.sourceCardId).toBe("BT13-110");
    expect(s.state.memory).toBe(4);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: placeUnder.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const plan = s.decisions.at(-1)!.req;
    const keys = plan.options!.triggerKeys!;
    expect(plan.options).toMatchObject({
      acceptsResolutionPlan: true,
      triggerCardIds: ["BT13-007", "BT13-007", "BT13-007"],
      triggerIsOptional: [false, false, false],
    });
    expect(keys).toHaveLength(3);
    expect(new Set(keys).size).toBe(3);
    expect(keys.map((key) => key.split("::")[0]).sort()).toEqual([...sourceIds].sort());
    const order = [...keys].reverse();
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: plan.decisionId,
        response: { kind: "orderTriggers", order },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 7 && s.state.pendingDecision === undefined);
    expect(drasil.stack.map(({ instanceId }) => instanceId)).toEqual(sourceIds);
    expect(human.battleArea.some(({ topCard }) => topCard.instanceId === "dev-ui-king-drasil-royal-purge")).toBe(true);
    expect(
      s.events
        .slice(eventStart)
        .flatMap((event) =>
          event.kind === "effectTriggered" && event.sourceCardId === "BT13-007" ? [event.sourceInstanceId] : [],
        ),
    ).toEqual(order.map((key) => key.split("::")[0]));
    expect(
      s.events
        .slice(eventStart)
        .flatMap((event) =>
          event.kind === "memoryChanged" && event.reason === "gainMemory" ? [[event.from, event.to]] : [],
        ),
    ).toEqual([
      [4, 5],
      [5, 6],
      [6, 7],
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
