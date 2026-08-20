import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-062.js";

describe("BT16-062", () => {
  it("de-digivolves and deletes an opposing Digimon on play or digivolution", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({ kind: "DeDigivolve", amount: 1, target: { filter: { dp: { op: "lte", relativeToSource: true } } } });
      expect(effect.actions?.[1]).toMatchObject({ kind: "Delete", target: { filter: { playCostLte: 3 } } });
    }
  });

  it("copies effects from Gammamon cards in its stack, including inherited", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "GrantStatic", grant: { copyEffectsFromDigivolution: expect.anything() }, duration: "permanent" }] });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", isInherited: true });
  });
});
