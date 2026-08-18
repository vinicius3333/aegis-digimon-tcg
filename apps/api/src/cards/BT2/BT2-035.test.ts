import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-035.js";

describe("BT2-035 GeoGreymon", () => {
  it("gives an opposing Digimon -2000 DP when attacking with 3 yellow Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-038", as: "attacker", under: ["BT2-035"] },
            "BT1-087",
            "BT1-087",
            "BT1-087",
          ],
        },
        1: { battleArea: [{ card: "BT2-043", as: "target", dp: 6000 }], security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("attacker"));
    await settle(() => s.perm("target").currentDP === 4000, 5000);

    expect(s.perm("target").currentDP).toBe(4000);
  });
});
