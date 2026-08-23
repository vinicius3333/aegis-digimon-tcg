import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-005.js";

describe("BT6-005 Pagumon", () => {
  it("adds a revealed black Digimon to hand when its host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-067", under: ["BT6-005"], as: "host" }],
          deck: [{ card: "BT5-059", as: "revealed" }],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealed").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealed").instanceId)).toBe(true);
  });
});
