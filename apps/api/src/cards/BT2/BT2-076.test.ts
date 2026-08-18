import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-076.js";

describe("BT2-076 Pumpkinmon", () => {
  it("draws 2 then trashes 1 card when its host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-079", as: "host", under: ["BT2-076"] }],
          deck: [{ card: "BT1-010", as: "first" }, { card: "BT1-011", as: "second" }],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(3);
  });
});
