import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-025.js";

describe("BT3-025 ExVeemon", () => {
  it("unsuspends one of your level 4 or lower Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-027", as: "base" },
            { card: "BT2-024", as: "target", suspended: true },
          ],
          hand: [{ card: "BT3-025", as: "evolving" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("does not unsuspend an opposing Digimon or a level 5 Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-027", as: "base" },
            { card: "BT2-024", as: "own", suspended: true },
            { card: "BT3-026", as: "tooHigh", suspended: true },
          ],
          hand: [{ card: "BT3-025", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT3-019", as: "opponent", suspended: true }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("own").permanentId);
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("own").isSuspended);
    expect(s.perm("own").isSuspended).toBe(false);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.perm("tooHigh").isSuspended).toBe(true);
  });
});
