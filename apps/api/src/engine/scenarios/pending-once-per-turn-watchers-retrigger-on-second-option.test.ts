import { expect, it } from "vitest";
import { Phase } from "@aegis/shared/schema/enums";
import "#api/cards/index";
import fixture from "#api/engine/scenarios/pending-once-per-turn-watchers-retrigger-on-second-option.fixture";
import { settle } from "#api/engine/testkit/harness";
import { setupScenario } from "#api/engine/testkit/scenario";

it("retriggers pending inherited once-per-turn Option watchers when a second Option is used", async () => {
  const preferred: string[] = [];
  const s = setupScenario(fixture, {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoOrderTriggers: true,
    preferTriggerKeys: ["ST22-01"],
    preferInstanceIds: preferred,
  });
  preferred.push(s.inst("firstOption").instanceId, s.inst("secondOption").instanceId);
  await s.ready();
  s.state.phase = Phase.Main;
  try {
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kyubimon").permanentId,
        instanceId: s.inst("taomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.engine.mainVerbContinuationsInFlight === 0 &&
        !s.state.players[0]!.hand.some((card) => card.cardId === "ST22-10"),
    );

    expect(s.perm("kyubimon").topCard.cardId).toBe("ST22-06");
    const triggerGroups = s.decisions
      .filter(({ req }) => req.kind === "orderTriggers")
      .map(({ req }) => req.options?.triggerCardIds);
    expect(triggerGroups.slice(0, 2)).toEqual([
      ["ST22-01", "EX2-019", "BT17-031"],
      ["ST22-06", "EX2-019", "BT17-031"],
    ]);
    const resolvedCardIds = s.events.flatMap((event) => (event.kind === "effectResolved" ? [event.sourceCardId] : []));
    expect(resolvedCardIds.filter((cardId) => cardId === "EX2-019")).toHaveLength(1);
    expect(resolvedCardIds.filter((cardId) => cardId === "BT17-031")).toHaveLength(1);
    expect(s.events.filter((event) => event.kind === "memoryChanged" && event.reason === "gainMemory")).toHaveLength(1);
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
  }
});
