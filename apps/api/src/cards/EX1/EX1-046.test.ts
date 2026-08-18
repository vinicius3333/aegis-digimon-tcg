import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX1-046.js";

describe("EX1-046 Kurisarimon", () => {
  it("unsuspends its host when another Digimon with the host's name is deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", suspended: true, under: ["EX1-046"] }, { card: "BT1-009", as: "other" }] } });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("other").permanentId], "byEffect");
    expect(s.perm("host").isSuspended).toBe(false);
  });
});
