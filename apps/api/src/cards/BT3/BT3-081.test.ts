import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT3-081.js";

describe("BT3-081 Devidramon", () => {
  it("gains 1 memory when its host is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-086", as: "host", under: ["BT3-081"] }] },
    });
    s.state.memory = 0;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);

    expect(s.state.memory).toBe(1);
  });
});
