import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT18-078.js";

describe("BT18-078 Duskmon", () => {
  it("targets exactly one opposing Digimon or Tamer until the opponent's turn ends", () => {
    const effect = runtimeCompiledCard("BT18-078")!.effects[0]!;
    expect(effect.actions[0]).toMatchObject({ kind: "GrantStatic", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 }, grant: { color: "otherThanWhite" }, duration: "untilOpponentTurnEnd" });
  });
});
