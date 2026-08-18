import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-004.js";

describe("BT2-004 Argomon", () => {
  it("gains 1 memory when its host becomes unsuspended in the active phase", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-043", as: "host", under: ["BT2-004"], suspended: true }] } });
    s.state.phase = Phase.Active;
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.state.memory).toBe(1);
  });

  it("Q994 does not gain memory outside the active phase or without a state change", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-043", as: "host", under: ["BT2-004"], suspended: true }] } });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.state.memory).toBe(0);

    s.state.phase = Phase.Active;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.state.memory).toBe(0);
  });
});
