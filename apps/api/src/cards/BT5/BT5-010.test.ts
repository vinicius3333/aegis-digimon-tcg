import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT4/BT4-013.js";
import "./BT5-010.js";

describe("BT5-010 Greymon", () => {
  it("gains 1 memory with Agumon in its sources", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-007", as: "base" }], hand: [{ card: "BT5-010", as: "evolving" }] } });
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("its inherited effect gives a qualifying Greymon host +2000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-016", as: "host", under: ["BT5-010"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });

  it("does not boost an explicitly excluded BurningGreymon host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-013", as: "host", under: ["BT5-010"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 3000);
  });
});
