import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-036.js";

describe("BT14-036", () => {
  it("gives an opposing Digimon -3000 DP on digivolution", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" }));
  it("inherits once-per-turn -2000 DP when attacking", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }] }));
});
