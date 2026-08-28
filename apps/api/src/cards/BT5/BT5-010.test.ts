import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT4/BT4-013.js";
import "./BT5-010.js";

describe("BT5-010 Greymon", () => {
  it("gains 1 memory with Agumon in its sources", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-007", as: "base" }], hand: [{ card: "BT5-010", as: "evolving" }] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });

  it("its inherited effect gives a qualifying Greymon host +2000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-016", as: "host", under: ["BT5-010"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });

  it("does not boost an explicitly excluded BurningGreymon host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT4-013", as: "host", under: ["BT5-010"] },
          { card: "BT4-013", as: "control" },
        ],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("control").currentDP);
  });

  it("matches both printed positive name categories and rejects every exclusion", async () => {
    for (const card of ["BT5-016", "BT5-086"]) {
      const withSource = setupEngine({ 0: { battleArea: [{ card, as: "host", under: ["BT5-010"] }] } });
      const withoutSource = setupEngine({ 0: { battleArea: [{ card, as: "host" }] } });
      await withSource.ready();
      await withoutSource.ready();
      expect(withSource.perm("host").currentDP).toBe(withoutSource.perm("host").currentDP + 2000);
    }

    for (const card of ["BT7-064", "BT4-013", "BT9-078"]) {
      const withSource = setupEngine({ 0: { battleArea: [{ card, as: "host", under: ["BT5-010"] }] } });
      const withoutSource = setupEngine({ 0: { battleArea: [{ card, as: "host" }] } });
      await withSource.ready();
      await withoutSource.ready();
      expect(withSource.perm("host").currentDP, card).toBe(withoutSource.perm("host").currentDP);
    }
  });

  it("applies the inherited bonus only during its owner's turn and requires the source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-016", as: "host", under: ["BT5-010"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);

    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);

    const missing = setupEngine({ 0: { battleArea: [{ card: "BT5-016", as: "host" }] } });
    await missing.ready();
    expect(missing.perm("host").currentDP).toBe(missing.perm("host").baseDP);
  });
});
