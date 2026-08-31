import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST12-05.js";

describe("ST12-05 Meramon", () => {
  it("registers an explicit empty IR for its printed no-effect contract", () => {
    expect(runtimeCompiledCard("ST12-05")?.effects).toEqual([]);
  });

  it("plays with its printed cost and DP", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "ST12-05", as: "meramon" }] } });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("meramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea[0]).toMatchObject({ baseDP: 4000, currentDP: 4000 });
  });

  it("digivolves from a red level 3 for 1 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST12-02", as: "base" }], hand: [{ card: "ST12-05", as: "meramon" }] },
    });
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("meramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("meramon").instanceId);
    expect(s.state.memory).toBe(0);
  });

  it("rejects digivolving from a blue level 3", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-027", as: "blueBase" }], hand: [{ card: "ST12-05", as: "meramon" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueBase").permanentId,
        instanceId: s.inst("meramon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
