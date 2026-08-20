import { describe, expect, it } from "vitest";
import { CardColor, CardKind, getCardDefinition } from "@aegis/shared";
import { getEffectModule } from "./effects/registry.js";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

// BT23 is the first card-by-card audit slice. The list is derived from every
// stored BT23 recipe, so a card cannot disappear from the audit when a recipe
// changes without changing this test's inventory expectation.
const BT23_CARDS = [
  "P-117", "BT16-017", "BT21-032", "ST17-13", "P-137", "BT13-040", "BT19-023", "EX8-074",
  "BT16-102", "BT9-112", "BT20-021", "BT20-102", "BT17-077", "BT21-102", "BT4-109", "LM-028",
  "LM-034", "P-104", "BT9-109", "ST20-15", "ST21-15", "BT4-104", "BT9-098", "BT23-048",
  "BT23-017", "BT23-040", "BT22-043", "BT23-037", "BT23-051", "BT23-050", "BT23-020", "BT23-101",
  "BT23-027", "BT23-032", "BT10-042", "BT23-085", "BT23-084", "BT22-094", "BT23-090", "BT23-081",
  "BT23-096", "BT23-092", "BT23-091", "BT5-071", "BT21-064", "EX4-006", "EX8-009", "BT21-068",
  "EX3-057", "EX8-012", "BT16-075", "EX5-061", "BT21-072", "BT7-077", "EX5-063", "BT13-111",
  "P-186", "BT4-111", "BT5-106", "BT7-107", "LM-032", "P-040", "P-108", "BT1-090", "BT23-014",
  "EX8-073", "BT17-010", "BT17-013", "EX8-015", "BT17-018", "LM-027", "BT23-067", "BT23-031",
  "P-187", "BT23-102", "BT22-093", "BT22-089", "BT22-099", "BT23-054", "BT13-093", "BT20-083",
  "BT23-058", "BT20-056", "BT19-072", "BT20-017", "BT23-035", "BT20-060", "BT13-112", "BT13-102",
  "BT20-091", "BT21-086", "BT13-110", "BT20-100", "P-206", "EX5-015", "BT14-070", "BT3-077",
  "BT8-071", "EX5-057", "BT16-067", "BT16-068", "EX5-058", "EX5-059", "EX5-060", "BT15-081",
  "EX5-062", "EX5-063", "EX4-074", "BT15-100", "EX5-069", "BT20-008", "BT23-006", "BT6-009",
  "BT23-076", "ST12-12", "BT13-013", "BT20-013", "BT20-084", "BT23-077", "BT6-084", "BT20-014",
  "BT6-015", "BT8-084", "BT10-016", "BT23-013", "BT23-099", "BT23-041", "BT23-059", "BT23-094",
  "BT23-095", "BT23-100", "BT23-018", "BT23-019", "BT23-021", "BT23-022", "BT23-023", "BT23-024",
  "BT23-025", "BT23-026", "BT23-028", "BT23-029", "BT23-030", "BT23-033", "BT23-034", "BT23-036",
  "BT23-038", "BT23-039", "BT23-042", "BT23-043", "BT23-044", "BT23-045", "BT23-046", "BT23-047",
  "BT23-049", "BT23-052", "BT23-053", "BT23-055", "BT23-056", "BT23-057", "BT23-060", "BT23-061",
  "BT23-062", "BT23-063", "BT23-064", "BT23-065", "BT23-066", "BT23-068", "BT23-069", "BT23-070",
  "BT23-071", "BT23-072", "BT23-073", "BT23-074", "BT23-075", "BT23-078", "BT23-079", "BT23-080",
  "BT23-082", "BT23-083", "BT23-086", "BT23-087", "BT23-088", "BT23-089", "BT23-093", "BT23-097",
  "BT23-098",
] as const;

const PLAYABLE = new Set([CardKind.Digimon, CardKind.Tamer, CardKind.Option]);

// An Option needs a Digimon or Tamer of EACH of its colors in play (§4-21-2), so the allies the
// audit seats have to follow the audited card's colors — otherwise every off-red Option is
// refused for its color requirement before its effect is ever reached. One plain level 3 per color.
const ALLY_BY_COLOR: Record<string, string> = {
  [CardColor.Red]: "BT1-009",
  [CardColor.Blue]: "BT1-027",
  [CardColor.Yellow]: "BT1-045",
  [CardColor.Green]: "BT1-064",
  [CardColor.White]: "BT16-082",
  [CardColor.Black]: "BT10-058",
  [CardColor.Purple]: "BT10-071",
};

function alliesFor(definition: { colors: readonly string[] }): string[] {
  const allies = definition.colors.map((color) => ALLY_BY_COLOR[color]).filter((ally) => ally !== undefined);
  return allies.length > 0 ? allies : ["BT1-009"];
}

describe("BT23 card-by-card audit", () => {
  it("has a registered implementation for every catalog card", () => {
    for (const cardId of BT23_CARDS) {
      expect(getCardDefinition(cardId), cardId).toBeDefined();
      expect(getEffectModule(cardId), cardId).toBeDefined();
    }
  });

  for (const cardId of BT23_CARDS) {
    it(`${cardId} resolves its primary hand interaction`, async () => {
      const definition = getCardDefinition(cardId);
      expect(definition, cardId).toBeDefined();
      if (!definition?.kinds.some((kind) => PLAYABLE.has(kind))) return;

      const setup = setupEngine(
        {
          0: {
            hand: [{ card: cardId, as: "audited" }],
            deck: ["BT1-009", "BT1-027", "BT1-009", "BT1-027", "BT1-090"],
            trash: ["BT1-009", "BT1-027", "BT1-090"],
            security: ["BT1-090", "BT1-090", "BT1-090"],
            battleArea: alliesFor(definition).map((card, index) => ({ card, as: index === 0 ? "ally" : `ally${index}`, under: ["BT1-009"] })),
          },
          1: {
            deck: ["BT1-009", "BT1-027", "BT1-090"],
            security: ["BT1-090", "BT1-090", "BT1-090"],
            battleArea: [{ card: "BT1-027", as: "opponent", under: ["BT1-009"] }],
          },
        },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          autoChooseOption: true,
          autoOrderCards: true,
        },
      );
      setup.state.memory = 50;
      const result = setup.engine.applyIntent(0, {
        type: "playCard",
        instanceId: setup.inst("audited").instanceId,
      });
      expect(result.ok, cardId).toBe(true);
      await settle(() => false, 100);
      assertNoLoudGap(setup);
    });
  }
});
