import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-025.js";

describe("EX5-025 Dianamon", () => {
  it("has Blocker and once-per-turn shared When Digivolving/When Attacking effects", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([{ keyword: "Blocker" }]);
    const digivolving = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving");
    const attacking = compiled.effects?.find((entry) => entry.trigger === "WhenAttacking");
    expect(digivolving).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0", actions: [{ kind: "TrashDigivolution" }, { kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" }] });
    expect(attacking).toMatchObject({ frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
  });
});
