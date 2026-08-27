import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-039.js";
import "./index.js";

describe("BT17-039 ShineGreymon", () => {
  it("may play Marcus Damon from hand when digivolving", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Marcus Damon"], match: "name" }] }, count: 1 },
    });
  });

  it("once per turn prevents opponent-effect removal by returning a yellow Tamer", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "byOpponentEffect",
          actions: [
            {
              kind: "Prevent",
              cost: {
                kind: "return",
                target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Yellow"] }, count: 1 },
              },
            },
          ],
        },
      ],
    });
  });

  it("plays Marcus Damon without cost when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-037", as: "base" }],
          hand: [
            { card: "BT17-039", as: "shine" },
            { card: "BT12-092", as: "marcus" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const marcusId = s.inst("marcus").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("shine").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === marcusId));

    expect(s.state.memory).toBe(0);
  });

  it("returns a yellow Tamer to prevent an opponent-effect deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-039", as: "shine" },
            { card: "BT1-087", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const shineId = s.perm("shine").permanentId;
    const tamerId = s.perm("tamer").topCard!.instanceId;

    await advance(s.engine).verb.deletePermanent([shineId], "byEffect");
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === shineId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === tamerId)).toBe(true);
  });
});
