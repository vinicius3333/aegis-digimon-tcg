import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-009.js";
import "../index.js";

describe("BT16-009", () => {
  it("has Raid and Armor Purge and gives an opposing Digimon -3000 DP when digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Raid" }, { keyword: "Armor Purge" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" }],
    });
  });

  it("gives an opposing Digimon -3000 DP for the turn when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-009", as: "lynxmon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target", dp: 6000 },
            { card: "BT1-009", as: "other", dp: 7000 },
          ],
        },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("lynxmon"));
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.perm("other").currentDP).toBe(7000);
  });
});
