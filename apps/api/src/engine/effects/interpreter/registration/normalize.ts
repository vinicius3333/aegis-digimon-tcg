import type { CompiledCard, Condition } from "@aegis/shared";

const knownConditions: Readonly<Record<string, Condition>> = {
  "you do": { kind: "ifThisEffectActed" },
  "an opponent's Digimon isn't deleted by this effect": { kind: "ifThisEffectDidNotDelete" },
  "no Digimon was deleted by this effect": { kind: "ifThisEffectDidNotDelete" },
  "this Digimon would digivolve with this effect": { kind: "ifThisEffectDigivolved" },
  "this Digimon has 2 or more colors": { kind: "selfColorCount", op: "gte", value: 2 },
  "this Digimon has 10000 or more DP": { kind: "selfDpAtLeast", value: 10000 },
  "there're 6 or fewer total cards in both players' security stacks": {
    kind: "totalSecurityCount",
    op: "lte",
    value: 6,
  },
  "this effect placed": { kind: "ifThisEffectActed" },
  "it did": { kind: "ifThisEffectActed" },
  "this Digimon has a blue card in its digivolution cards": {
    kind: "selfDigivolutionStackHasColor",
    filter: { colors: ["Blue"] },
  },
  "there is a green card": {
    kind: "selfDigivolutionStackHasColor",
    filter: { colors: ["Green"] },
  },
  "this Digimon has ＜Save＞ in its text": {
    kind: "selfTopHasText",
    filter: { nameOrTrait: [{ tokens: ["Save"], match: "text" }] },
  },
  "this Digimon has [Growlmon] or [Gallantmon] in its name": {
    kind: "selfHasNameContaining",
    names: ["Growlmon", "Gallantmon"],
  },
  "this Digimon has [Greymon] or [Omnimon] in its name": {
    kind: "selfHasNameContaining",
    names: ["Greymon", "Omnimon"],
  },
  "this Digimon has [Omnimon] in its name": {
    kind: "selfHasNameContaining",
    names: ["Omnimon"],
  },
  "this Digimon has a [Hybrid] or [Ten Warriors] trait": {
    kind: "selfHasTrait",
    filter: { nameOrTrait: [{ tokens: ["Hybrid", "Ten Warriors"], match: "trait" }] },
  },
  "this Digimon has [Machine] or [Dragonkin] in its traits": {
    kind: "selfHasTrait",
    filter: { nameOrTrait: [{ tokens: ["Machine", "Dragonkin"], match: "trait" }] },
  },
  "this Digimon has [Imperialdramon] in its name or a [Free] trait": {
    kind: "anyOf",
    conditions: [
      { kind: "selfHasNameContaining", names: ["Imperialdramon"] },
      { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Free"], match: "trait" }] } },
    ],
  },
  "this Digimon has [Imperialdramon] in its name or [Free] in its traits": {
    kind: "anyOf",
    conditions: [
      { kind: "selfHasNameContaining", names: ["Imperialdramon"] },
      { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Free"], match: "trait" }] } },
    ],
  },
  "it has the [Angel]/[Archangel]/[Three Great Angels] trait": {
    kind: "triggerSubjectMatchesFilter",
    filter: {
      nameOrTrait: [{ tokens: ["Angel", "Archangel", "Three Great Angels"], match: "trait" }],
    },
  },
  "[Lilithmon]/[X Antibody] in its digivolution cards": {
    kind: "selfDigivolutionStackMatchesFilter",
    filter: {
      nameOrTrait: [
        { tokens: ["Lilithmon"], match: "name" },
        { tokens: ["X Antibody"], match: "trait" },
      ],
    },
  },
};

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value === null || typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  if (record.kind === "raw" && typeof record.raw === "string") {
    const known = knownConditions[record.raw];
    if (known !== undefined) return { ...known, raw: record.raw };
  }

  return Object.fromEntries(Object.entries(record).map(([key, entry]) => [key, normalizeValue(entry)]));
}

/** Convert parser-recognized legacy predicates before a card enters the runtime registry. */
export function normalizeCompiledCard(compiled: CompiledCard): CompiledCard {
  return normalizeValue(compiled) as CompiledCard;
}
