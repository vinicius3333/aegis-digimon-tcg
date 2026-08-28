import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { compiled as blackRapidmon } from "./EX4-036.js";
import { compiled as antylamon } from "./EX4-057.js";

function actions(card: typeof blackRapidmon, trigger: string): any[] {
  return card.effects.filter((effect: any) => effect.trigger === trigger).flatMap((effect: any) => effect.actions);
}

describe("EX4-036 BlackRapidmon and EX4-057 Antylamon", () => {
  it("keeps BlackRapidmon's level-3 stopping boundary while de-digivolving", () => {
    const endOfAttack = actions(blackRapidmon, "EndOfAttack");
    expect(endOfAttack[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 99,
      stopAtLevel: 3,
      fromTop: true,
    });
    expect(endOfAttack[1]).toMatchObject({ kind: "DeDigivolve", amount: 1 });
    expect(getCardDefinition("EX4-036")).toMatchObject({ level: 5, colors: ["Green", "Black"] });
  });

  it("binds Antylamon's suspended-Digimon DP and Security Attack +1 to the attack", () => {
    const attack = actions(antylamon, "WhenAttacking")[0];
    expect(attack).toMatchObject({
      kind: "AddDPFromSuspendedCost",
      dpSource: { kind: "suspendedTarget" },
      duration: "forThisAttack",
      alsoGainKeywords: [{ keyword: "SecurityAttack", amount: 1 }],
    });
    expect(attack.cost.target.filter).toMatchObject({ zone: "battleArea", excludeSelf: true });
    expect(getCardDefinition("EX4-057")).toMatchObject({ level: 5, colors: ["Purple", "Green"] });
  });
});
