import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-009.js";

describe("BT22-009 Effecmon", () => {
  it("plays from Security only at end of battle and deletes 4000-DP-or-less Digimon on entry", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true, timing: "endOfBattle" });
    expect(security?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      target: { filter: { isSelfRef: true }, isSelf: true },
      payCost: false,
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 },
      });
    }
    expect(compiled.effects.find((entry) => entry.trigger === "WhenLinking")).toMatchObject({
      isLinked: true,
      actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 4000 } }, count: 1 } }],
    });
  });

  it("deletes exactly one 4000-DP opponent while leaving a 5000-DP near-boundary target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT22-009", as: "effecmon" }] },
        1: {
          battleArea: [
            { card: "BT22-009", dp: 4000, as: "eligible" },
            { card: "BT22-010", dp: 5000, as: "tooLarge" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("effecmon"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("tooLarge").permanentId,
    ]);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT22-009")).toBe(true);
  });
});
