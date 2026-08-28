import { CardColor, CardKind, type CardDefinition, type DigiXrosRequirement } from "@aegis/shared";
import { eligibleDigiXrosCandidateIds } from "./digiXrosMaterialSelection";
import { describe, expect, it } from "vitest";

function card(cardId: string, nameEn: string, options: Partial<CardDefinition> = {}): CardDefinition {
  return {
    cardId,
    set: "TEST",
    nameEn,
    kinds: [CardKind.Digimon],
    colors: [CardColor.Black],
    playCost: 4,
    dp: 4000,
    evoCosts: [],
    maxCountInDeck: 4,
    ...options,
  };
}

describe("eligibleDigiXrosCandidateIds", () => {
  it("removes cards that cannot satisfy any recipe slot", () => {
    const requirement: DigiXrosRequirement = {
      count: 1,
      materials: [{ names: ["SkullKnightmon"] }, { names: ["DeadlyAxemon"] }],
    };
    const candidates = [card("BT7-058", "SkullKnightmon"), card("BT7-059", "DeadlyAxemon"), card("BT1-001", "Yokomon")];

    expect(
      eligibleDigiXrosCandidateIds(
        requirement,
        candidates.map((definition) => ({ instanceId: definition.cardId, definition })),
        [],
      ),
    ).toEqual(new Set(["BT7-058", "BT7-059"]));
  });

  it("recalculates distinct slots after a material is picked", () => {
    const requirement: DigiXrosRequirement = {
      count: 2,
      materials: [{ names: ["MetalGreymon"], colors: ["Blue"] }, { names: ["DarkKnightmon"] }],
    };
    const metal = card("EX4-020", "MetalGreymon", { colors: [CardColor.Blue] });
    const darkKnight = card("BT10-066", "DarkKnightmon");
    const otherMetal = card("BT8-070", "MetalGreymon", { colors: [CardColor.Blue] });

    const candidates = [metal, darkKnight, otherMetal].map((definition) => ({
      instanceId: definition.cardId,
      definition,
    }));
    expect(eligibleDigiXrosCandidateIds(requirement, candidates, [metal.cardId])).toEqual(
      new Set([metal.cardId, darkKnight.cardId]),
    );
  });

  it("enforces different card numbers for repeated trait materials", () => {
    const requirement: DigiXrosRequirement = {
      count: "∞",
      materials: [{ traits: ["Xros Heart"], differentCardNumbers: true }],
    };
    const picked = card("BT10-008", "Shoutmon", { types: ["Xros Heart"] });
    const duplicate = card("BT10-008", "Shoutmon", { types: ["Xros Heart"] });
    const distinct = card("BT10-009", "Shoutmon X4", { types: ["Xros Heart"] });

    const candidates = [picked, duplicate, distinct].map((definition, index) => ({
      instanceId: `${definition.cardId}-${index}`,
      definition,
    }));
    expect(eligibleDigiXrosCandidateIds(requirement, candidates, [candidates[0]!.instanceId])).toEqual(
      new Set([candidates[0]!.instanceId, candidates[2]!.instanceId]),
    );
  });

  it("honors the recipe maximum and dynamic DigiXros aliases", () => {
    const requirement: DigiXrosRequirement = {
      count: 2,
      maxMaterials: 1,
      materials: [{ names: ["Shoutmon"] }],
    };
    const aliased = card("BT19-012", "Agumon");
    const extra = card("BT10-008", "Shoutmon");
    const candidates = [
      { instanceId: "alias", definition: aliased, digiXrosNames: ["Shoutmon"] },
      { instanceId: "extra", definition: extra },
    ];

    expect(eligibleDigiXrosCandidateIds(requirement, candidates, [])).toEqual(new Set(["alias", "extra"]));
    expect(eligibleDigiXrosCandidateIds(requirement, candidates, ["alias"])).toEqual(new Set(["alias"]));
  });

  it("supports Dorbickmon's trait substrings, different names, Digimon kind, and five-card cap", () => {
    const requirement: DigiXrosRequirement = {
      count: 2,
      maxMaterials: 5,
      materials: [
        {
          traitContains: ["Dragon", "saur", "Ceratopsian"],
          differentNames: true,
        },
      ],
    };
    const pickedDragon = card("EX3-005", "Vorvomon", { types: ["Rock Dragon"] });
    const duplicateName = card("TEST-002", "Vorvomon", { types: ["Dragonkin"] });
    const dinosaur = card("EX3-006", "Flarerizamon", { types: ["Dinosaur"] });
    const ceratopsian = card("TEST-003", "Triceramon", { types: ["Ceratopsian"] });
    const unrelated = card("TEST-004", "Agumon", { types: ["Reptile"] });
    const option = card("EX3-069", "Trial of the Four Great Dragons", {
      kinds: [CardKind.Option],
      types: ["Four Great Dragons"],
      dp: undefined,
    });
    const candidates = [pickedDragon, duplicateName, dinosaur, ceratopsian, unrelated, option].map(
      (definition, index) => ({ instanceId: `${definition.cardId}-${index}`, definition }),
    );

    expect(eligibleDigiXrosCandidateIds(requirement, candidates, [candidates[0]!.instanceId])).toEqual(
      new Set([candidates[0]!.instanceId, candidates[2]!.instanceId, candidates[3]!.instanceId]),
    );

    const fiveUnique = ["A Dragon", "B Dinosaur", "C Dragonkin", "D Rock Dragon", "E Ceratopsian"].map(
      (trait, index) => {
        const definition = card(`TEST-${10 + index}`, `Dragon ${index}`, { types: [trait] });
        return { instanceId: definition.cardId, definition };
      },
    );
    const sixth = card("TEST-20", "Dragon 6", { types: ["Dragon"] });
    expect(
      eligibleDigiXrosCandidateIds(
        requirement,
        [...fiveUnique, { instanceId: sixth.cardId, definition: sixth }],
        fiveUnique.map(({ instanceId }) => instanceId),
      ),
    ).toEqual(new Set(fiveUnique.map(({ instanceId }) => instanceId)));
  });

  it("allows exactly one mismatched battlefield substitute", () => {
    const requirement: DigiXrosRequirement = {
      count: 1,
      materials: [{ names: ["SkullKnightmon"] }, { names: ["DeadlyAxemon"] }],
    };
    const substitute = card("BT1-001", "Yokomon");
    const candidates = [{ instanceId: "sub", definition: substitute, canSubstitute: true }];

    expect(eligibleDigiXrosCandidateIds(requirement, candidates, [])).toEqual(new Set(["sub"]));
  });
});
