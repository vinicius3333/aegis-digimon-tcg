import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-052.js";
import "./index.js";

describe("BT22-052 Leopardmon", () => {
  it("plays a small Digimon and grants Blocker to all level 3+ Digimon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand"],
        optional: true,
        target: { filter: { controller: "mine", kind: ["Digimon"], dp: { op: "lte", value: 5000 } }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Blocker" },
        duration: "untilOpponentTurnEnd",
        target: {
          filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "gte", value: 3 } },
          count: "all",
        },
      });
    }
  });

  it("gains 2 memory when another own Digimon would leave, once per turn", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
          actions: [{ kind: "GainMemory", amount: 2 }],
        },
      ],
    });
  });

  it("plays the inclusive 5000-DP boundary and grants Blocker to every level-3+ Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT22-052", as: "leopardmon" },
            { card: "BT22-057", as: "small" },
          ],
          battleArea: [{ card: "BT22-053", as: "existing" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("leopardmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-057"));
    await settle();

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT22-057")!;
    expect(observe(s.engine).hasKeyword(played, "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("existing"), "Blocker")).toBe(true);
    expect(
      observe(s.engine).hasKeyword(
        s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT22-052")!,
        "Blocker",
      ),
    ).toBe(true);
  });

  it("gains memory at would-leave timing only once across two other Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT22-052", as: "leopardmon" },
          { card: "BT22-057", as: "first" },
          { card: "BT22-056", as: "second" },
        ],
      },
    });
    await s.ready();
    s.state.memory = 0;
    const primitives = (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause: "byEffect"): Promise<unknown> } }
    ).primitives;

    await primitives.deletePermanent([s.perm("first").permanentId], "byEffect");
    await settle();
    expect(s.state.memory).toBe(2);

    await primitives.deletePermanent([s.perm("second").permanentId], "byEffect");
    await settle();
    expect(s.state.memory).toBe(2);
  });
});
