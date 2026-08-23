import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-159.js";

describe("P-159 Rook Device", () => {
  it("encodes the effect-trash trigger and Main grants with shared target", () => {
    const compiled = runtimeCompiledCard("P-159")!;
    const reaction = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    expect(reaction.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenTrashedByEffect",
      sourceFilter: { isSelfRef: true },
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "Reboot" }, duration: "untilOpponentTurnEnd" },
        {
          kind: "GainKeyword",
          keyword: { keyword: "Blocker" },
          duration: "untilOpponentTurnEnd",
          target: expect.objectContaining({ sameTarget: true }),
        },
        {
          kind: "ModifyDP",
          amount: 2000,
          duration: "untilOpponentTurnEnd",
          target: expect.objectContaining({ sameTarget: true }),
        },
      ],
    });
    const main = compiled.effects.find((effect) => effect.trigger === "Main")!;
    expect(main.actions).toHaveLength(4);
    expect(main.actions[3]).toEqual({ kind: "PlaceInBattleAreaSelf" });
  });

  it("encodes color waiver and Security De-Digivolve 2 with hand return", () => {
    const compiled = runtimeCompiledCard("P-159")!;
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHaveNone" } }],
    });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Security",
          isSecurity: true,
          actions: [expect.objectContaining({ kind: "DeDigivolve", amount: 2 }), { kind: "AddToHandSelf" }],
        }),
      ]),
    );
  });
});
