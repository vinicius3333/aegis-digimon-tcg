import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT6-055.js";

describe("BT6-055 Junkmon", () => {
  it("gains 1 memory when its host is deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-062", under: ["BT6-055"], as: "host" }] } });
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");

    expect(s.state.memory).toBe(1);
  });
});
