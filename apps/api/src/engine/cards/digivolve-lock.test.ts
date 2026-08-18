import { describe, it, expect } from "vitest";
import "../../cards/index.js";
import { definitionOf, matchingAlternateDigivolutionRequirement, matchingEvoCost } from "./cardData.js";

describe("alternate-digivolution gate lock (regression: BT21-021 onto Lv.2)", () => {
  it("RB1-036 exposes the Arcturusmon stack-name gate", () => {
    const req = matchingAlternateDigivolutionRequirement("RB1-036", "RB1-010");
    expect(req).toMatchObject({
      cost: 3,
      minNameStackCount: 1,
      minNameStackNames: ["Arcturusmon"],
    });
  });

  it("BT21-021 (OmniShoutmon) does NOT match a Lv.2 non-Shoutmon base", () => {
    // Koromon (BT11-003 etc.) is a Lv.2 with no Shoutmon name / Xros Heart-Hero traits.
    expect(matchingAlternateDigivolutionRequirement("BT21-021", "BT1-001")).toBeUndefined();
    expect(matchingEvoCost("BT21-021", "BT1-001")).toBeUndefined();
  });

  it("BT21-021 matches a Shoutmon base by name (cost 4)", () => {
    const req = matchingAlternateDigivolutionRequirement("BT21-021", "BT21-011"); // Shoutmon Lv.3
    expect(req?.cost).toBe(4);
  });

  it("BT21-021 matches a Lv.4 Xros Heart/Hero base (cost 3)", () => {
    const req = matchingAlternateDigivolutionRequirement("BT21-021", "BT21-016"); // Shoutmon (King Version) Lv.4 — Xros Heart
    expect(req).toBeDefined();
  });

  it("a gateless special-mechanic alternate (BT8-012 Armor) matches NO arbitrary base", () => {
    // BT8-012's only digivolutionRequirement was a gateless runtime record entry; it must not
    // let an Armor digivolve stack onto an unrelated Lv.5 base.
    expect(matchingAlternateDigivolutionRequirement("BT8-012", "BT21-021")).toBeUndefined();
  });
});

describe("alternate-digivolution name gates use effective static names", () => {
  it("AD1-002's names:[Takuya Kanbara] requirement matches AD1-020's name-rule alias", () => {
    const req = matchingAlternateDigivolutionRequirement("AD1-002", "AD1-020");
    expect(req).toBeDefined();
    expect(req?.names).toEqual(["Takuya Kanbara"]);
    expect(req?.cost).toBe(3);
  });

  it("AD1-002 still rejects unrelated Tamers that do not have the Takuya Kanbara effective name", () => {
    expect(matchingAlternateDigivolutionRequirement("AD1-002", "BT1-085")).toBeUndefined(); // Tai Kamiya
  });

  it("BT4-027's Hybrid path matches blue Tamers at cost 3 and rejects non-blue Tamers", () => {
    const blueTamerReq = matchingAlternateDigivolutionRequirement("BT4-027", "AD1-019"); // Matt & T.K.
    expect(blueTamerReq).toMatchObject({
      cost: 3,
      isAlternate: true,
      baseIsTamer: true,
      baseColors: ["Blue"],
    });
    expect(matchingAlternateDigivolutionRequirement("BT4-027", "AD1-021")).toBeUndefined(); // Marcus & Agumon
  });

  it("BT7-046's Hybrid path matches green Tamers at cost 2 and rejects non-green Tamers", () => {
    const greenTamerReq = matchingAlternateDigivolutionRequirement("BT7-046", "AD1-020"); // Tommy/Takuya/Zoe
    expect(greenTamerReq).toMatchObject({
      cost: 2,
      isAlternate: true,
      baseIsTamer: true,
      baseColors: ["Green"],
    });
    expect(matchingAlternateDigivolutionRequirement("BT7-046", "AD1-019")).toBeUndefined(); // Matt & T.K.
  });
});

describe("special-mechanic digivolves (Armor / X-Antibody / Blast) — exact-name gates", () => {
  it("BT8-012 (Flamedramon, Armor) matches base [Veemon] at cost 2", () => {
    const req = matchingAlternateDigivolutionRequirement("BT8-012", "BT11-023"); // Veemon Lv.3
    expect(req?.cost).toBe(2);
  });

  it("BT8-012 does NOT match [ExVeemon] (exact-name gate rejects the substring relative)", () => {
    expect(matchingAlternateDigivolutionRequirement("BT8-012", "BT12-022")).toBeUndefined(); // ExVeemon
  });

  it("EX5-018 (Garurumon X-Antibody) matches [Garurumon] but NOT [WereGarurumon]", () => {
    expect(matchingAlternateDigivolutionRequirement("EX5-018", "BT1-036")).toBeDefined(); // Garurumon
    expect(matchingAlternateDigivolutionRequirement("EX5-018", "BT1-040")).toBeUndefined(); // WereGarurumon
  });

  it.each([
    ["BT10-016", "BT6-016", "BT10-016", 0], // Jesmon X: [Jesmon], not another Jesmon X
    ["BT10-031", "BT6-003", "BT10-031", 0], // Pulsemon: [Bibimon], not Pulsemon
    ["BT10-050", "BT8-008", "BT10-078", 2], // WezenGammamon: [Gammamon], not GulusGammamon
    ["BT10-068", "BT6-067", "BT10-068", 1], // Gankoomon X: [Gankoomon], not another Gankoomon X
    ["BT10-078", "BT8-008", "BT10-050", 2], // GulusGammamon: [Gammamon], not WezenGammamon
    ["BT10-086", "BT5-086", "BT10-086", 3], // Omnimon X: [Omnimon], not another Omnimon X
  ])("%s accepts its exact printed base and rejects a related/form name", (evolving, exactBase, relatedBase, cost) => {
    expect(matchingAlternateDigivolutionRequirement(evolving, exactBase)?.cost).toBe(cost);
    expect(matchingAlternateDigivolutionRequirement(evolving, relatedBase)).toBeUndefined();
  });

  it.each([
    ["BT9-008", "BT1-010", 0], // Agumon X from [Agumon]
    ["BT9-009", "EX2-008", 0], // Guilmon X from [Guilmon]
    ["BT9-011", "EX2-009", 0], // Growlmon X from [Growlmon]
    ["BT9-012", "BT1-015", 0], // Greymon X from [Greymon]
    ["BT9-013", "BT5-014", 0], // OmniShoutmon X from [OmniShoutmon]
    ["BT9-014", "EX2-010", 0], // WarGrowlmon X from [WarGrowlmon]
    ["BT9-015", "BT1-021", 0], // MetalGreymon X from [MetalGreymon]
    ["BT9-016", "BT1-025", 1], // WarGreymon X from [WarGreymon]
    ["BT9-017", "EX2-011", 1], // Gallantmon X from [Gallantmon]
    ["BT9-020", "BT1-029", 0], // Gabumon X from [Gabumon]
    ["BT9-023", "BT8-008", 2], // KausGammamon from [Gammamon]
    ["BT9-024", "BT1-036", 0], // Garurumon X from [Garurumon]
    ["BT9-028", "BT1-040", 0], // WereGarurumon X from [WereGarurumon]
    ["BT9-031", "BT1-044", 1], // MetalGarurumon X from [MetalGarurumon]
    ["BT9-034", "BT2-034", 0], // Salamon X from [Salamon]
    ["BT9-036", "BT2-036", 0], // Gatomon X from [Gatomon]
    ["BT9-038", "BT1-048", 2], // Pegasusmon from [Patamon]
    ["BT9-040", "BT2-037", 0], // Angewomon X from [Angewomon]
    ["BT9-041", "BT2-038", 1], // RizeGreymon X from [RizeGreymon]
    ["BT9-043", "BT2-039", 1], // Magnadramon X from [Magnadramon]
    ["BT9-044", "BT8-038", 4], // Magnamon X from [Magnamon]
    ["BT9-046", "BT1-068", 0], // Kokuwamon X from [Kokuwamon]
    ["BT9-049", "BT1-070", 0], // Kuwagamon X from [Kuwagamon]
    ["BT9-050", "EX2-017", 0], // Leomon X from [Leomon]
    ["BT9-051", "BT6-025", 0], // Panjyamon X from [Panjyamon]
    ["BT9-052", "BT1-077", 0], // Okuwamon X from [Okuwamon]
    ["BT9-055", "BT1-083", 1], // GrandisKuwagamon from [GranKuwagamon]
    ["BT9-056", "BT1-043", 1], // Dinotigermon from [SaberLeomon]
    ["BT9-068", "BT2-112", 2], // Gaiomon from [BlackWarGreymon]
    ["BT9-070", "BT3-077", 0], // Gazimon X from [Gazimon]
    ["BT9-075", "BT7-062", 0], // DexDorugamon from [Dorugamon]
    ["BT9-078", "BT7-064", 1], // DexDoruGreymon from [DoruGreymon]
    ["BT9-081", "BT7-065", 2], // DexDorugoramon from [Dorugoramon]
    ["BT9-111", "BT6-111", 3], // Alphamon: Ouryuken from [Alphamon]
  ])("%s accepts the exact BT9 base and rejects itself as a substring relative", (evolving, exactBase, cost) => {
    expect(matchingAlternateDigivolutionRequirement(evolving, exactBase)).toMatchObject({
      cost,
      namesExact: [definitionOf(exactBase).nameEn],
    });
    expect(matchingAlternateDigivolutionRequirement(evolving, evolving)).toBeUndefined();
  });

  it.each([
    ["BT2-111", "BT2-068", "BT12-073", 4], // Beelzemon from exact [Impmon]
    ["BT5-014", "BT5-009", "BT5-014", 4], // OmniShoutmon from exact [Shoutmon]
    ["BT5-067", "BT5-059", "BT24-052", 4], // Infermon from exact [Keramon]
    ["BT7-017", "EX1-073", undefined, 1], // Chaosdramon from exact [Machinedramon]
    ["BT7-111", "BT4-115", "BT7-111", 7], // Lucemon: Chaos Mode from exact [Lucemon]
    ["EX2-022", "EX2-020", "BT16-067", 3], // Antylamon from exact [Lopmon]
  ])("%s preserves exact pre-BT9 named evolution paths", (evolving, exactBase, relatedBase, cost) => {
    expect(matchingAlternateDigivolutionRequirement(evolving, exactBase)).toMatchObject({
      cost,
      namesExact: [definitionOf(exactBase).nameEn],
    });
    if (relatedBase !== undefined) {
      expect(matchingAlternateDigivolutionRequirement(evolving, relatedBase)).toBeUndefined();
    }
  });

  it("keeps BT10-067's explicit 'name contains [Justimon]' path as a substring match", () => {
    expect(matchingAlternateDigivolutionRequirement("BT10-067", "EX2-038")?.cost).toBe(1);
  });

  it("P-109 (Blast Digivolve) matches either [Paildramon] or [Dinobeemon] at cost 3", () => {
    expect(matchingAlternateDigivolutionRequirement("P-109", "AD1-011")?.cost).toBe(3); // Paildramon
    expect(matchingAlternateDigivolutionRequirement("P-109", "BT12-055")?.cost).toBe(3); // Dinobeemon
  });

  it("effect-driven 'digivolve INTO [X]' card (ST7-03) exposes NO base requirement", () => {
    // ST7-03's gateless entry is a different mechanic (Gallantmon onto this Guilmon); it must
    // not act as an any-base requirement for digivolving ST7-03 itself.
    expect(matchingAlternateDigivolutionRequirement("ST7-03", "BT11-023")).toBeUndefined();
  });
});

describe("base-play-cost gate (BT26-032 'Play cost 12 [Ceresmon]: Cost 2')", () => {
  // Three cards print the name "Ceresmon"; only the two play-cost-12 reprints qualify as the
  // base for this alternate path — the card's OWN play-cost-5 printing must not.
  it("matches the play-cost-12 [Ceresmon] reprints", () => {
    expect(matchingAlternateDigivolutionRequirement("BT26-032", "BT25-059")?.cost).toBe(2); // Ceresmon, play cost 12
    expect(matchingAlternateDigivolutionRequirement("BT26-032", "BT3-056")?.cost).toBe(2); // Ceresmon, play cost 12
  });

  it("rejects BT26-032's own play-cost-5 printing of the same name", () => {
    expect(matchingAlternateDigivolutionRequirement("BT26-032", "BT26-032")).toBeUndefined();
  });
});
