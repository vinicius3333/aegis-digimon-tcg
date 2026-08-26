import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-024.js";

describe("EX6-024 Sagomon", () => {
  it("shares DigiXros Security Attack reduction and suspends an opposing Digimon or Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "GainKeyword",
        optional: true,
        target: { filter: { controller: "any" } },
        keyword: { keyword: "SecurityAttack", amount: -1 },
      },
      { kind: "Restrict", restriction: "suspend", condition: { kind: "digiXrosCount", minimum: 1 } },
    ]);
  });
  it("permits exactly one listed DigiXros material", () =>
    expect(compiled.digiXrosRequirement).toMatchObject([{ count: 2, maxMaterials: 1 }]));
  it("inherits Security Attack -1 and returns a yellow source from its own stack on leave", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "SecurityAttack", amount: -1 },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({
      kind: "Replacement",
      actions: [
        {
          kind: "Return",
          to: "hand",
          target: { filter: { zone: "digivolutionCards", colors: ["Yellow"], hostFilter: { isSelfRef: true } } },
        },
      ],
    });
  });
});
