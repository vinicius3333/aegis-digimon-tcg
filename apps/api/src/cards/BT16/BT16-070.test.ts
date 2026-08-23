import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-070.js";
import "../index.js";

describe("BT16-070", () => {
  it("models Armor Purge", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Armor Purge" }] });
  });

  it("deletes a chosen own Digimon and an opposing Digimon with equal-or-lower DP", () => {
    for (const effect of compiled.effects?.slice(1, 3) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "SelectBind",
        optional: true,
        abortOnDecline: true,
        target: { bindAs: "chosenDigimon" },
      });
      expect(effect.actions?.[1]).toMatchObject({ kind: "Delete", target: { fromSelectionRef: "chosenDigimon" } });
      expect(effect.actions?.[2]).toMatchObject({
        kind: "Delete",
        target: { filter: { relativeTo: { attr: "dp", op: "lte", selectionRef: "chosenDigimon" } } },
      });
    }
  });

  it("deletes the chosen own Digimon and a DP-eligible opponent live", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "ally", dp: 3000 },
            { card: "BT16-070", as: "seth", dp: 5000 },
          ],
        },
        // "as much or less DP as it" is measured against the CHOSEN ally (3000), so a
        // DP-eligible opponent has to be at or below that.
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("seth"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("seth"), "Armor Purge")).toBe(true);
  });
});
