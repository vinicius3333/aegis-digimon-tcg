import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST7-04.js";

describe("ST7-04 Biyomon", () => {
  it("has Blocker and cannot attack players on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST7-04", as: "biyomon" }] }, 1: { security: ["ST7-01"] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("biyomon"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("biyomon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });
});
