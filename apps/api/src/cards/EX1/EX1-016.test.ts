import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./EX1-016.js";

describe("EX1-016 Ikkakumon", () => {
  it("can attack an unsuspended opposing Digimon with no digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-016", as: "ikkakumon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "eligible" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ikkakumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("eligible").permanentId },
      }),
    ).toEqual({ ok: true });
  });

  it("can't use that permission against an unsuspended Digimon with digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-016", as: "ikkakumon" }] },
      1: { battleArea: [{ card: "BT1-010", as: "ineligible", under: ["BT1-009"] }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ikkakumon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("ineligible").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });
});
