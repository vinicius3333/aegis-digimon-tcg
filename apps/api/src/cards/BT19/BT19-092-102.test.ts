import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-092.js";
import "./BT19-093.js";
import "./BT19-094.js";
import "./BT19-095.js";
import "./BT19-096.js";
import "./BT19-097.js";
import "./BT19-098.js";
import "./BT19-099.js";
import "./BT19-100.js";
import "./BT19-101.js";
import "./BT19-102.js";

describe("BT19-092 through BT19-102 audit contract", () => {
  it("has complete generated coverage for every card in the audited range", () => {
    for (const id of [
      "BT19-092",
      "BT19-093",
      "BT19-094",
      "BT19-095",
      "BT19-096",
      "BT19-097",
      "BT19-098",
      "BT19-099",
      "BT19-100",
      "BT19-101",
      "BT19-102",
    ]) {
      const compiled = runtimeCompiledCard(id);
      expect(compiled?.coverage, id).toBe("full");
      expect(compiled?.residual, id).toEqual([]);
    }
  });

  it("keeps Knight Device's trash trigger active on either player's turn", () => {
    const compiled = runtimeCompiledCard("BT19-095")!;
    const triggers = compiled.effects.filter((effect) => effect.trigger === "whenTrashedFromBattleArea");
    expect(triggers).toHaveLength(1);
    expect(triggers[0]?.turnCondition).toBeUndefined();
    expect(triggers[0]?.actions[0]).toMatchObject({ duration: "untilOpponentTurnEnd" });
    expect(triggers[0]?.actions[1]).toMatchObject({ duration: "untilOpponentTurnEnd" });
  });

  it("restricts Luminamon's deletion play to cards under your Tamers", () => {
    const compiled = runtimeCompiledCard("BT19-102")!;
    const deletion = compiled.effects.find((effect) => effect.trigger === "OnDeletion")!;
    const play = deletion.actions[0] as { from?: string[]; target?: { filter?: Record<string, unknown> } };
    expect(play.from).toEqual(["underTamers"]);
    expect(play.target?.filter).toMatchObject({ zone: "underTamers", playCostLte: 5 });
  });
});
