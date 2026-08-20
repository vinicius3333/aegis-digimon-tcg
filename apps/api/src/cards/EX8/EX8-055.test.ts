import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-055.js";

describe("EX8-055", () => {
  it("has Fragment (3) and trashes 3 Mineral/Rock digivolution cards to unsuspend and gain Security Attack +1 when digivolving and attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({ keyword: "Fragment", amount: 3, raw: "＜Fragment (3)＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([{ kind: "Unsuspend", cost: { kind: "trash", target: { count: 3 } } }, { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "forTheTurn" }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({ kind: "Unsuspend", cost: { kind: "trash", target: { count: 3 } } });
  });
  it("places 1 to 3 Mineral/Rock cards from trash underneath itself at end of turn", () => expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({ kind: "PlaceUnder", target: { count: 1 } }));
});
