import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-056.js";

describe("EX1-056 DemiDevimon", () => {
  it("has Retaliation and cannot declare an attack on a Digimon without Myotismon in play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-056", as: "demidevimon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("demidevimon"), "Retaliation")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("demidevimon"), "cantAttackDigimon")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "cantBeAttacked")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("demidevimon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("demidevimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("may attack an opposing Digimon while Myotismon is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-056", as: "demidevimon" },
          { card: "EX1-063", as: "myotismon" },
        ],
      },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("demidevimon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
  });
});
