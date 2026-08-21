import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle } from "../../engine/testkit/harness.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX8-008.js";
import "../index.js";

describe("EX8-008", () => {
  it("gains 1 memory on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
    }));
  it("inherits +2000 DP during your turn", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
    }));
  it("applies inherited DP on a live host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: "EX8-008", as: "candle" }] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("gains 1 memory when deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-008", as: "candle" }] } });
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("candle").permanentId], "byEffect");
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });
});
