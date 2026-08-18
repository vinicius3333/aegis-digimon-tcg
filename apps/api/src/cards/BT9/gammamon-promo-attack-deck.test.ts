import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../P/P-058.js";
import "./BT9-023.js";

describe("Gammamon promo attack deck", () => {
  it("combines P-058's unsuspended target access with KausGammamon's unblockable pressure", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-085" },
          { card: "P-058", as: "promo", dp: 8000 },
          { card: "BT9-023", as: "kaus" },
        ],
      },
      1: { battleArea: [{ card: "BT8-034", as: "target", dp: 3000 }] },
    });
    await s.ready();

    expect(observe(s.engine).canAttackUnsuspended(s.perm("promo"))).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("kaus"), "cantBeBlocked")).toBe(true);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("promo").permanentId,
      target: { kind: "permanent", permanentId: s.perm("target").permanentId },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
