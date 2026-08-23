import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-064.js";

describe("BT6-064 Mamemon", () => {
  it("has Decoy and deletes a play-cost-7 Digimon on deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-064", as: "mamemon" }] },
        1: { battleArea: [{ card: "BT6-051", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("mamemon"), "Decoy")).toBe(true);

    await advance(s.engine).verb.deletePermanent([s.perm("mamemon").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
