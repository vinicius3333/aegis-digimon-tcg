import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-026.js";

describe("BT22-026 MetalGarurumon", () => {
  it("keeps the Nokia hand digivolution, modal When Digivolving options, and inherited Omnimon unsuspend", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ isFromHand: true });
    expect(main?.actions[0]).toMatchObject({
      kind: "Digivolve",
      target: {
        filter: {
          controller: "mine",
          zone: "battleArea",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Gabumon"], match: "name" }],
        },
        count: 1,
      },
      into: { isSelfRef: true },
      costOverride: 6,
      ignoreRequirements: true,
      condition: { kind: "youHave" },
    });
    const whenDigivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(whenDigivolving?.actions[0]).toMatchObject({
      kind: "Modal",
      choose: 1,
      options: [
        [
          {
            kind: "Digivolve",
            target: {
              filter: { controller: "mine", zone: "battleArea", nameOrTrait: [{ tokens: ["Agumon"], match: "name" }] },
              count: 1,
            },
            into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["WarGreymon"], match: "name" }] },
            from: ["hand"],
            payCost: false,
            ignoreRequirements: true,
            optional: true,
          },
        ],
        [
          {
            kind: "Return",
            to: "hand",
            target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: 1 },
          },
        ],
      ],
    });
    const inherited = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");
    expect(inherited).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, isSelf: true },
          // Structured, not "raw": evaluateCondition treats an unparsed gate as unmet, so a raw
          // kind here would silently never unsuspend.
          condition: { kind: "selfHasNameContaining" },
        },
      ],
    });
  });
});
