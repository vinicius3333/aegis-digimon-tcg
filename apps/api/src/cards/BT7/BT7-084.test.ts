import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-084.js";

describe("BT7-084 Eosmon", () => {
  it("gives each other Eosmon +1000 DP during its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT7-084", as: "source" }, { card: "BT6-085", as: "other" }] },
    });
    await s.ready();

    expect(s.perm("source").currentDP).toBe(11000);
    expect(s.perm("other").currentDP).toBe(7000);
  });

  it("plays a level-5 Eosmon from hand when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-084", as: "source" }],
          hand: [{ card: "BT6-085", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("source").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard?.instanceId === s.inst("played").instanceId,
    ));

    expect(s.state.players[0]!.battleArea.some(
      (permanent) => permanent.topCard?.instanceId === s.inst("played").instanceId,
    )).toBe(true);
  });
});
