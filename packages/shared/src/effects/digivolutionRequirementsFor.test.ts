import { describe, it, expect } from "vitest";
import cards from "../cards/data/cards.json" with { type: "json" };
import { digivolutionRequirementsFor } from "./data.js";
import { digiXrosRequirementFor, digiXrosTrashNameAllowanceFor } from "./data.js";

// Regression for the corresponding regression coverage finding 1: BT26 is hand-implemented
// and has no effects.json entry, so its printed `[Digivolve] ...: Cost N` alternate paths only
// exist via ALTERNATE_DIGIVOLUTION_OVERRIDES or the generated fallback map. Every BT26 card that
// prints such a header must resolve to a non-empty requirement list.
describe("digivolutionRequirementsFor / BT26 alternate digivolve coverage", () => {
  it("preserves EX11-022's yellow/purple base-color gate", () => {
    expect(digivolutionRequirementsFor("EX11-022")).toEqual([
      { level: 4, traits: ["Puppet"], cost: 3, isAlternate: true, baseColors: ["Yellow", "Purple"] },
    ]);
  });

  it("does not expose EX11-024's ordinary EvoCost as an alternate requirement", () => {
    expect(digivolutionRequirementsFor("EX11-024")).toEqual([]);
  });

  it("preserves EX11-026's unrestricted level 2 alternate route", () => {
    expect(digivolutionRequirementsFor("EX11-026")).toEqual([{ level: 2, cost: 0, isAlternate: true }]);
  });

  it("does not expose EX11-028's ordinary EvoCost as an alternate requirement", () => {
    expect(digivolutionRequirementsFor("EX11-028")).toEqual([]);
  });

  it("keeps only EX11-029's named Maquinamon alternate route", () => {
    expect(digivolutionRequirementsFor("EX11-029")).toEqual([{ names: ["Maquinamon"], cost: 2, isAlternate: true }]);
  });

  it("keeps only EX11-030's Royal Base alternate route", () => {
    expect(digivolutionRequirementsFor("EX11-030")).toEqual([
      { level: 3, traits: ["Royal Base"], cost: 2, isAlternate: true },
    ]);
  });

  it("keeps Shoto Kazama as EX11-074's board gate rather than an evolution base", () => {
    expect(digivolutionRequirementsFor("EX11-074")).toEqual([
      {
        namesExact: ["GrandGalemon"],
        cost: 6,
        isAlternate: true,
        controllerControls: { kind: ["Tamer"], namesExact: ["Shoto Kazama"], min: 1 },
      },
    ]);
  });

  it("keeps BT24-059's Aqua and Sea Animal substring route alongside its TS route", () => {
    expect(digivolutionRequirementsFor("BT24-059")).toEqual([
      { level: 4, traitSubstrings: ["Aqua", "Sea Animal"], cost: 3, isAlternate: true },
      { level: 4, traits: ["TS"], cost: 3, isAlternate: true },
    ]);
  });

  it("keeps BT19-102's named stack gate and two DigiXros material slots", () => {
    expect(digivolutionRequirementsFor("BT19-102")).toEqual([
      { names: ["Luminamon"], cost: 2, isAlternate: true },
      {
        names: ["Nene Amano"],
        cost: 3,
        isAlternate: true,
        minNameStackCount: 1,
        minNameStackNames: ["Shademon"],
      },
    ]);
    expect(digiXrosRequirementFor("BT19-102")).toEqual([
      {
        count: 1,
        materials: [{ names: ["Nene Amano"] }, { names: ["Luminamon", "Shademon"] }],
      },
    ]);
  });

  it("keeps BT19-013's five distinct named DigiXros slots", () => {
    expect(digiXrosRequirementFor("BT19-013")).toEqual([
      {
        count: 2,
        materials: ["Shoutmon", "Ballistamon", "Dorulumon", "Starmons", "Sparrowmon"].map((name) => ({
          names: [name],
        })),
      },
    ]);
  });

  it("keeps BT19-014's five distinct named DigiXros slots", () => {
    expect(digiXrosRequirementFor("BT19-014")).toEqual([
      {
        count: 2,
        materials: ["OmniShoutmon", "ZeigGreymon", "AtlurBallistamon", "JaegerDorulumon", "RaptorSparrowmon"].map(
          (name) => ({ names: [name] }),
        ),
      },
    ]);
  });

  it("keeps BT19-025's Blue Greymon and MailBirdramon DigiXros slots", () => {
    expect(digiXrosRequirementFor("BT19-025")).toEqual([
      {
        count: 2,
        materials: [{ names: ["Greymon"], colors: ["Blue"] }, { names: ["MailBirdramon"] }],
      },
    ]);
  });

  it("keeps BT18-065's four Vemmon recipe and intrinsic trash gate", () => {
    expect(digiXrosRequirementFor("BT18-065")).toEqual([
      { materials: [{ names: ["Vemmon"] }], count: 1, maxMaterials: 4 },
    ]);
    expect(digiXrosTrashNameAllowanceFor("BT18-065")).toEqual(["Vemmon"]);
  });

  it("keeps BT20-058's three distinct named DigiXros -2 slots", () => {
    expect(digiXrosRequirementFor("BT20-058")).toEqual([
      {
        materials: [{ names: ["Raijinmon"] }, { names: ["Fujinmon"] }, { names: ["Suijinmon"] }],
        count: 2,
      },
    ]);
  });
  const bt26WithHeader = (cards as Array<{ cardId: string; set: string; effectText?: string }>).filter(
    (c) => c.set === "BT26" && /\[Digivolve\]/.test(c.effectText ?? ""),
  );

  it("finds the expected number of BT26 cards printing a [Digivolve] header", () => {
    expect(bt26WithHeader.length).toBe(76);
  });

  it.each(bt26WithHeader.map((c) => c.cardId))("%s resolves a non-empty alternate requirement", (cardId) => {
    const reqs = digivolutionRequirementsFor(cardId);
    expect(reqs).toBeDefined();
    expect(reqs!.length).toBeGreaterThan(0);
  });

  it("BT26-032 (Ceresmon) carries the base-play-cost gate, not just a name gate", () => {
    const reqs = digivolutionRequirementsFor("BT26-032");
    expect(reqs).toEqual([{ names: ["Ceresmon"], basePlayCost: 12, cost: 2, isAlternate: true }]);
  });

  it("BT26-050 (Rosemon) keeps its hand-curated Burst Digivolve addition alongside the generated trait alternate", () => {
    const reqs = digivolutionRequirementsFor("BT26-050");
    expect(reqs).toEqual([
      { level: 6, traits: ["DATA SQUAD"], cost: 5, isAlternate: true },
      {
        cost: 0,
        isAlternate: true,
        names: ["Rosemon"],
        burstDigivolve: { returnTamerNamesExact: ["Yoshino Fujieda"] },
      },
    ]);
  });
});
