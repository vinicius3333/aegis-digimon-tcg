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

/** The self-targeting `GainKeyword ＜Delay＞` an armer clause uses as its only payload. */
function isSelfDelayGrant(action: Action): boolean {
  if (action.kind !== "GainKeyword" || action.keyword.keyword !== "Delay") return false;
  const target = action.target as { isSelf?: boolean; filter?: { isSelfRef?: boolean } } | undefined;
  return target?.isSelf === true || target?.filter?.isSelfRef === true;
}

/** A reactive listener (or the clause itself) whose whole body is that ＜Delay＞ grant. */
function isDelayArmingAction(action: Action): boolean {
  if (isSelfDelayGrant(action)) return true;
  if (action.kind !== "SubTrigger" && action.kind !== "Replacement") return false;
  const nested = (action as { actions?: Action[] }).actions;
  return Array.isArray(nested) && nested.length === 1 && isSelfDelayGrant(nested[0]!);
}

function delayArmingActions(effect: CardEffect): Action[] {
  return (effect.actions ?? []).filter(isDelayArmingAction);
}

function hasDelayKeyword(effect: CardEffect): boolean {
  return (effect.keywords ?? []).some((keyword) => keyword.keyword === "Delay");
}

function isDelayArmedPayload(effect: CardEffect): boolean {
  return (
    effect.trigger === "Main" &&
    effect.isSecurity !== true &&
    hasDelayKeyword(effect) &&
    (effect.actions ?? []).some((action) => (action as { requiresDelayArmed?: boolean }).requiresDelayArmed === true)
  );
}

function withoutDelayArmedMarker(actions: Action[]): Action[] {
  return actions.map((action) => {
    if ((action as { requiresDelayArmed?: boolean }).requiresDelayArmed !== true) return action;
    const { requiresDelayArmed: _armed, ...rest } = action as Action & { requiresDelayArmed?: boolean };
    return rest as Action;
  });
}

/**
 * Fold the "grant ＜Delay＞ now, activate it from a later [Main] window" compilation back into
 * the printed triggered window.
 *
 * "[All Turns] When X, ＜Delay＞ ・payload" is ONE clause: the printed event opens the ＜Delay＞
 * window there and then, and the player either pays the activation cost (trashing this card,
 * §16-17-1) at that moment or loses it (EX5-069 KB Q3675/Q4735 — the window resolves
 * simultaneously with the other effects the same play triggers). Several cards compiled it as
 * two clauses instead: an armer that grants a permanent ＜Delay＞ keyword, plus a separate
 * ＜Delay＞-keyworded [Main] clause gated on `requiresDelayArmed`. That shape only ever offers
 * the payload during the controller's OWN later Main phase, so the window the rules open — on
 * the opponent's turn, at the moment of the event — never existed.
 *
 * Rewriting the pair here, at the single registration point, hands the clause to the intrinsic
 * ＜Delay＞ machinery (`withIntrinsicDelayGate`) that the correctly-compiled cards of the same
 * family already use (BT19-099, BT20-100, ST20-14): the printed trigger fires the payload and
 * the engine applies §16-17's trash cost and "not the turn it entered play" guard.
 *
 * Left alone when the shape is anything but exactly one armer and one payload, so the genuinely
 * distinct "another card grants this permanent ＜Delay＞" encoding keeps its grant/consume gate.
 */
function withTriggeredDelayWindows(compiled: CompiledCard): CompiledCard {
  const payloads = compiled.effects.filter(isDelayArmedPayload);
  if (payloads.length !== 1) return compiled;
  const payload = payloads[0]!;
  if (payload.condition !== undefined) return compiled;
  const armers = compiled.effects.filter((effect) => effect !== payload && delayArmingActions(effect).length > 0);
  if (armers.length !== 1) return compiled;
  const armer = armers[0]!;
  if (hasDelayKeyword(armer)) return compiled;
  const body = withoutDelayArmedMarker(payload.actions ?? []);
  if (body.length === 0) return compiled;
  const armingActions = delayArmingActions(armer);
  const reactive = armingActions.every((action) => action.kind === "SubTrigger" || action.kind === "Replacement");
  if (!reactive && armingActions.length !== 1) return compiled;
  // The armer often carries the clause's "if ..." gate on the grant ACTION rather than on the
  // clause (EX6-070's "If you have a Digimon with [Lilithmon] in its name"). The grant is what
  // the fold replaces, so lift that gate onto the clause it belongs to, and leave the card alone
  // when it would have to compete with a gate already there.
  const grantConditions = armingActions.map((action) =>
    action.kind === "SubTrigger" || action.kind === "Replacement"
      ? ((action as { actions?: Action[] }).actions?.[0] as { condition?: CardEffect["condition"] } | undefined)
          ?.condition
      : (action as { condition?: CardEffect["condition"] }).condition,
  );
  const distinctGrantConditions = new Set(
    grantConditions.map((condition) => (condition === undefined ? "<unconditional>" : JSON.stringify(condition))),
  );
  if (distinctGrantConditions.size > 1) return compiled;
  const grantCondition = grantConditions[0];
  if (grantCondition !== undefined && armer.condition !== undefined) return compiled;
  const actions = reactive
    ? (armer.actions ?? []).map((action) =>
        isDelayArmingAction(action) ? ({ ...action, actions: body } as Action) : action,
      )
    : body;
  const rewritten: CardEffect = {
    ...armer,
    ...(grantCondition !== undefined ? { condition: grantCondition } : {}),
    keywords: [...(armer.keywords ?? []), { keyword: "Delay", raw: "＜Delay＞" }],
    actions,
  };
  return {
    ...compiled,
    effects: compiled.effects.flatMap((effect) =>
      effect === payload ? [] : effect === armer ? [rewritten] : [effect],
    ),
  };
}

/** Convert parser-recognized legacy predicates before a card enters the runtime registry. */
export function normalizeCompiledCard(compiled: CompiledCard): CompiledCard {
  return withTriggeredDelayWindows(withSavePlacementDefaults(normalizeValue(compiled) as CompiledCard));
}
