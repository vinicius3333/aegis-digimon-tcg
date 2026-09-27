import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

describe("deferred play affordability results", () => {
  it.each([
    { available: false, cause: "memory changed" },
    { available: true, cause: "payment declined" },
  ])("reports an unpaid play after cost finalization ($cause)", async ({ available }) => {
    const setup = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-076", as: "played" }],
          battleArea: available ? [{ card: "EX9-047", as: "payment", under: ["EX9-005"] }] : [],
        },
      },
      { autoDeclineOptional: true },
    );
    setup.state.memory = available ? 0 : 3;
    await setup.ready();
    const id = setup.inst("played").instanceId;
    expect(setup.engine.applyIntent(0, { type: "playCard", instanceId: id })).toEqual({ ok: true });
    // The final check must still catch a resource change after provisional acceptance.
    if (!available) setup.state.memory = 0;
    if (available) {
      await settle(() => setup.state.pendingDecision !== undefined);
      const request = setup.decisions.at(-1)!.req;
      expect(request.kind).toBe("chooseTargets");
      expect(
        setup.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: request.decisionId,
          response: { kind: "chooseTargets", instanceIds: [] },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => setup.engine.mainVerbContinuationsInFlight === 0);
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([
      { kind: "actionRejected", intent: "playCard", reason: "insufficient-memory" },
    ]);
    expect(setup.state.players[0]!.hand.map((card) => card.instanceId)).toContain(id);
    expect(setup.state.players[0]!.battleArea).toHaveLength(available ? 1 : 0);
    expect(setup.state.memory).toBe(0);
    expect(setup.state.pendingDecision).toBeUndefined();
  });

  it("keeps a successfully paid deferred play free of rejection events", async () => {
    const setup = setupEngine({ 0: { hand: [{ card: "BT25-076", as: "played" }] } }, { autoDeclineOptional: true });
    setup.state.memory = 3;
    await setup.ready();
    const id = setup.inst("played").instanceId;
    expect(setup.engine.applyIntent(0, { type: "playCard", instanceId: id })).toEqual({ ok: true });
    await settle(() => setup.engine.mainVerbContinuationsInFlight === 0);
    expect(setup.events.filter((event) => event.kind === "actionRejected")).toEqual([]);
    expect(setup.state.players[0]!.battleArea.some((unit) => unit.topCard.instanceId === id)).toBe(true);
    expect(setup.state.players[0]!.hand.some((card) => card.instanceId === id)).toBe(false);
  });
});
