import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST6-04.js";

describe("ST6-04 Dracmon", () => {
  it("returns a purple Option costing 1 or 7 from trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST6-04", as: "dracmon" }],
          trash: [
            { card: "ST6-15", as: "costOne" },
            { card: "ST6-16", as: "costSeven" },
            { card: "BT6-107", as: "invalidCostThree" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("costSeven").instanceId);
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dracmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("costSeven").instanceId));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("costSeven").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("costOne").instanceId, s.inst("invalidCostThree").instanceId]),
    );
    const request = s.decisions.find(({ req }) => req.kind === "selectCards")?.req;
    expect(request).toBeDefined();
    expect(new Set(request!.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([s.inst("costOne").instanceId, s.inst("costSeven").instanceId]),
    );
  });
});
