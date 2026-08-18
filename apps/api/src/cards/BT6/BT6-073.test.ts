import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-073.js";

describe("BT6-073 Ginkakumon", () => {
  it("gains 1 memory only once per turn when cards are trashed from hand by effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", under: ["BT6-073"], as: "host" }], hand: [{ card: "BT1-011", as: "first" }, { card: "BT1-012", as: "second" }] } });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("first").instanceId]);
    await settle(() => s.state.memory === 1);
    await advance(s.engine).verb.trash([s.inst("second").instanceId]);

    expect(s.state.memory).toBe(1);
  });

  it("does not install its inherited watcher from a loose copy in the trash", async () => {
    const s = setupEngine({
      0: {
        trash: ["BT6-073"],
        hand: [{ card: "BT1-011", as: "discarded" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("discarded").instanceId]);

    expect(s.state.memory).toBe(0);
  });
});
