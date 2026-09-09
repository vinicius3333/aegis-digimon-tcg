import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../testkit/harness.js";
import "../../cards/EX7/EX7-015.js";
import "../../cards/BT10/BT10-008.js";
import "../../cards/BT12/BT12-074.js";

describe("DigiXros play-cost restriction", () => {
  it("suppresses the intrinsic DigiXros reduction for every restricted player", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["EX7-015"],
        hand: [
          { card: "BT12-074", as: "gumdramon" },
          { card: "BT10-008", as: "material" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("gumdramon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("gumdramon").instanceId),
    );

    // FAILS-WHEN-REVERTED: omitting canReducePlayCost from the DigiXros dependency
    // contract makes the intrinsic -2 reduction apply and leaves memory at 8.
    expect(s.state.memory).toBe(6);
    expect(s.perm("gumdramon").stack.map((card) => card.instanceId)).toEqual([s.inst("material").instanceId]);
  });

  it("keeps the intrinsic DigiXros reduction when no restriction is active", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT12-074", as: "gumdramon" },
          { card: "BT10-008", as: "material" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("gumdramon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("material").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("gumdramon").instanceId),
    );

    expect(s.state.memory).toBe(8);
  });
});
