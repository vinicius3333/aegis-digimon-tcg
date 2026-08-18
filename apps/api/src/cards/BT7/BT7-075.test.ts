import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-075.js";

describe("BT7-075 Rhihimon", () => {
  it("reduces its digivolution cost by 2 when the base has a Tamer source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-071", under: ["BT7-091"], as: "base" }],
        hand: [{ card: "BT7-075", as: "rhihimon" }],
        deck: ["BT7-072"],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("rhihimon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT7-075" && s.state.memory === 0);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard?.cardId).toBe("BT7-075");
  });

  it("plays the purple Tamer from its own deleted stack when it has a Hybrid source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{
            card: "BT7-075",
            under: [{ card: "BT7-071", as: "hybrid" }, { card: "BT3-096", as: "tamer" }],
            as: "rhihimon",
          }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("rhihimon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard?.instanceId === s.inst("tamer").instanceId,
    ));

    expect(s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard?.instanceId === s.inst("tamer").instanceId,
    )).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(true);
  });
});
