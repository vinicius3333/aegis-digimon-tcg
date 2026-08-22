import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-014 Shoutmon EX6", () => {
  it("reduces opposing Digimon DP once for each distinct stack color", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-014", as: "ex6", dp: 12000, under: ["BT19-012", "BT19-020"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 12000 }] },
    }, { autoSelectCards: true });

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("ex6"));

    expect(s.perm("target").currentDP).toBe(8000);
  });
});
