import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { compiled as blackRapidmon } from "./EX4-036.js";
import { compiled as antylamon } from "./EX4-057.js";

function actions(card: typeof blackRapidmon, trigger: string) {
  return card.effects.filter((effect) => effect.trigger === trigger).flatMap((effect) => effect.actions);
}

describe("EX4-036 BlackRapidmon and EX4-057 Antylamon", () => {
  it("De-Digivolves 1 at End of Attack without trashing further sources", () => {
    const endOfAttack = actions(blackRapidmon, "EndOfAttack");
    expect(endOfAttack).toHaveLength(1);
    expect(endOfAttack[0]).toMatchObject({ kind: "DeDigivolve", amount: 1 });
    expect(getCardDefinition("EX4-036")).toMatchObject({ level: 5, colors: ["Green", "Black"] });
  });

  it("exposes Antylamon's printed Alliance through the native combat keyword", () => {
    expect(antylamon.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [],
      keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
    });
    expect(getCardDefinition("EX4-057")).toMatchObject({ level: 5, colors: ["Purple", "Green"] });
  });
});
