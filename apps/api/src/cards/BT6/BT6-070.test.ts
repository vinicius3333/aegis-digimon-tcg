import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-070.js";

describe("BT6-070 Elecmon", () => {
  it("deletes an opposing level 3 Digimon on deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-070", as: "elecmon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("elecmon").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
