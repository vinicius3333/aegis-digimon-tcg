import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-053.js";

describe("BT15-053", () => {
  it("suspends an opposing Digimon and grants one of yours Piercing", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "Suspend" }, { kind: "GainKeyword", keyword: { keyword: "Piercing" } }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "Suspend" }, { kind: "GainKeyword" }],
    });
  });
  it("is immune to opponent Digimon effects while suspended", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", condition: { kind: "selfIsSuspended" } },
      ],
    }));
});
