import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-069.js";

describe("BT6-069 Goblimon", () => {
  it("gives its host +2000 DP only once per turn when cards are trashed from hand by effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", under: ["BT6-069"], as: "host" }], hand: [{ card: "BT1-011", as: "first" }, { card: "BT1-012", as: "second" }] } });
    await s.ready();
    const baseDP = s.perm("host").baseDP;

    await advance(s.engine).verb.trash([s.inst("first").instanceId]);
    await settle(() => s.perm("host").currentDP === baseDP + 2000);
    await advance(s.engine).verb.trash([s.inst("second").instanceId]);

    expect(s.perm("host").currentDP).toBe(baseDP + 2000);
  });
});
