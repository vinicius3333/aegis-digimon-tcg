import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-151.js";

describe("P-151 Digimon Liberator", () => {
  it("waives color with a Liberator trait card and reveals/adds then independently plays", () => {
    const compiled = runtimeCompiledCard("P-151")!;
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          condition: {
            kind: "youHave",
            filter: { kind: ["Digimon", "Tamer"], nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] },
          },
        },
      ],
    });
    const main = compiled.effects.find((effect) => effect.trigger === "Main")!;
    expect(main.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [{ count: 1, to: "hand" }],
    });
    expect(main.actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: {
        filter: { controller: "mine", playCostLte: 3, nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] },
      },
    });
  });

  it("keeps the Security effect as an activation of the Main effect", () => {
    expect(runtimeCompiledCard("P-151")!.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] }),
      ]),
    );
  });
});
