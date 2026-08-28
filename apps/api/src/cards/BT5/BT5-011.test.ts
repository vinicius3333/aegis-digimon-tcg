import { describe, it, expect } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-011.js";
describe("BT5-011 Meramon", () => {
  it("gives exactly one other Digimon +3000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "base" },
            { card: "BT2-024", as: "target" },
            { card: "BT1-010", as: "other" },
          ],
          hand: [{ card: "BT5-011", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT2-024", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 7000);
    expect(s.perm("target").currentDP).toBe(7000);
    expect(s.perm("other").currentDP).toBe(s.perm("other").baseDP);
    expect(s.perm("opponent").currentDP).toBe(s.perm("opponent").baseDP);

    advance(s.engine).ledgers.modifiers.sweep(s.state, "ownerTurnEnd", 0);
    await advance(s.engine).recompute();
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP);
  });

  it("does nothing when there is no other Digimon to target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "base" }],
          hand: [{ card: "BT5-011", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT2-024", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponent").currentDP === s.perm("opponent").baseDP);
    expect(s.perm("opponent").currentDP).toBe(s.perm("opponent").baseDP);
  });
});
