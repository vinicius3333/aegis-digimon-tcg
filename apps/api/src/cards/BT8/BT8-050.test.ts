import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-050.js";

describe("BT8-050 Exermon", () => {
  it("suspends one of your Digimon to suspend an opposing Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-064", as: "base" },
            { card: "BT1-065", as: "cost" },
          ],
          hand: [{ card: "BT8-050", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cost").permanentId, s.perm("target").permanentId);
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("cost").isSuspended).toBe(true);
  });

  it("may suspend itself as the cost to suspend an opposing Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "base" }],
          hand: [{ card: "BT8-050", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("base").permanentId, s.perm("target").permanentId);
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("gives its host +1000 DP for each other suspended Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-042", as: "host", under: ["BT8-050"], suspended: true },
          { card: "BT8-034", suspended: true },
          { card: "BT8-035", suspended: true },
        ],
      },
      1: { battleArea: [{ card: "BT8-034", suspended: true }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 2000);
  });
});
