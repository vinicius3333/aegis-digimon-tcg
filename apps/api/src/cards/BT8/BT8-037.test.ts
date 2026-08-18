import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-037.js";

describe("BT8-037 Dinohyumon", () => {
  it("gives an opposing Digimon -1000 DP when its host attacks", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-042", as: "host", under: ["BT8-037"] }] },
      1: { security: ["BT8-034"], battleArea: [{ card: "BT8-017", as: "target" }] },
    }, { autoSelectCards: true });
    const before = s.perm("target").currentDP;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP < before);
    expect(s.perm("target").currentDP).toBe(before - 1000);
  });
});
