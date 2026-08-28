import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
describe("ST21-03", () => {
  it("matches the catalog and executable security clause", () => {
    expect(getCardDefinition("ST21-03")?.effectText).toContain("At the end of the battle");
    const effect = runtimeCompiledCard("ST21-03")?.effects.find((x) => x.trigger === "Security");
    expect(effect?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } });
  });
  it("restricts only opponent Digimon without evolution cards after removing two sources", () => {
    const effect = runtimeCompiledCard("ST21-03")?.effects.find((x) => x.trigger === "OnPlay");
    expect(effect?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "TrashDigivolution", amount: 2, fromTop: true }),
        expect.objectContaining({ kind: "Restrict", restriction: "attackOrBlock", duration: "untilOpponentTurnEnd" }),
      ]),
    );
  });
});
