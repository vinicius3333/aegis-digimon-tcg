import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("EX13 KingEtemon digivolve rule-check arena scenario", () => {
  it("Discord 1557158483273453598: orders KingSukamon's watcher with KingEtemon's [When Digivolving]", async () => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
    );
    layDevScenario("arena-ex13-kingetemon-digivolve-rule-check", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: "kingetemon-rule-check-base",
        instanceId: "dev-kingetemon-rule-check-king",
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    const order = s.decisions.findLast(({ req }) => req.kind === "orderTriggers")!.req;
    expect(order.options?.triggerCardIds).toEqual(expect.arrayContaining(["EX13-035", "EX13-031"]));
    const watcherKey = order.options!.triggerKeys![order.options!.triggerCardIds!.indexOf("EX13-031")]!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderTriggers", order: [watcherKey] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some(
          ({ topCard }) => topCard.instanceId === "dev-kingetemon-rule-check-reveal-sukamon",
        ),
    );

    const triggered = s.events.flatMap((event) =>
      event.kind === "effectTriggered" && ["EX13-035", "EX13-031"].includes(event.sourceCardId ?? "")
        ? [event.sourceCardId]
        : [],
    );
    expect(triggered[0]).toBe("EX13-031");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      "dev-kingetemon-rule-check-bonus-draw",
    ]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
