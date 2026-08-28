import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX1-058.js";

describe("EX1-058 Devimon", () => {
  it("returns a purple level 4 or lower Digimon from trash when its host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-060", as: "host", under: ["EX1-058"] }],
          trash: [{ card: "EX1-056", as: "returnee" }],
        },
      },
      { autoSelectCards: true },
    );
    const returneeId = s.inst("returnee").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === returneeId)).toBe(true);
  });
});
