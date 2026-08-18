import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-002.js";

describe("BT2-002 DemiVeemon", () => {
  it("gives +1000 DP when its suspended host becomes unsuspended in the main phase", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-012", as: "host", under: ["BT2-002"], suspended: true }] } });
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("Q993 requires a real unsuspend during the main phase", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-012", as: "host", under: ["BT2-002"], suspended: true }] } });
    s.state.phase = Phase.Active;
    await s.ready();
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);

    s.state.phase = Phase.Main;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
