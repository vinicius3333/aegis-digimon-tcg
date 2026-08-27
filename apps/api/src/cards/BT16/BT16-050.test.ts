import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-050.js";
import "../index.js";

describe("BT16-050", () => {
  it("gives your other D-Brigade or DigiPolice Digimon 1000 DP", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "permanent",
          target: { filter: { controller: "mine", excludeSelf: true }, count: "all" },
        },
      ],
    });
  });

  it("retains the same DP effect as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    });
  });

  it("boosts only other D-Brigade or DigiPolice Digimon live", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT16-050", as: "command", dp: 1000 },
          { card: "BT3-059", as: "eligible", dp: 3000 },
          { card: "BT1-009", as: "other", dp: 3000 },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("command").currentDP).toBe(1000);
    expect(s.perm("eligible").currentDP).toBe(4000);
    expect(s.perm("other").currentDP).toBe(3000);
  });
});
