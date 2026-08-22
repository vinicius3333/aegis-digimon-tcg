import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-001.js";

describe("BT20-001 DemiVeemon", () => {
  it("only grants +2000 DP to this inherited Digimon with 4 or more digivolution cards", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    const action = effect?.actions[0];

    expect(effect?.trigger).toBe("YourTurn");
    expect(action).toMatchObject({
      kind: "ModifyDP",
      amount: 2000,
      duration: "permanent",
      condition: {
        kind: "selfDigivolutionCountAtLeast",
        value: 4,
      },
    });
    expect(action?.target).toMatchObject({ count: 1, isSelf: true });
  });
});
