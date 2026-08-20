import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-010.js";

describe("EX7-010 Deputymon", () => {
  it("trashes an Option from any digivolution stack on digivolving or attacking", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions[0]).toMatchObject({ kind: "Trash", optional: true, target: { filter: { zone: "digivolutionCards", cardType: "Option", anyController: true } } });
  });
  it("grants the Three Musketeers trait and inherits +2000 DP", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited)?.actions[0]).toMatchObject({ kind: "GrantStatic", grant: "trait", tokens: ["Three Musketeers"] });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 2000, duration: "permanent" });
  });
});
