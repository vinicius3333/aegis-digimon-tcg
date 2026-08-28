import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-013.js";

describe("BT7-013 MetalGreymon", () => {
  it("gains only 1 memory per turn when an opposing Digimon is deleted as an inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-014", under: ["BT7-013"], as: "host" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-014", as: "second" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId], "byEffect");
    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId], "byEffect");

    expect(s.state.memory).toBe(1);
  });

  it("gains two memory when its owner has a Tamer in play", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT7-013", as: "source" }], battleArea: [{ card: "BT7-085", as: "tamer" }] },
    });
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 2);
    expect(s.state.memory).toBe(2);
  });

  it("Q1514 plays a red Tamer for free instead of gaining memory when none is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-013", as: "source" },
            { card: "BT7-085", as: "takuya" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("takuya").instanceId),
    );

    expect(s.state.memory).toBe(0);
  });
});
