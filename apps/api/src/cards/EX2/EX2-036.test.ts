import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-036.js";

describe("EX2-036 GroundLocomon", () => {
  it("can attack players and gains 1000 DP per Cyborg or Machine in trash", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-036", as: "groundLocomon" }], trash: ["EX2-031", "EX2-034"] },
      1: { security: ["BT1-001"] },
    });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("groundLocomon"), "cantAttackDigimon")).toBe(true);
    expect(s.perm("groundLocomon").currentDP).toBe(13000);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("groundLocomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
  });

  it("can't choose an opponent's suspended Digimon as its attack target", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-036", as: "groundLocomon" }] },
      1: { battleArea: [{ card: "EX2-031", as: "target", suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("groundLocomon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });
});
