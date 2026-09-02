import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-043.js";

describe("BT5-043 Jijimon", () => {
  it("recovers the top deck card when deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT5-043", as: "jijimon", under: ["BT5-042"] }],
        deck: [{ card: "BT1-009", as: "top" }],
      },
    });
    const topId = s.inst("top").instanceId;
    await advance(s.engine).verb.deletePermanent([s.perm("jijimon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === topId));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === topId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
