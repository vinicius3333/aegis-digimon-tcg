import type { Action, CardEffect, CompiledCard, Condition } from "@aegis/shared";

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

/**
 * ＜Save＞ places the card at the BOTTOM of the Tamer's digivolution stack (Comprehensive
 * Rules 4-3), but most ＜Save＞ records compile a positionless `PlaceUnder` and
 * `runPlaceUnder` reads `belowTop: action.position !== "bottom"` — so a positionless
 * record landed the card directly beneath the Tamer, inverting stack order (and with it
 * the inherited effects the stack grants). Default the position here, at the single
 * registration point, rather than asking every ＜Save＞ card module to repeat the field.
 * An explicit `position` on the record always wins.
 */
function defaultSavePlaceUnderToBottom(actions: Action[]): Action[] {
  return actions.map((action) => {
    if (action.kind === "PlaceUnder" && action.position === undefined) {
      return { ...action, position: "bottom" } as Action;
    }
    const nested = (action as { actions?: Action[] }).actions;
    if (Array.isArray(nested)) {
      return { ...action, actions: defaultSavePlaceUnderToBottom(nested) } as Action;
    }
    return action;
  });
}

function withSavePlacementDefaults(compiled: CompiledCard): CompiledCard {
  let changed = false;
  const effects = compiled.effects.map((effect: CardEffect) => {
    const isSave = (effect.keywords ?? []).some((keyword) => keyword.keyword === "Save");
    if (!isSave || effect.actions === undefined) return effect;
    const actions = defaultSavePlaceUnderToBottom(effect.actions);
    if (actions.every((action, index) => action === effect.actions![index])) return effect;
    changed = true;
    return { ...effect, actions };
  });
  return changed ? { ...compiled, effects } : compiled;
}

/** Convert parser-recognized legacy predicates before a card enters the runtime registry. */
export function normalizeCompiledCard(compiled: CompiledCard): CompiledCard {
  return withSavePlacementDefaults(normalizeValue(compiled) as CompiledCard);
}
