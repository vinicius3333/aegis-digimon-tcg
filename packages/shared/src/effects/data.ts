import type { CompiledCard, CompiledEffects } from "./ir/card.js";
import type { AssemblyRequirement, DnaDigivolveRequirement } from "./ir/requirements/fusion.js";
import type { BaseGrantedDigivolve, DigivolutionRequirement } from "./ir/requirements/digivolve.js";
import type { DigiXrosRequirement } from "./ir/requirements/xrosLink.js";
import effectsJson from "./effects.json" with { type: "json" };
import generatedDigivolveOverridesJson from "./generated-digivolve-overrides.json" with { type: "json" };

/** Runtime effect records keyed by card id. Card modules remain authoritative. */
export const compiledEffects: CompiledEffects = effectsJson as unknown as CompiledEffects;

/** BT26 is hand-authored while generated effect records are absent. */
export const ASSEMBLY_REQUIREMENT_OVERRIDES: Record<string, AssemblyRequirement[]> = {
  "BT26-014": [{ reduceCost: 2, materials: [{ traits: ["TB"], levelMax: 4, count: 1 }] }],
  "BT26-017": [{ reduceCost: 4, materials: [{ traits: ["Shambala"], levelMax: 5, count: 2, differentLevels: true }] }],
  "BT26-028": [{ reduceCost: 2, materials: [{ traits: ["Life", "System", "Seven Code"], level: 3, count: 1 }] }],
  "BT26-037": [{ reduceCost: 2, materials: [{ traits: ["Navi", "System", "Seven Code"], level: 3, count: 1 }] }],
  "BT26-047": [{ reduceCost: 6, materials: [{ traits: ["Larva", "Insectoid", "Titan"], count: 4, differentLevels: true }] }],
  "BT26-073": [{ reduceCost: 2, materials: [{ nameOrTrait: [{ tokens: ["Chronomon"], match: "text" }, { tokens: ["TS"], match: "trait" }], levelMax: 4, count: 1 }] }],
  "BT26-079": [{ reduceCost: 2, materials: [{ names: ["Plutomon"], count: 1 }] }],
  "BT26-081": [{ reduceCost: 5, materials: [{ names: ["Minervamon"], count: 1 }] }],
  "BT26-083": [{ reduceCost: 4, materials: [{ names: ["Junomon"], count: 1 }] }],
  "BT26-085": [{ reduceCost: 5, materials: [{ nameOrTrait: [{ tokens: ["Chronomon"], match: "text" }, { tokens: ["Shaman"], match: "trait" }], count: 5, differentLevels: true }] }],
  "BT26-086": [{ reduceCost: 7, materials: [{ traits: ["Seven Code"], count: 7, differentNames: true }] }],
};

/** Look up the compiled IR record for a card id, or undefined when absent. */
export function getCompiledCard(cardId: string): CompiledCard | undefined {
  return compiledEffects[cardId];
}

/**
 * Hand-authored DNA requirements missing from the historical aggregate. BT8-015's card-data
 * text starts at [When Digivolving] and omits its printed DNA header, while its audited runtime
 * module correctly carries the red Lv.4 + yellow Lv.4 recipe. BT17-078 states its recipe inside
 * the ＜Blast DNA Digivolve＞ keyword rather than a DNA header, so the compiler saw none at all.
 * This shared override keeps server cost validation/payment and client material highlighting on
 * one source of truth.
 */
export const DNA_DIGIVOLUTION_REQUIREMENT_OVERRIDES: Record<string, DnaDigivolveRequirement[]> = {
  "BT17-078": [
    {
      cost: 0,
      materials: [{ names: ["WarGreymon"] }, { names: ["MetalGarurumon"] }],
    },
  ],
  "BT8-015": [
    {
      cost: 0,
      materials: [
        { color: "Red", level: 4 },
        { color: "Yellow", level: 4 },
      ],
    },
  ],
};

export function dnaDigivolutionRequirementsFor(cardId: string): DnaDigivolveRequirement[] {
  return DNA_DIGIVOLUTION_REQUIREMENT_OVERRIDES[cardId] ?? compiledEffects[cardId]?.dnaDigivolveRequirement ?? [];
}

/**
 * Hand-authored alternate-digivolution-requirement overrides, keyed by the EVOLVING card id.
 * When present, the list REPLACES the requirement the generator compiled into effects.json:
 * the compiler can't express the Tamer-base gate (`baseIsTamer`) or the non-memory
 * `placementCost` some alternate paths need, and its gateless `{cost, isAlternate}` would
 * over-match every base. Kept in @aegis/shared so the SERVER (digivolve legality + cost) and
 * the CLIENT (digivolve-target highlighting + cost labels) read ONE source of truth.
 */
export const ALTERNATE_DIGIVOLUTION_OVERRIDES: Record<string, DigivolutionRequirement[]> = {
  "BT11-022": [{ cost: 0, isAlternate: true, namesExact: ["Bebydomon"] }],
  "BT11-031": [{ cost: 2, isAlternate: true, namesExact: ["MetalGreymon"] }],
  "BT11-034": [{ cost: 0, isAlternate: true, level: 2, traits: ["Xros Heart"] }],
  "BT11-041": [{ cost: 3, isAlternate: true, level: 4, names: ["Sukamon"] }],
  "BT11-043": [{ cost: 3, isAlternate: true, level: 4, names: ["Sukamon"] }],
  // BT7 beast Hybrids: the historical serialized IR retained only `baseIsTamer` and dropped
  // the printed Tamer color. Keep the current client/server legality source exact while the
  // compiler fix above ensures regenerated artifacts include `baseColors` going forward.
  "BT7-011": [{ cost: 2, isAlternate: true, baseIsTamer: true, baseColors: ["Red"] }],
  "BT7-022": [{ cost: 2, isAlternate: true, baseIsTamer: true, baseColors: ["Blue"] }],
  "BT7-036": [{ cost: 2, isAlternate: true, baseIsTamer: true, baseColors: ["Yellow"] }],
  "BT7-047": [{ cost: 2, isAlternate: true, baseIsTamer: true, baseColors: ["Green"] }],
  "BT7-073": [{ cost: 2, isAlternate: true, baseIsTamer: true, baseColors: ["Purple"] }],
  // BT7-112 (Susanoomon): digivolve from hand onto one of your Tamers (treated as a level 6
  // Digimon, cost 7) by placing 10 Tamer and/or [Hybrid]-trait cards from hand+trash at the
  // bottom of the deck. Replaces the gateless generated `{cost:7, isAlternate:true}`.
  "BT7-112": [
    {
      cost: 7,
      isAlternate: true,
      baseIsTamer: true,
      placementCost: { count: 10, from: ["hand", "trash"], kinds: ["Tamer"], traits: ["Hybrid"] },
    },
  ],
  // BT18-102 (Susanoomon): "[Digivolve] Takuya Kanbara / Koji Minamoto: Cost 6 (if this Digimon
  // has 10 or more [Hybrid]-trait cards in its digivolution stack)". The effects.json entry has the
  // `names` gate but lacks `requiredDigivolutionCardCount` and `incompatibleWithBlastDigivolve`
  // (KB Q3055/Q3056). Override here so the server's digivolve-legality validator enforces the
  // 10-[Hybrid] stack count gate and excludes this path from Blast Digivolve candidates.
  "BT18-102": [
    {
      cost: 6,
      isAlternate: true,
      names: ["Takuya Kanbara", "Koji Minamoto"],
      requiredDigivolutionCardCount: { trait: "Hybrid", min: 10 },
      incompatibleWithBlastDigivolve: true,
    },
  ],
  // `TopCard.EqualsCardName("Takuya Kanbara")` plus >=2 [Hybrid] digivolution cards. The generated
  // IR already captured the name gate; this override preserves that gate and adds only the dropped
  // Tamer-base and stack-count gates. Name aliases such as AD1-020's "also treated as
  // [Takuya Kanbara]" are handled by the engine's effective-name matcher.
  "AD1-002": [
    {
      cost: 3,
      isAlternate: true,
      baseIsTamer: true,
      names: ["Takuya Kanbara"],
      minTraitStackCount: 2,
      minTraitStackTraits: ["Hybrid"],
    },
  ],
  // BT16-020 (GaoGamon): [Digivolve] Lv.3 w/[Night Claw]/[Light Fang] trait: Cost 2
  // (documented behavior — PermanentCondition: TopCard.Level == 3 && HasLightFangNightClawTraits).
  // The generator emitted no digivolutionRequirement for this card; this is purely additive.
  "BT16-020": [
    {
      cost: 2,
      isAlternate: true,
      level: 3,
      traits: ["Night Claw", "Light Fang"],
    },
  ],
  // BT19-101 (ZeedMillenniummon): "[Digivolve]MoonMillenniummon: Cost 2". The printed name is
  // NOT bracketed, so the text parser cannot extract the name gate and emits a gateless entry
  // that would match any base of any level. Gate it on the base name explicitly.
  "BT19-101": [
    {
      cost: 2,
      isAlternate: true,
      names: ["MoonMillenniummon"],
    },
  ],
  // BT21-063/066/072 (Gumdramon line): "[Digivolve] Lv.N w/＜Save＞ in text or w/[Hero] trait: Cost C".
  // The ＜Save＞ keyword's full-width angle brackets and the "in text" phrasing defeat the text
  // parser, so it emits a gateless entry. The "or" is a DISJUNCTION (＜Save＞-in-text OR [Hero]
  // trait), but a single requirement's gates are conjunctive — so emit one entry per branch,
  // both gated on the printed level.
  // EX10-015 (Psychemon): "[Digivolve] Lv.2 w/＜Save＞ in text: Cost 0" (documented behavior:
  // TopCard.IsLevel2 && TopCard.HasSaveText; digivolutionCost:0; ignoreDigivolutionRequirement:false).
  "EX10-015": [{ cost: 0, isAlternate: true, level: 2, texts: ["＜Save＞"] }],

  "BT21-063": [
    { cost: 0, isAlternate: true, level: 2, texts: ["＜Save＞"] },
    { cost: 0, isAlternate: true, level: 2, traits: ["Hero"] },
  ],
  "BT21-066": [
    { cost: 2, isAlternate: true, level: 3, texts: ["＜Save＞"] },
    { cost: 2, isAlternate: true, level: 3, traits: ["Hero"] },
  ],
  "BT21-072": [
    { cost: 3, isAlternate: true, level: 4, texts: ["＜Save＞"] },
    { cost: 3, isAlternate: true, level: 4, traits: ["Hero"] },
  ],
  // parser captured, PLUS an unnamed "from one of your <color> Tamers" path it DROPPED (no bracket
  // name to parse, and the compiler can't emit the baseIsTamer/baseColors gate). Every entry below
  // EqualsCardName, exact). Entries are ordered ascending by cost: the legality lookup returns the
  // FIRST matching entry, so the cheapest legal path wins when a base satisfies more than one.
  //
  // BT21-013 (Agunimon, documented behavior): from a red Tamer (cost 2) or BurningGreymon (cost 0).
  "BT21-013": [
    { cost: 0, isAlternate: true, namesExact: ["BurningGreymon"] },
    { cost: 2, isAlternate: true, baseIsTamer: true, baseColors: ["Red"] },
  ],
  // BT21-014 (BurningGreymon, documented behavior): from a red Tamer (cost 3) or Agunimon (cost 1).
  "BT21-014": [
    { cost: 1, isAlternate: true, namesExact: ["Agunimon"] },
    { cost: 3, isAlternate: true, baseIsTamer: true, baseColors: ["Red"] },
  ],
  // BT18 Frontier line (documented behavior): the dropped path is "from one of your <colors> Tamers".
  "BT18-011": [
    { cost: 0, isAlternate: true, namesExact: ["BurningGreymon"] },
    { cost: 2, isAlternate: true, namesExact: ["Takuya Kanbara"] },
    { cost: 3, isAlternate: true, baseIsTamer: true, baseColors: ["Red", "Purple"] },
  ],
  "BT18-012": [
    { cost: 0, isAlternate: true, namesExact: ["Gigasmon"] },
    { cost: 2, isAlternate: true, baseIsTamer: true, baseColors: ["Red"] },
  ],
  "BT18-014": [
    { cost: 1, isAlternate: true, namesExact: ["Grumblemon"] },
    { cost: 3, isAlternate: true, baseIsTamer: true, baseColors: ["Red"] },
  ],
  "BT18-022": [
    { cost: 0, isAlternate: true, namesExact: ["Korikakumon"] },
    { cost: 2, isAlternate: true, namesExact: ["Tommy Himi"] },
    { cost: 3, isAlternate: true, baseIsTamer: true, baseColors: ["Blue", "Red"] },
  ],
  "BT18-023": [
    { cost: 0, isAlternate: true, namesExact: ["Calmaramon"] },
    { cost: 2, isAlternate: true, baseIsTamer: true, baseColors: ["Blue"] },
  ],
  "BT18-024": [
    { cost: 1, isAlternate: true, namesExact: ["Lanamon"] },
    { cost: 3, isAlternate: true, baseIsTamer: true, baseColors: ["Blue"] },
  ],
  "BT18-025": [
    { cost: 1, isAlternate: true, namesExact: ["Kumamon"] },
    { cost: 3, isAlternate: true, namesExact: ["Tommy Himi"] },
    { cost: 4, isAlternate: true, baseIsTamer: true, baseColors: ["Blue", "Red"] },
  ],
  "BT18-037": [
    { cost: 0, isAlternate: true, namesExact: ["KendoGarurumon"] },
    { cost: 2, isAlternate: true, namesExact: ["Koji Minamoto"] },
    { cost: 3, isAlternate: true, baseIsTamer: true, baseColors: ["Yellow", "Blue"] },
  ],
  "BT18-047": [
    { cost: 0, isAlternate: true, namesExact: ["Petaldramon"] },
    { cost: 2, isAlternate: true, baseIsTamer: true, baseColors: ["Green"] },
  ],
  "BT18-048": [
    { cost: 0, isAlternate: true, namesExact: ["Zephyrmon"] },
    { cost: 2, isAlternate: true, namesExact: ["Zoe Orimoto"] },
    { cost: 3, isAlternate: true, baseIsTamer: true, baseColors: ["Green", "Red"] },
  ],
  "BT18-049": [
    { cost: 1, isAlternate: true, namesExact: ["Kazemon"] },
    { cost: 3, isAlternate: true, namesExact: ["Zoe Orimoto"] },
    { cost: 4, isAlternate: true, baseIsTamer: true, baseColors: ["Green", "Red"] },
  ],
  "BT18-050": [
    { cost: 1, isAlternate: true, namesExact: ["Arbormon"] },
    { cost: 3, isAlternate: true, baseIsTamer: true, baseColors: ["Green"] },
  ],
  "BT18-063": [
    { cost: 0, isAlternate: true, namesExact: ["MetalKabuterimon"] },
    { cost: 2, isAlternate: true, namesExact: ["J.P. Shibayama"] },
    { cost: 3, isAlternate: true, baseIsTamer: true, baseColors: ["Black", "Yellow"] },
  ],
  "BT18-064": [
    { cost: 0, isAlternate: true, namesExact: ["Sephirothmon"] },
    { cost: 2, isAlternate: true, baseIsTamer: true, baseColors: ["Black"] },
  ],
  "BT18-066": [
    { cost: 1, isAlternate: true, namesExact: ["Mercurymon"] },
    { cost: 3, isAlternate: true, baseIsTamer: true, baseColors: ["Black"] },
  ],
  "BT18-067": [
    { cost: 1, isAlternate: true, namesExact: ["Beetlemon"] },
    { cost: 3, isAlternate: true, namesExact: ["J.P. Shibayama"] },
    { cost: 4, isAlternate: true, baseIsTamer: true, baseColors: ["Black", "Yellow"] },
  ],
  "BT18-076": [
    { cost: 0, isAlternate: true, namesExact: ["KaiserLeomon"] },
    { cost: 2, isAlternate: true, namesExact: ["Koichi Kimura"] },
    { cost: 3, isAlternate: true, baseIsTamer: true, baseColors: ["Purple", "Yellow"] },
  ],
  "BT18-077": [
    { cost: 1, isAlternate: true, namesExact: ["Loweemon"] },
    { cost: 3, isAlternate: true, namesExact: ["Koichi Kimura"] },
    { cost: 4, isAlternate: true, baseIsTamer: true, baseColors: ["Purple", "Yellow"] },
  ],
  "BT18-078": [
    { cost: 1, isAlternate: true, namesExact: ["Velgrmon"] },
    { cost: 2, isAlternate: true, namesExact: ["Koichi Kimura"] },
    { cost: 3, isAlternate: true, baseIsTamer: true, baseColors: ["Purple"] },
  ],
  "BT18-079": [
    { cost: 1, isAlternate: true, namesExact: ["Duskmon"] },
    { cost: 3, isAlternate: true, namesExact: ["Koichi Kimura"] },
    { cost: 4, isAlternate: true, baseIsTamer: true, baseColors: ["Purple"] },
  ],
  // BT4-027 (KendoGarurumon): "digivolve this card from your hand onto one of your blue Tamers as
  // if the Tamer is a level 3 Digimon" (KB Q1189-Q1194 confirm the Tamer-onto path). The compiled
  // entry is gateless (`{cost:0, isAlternate:true, baseIsTamer:true}`, matching a Tamer of any
  // color at cost 0); the real cost is the card's printed level-3/blue evo cost (3).
  "BT4-027": [{ cost: 3, isAlternate: true, baseIsTamer: true, baseColors: ["Blue"] }],
  // BT7-046 (Beetlemon): "digivolve this card from your hand onto one of your green Tamers as if
  // the Tamer is a level 3 green Digimon". Same gateless-compile defect as BT4-027; the real cost
  // is the card's printed level-3/green evo cost (2).
  "BT7-046": [{ cost: 2, isAlternate: true, baseIsTamer: true, baseColors: ["Green"] }],
  // Early named hand-evolution effects use exact bracketed names. Their generated `names`
  // entries are substring gates, which admitted forms such as Lucemon: Chaos Mode onto itself.
  // BT2-111 and EX2-022 also carry live-state availability gates omitted by the compiler.
  "BT2-111": [
    {
      cost: 4,
      isAlternate: true,
      namesExact: ["Impmon"],
      controllerTrashCountMin: 10,
      battleAreaOnly: true,
    },
  ],
  "BT5-014": [{ cost: 4, isAlternate: true, namesExact: ["Shoutmon"], battleAreaOnly: true }],
  "BT5-067": [{ cost: 4, isAlternate: true, namesExact: ["Keramon"], battleAreaOnly: true }],
  // BT5-111's named Omnimon shortcut is explicitly limited to the battle area (KB Q1385).
  "BT5-111": [{ cost: 3, isAlternate: true, names: ["Omnimon"], battleAreaOnly: true }],
  "BT7-017": [{ cost: 1, isAlternate: true, namesExact: ["Machinedramon"] }],
  "BT7-111": [{ cost: 7, isAlternate: true, namesExact: ["Lucemon"] }],
  "EX2-022": [
    {
      cost: 3,
      isAlternate: true,
      namesExact: ["Lopmon"],
      controllerControls: { kind: ["Tamer"], namesExact: ["Shu-Chong Wong"], min: 1 },
    },
  ],
  // P-185 (EmperorGreymon, documented behavior): digivolve from your [Takuya Kanbara] Tamer with 5+ [Hybrid]
  // cards under it, cost 4. The compiled entry kept only the name, dropping baseIsTamer and the
  // 5-[Hybrid] stack gate (enforced on the base permanent's digivolution stack at the digivolve site).
  "P-185": [
    {
      cost: 4,
      isAlternate: true,
      baseIsTamer: true,
      namesExact: ["Takuya Kanbara"],
      minTraitStackCount: 5,
      minTraitStackTraits: ["Hybrid"],
    },
  ],
  // BT22-042 (Chaperomon, documented behavior): digivolve from Chaperomon for cost 6, ONLY while you
  // control a Tamer named [Arisa Kinosaki]. The compiled entry wrongly modeled
  // the controller condition as an alternate BASE name (`names:["Arisa Kinosaki","Chaperomon"]`),
  // which would let you digivolve from an Arisa Kinosaki permanent directly and skip the control
  // gate. Correct: base is Chaperomon; the Arisa Kinosaki Tamer is a `controllerControls` gate.
  "BT22-042": [
    {
      cost: 6,
      isAlternate: true,
      namesExact: ["Chaperomon"],
      controllerControls: { kind: ["Tamer"], namesExact: ["Arisa Kinosaki"], min: 1 },
    },
  ],
  // BT23-101 (documented behavior): two alternate paths.
  //   1. from a Lv.3 [CS]-trait Digimon, cost 4 (already gated correctly by level+trait).
  //   2. from [Erika Mishima] for cost 3, ONLY while you control 4+ [Hudie] Tamers.
  // The compiled entry for path 2 conflated the [Hudie] control condition into a base trait gate
  // (`traits:["Hudie"], names:["Erika Mishima"]`); re-model it as a `controllerControls` gate.
  "BT23-101": [
    {
      cost: 3,
      isAlternate: true,
      namesExact: ["Erika Mishima"],
      controllerControls: { kind: ["Tamer"], traits: ["Hudie"], min: 4 },
    },
    { cost: 4, isAlternate: true, level: 3, traits: ["CS"] },
  ],

  // Special-mechanic digivolves: "Digivolve from [ExactCard]" paths (Armor / X-Antibody / Blast)
  // `PermanentCondition: TopCard.CardNames.Contains("<base>")` + a digivolution cost. The English
  // effectText drops these lines and the runtime record flattened them to a gateless entry, so they
  // base must BE that card — substring would wrongly accept relatives ("Veemon" ⊂ "ExVeemon").
  // Armor digivolve (BT8 [Armor Form] line):
  "BT8-012": [{ cost: 2, isAlternate: true, namesExact: ["Veemon"] }],
  "BT8-023": [{ cost: 2, isAlternate: true, namesExact: ["Armadillomon"] }],
  "BT8-026": [{ cost: 2, isAlternate: true, namesExact: ["Hawkmon"] }],
  "BT8-038": [{ cost: 3, isAlternate: true, namesExact: ["Veemon"] }],
  "BT8-039": [{ cost: 3, isAlternate: true, namesExact: ["Terriermon"] }],
  "BT8-048": [{ cost: 2, isAlternate: true, namesExact: ["Hawkmon"] }],
  "BT8-051": [{ cost: 2, isAlternate: true, namesExact: ["Armadillomon"] }],
  "BT8-053": [{ cost: 2, isAlternate: true, namesExact: ["Veemon"] }],
  "BT8-082": [{ cost: 2, isAlternate: true, namesExact: ["Ophanimon"] }],
  // BT9 bracketed "Digivolve: N from [ExactCard]" paths are exact card-name gates.
  // The generated `names` representation uses substring semantics and therefore allowed
  // most X-Antibody forms to digivolve onto themselves. It also absorbed static name aliases
  // into BT9-051/068's base lists, even though their printed paths name only one exact base.
  "BT9-008": [{ cost: 0, isAlternate: true, namesExact: ["Agumon"] }],
  "BT9-009": [{ cost: 0, isAlternate: true, namesExact: ["Guilmon"] }],
  "BT9-011": [{ cost: 0, isAlternate: true, namesExact: ["Growlmon"] }],
  "BT9-012": [{ cost: 0, isAlternate: true, namesExact: ["Greymon"] }],
  "BT9-013": [{ cost: 0, isAlternate: true, namesExact: ["OmniShoutmon"] }],
  "BT9-014": [{ cost: 0, isAlternate: true, namesExact: ["WarGrowlmon"] }],
  "BT9-015": [{ cost: 0, isAlternate: true, namesExact: ["MetalGreymon"] }],
  "BT9-016": [{ cost: 1, isAlternate: true, namesExact: ["WarGreymon"] }],
  "BT9-017": [{ cost: 1, isAlternate: true, namesExact: ["Gallantmon"] }],
  "BT9-020": [{ cost: 0, isAlternate: true, namesExact: ["Gabumon"] }],
  "BT9-023": [{ cost: 2, isAlternate: true, namesExact: ["Gammamon"] }],
  "BT9-024": [{ cost: 0, isAlternate: true, namesExact: ["Garurumon"] }],
  "BT9-028": [{ cost: 0, isAlternate: true, namesExact: ["WereGarurumon"] }],
  "BT9-031": [{ cost: 1, isAlternate: true, namesExact: ["MetalGarurumon"] }],
  "BT9-034": [{ cost: 0, isAlternate: true, namesExact: ["Salamon"] }],
  "BT9-036": [{ cost: 0, isAlternate: true, namesExact: ["Gatomon"] }],
  "BT9-038": [{ cost: 2, isAlternate: true, namesExact: ["Patamon"] }],
  "BT9-040": [{ cost: 0, isAlternate: true, namesExact: ["Angewomon"] }],
  "BT9-041": [{ cost: 1, isAlternate: true, namesExact: ["RizeGreymon"] }],
  "BT9-043": [{ cost: 1, isAlternate: true, namesExact: ["Magnadramon"] }],
  "BT9-044": [{ cost: 4, isAlternate: true, namesExact: ["Magnamon"] }],
  "BT9-046": [{ cost: 0, isAlternate: true, namesExact: ["Kokuwamon"] }],
  "BT9-049": [{ cost: 0, isAlternate: true, namesExact: ["Kuwagamon"] }],
  "BT9-050": [{ cost: 0, isAlternate: true, namesExact: ["Leomon"] }],
  "BT9-051": [{ cost: 0, isAlternate: true, namesExact: ["Panjyamon"] }],
  "BT9-052": [{ cost: 0, isAlternate: true, namesExact: ["Okuwamon"] }],
  "BT9-055": [{ cost: 1, isAlternate: true, namesExact: ["GranKuwagamon"] }],
  "BT9-056": [{ cost: 1, isAlternate: false, namesExact: ["SaberLeomon"] }],
  "BT9-068": [{ cost: 2, isAlternate: true, namesExact: ["BlackWarGreymon"] }],
  "BT9-070": [{ cost: 0, isAlternate: true, namesExact: ["Gazimon"] }],
  "BT9-075": [{ cost: 0, isAlternate: true, namesExact: ["Dorugamon"] }],
  "BT9-078": [{ cost: 1, isAlternate: true, namesExact: ["DoruGreymon"] }],
  "BT9-081": [{ cost: 2, isAlternate: true, namesExact: ["Dorugoramon"] }],
  "BT9-111": [
    {
      cost: 3,
      isAlternate: true,
      namesExact: ["Alphamon"],
      minNameStackCount: 1,
      minNameStackNames: ["Ouryumon"],
    },
  ],
  // BT10 bracketed alternate paths name one exact base. The declarative effect record used the
  // substring `names` gate, which let an X-Antibody/form name evolve onto itself
  // (for example Jesmon (X Antibody) onto Jesmon (X Antibody)). Keep explicit
  // "name contains" cards such as BT10-067 on the substring path.
  "BT10-016": [{ cost: 0, isAlternate: true, namesExact: ["Jesmon"] }],
  "BT10-031": [{ cost: 0, isAlternate: true, namesExact: ["Bibimon"] }],
  "BT10-050": [{ cost: 2, isAlternate: true, namesExact: ["Gammamon"] }],
  "BT10-068": [{ cost: 1, isAlternate: true, namesExact: ["Gankoomon"] }],
  "BT10-078": [{ cost: 2, isAlternate: true, namesExact: ["Gammamon"] }],
  "BT10-086": [{ cost: 3, isAlternate: true, namesExact: ["Omnimon"] }],
  // X-Antibody digivolve (from the same-named non-X base):
  "BT15-021": [{ cost: 0, isAlternate: true, namesExact: ["Gomamon"] }],
  "BT15-032": [{ cost: 2, isAlternate: true, namesExact: ["Plesiomon"] }],
  "BT15-045": [{ cost: 0, isAlternate: true, namesExact: ["Palmon"] }],
  "BT15-048": [{ cost: 0, isAlternate: true, namesExact: ["Togemon"] }],
  "BT15-051": [{ cost: 0, isAlternate: true, namesExact: ["Lillymon"] }],
  "BT15-054": [{ cost: 1, isAlternate: true, namesExact: ["Rosemon"] }],
  "BT15-081": [{ cost: 2, isAlternate: true, namesExact: ["Leviamon"] }],
  "EX5-018": [{ cost: 0, isAlternate: true, namesExact: ["Garurumon"] }],
  "EX5-023": [{ cost: 1, isAlternate: true, namesExact: ["WereGarurumon"] }],
  "EX5-026": [{ cost: 1, isAlternate: true, namesExact: ["MetalGarurumon"] }],
  "EX5-059": [{ cost: 0, isAlternate: true, namesExact: ["Dobermon"] }],
  // Named alternate-form / line-specific digivolves:
  "BT12-034": [{ cost: 0, isAlternate: true, namesExact: ["Koromon"] }],
  "BT15-020": [{ cost: 0, isAlternate: true, namesExact: ["Tsunomon"] }],
  "BT15-056": [{ cost: 0, isAlternate: true, namesExact: ["Kyokyomon"] }],
  "BT20-073": [{ cost: 1, isAlternate: true, namesExact: ["Phantomon"] }],
  "LM-016": [{ cost: 0, isAlternate: true, namesExact: ["Gurimon"] }],
  "P-072": [{ cost: 0, isAlternate: true, namesExact: ["MetalGreymon"] }],
  "P-073": [{ cost: 0, isAlternate: true, namesExact: ["WereGarurumon"] }],
  "P-092": [{ cost: 0, isAlternate: true, namesExact: ["Bebydomon"] }],
  // Blast Digivolve (from either listed material):
  "P-109": [{ cost: 3, isAlternate: true, namesExact: ["Paildramon", "Dinobeemon"] }],
  "P-220": [{ cost: 6, isAlternate: true, namesExact: ["Kimeramon"] }],
  // Burst Digivolve (comprehensive-0040 / §8-3) keeps the base name separate from the
  // Tamer return cost. Combining them in one name list would incorrectly allow a Tamer's
  // name to satisfy the base requirement.
  "BT13-020": [
    {
      cost: 0,
      isAlternate: true,
      names: ["ShineGreymon"],
      burstDigivolve: { returnTamerNamesExact: ["Marcus Damon"] },
    },
  ],
  "BT13-033": [
    {
      cost: 0,
      isAlternate: true,
      names: ["MirageGaogamon"],
      burstDigivolve: { returnTamerNamesExact: ["Thomas H. Norstein"] },
    },
  ],
  "BT13-092": [
    { cost: 0, isAlternate: true, names: ["Ravemon"], burstDigivolve: { returnTamerNamesExact: ["Keenan Crier"] } },
  ],

  // RB1-036 (Proximamon): the Siriusmon alternate path is legal only when the
  // base already has an [Arcturusmon] card in its digivolution stack (printed
  // "w/[Arcturusmon] digivolution card").
  "RB1-036": [
    {
      cost: 3,
      isAlternate: true,
      names: ["Siriusmon"],
      minNameStackCount: 1,
      minNameStackNames: ["Arcturusmon"],
    },
  ],

  // BT26-050 combines an ordinary alternate path with a Burst Digivolve clause, so its
  // complete requirements are kept together here instead of in the committed data below.
  "BT26-050": [
    { level: 6, traits: ["DATA SQUAD"], cost: 5, isAlternate: true },
    { cost: 0, isAlternate: true, names: ["Rosemon"], burstDigivolve: { returnTamerNamesExact: ["Yoshino Fujieda"] } },
  ],
};

/**
 * Committed alternate digivolution requirements for cards whose direct modules do not
 * embed them. Explicit overrides above take precedence on a card ID collision.
 */
const GENERATED_DIGIVOLUTION_OVERRIDES = generatedDigivolveOverridesJson as unknown as Record<
  string,
  DigivolutionRequirement[]
>;

/**
 * The alternate digivolution requirements for a card: the hand-authored override when one
 * exists, else the committed declarative entry, else the compiled card effect.
 * Shared by the server's digivolve legality/cost path and the client's target-highlighting/
 * cost-label projections.
 */
export function digivolutionRequirementsFor(cardId: string): DigivolutionRequirement[] | undefined {
  return (
    ALTERNATE_DIGIVOLUTION_OVERRIDES[cardId] ??
    GENERATED_DIGIVOLUTION_OVERRIDES[cardId] ??
    compiledEffects[cardId]?.digivolutionRequirement
  );
}

/**
 * The "as if level N" level for a card that may digivolve from hand onto one of your <color>
 * Tamers as if the Tamer is a level-N Digimon (Frontier hybrids: BT4-025, BT17-012, ...), or
 * undefined when the card has no such path. Derived from the compiled IR — the mechanic compiles
 * to a `Static` `Digivolve` action carrying `onto` (a Tamer filter) and `asLevel`. Kept in
 * @aegis/shared so the SERVER (digivolve legality/cost) and the CLIENT (target highlighting +
 * cost labels) derive it identically. For such cards the compiled `digivolutionRequirement` is a
 * STALE gateless/`baseIsTamer`-only entry to be ignored in favor of this derived path (plus any
 * SPECIFIC named requirement the card also prints, e.g. `[Takuya Kanbara]: Cost 2`).
 */
export function tamerOntoDigivolveLevel(cardId: string): number | undefined {
  const compiled = compiledEffects[cardId];
  if (!compiled) return undefined;
  for (const effect of compiled.effects ?? []) {
    if (effect.trigger !== "Static") continue;
    for (const action of effect.actions ?? []) {
      const act = action as { kind?: unknown; asLevel?: unknown; onto?: unknown };
      if (act.kind !== "Digivolve" || typeof act.asLevel !== "number") continue;
      const onto = act.onto as { filter?: { kind?: unknown }; kind?: unknown } | undefined;
      const ontoKind = onto?.filter ? onto.filter.kind : onto?.kind;
      if (Array.isArray(ontoKind) && ontoKind.includes("Tamer")) return act.asLevel;
    }
  }
  return undefined;
}

/**
 * Base-GRANTED digivolution paths, keyed by the BASE card id (the Digimon in play that grants the
 * == self` PermanentCondition and a `cardCondition` gating the evolving card; the English text
 * drops the line and the model is keyed by the evolving card, so the data is authored here from the
 * target-highlighting so both agree. See {@link BaseGrantedDigivolve}.
 */
export const BASE_GRANTED_DIGIVOLVE: Record<string, BaseGrantedDigivolve[]> = {
  // ST7-03 Guilmon: while the opponent has a Lv.6+ Digimon, a [Gallantmon] from hand digivolves
  // onto this Guilmon for 4, ignoring requirements (documented behavior — CardNames.Contains("Gallantmon"),
  // Condition: HasMatchConditionOpponentsPermanent(level >= 6)).
  "ST7-03": [
    {
      target: { namesExact: ["Gallantmon"] },
      cost: 4,
      ignoreRequirements: true,
      condition: { kind: "opponentHasDigimonLevelAtLeast", level: 6 },
    },
  ],
  // ST8-04 Veemon: same shape — an [UlforceVeedramon] from hand, cost 4 (documented behavior).
  "ST8-04": [
    {
      target: { namesExact: ["UlforceVeedramon"] },
      cost: 4,
      ignoreRequirements: true,
      condition: { kind: "opponentHasDigimonLevelAtLeast", level: 6 },
    },
  ],
  // BT21-040 Agumon: the ST7-03 shape with a second printed alternative — "while your opponent has
  // a level 6 or higher Digimon OR you have 3 or more [Hero] trait Tamers with different names",
  // a [ShineGreymon] from hand digivolves onto this for 4, ignoring requirements.
  "BT21-040": [
    {
      target: { namesExact: ["ShineGreymon"] },
      cost: 4,
      ignoreRequirements: true,
      condition: {
        kind: "anyOf",
        conditions: [
          { kind: "opponentHasDigimonLevelAtLeast", level: 6 },
          { kind: "distinctNamedTamersWithTrait", trait: "Hero", count: 3 },
        ],
      },
    },
  ],
  // BT6-060 Deputymon: a Digimon card with the [Three Musketeers] trait from hand digivolves onto
  // this for 6, ignoring requirements — no opponent gate (documented behavior — CardTraits.Contains).
  "BT6-060": [
    {
      target: { traits: ["Three Musketeers"] },
      cost: 6,
      ignoreRequirements: true,
    },
  ],
};

/** The base-granted digivolution paths a card in play offers, or undefined when it grants none. */
export function baseGrantedDigivolveFor(cardId: string): BaseGrantedDigivolve[] | undefined {
  return BASE_GRANTED_DIGIVOLVE[cardId];
}

/**
 * Hand-authored DigiXros-requirement overrides, keyed by the played card id. The compiler captures
 * a slot's label verbatim as a single name token ("Blue MetalGreymon"), so a slot that is really
 * "name contains MetalGreymon AND color Blue" cannot be expressed by the generated token alone; the
 * override splits it into `names` + `colors`. Kept in @aegis/shared so the SERVER (DigiXros legality
 * + cost) and CLIENT (material highlighting) read ONE source of truth.
 */
export const DIGIXROS_REQUIREMENT_OVERRIDES: Record<string, DigiXrosRequirement[]> = {
  // EX3-014: up to 5 differently named Digimon whose trait CONTAINS Dragon/saur/Ceratopsian.
  // This includes Dragonkin, Rock Dragon and Dinosaur (Q3377), not only exact trait tokens.
  "EX3-014": [
    {
      materials: [
        {
          traitContains: ["Dragon", "saur", "Ceratopsian"],
          differentNames: true,
        },
      ],
      count: 2,
      maxMaterials: 5,
    },
  ],
  "BT11-018": [
    {
      materials: [{ names: ["OmniShoutmon"] }, { names: ["ZeigGreymon"] }],
      count: 2,
    },
  ],
  "BT11-019": [
    {
      materials: [
        { names: ["OmniShoutmon"] },
        { names: ["ZeigGreymon"] },
        { names: ["Ballistamon"] },
        { names: ["Dorulumon"] },
        { names: ["Starmons"] },
        { names: ["Sparrowmon"] },
      ],
      count: 2,
    },
  ],
  "BT11-030": [
    {
      materials: [{ names: ["MetalGreymon"] }, { names: ["Cyberdramon"] }],
      count: 2,
    },
  ],
  // BT11-009: two distinct printed slots. The compiler kept only Shoutmon and thereby made
  // the two-material conditional On Play branch impossible to reach through a legal DigiXros.
  "BT11-009": [
    {
      materials: [{ names: ["Shoutmon"] }, { names: ["Starmons"] }],
      count: 1,
    },
  ],
  // BT10-111: the printed requirement is any 1 Digimon with [Xros Heart] in its traits.
  // The compiler incorrectly fused the card's (Rule) Shoutmon name alias into the same
  // material slot, narrowing the recipe to Shoutmon AND Xros Heart.
  "BT10-111": [
    {
      materials: [{ traits: ["Xros Heart"] }],
      count: 2,
    },
  ],
  // EX4-021: [DigiXros -2] "Blue MetalGreymon" + "DarkKnightmon" (documented behavior — slot 1 is
  // IsDigimon + name contains "MetalGreymon" + HasCardColor(Blue); slot 2 is name "DarkKnightmon").
  // The compiler flattened slot 1 to the single name token "Blue MetalGreymon"; split it here.
  "EX4-021": [
    {
      materials: [{ names: ["MetalGreymon"], colors: ["Blue"] }, { names: ["DarkKnightmon"] }],
      count: 2,
    },
  ],
};

/**
 * The DigiXros requirement(s) for a played card: the hand-authored override when one exists,
 * otherwise whatever the compiler emitted. Read by the server's DigiXros play subsystem and the
 * client's material-highlighting projection.
 */
export function digiXrosRequirementFor(cardId: string): DigiXrosRequirement[] | undefined {
  return DIGIXROS_REQUIREMENT_OVERRIDES[cardId] ?? compiledEffects[cardId]?.digiXrosRequirement;
}

/**
 * The Assembly requirement(s) for a played card (§7-3): whatever the compiler emitted from the
 * card's "[Assembly -N] <materials>" header. Read by the server's Assembly play subsystem
 * (apps/api/src/engine/actions/assembly.ts) and (eventually) the client's material-highlighting
 * projection. Mirrors `digiXrosRequirementFor`, including hand-authored recipes for BT26.
 */
export function assemblyRequirementFor(cardId: string): AssemblyRequirement[] | undefined {
  return ASSEMBLY_REQUIREMENT_OVERRIDES[cardId] ?? compiledEffects[cardId]?.assemblyRequirement;
}

/**
 * App-Fusion legality: can the battle-area Digimon described by `fusingNames` (its top card
 * name followed by its linked-card names) app fuse INTO the fusion-target card `targetCardId`?
 *
 * produced by `the effect factory.AddAppfuseMethodByName(names, cost)`:
 *   - `digimonCondition`: the permanent's top card matches one required name AND a linked card
 *     matches a DIFFERENT required name.
 *   - `linkedCondition`: a linked card matches one required name AND the top card matches a
 *     different required name.
 * Both reduce to "the top card plus the linked cards collectively cover >= 2 DISTINCT names
 * from the target's `appFusionRequirement.names`, including the top card". Returns the
 * app-fusion cost when legal, or `undefined` when the target has no app-fusion requirement
 * or the fusing Digimon does not satisfy it.
 *
 * one of the matched names); the remaining entries are the linked-card names.
 */
export function appFusionCostFor(
  targetCardId: string,
  fusingNames: { topName: string; linkedNames: string[] },
): number | undefined {
  const compiled = compiledEffects[targetCardId];
  const requirements = compiled?.appFusionRequirement;
  if (requirements === undefined || requirements.length === 0) return undefined;
  for (const requirement of requirements) {
    const required = requirement.names ?? [];
    if (!required.includes(fusingNames.topName)) continue;
    const linkedMatchesOther = fusingNames.linkedNames.some(
      (name) => name !== fusingNames.topName && required.includes(name),
    );
    if (linkedMatchesOther) return requirement.cost ?? 0;
  }
  return undefined;
}
