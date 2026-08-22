import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-011.js";

describe("EX6-011 RagnaLoardmon", () => {
  it("has Blast DNA Digivolve, Raid, and Reboot", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]?.keyword).toBe(
      "BlastDNADigivolve",
    );
    expect(
      compiled.effects
        ?.filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords ?? [])
        .map((keyword) => keyword.keyword),
    ).toEqual(expect.arrayContaining(["Raid", "Reboot"]));
  });
  it("trashes security, grants protection, and gates DNA de-digivolve/delete on both triggers", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)?.actions).toMatchObject([
        { kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 },
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true } },
          grant: "immuneToOpponentEffects",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
          amount: 1,
          stopAtLevel: 3,
          condition: { kind: "isDnaDigivolving" },
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          condition: { kind: "isDnaDigivolving" },
        },
      ]);
    }
  });
});
