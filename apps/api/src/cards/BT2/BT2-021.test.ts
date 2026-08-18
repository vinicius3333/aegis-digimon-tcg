import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-021.js";

describe("BT2-021 Veemon", () => {
  it("draws 1 when its host becomes unsuspended in the main phase", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-026", as: "host", under: ["BT2-021"], suspended: true }], deck: [{ card: "BT1-010", as: "drawn" }] } });
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("Q1001 does not draw outside the main phase or when already unsuspended", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-026", as: "host", under: ["BT2-021"], suspended: true }], deck: [{ card: "BT1-010", as: "notDrawn" }] } });
    s.state.phase = Phase.Active;
    await s.ready();
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    s.state.phase = Phase.Main;
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
