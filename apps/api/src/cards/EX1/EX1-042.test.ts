import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-042.js";

describe("EX1-042 Rosemon", () => {
  it("gets +1000 DP per suspended opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-042", as: "rosemon", dp: 11000 }] },
      1: {
        battleArea: [
          { card: "BT1-070", as: "opponentOne", suspended: true },
          { card: "BT1-073", as: "opponentTwo", suspended: true },
        ],
      },
    });
    await s.ready();
    expect(s.perm("rosemon").currentDP).toBe(13000);
  });

  it("counts zero suspended opposing Digimon and excludes a suspended ally", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-042", as: "rosemon", dp: 11000 },
          { card: "BT1-070", suspended: true },
        ],
      },
      1: { battleArea: [{ card: "BT1-076", as: "opponent" }] },
    });
    await s.ready();
    expect(s.perm("rosemon").currentDP).toBe(11000);
  });

  it("suspends exactly one opposing unsuspended Digimon on attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-042", as: "rosemon" },
            { card: "BT1-070", as: "ownTarget" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-076", as: "alreadySuspended", suspended: true },
            { card: "BT1-070", as: "target" },
          ],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rosemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.perm("alreadySuspended").isSuspended).toBe(true);
    expect(s.perm("ownTarget").isSuspended).toBe(false);
  });
});
