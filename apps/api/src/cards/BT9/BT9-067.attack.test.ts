import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-067.js";

describe("BT9-067 Raidenmon — level-6 source colors", () => {
  it("gets +3000 DP at 3 colors and de-digivolves at 4 colors among its level-6 sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT9-067", as: "raiden", under: ["BT1-025", "BT1-043", "BT1-062", "BT1-080"] }] },
        1: { battleArea: [{ card: "BT9-065", as: "target", under: ["BT9-061"] }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("raiden"));

    expect(s.perm("raiden").currentDP).toBe(15000);
    expect(s.perm("target").stack).toHaveLength(0);
  });
});
