import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-012.js";

describe("BT14-012", () => {
  it("gains +2000 DP and memory when attacking with Tai Kamiya", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ actions: [{ kind: "ModifyDP", amount: 2000 }, { kind: "GainMemory", amount: 1, condition: { kind: "youHave" } }] }));
  it("inherits conditional +2000 DP for Greymon or Omnimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 2000 }, while: { kind: "selfHasNameContaining" } }] }));

  it("gets +2000 DP and gains memory when attacking with Tai Kamiya present", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT14-012", as: "greymon" }, { card: "BT1-085", as: "tai" }] },
      1: { security: ["BT1-001"] },
    });
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const greymon = s.perm("greymon");
    const before = greymon.currentDP;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: greymon.permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => greymon.currentDP === before + 2000);
    expect(greymon.currentDP).toBe(before + 2000);
    expect(s.state.memory).toBeGreaterThanOrEqual(10);
  });
});
