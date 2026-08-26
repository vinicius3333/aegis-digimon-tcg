import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-024.js";

describe("BT5-024 Garurumon", () => {
  it("gains 1 memory when digivolving with Gabumon in its sources", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-020", as: "base" }], hand: [{ card: "BT5-024", as: "evolving" }] },
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

  it("grants its Garurumon or Omnimon host +1000 DP as an inherited effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-086", as: "host", under: ["BT5-024"] }] } });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("recognizes a Garurumon variant and remains active on either player's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-031", as: "host", under: ["BT5-024", "BT1-040"] }] } });

    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);

    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("keeps the inherited bonus through a legal Gabumon-to-Omnimon stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT5-086",
            as: "host",
            // BT5-020 (Lv.3) -> BT5-024 (Lv.4) -> BT1-040 (Lv.5) ->
            // BT5-031 (Lv.6) -> BT5-086 (Lv.7).
            under: ["BT5-020", "BT5-024", "BT1-040", "BT5-031"],
          },
        ],
      },
    });
    const host = s.perm("host");

    expect(host.stack.map((card) => card.cardId)).toEqual(["BT5-020", "BT5-024", "BT1-040", "BT5-031"]);
    await s.ready();
    expect(host.currentDP).toBe(host.baseDP + 1000);
  });

  it("does not grant the inherited bonus to an unrelated name", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-113", as: "host", under: ["BT5-024"] }] } });

    await s.ready();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not gain memory without a Gabumon source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-021", as: "base" }], hand: [{ card: "BT5-024", as: "evolving" }] },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 0);
    expect(s.state.memory).toBe(0);
  });
});
