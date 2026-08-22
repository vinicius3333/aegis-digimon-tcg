import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-025.js";

describe("EX4-025 Turuiemon", () => {
  it("reduces an opposing Digimon by 2000 after an attack when another own Digimon is suspended", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")).toMatchObject({ isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", excludeSelf: true, suspended: true, kind: ["Digimon"] } } }] });
  });

  it("requires another suspended Digimon, excluding the inherited-effect source", () => {
    const effect = compiled.effects?.find((entry) => entry.trigger === "EndOfAttack");
    expect(effect?.actions?.[0]).toMatchObject({
      condition: {
        kind: "youHave",
        filter: { excludeSelf: true, suspended: true, controllerDefault: "mine" },
      },
    });
  });
});
