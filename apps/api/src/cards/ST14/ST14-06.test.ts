import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./ST14-06.js";

describe("ST14-06 Witchmon", () => {
  it("mills 3 when digivolving and gives a Wizard host +2000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-010", as: "host", under: ["ST14-06"] },
          { card: "ST14-06", as: "witch" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("witch"));
    expect(s.state.players[0]!.trash).toHaveLength(3);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });

  it("does not use a Wizard in the stack to qualify a non-Wizard host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST14-05", as: "host", under: ["ST14-06"] }],
      },
    });
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
