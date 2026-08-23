import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX1-055.js";

describe("EX1-055 Tapirmon", () => {
  it("draws 1 when another one of your Digimon is deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-058", as: "host", under: ["EX1-055"] },
          { card: "EX1-056", as: "other" },
        ],
        deck: ["BT1-009"],
      },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId], "byEffect");
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});
