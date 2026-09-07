/* Projections from the synchronized GameState into the shapes the React board
   renders. Pure reads of @aegis/shared state — no rules, no mutation. The server
   owns legality; these helpers only shape what the viewer sees. */

import {
  getCardDefinition,
  digivolutionRequirementsFor,
  effectiveStaticNames,
  tamerOntoDigivolveSpec,
  baseGrantedDigivolveFor,
  getCompiledCard,
  intrinsicDigivolutionCostReductionFor,
  canAssignDistinctColors,
  parseTriggerKey,
  type BaseGrantedDigivolve,
  type CardInstance,
  type DigivolutionRequirement,
  type DecisionRequest,
  type GameState,
  type Permanent,
  type PlayerState,
  type Seat,
  type ServerEvent,
} from "@aegis/shared";
import { CardKind, Phase } from "@aegis/shared";
import { colorKey, type ColorName } from "../design/theme";
import type { Translate, TranslationKey } from "../i18n";

export type LogKind = "you" | "opp" | "sys";
export interface LogLine {
  text: string;
  kind: LogKind;
  /**
   * The cards this line names, so the play log can turn their names into links
   * (`PlayLog.cs`). The names are already inside `text`; this says which card each
   * one is, rather than making the reader guess from the printed name.
   *
   * Listed in the order the sentence names them: two cards can share a printed name,
   * and order is the only thing that then tells the reader's link apart from the other.
   */
  cardIds?: readonly string[];
}

const LOG_ZONE_KEYS: Record<string, TranslationKey> = {
  deck: "log.zone.deck",
  deckBottom: "log.zone.deckBottom",
  hand: "log.zone.hand",
  battleArea: "log.zone.battleArea",
  play: "log.zone.battleArea",
  breeding: "log.zone.breeding",
  security: "log.zone.security",
  trash: "log.zone.trash",
  eggDeck: "log.zone.eggDeck",
  delay: "log.zone.delay",
  underTamer: "log.zone.underTamer",
  various: "log.zone.various",
  suspended: "log.zone.suspended",
  unsuspended: "log.zone.unsuspended",
};

function logZoneLabel(zone: string, t: Translate): string {
  const key = LOG_ZONE_KEYS[zone];
  return key ? t(key) : zone;
}

export interface ActivatableEntry {
  instanceId: string;
  effectKey: string;
  description: string;
}

/** Events appended after `previous`, resilient to useRoom's rolling 100-event window. */
export function eventsAfter(events: readonly ServerEvent[], previous?: ServerEvent): readonly ServerEvent[] {
  if (previous === undefined) return events;
  return events.slice(events.indexOf(previous) + 1);
}

/** Find one server-valid-looking DNA material assignment for a hand card on the current board. */
export function findDnaMaterialCombination(cardId: string, permanents: readonly Permanent[]): string[] | undefined {
  const requirements = getCompiledCard(cardId)?.dnaDigivolveRequirement;
  if (!requirements) return undefined;
  const digimon = permanents.filter((permanent) => {
    const def = permanent.topCard ? getCardDefinition(permanent.topCard.cardId) : undefined;
    return def?.kinds.includes(CardKind.Digimon) === true;
  });
  for (const requirement of requirements) {
    if (requirement.materials.length < 2) continue;
    const matches = (permanent: Permanent, spec: (typeof requirement.materials)[number]) => {
      const def = permanent.topCard ? getCardDefinition(permanent.topCard.cardId) : undefined;
      if (!def) return false;
      if (spec.level !== undefined && def.level !== spec.level) return false;
      if (spec.color !== undefined && !def.colors.some((color) => color.toLowerCase() === spec.color!.toLowerCase()))
        return false;
      if (spec.names?.length && !spec.names.some((name) => def.nameEn.includes(name))) return false;
      const traits = [...(def.forms ?? []), ...(def.attributes ?? []), ...(def.types ?? [])];
      if (spec.traits?.length && !spec.traits.some((trait) => traits.includes(trait))) return false;
      return true;
    };
    const assign = (slot: number, used: Set<string>, result: string[]): string[] | undefined => {
      if (slot === requirement.materials.length) return result;
      for (const permanent of digimon) {
        if (used.has(permanent.permanentId) || !matches(permanent, requirement.materials[slot]!)) continue;
        const nextUsed = new Set(used).add(permanent.permanentId);
        const found = assign(slot + 1, nextUsed, [...result, permanent.permanentId]);
        if (found) return found;
      }
      return undefined;
    };
    const found = assign(0, new Set(), []);
    if (found) return found;
  }
  return undefined;
}

export type HandCardEvolutionRoute =
  | { kind: "normal" }
  | { kind: "dna"; materialPermanentIds: string[] }
  | { kind: "both"; materialPermanentIds: string[] }
  | undefined;

/**
 * Resolve the legal evolution modes when a hand card is dropped onto one of its possible
 * bases. `normal` is the server's own verdict for this (card, base) pair
 * (`CardInstance.digivolveTargetPermanentIds`); only the DNA route is shape-matched here,
 * because a DNA declaration names its materials and so has no server projection to read.
 */
export function handCardEvolutionRoute(
  cardId: string,
  battleArea: readonly Permanent[],
  normal: boolean,
): HandCardEvolutionRoute {
  const materialPermanentIds = findDnaMaterialCombination(cardId, battleArea);
  if (normal && materialPermanentIds) return { kind: "both", materialPermanentIds };
  if (normal) return { kind: "normal" };
  return materialPermanentIds ? { kind: "dna", materialPermanentIds } : undefined;
}

/**
 * The battle-area permanents a digivolution of `cardId` would build on: the bases the
 * server offered for this hand card (`CardInstance.digivolveTargetPermanentIds`, passed in
 * as `serverBasePermanentIds`) plus the materials a DNA declaration would consume. Dropping
 * the card anywhere else on the field plays it instead — an offer the battle area itself
 * carries — so no other permanent, Tamer or Digimon, is a digivolution target.
 */
export function digivolveBasePermanentIds(
  cardId: string,
  battleArea: readonly Permanent[],
  serverBasePermanentIds: readonly string[],
): string[] {
  const bases = new Set([...serverBasePermanentIds, ...(findDnaMaterialCombination(cardId, battleArea) ?? [])]);
  return battleArea.filter((permanent) => bases.has(permanent.permanentId)).map((permanent) => permanent.permanentId);
}

export function parseActivatable(json: string): ActivatableEntry[] {
  if (!json) return [];
  try {
    return JSON.parse(json) as ActivatableEntry[];
  } catch {
    return [];
  }
}

export interface LinkCardSlot {
  /** Width/height of the box the (sideways) link card mini occupies, post-rotation. */
  width: number;
  height: number;
  /** Position relative to the host card's own top-left corner. */
  left: number;
  top: number;
}

/**
 * Lays out a permanent's `linked` cards plugged in sideways under the host, per
 * Comprehensive Rules 4-8-3: each link card is inserted from the right so its link
 * portion stays visible, and a newly inserted link card must be placed so its own
 * link portion is visible under any cards already there. `hostWidth` is the host
 * card's mini width (matches CardMini's aspect ratio of height = width * 1.4).
 * Anchored toward the host's bottom-right corner (not its vertical middle) so it
 * reads as tucked under the host rather than pinned to its side.
 *
 * The "how much must peek" question is answered from CardMini's own TokenInfo
 * layout (apps/web/src/design/cards.tsx ~L305-320), not guessed: the readable
 * name+DP band is a full-width strip pinned to the card's bottom edge, sized
 * `paddingTop(12) + nameLineHeight(~9.5) + paddingBottom(4)` at width=92 scale,
 * i.e. ~29-30px of a 92*1.4=128.8px-tall mini card — about 23% of the card's
 * long edge. Below that, the strip carrying the card's name/cost/DP is clipped
 * and the link card is unreadable. `peek` below exposes 36%, with margin.
 *
 * The caller must rotate the link card counter-clockwise (not clockwise): a
 * counter-clockwise turn maps the card's original BOTTOM edge (where the
 * name/cost/DP band lives) onto the edge that ends up exposed on the right, so
 * the peeking strip is actually the readable band, not a stray edge of the
 * card's middle artwork.
 */
export function linkCardSlots(count: number, hostWidth: number): LinkCardSlot[] {
  const hostHeight = Math.round(hostWidth * 1.4);
  const linkWidth = Math.round(hostWidth * 0.62);
  const linkHeight = Math.round(linkWidth * 1.4);
  const peek = Math.round(linkHeight * 0.36);
  const stagger = Math.round(linkWidth * 0.42);
  const slots: LinkCardSlot[] = [];
  for (let i = 0; i < count; i += 1) {
    slots.push({
      width: linkHeight,
      height: linkWidth,
      left: hostWidth - (linkHeight - peek),
      top: hostHeight - Math.round(linkWidth * 0.9) + i * stagger,
    });
  }
  return slots;
}

/** This client's seat: the player whose sessionId matches ours; default 0. */
/**
 * Whether the breeding-area Digimon may move to the battle area. Comprehensive
 * Rules §4-16-2: only a Digimon with DP can move, which excludes the Lv.2 Digi-Egg
 * a hatch puts there. Mirrors the server's `validateMoveFromBreeding`.
 */
export function canMoveFromBreeding(breeding: Permanent | undefined): boolean {
  if (breeding === undefined) return false;
  const definition = getCardDefinition(breeding.topCard?.cardId ?? "");
  if (definition === undefined) return false;
  // Printed DP is the client-visible movement criterion. This intentionally
  // includes EX2-007 Mother D-Reaper, a Digi-Egg card with 15000 DP that
  // official Q3276 permits to move without digivolving first.
  return (definition.dp ?? 0) > 0;
}

/**
 * Whether the breeding action (hatch a Digi-Egg, or move the raised Digimon out)
 * can actually be taken right now. Both verbs are gated on the turn player's
 * breeding phase (§4-16 / §4-17), which the server enforces in `gateBreedingPhase`
 * and would otherwise reject as `wrong-phase`.
 *
 * The action bar, the card sheet and the breeding prompt all offer these verbs, so
 * the rule lives here rather than being spelled out at each call site.
 */
export function canUseBreedingAction({
  phase,
  isMyTurn,
  canHatch,
  canMove,
}: {
  phase: Phase;
  isMyTurn: boolean;
  canHatch: boolean;
  canMove: boolean;
}): boolean {
  if (phase !== Phase.Breeding) return false;
  if (!isMyTurn) return false;
  return canHatch || canMove;
}

/**
 * Whether `perm` may declare a normal attack right now, and whether it may declare a
 * ＜Vortex＞ attack right now. Both read the server's own projection rather than
 * re-deriving the rules: turn, phase, summoning sickness (§16-1), the once-per-turn
 * limit (§11-2-3), suspension, `can't attack`/`can't suspend` restrictions and the
 * Blitz window are all already resolved server-side, and a Digimon that has no legal
 * object has no attack to offer either way.
 *
 * ＜Vortex＞ is projected separately because §16-33-1 makes it a same-turn-attack grant
 * in its own right — a Vortex Digimon played this turn can Vortex-attack while it
 * cannot attack normally, so the normal projection cannot stand in for it.
 */
export function canAttackWith(perm: Permanent): boolean {
  return perm.canAttackPlayer || perm.attackablePermanentIds.length > 0;
}

export function canVortexAttackWith(perm: Permanent): boolean {
  return perm.canVortexAttackPlayer || perm.vortexAttackablePermanentIds.length > 0;
}

/** The permanent ids `attacker` may target in the current (normal or ＜Vortex＞) declaration. */
export function attackTargetIdsOf(attacker: Permanent | undefined, vortex: boolean): readonly string[] {
  if (!attacker) return [];
  return vortex ? attacker.vortexAttackablePermanentIds : attacker.attackablePermanentIds;
}

/** Those targets resolved against a battle area, in board order. */
export function attackTargetsOf(
  attacker: Permanent | undefined,
  battleArea: readonly Permanent[],
  vortex: boolean,
): Permanent[] {
  const legal = attackTargetIdsOf(attacker, vortex);
  return battleArea.filter((permanent) => legal.includes(permanent.permanentId));
}

/** Whether `attacker` may hit the opponent's security in the current declaration mode. */
export function canAttackPlayerWith(attacker: Permanent | undefined, vortex: boolean): boolean {
  if (!attacker) return false;
  return vortex ? attacker.canVortexAttackPlayer : attacker.canAttackPlayer;
}

export function viewerSeatOf(state: GameState | undefined, sessionId: string | undefined): Seat {
  if (state && sessionId) {
    for (let seat = 0 as Seat; seat <= 1; seat = (seat + 1) as Seat) {
      if (state.players[seat]?.sessionId === sessionId) return seat;
    }
  }
  return 0;
}

export const otherSeat = (seat: Seat): Seat => (1 - seat) as Seat;

/** Memory from the viewer's perspective: positive favors the viewer. */
export function displayMemory(state: GameState, viewerSeat: Seat): number {
  return state.turnSeat === viewerSeat ? state.memory : -state.memory;
}

/** Both seats are occupied (a real opponent has joined). */
export function bothSeated(state: GameState | undefined): boolean {
  return Boolean(state && state.players[0]?.sessionId && state.players[1]?.sessionId);
}

const cardName = (cardId: string): string => getCardDefinition(cardId)?.nameEn ?? cardId;

/** Map every visible card instance to its card id (board, breeding, trash, your hand). */
export function buildInstanceIndex(state: GameState, viewerSeat: Seat): Map<string, string> {
  const index = new Map<string, string>();
  const add = (ci: CardInstance | undefined) => {
    if (ci && ci.instanceId && ci.cardId) index.set(ci.instanceId, ci.cardId);
  };
  const addPermanent = (perm: Permanent | undefined) => {
    if (!perm) return;
    add(perm.topCard);
    // A Colyseus state patch can briefly expose a permanent before all of its
    // collection fields have been materialized on the client. The board only
    // needs the cards that are present, so skip a missing collection instead
    // of taking the whole game screen down during that render.
    perm.stack?.forEach(add);
    perm.linked?.forEach(add);
    if (perm.permanentId && perm.topCard?.cardId) index.set(perm.permanentId, perm.topCard.cardId);
  };
  state.players.forEach((player, seat) => {
    player.battleArea.forEach(addPermanent);
    addPermanent(player.breeding);
    player.trash.forEach(add);
    // Deck and egg deck are absent by design — the server never encodes them (see
    // HIDDEN_ZONE_VIEW_TAG), so there is nothing to index. A deck card whose identity an
    // effect legitimately reveals arrives in the decision payload instead, which
    // `decisionVisibleCards` already prefers over this index.
    if (seat === viewerSeat) player.hand.forEach(add);
  });
  return index;
}

/** Resolve decision cards from the request first; zone state can lag a reveal decision by one patch. */
export function decisionVisibleCards(
  options: DecisionRequest["options"],
  instanceIndex: ReadonlyMap<string, string>,
): { instanceId: string; cardId?: string }[] {
  const authoritative = new Map((options?.visibleCards ?? []).map((card) => [card.instanceId, card.cardId]));
  const visible = options?.visibleInstanceIds ?? options?.candidateInstanceIds ?? [];
  return visible.map((instanceId) => ({
    instanceId,
    cardId: authoritative.get(instanceId) ?? instanceIndex.get(instanceId),
  }));
}

/** Resolve candidate colors from the same authoritative identities used to render a decision. */
export function decisionCardColors(cards: readonly { instanceId: string; cardId?: string }[]): Map<string, string[]> {
  const colors = new Map<string, string[]>();
  for (const card of cards) {
    if (card.cardId !== undefined) {
      colors.set(card.instanceId, getCardDefinition(card.cardId)?.colors ?? []);
    }
  }
  return colors;
}

/** Whether adding a decision candidate can still assign one distinct color to every pick. */
export function differentColorsAllowCandidate(
  candidateInstanceId: string,
  picks: readonly string[],
  colorsByInstance: ReadonlyMap<string, readonly string[]>,
  enabled: boolean,
): boolean {
  if (!enabled || picks.includes(candidateInstanceId)) return true;
  const candidateColors = colorsByInstance.get(candidateInstanceId) ?? [];
  if (candidateColors.length === 0) return true;
  return canAssignDistinctColors([
    ...picks.map((instanceId) => colorsByInstance.get(instanceId) ?? []),
    candidateColors,
  ]);
}

/** Whether a decision candidate has a card number not already represented in the picks. */
export function distinctCardIdsAllow(
  candidateInstanceId: string,
  picks: readonly string[],
  cardIdByInstance: ReadonlyMap<string, string | undefined>,
  enabled: boolean,
): boolean {
  if (!enabled || picks.includes(candidateInstanceId)) return true;
  const candidateCardId = cardIdByInstance.get(candidateInstanceId);
  if (candidateCardId === undefined) return false;
  return picks.every((pickedId) => cardIdByInstance.get(pickedId) !== candidateCardId);
}

/** Index permanent source counts by either identifier a public decision may carry. */
export function decisionSourceCounts(permanents: readonly Permanent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const permanent of permanents) {
    const count = permanent.stack.length;
    counts.set(permanent.permanentId, count);
    if (permanent.topCard?.instanceId) counts.set(permanent.topCard.instanceId, count);
  }
  return counts;
}

export interface DecisionPermanentDetails {
  currentDP: number;
  isSuspended: boolean;
}

/** Live board details for distinguishing otherwise-identical decision candidates. */
export function decisionPermanentDetails(permanents: readonly Permanent[]): Map<string, DecisionPermanentDetails> {
  const details = new Map<string, DecisionPermanentDetails>();
  for (const permanent of permanents) {
    const value = {
      currentDP: permanent.currentDP,
      isSuspended: permanent.isSuspended,
    };
    details.set(permanent.permanentId, value);
    if (permanent.topCard?.instanceId) details.set(permanent.topCard.instanceId, value);
  }
  return details;
}

/** Card id on top of a permanent anywhere on the board, by permanentId. */
export function permCardId(state: GameState, permanentId: string): string | undefined {
  for (const player of state.players) {
    for (const perm of player.battleArea) if (perm.permanentId === permanentId) return perm.topCard?.cardId;
    if (player.breeding?.permanentId === permanentId) return player.breeding.topCard?.cardId;
  }
  return undefined;
}

/** Locate any card instance on the board by instanceId (topCard / stack / linked) and return its cardId. */
export function instanceCardId(state: GameState, instanceId: string): string | undefined {
  const onPermanent = (perm: Permanent): CardInstance | undefined =>
    [perm.topCard, ...perm.stack, ...perm.linked].find((c) => c?.instanceId === instanceId);
  for (const player of state.players) {
    for (const perm of player.battleArea) {
      const found = onPermanent(perm);
      if (found) return found.cardId;
    }
    if (player.breeding) {
      const found = onPermanent(player.breeding);
      if (found) return found.cardId;
    }
  }
  return undefined;
}

/** Locate a permanent anywhere on the board by permanentId. */
export function findPermanentInState(state: GameState, permanentId: string): Permanent | undefined {
  for (const player of state.players) {
    const inBattle = player.battleArea.find((p) => p.permanentId === permanentId);
    if (inBattle) return inBattle;
    if (player.breeding?.permanentId === permanentId) return player.breeding;
  }
  return undefined;
}

/** True when `def` has `trait` anywhere in its forms, attributes, or types. Case-insensitive to
 * tolerate printed-text vs card-data casing drift (e.g. "[NSP]" vs "NSp"); mirrors the server's
 * cardHasTrait. Trait values are whole-token identities, so case folding cannot over-match. */
function cardHasTrait(def: ReturnType<typeof getCardDefinition>, trait: string): boolean {
  if (!def) return false;
  const want = trait.toLowerCase();
  return (
    (def.forms ?? []).some((t) => t.toLowerCase() === want) ||
    (def.attributes ?? []).some((t) => t.toLowerCase() === want) ||
    (def.types ?? []).some((t) => t.toLowerCase() === want)
  );
}

/** How many of `player`'s hand+trash cards satisfy an alternate requirement's `placementCost`
 *  predicate (kind ∈ kinds OR a trait ∈ traits, over the listed `from` zones). */
function placementCostAvailable(
  player: PlayerState | undefined,
  spec: NonNullable<DigivolutionRequirement["placementCost"]>,
): number {
  if (!player) return 0;
  const matches = (cardId: string): boolean => {
    const def = getCardDefinition(cardId);
    if (!def) return false;
    if ((spec.kinds ?? []).some((k) => def.kinds.includes(CardKind[k]))) return true;
    return (spec.traits ?? []).some((t) => cardHasTrait(def, t));
  };
  let n = 0;
  for (const zone of spec.from) {
    const cards = zone === "hand" ? player.hand : player.trash;
    for (const c of cards) if (matches(c.cardId)) n += 1;
  }
  return n;
}

/**
 * Whether an alternate digivolution requirement matches `baseDef`. Mirrors the server's
 * `matchingAlternateDigivolutionRequirement` gates (level/trait/name/text + the Tamer-base
 * gate). When the requirement carries a non-memory `placementCost`, the digivolve is only
 * legal while the viewer can pay it — checked against `viewer`'s hand+trash when provided.
 */
function requirementHasGate(req: DigivolutionRequirement): boolean {
  return (
    req.level !== undefined ||
    req.levelMin !== undefined ||
    req.levelMax !== undefined ||
    (req.traits !== undefined && req.traits.length > 0) ||
    (req.names !== undefined && req.names.length > 0) ||
    (req.namesExact !== undefined && req.namesExact.length > 0) ||
    (req.texts !== undefined && req.texts.length > 0) ||
    req.baseIsTamer === true
  );
}

/**
 * Whether a requirement carries a base-IDENTITY gate (name/trait/text) rather than only a
 * "is a Tamer"/level shape. Mirrors the server's `requirementHasIdentityGate`: a Tamer-onto
 * card (BT17-012) prints SPECIFIC named requirements ([Takuya Kanbara]: Cost 2, [Agunimon]:
 * Cost 1) alongside the generic "onto any <color> Tamer as level N" effect; only the named
 * paths come from its `digivolutionRequirement` list — its stale gateless/`baseIsTamer`-only
 * entry must be ignored in favor of the derived generic path.
 */
function requirementHasIdentityGate(req: DigivolutionRequirement): boolean {
  return (
    (req.names !== undefined && req.names.length > 0) ||
    (req.namesExact !== undefined && req.namesExact.length > 0) ||
    (req.texts !== undefined && req.texts.length > 0) ||
    (req.traits !== undefined && req.traits.length > 0)
  );
}

/**
 * The alternate digivolution requirements that apply when evolving `handCardId` onto `baseDef`,
 * each paired with its memory cost — mirrors the server's `matchingAlternateDigivolutionRequirement`.
 * For a Tamer-onto card, only its SPECIFIC named requirements are drawn from the compiled list,
 * and the generic "onto any <shared-color> Tamer as level N" path is derived from the card's
 * EvoCosts (so the cost label matches what the server charges); its stale `baseIsTamer`-only
 * compiled entry is ignored. For every other card, all gated requirements apply as-is.
 */
function alternateDigivolveMatches(
  handCardId: string,
  hand: NonNullable<ReturnType<typeof getCardDefinition>>,
  base: Permanent,
  baseDef: NonNullable<ReturnType<typeof getCardDefinition>>,
  viewer: PlayerState | undefined,
): { req: DigivolutionRequirement; cost: number }[] {
  const requirements = digivolutionRequirementsFor(handCardId) ?? [];
  const tamerOntoSpec = tamerOntoDigivolveSpec(handCardId);
  const tamerOntoLevel = tamerOntoSpec?.asLevel;
  const matches: { req: DigivolutionRequirement; cost: number }[] = [];

  for (const req of requirements) {
    // Tamer-onto cards: consult ONLY their specific named requirements from the compiled list.
    if (tamerOntoLevel !== undefined && !requirementHasIdentityGate(req)) continue;
    if (altRequirementMatches(req, base, baseDef, viewer)) matches.push({ req, cost: req.cost });
  }

  if (tamerOntoLevel !== undefined && baseDef.kinds.includes(CardKind.Tamer)) {
    // Generic "onto one of your <color> Tamers as if a level-N Digimon": legal onto a Tamer that
    // satisfies the printed Tamer-color filter and shares a color with an EvoCost at the "as if"
    // level. A printed fixed cost takes precedence over the ordinary level-N EvoCost.
    if (
      tamerOntoSpec?.baseColors !== undefined &&
      !tamerOntoSpec.baseColors.some((color) => baseDef.colors.includes(color as (typeof baseDef.colors)[number]))
    ) {
      return matches;
    }
    const evo = hand.evoCosts.find((ev) => ev.level === tamerOntoLevel && baseDef.colors.includes(ev.color));
    if (evo) {
      const cost = tamerOntoSpec?.costOverride ?? evo.memoryCost;
      matches.push({
        req: {
          cost,
          isAlternate: true,
          baseIsTamer: true,
          ...(tamerOntoSpec?.baseColors === undefined ? {} : { baseColors: tamerOntoSpec.baseColors }),
        },
        cost,
      });
    }
  }

  return matches;
}

function altRequirementMatches(
  req: DigivolutionRequirement,
  base: Permanent,
  baseDef: NonNullable<ReturnType<typeof getCardDefinition>>,
  viewer: PlayerState | undefined,
): boolean {
  // A gateless requirement is a data defect, never an "any base" rule (mirror the server's
  // matchingAlternateDigivolutionRequirement guard) — match nothing rather than highlight every base.
  if (!requirementHasGate(req)) return false;
  const baseLevel = baseDef.level;
  if (req.baseIsTamer && !baseDef.kinds.includes(CardKind.Tamer)) return false;
  if (
    req.baseColors &&
    req.baseColors.length > 0 &&
    !req.baseColors.some((color) => baseDef.colors.includes(color as (typeof baseDef.colors)[number]))
  )
    return false;
  if (req.level !== undefined && baseLevel !== req.level) return false;
  if (req.levelMin !== undefined && (baseLevel === undefined || baseLevel < req.levelMin)) return false;
  if (req.levelMax !== undefined && (baseLevel === undefined || baseLevel > req.levelMax)) return false;
  if (req.traits && req.traits.length > 0 && !req.traits.some((t) => cardHasTrait(baseDef, t))) return false;
  // Name gates read the base's EFFECTIVE names (printed name + aliases such as AD1-020's
  // "Tommy, Takuya, & Zoe" answering to [Takuya Kanbara]) — same source as the server.
  const baseNames = effectiveStaticNames(baseDef);
  if (req.names && req.names.length > 0 && !req.names.some((n) => baseNames.some((name) => name.includes(n))))
    return false;
  if (req.namesExact && req.namesExact.length > 0 && !req.namesExact.some((n) => baseNames.includes(n))) return false;
  if (
    req.texts &&
    req.texts.length > 0 &&
    (!baseDef.effectText || !req.texts.some((t) => baseDef.effectText!.includes(t)))
  )
    return false;
  if (req.placementCost && viewer && placementCostAvailable(viewer, req.placementCost) < req.placementCost.count)
    return false;
  if (!stackGatesSatisfied(req, base)) return false;
  return true;
}

/**
 * Digivolution-stack gates on the BASE — "[Takuya Kanbara] w/2 or more [Hybrid] trait cards
 * under it" (AD1-002) and friends. Mirrors steps 4d/4d-2/4e of the server's validateDigivolve
 * so the client does not offer a path the server will reject.
 */
function stackGatesSatisfied(req: DigivolutionRequirement, base: Permanent): boolean {
  const stackDefs = [...base.stack].map((card) => getCardDefinition(card.cardId));

  if (req.minTraitStackCount !== undefined) {
    const traits = req.minTraitStackTraits ?? [];
    const matching = stackDefs.filter((def) => def && traits.some((t) => cardHasTrait(def, t))).length;
    if (matching < req.minTraitStackCount) return false;
  }

  if (req.minNameStackNames !== undefined) {
    const matching = stackDefs.filter(
      (def) => def && req.minNameStackNames!.some((n) => def.nameEn.includes(n)),
    ).length;
    if (matching < (req.minNameStackCount ?? 1)) return false;
  }

  if (req.requiredDigivolutionCardCount !== undefined) {
    const { trait, min } = req.requiredDigivolutionCardCount;
    const matching = stackDefs.filter((def) => def && cardHasTrait(def, trait)).length;
    if (matching < min) return false;
  }

  return true;
}

/**
 * Whether the BASE permanent grants `handCardId` a digivolution path onto it (ST7-03/BT6-060):
 * a static on the base lets a specific hand card digivolve onto it, ignoring color/level. Keyed by
 * the base card; the target predicate matches the evolving (hand) card. Mirrors the server's
 * GameEngine.matchBaseGrantedDigivolve — the base must be on the battle area, and a conditional
 * grant needs `opponent` (the digivolving seat's opponent) to evaluate its activation gate.
 * Returns the matched grant, or undefined.
 */
function baseGrantConditionHolds(
  condition: NonNullable<BaseGrantedDigivolve["condition"]>,
  viewer: PlayerState | undefined,
  opponent: PlayerState | undefined,
): boolean {
  if (condition.kind === "anyOf") {
    return condition.conditions.some((nested) => baseGrantConditionHolds(nested, viewer, opponent));
  }
  if (condition.kind === "opponentHasDigimonLevelAtLeast") {
    if (!opponent) return false;
    return opponent.battleArea.some((p) => {
      const def = p.topCard ? getCardDefinition(p.topCard.cardId) : undefined;
      return def?.kinds.includes(CardKind.Digimon) && def.level !== undefined && def.level >= condition.level;
    });
  }
  if (condition.kind === "distinctNamedTamersWithTrait") {
    if (!viewer) return false;
    const names = new Set<string>();
    for (const p of viewer.battleArea) {
      const def = p.topCard ? getCardDefinition(p.topCard.cardId) : undefined;
      if (!def?.kinds.includes(CardKind.Tamer) || !cardHasTrait(def, condition.trait)) continue;
      names.add(def.nameEn);
    }
    return names.size >= condition.count;
  }
  return false;
}

function baseGrantedMatch(
  handDef: NonNullable<ReturnType<typeof getCardDefinition>>,
  base: Permanent,
  viewer: PlayerState | undefined,
  opponent: PlayerState | undefined,
): BaseGrantedDigivolve | undefined {
  if (base.inBreeding || !base.topCard) return undefined;
  const grants = baseGrantedDigivolveFor(base.topCard.cardId);
  if (grants === undefined) return undefined;
  return grants.find((g) => {
    const t = g.target;
    const targetMatch =
      Boolean(t.namesExact?.some((n) => handDef.nameEn === n)) ||
      Boolean(t.names?.some((n) => handDef.nameEn.includes(n))) ||
      Boolean(t.traits?.some((tr) => cardHasTrait(handDef, tr)));
    if (!targetMatch) return false;
    // A conditional grant needs the board state its gate reads; without it, do not highlight
    // (the server still validates).
    return g.condition === undefined || baseGrantConditionHolds(g.condition, viewer, opponent);
  });
}

/* Digivolve LEGALITY is deliberately absent here: the server projects it per (hand card,
   base) pair onto `CardInstance.digivolveTargetPermanentIds`, and a second client-side
   answer would only drift from it. What remains below is PRICING — which cost paths a
   legal digivolution offers — because the cost-choice overlay must label them and the
   server has no reason to project prose. */

/** A cost path for digivolving a hand card onto a base permanent. */
export interface EvoCostOption {
  type: "normal" | "alternate";
  /** Human-readable path label; the localized overlay renders the numeric memory cost. */
  label: string;
  cost: number;
}

/**
 * Returns all valid digivolution cost paths (normal + alternate) for evolving
 * `handCardId` onto `base`. When only one path matches, returns a single-element
 * array. When both match, returns both so the UI can offer a choice.
 */
export function getDigivolveCostOptions(
  handCardId: string,
  base: Permanent,
  viewer?: PlayerState,
  opponent?: PlayerState,
): EvoCostOption[] {
  const hand = getCardDefinition(handCardId);
  const baseDef = base.topCard ? getCardDefinition(base.topCard.cardId) : undefined;
  if (!hand || !baseDef) return [];
  if (!hand.kinds.includes(CardKind.Digimon)) return [];

  const baseLevel = baseDef.level;
  const options: EvoCostOption[] = [];
  const intrinsicReduction = intrinsicDigivolutionCostReductionFor(
    handCardId,
    base.stack.map((card) => card.cardId),
    base.topCard?.cardId,
    base.stack.filter((card) => !card.faceUp).length,
  );

  // Normal printed EvoCosts
  for (const ev of hand.evoCosts) {
    if (ev.level === baseLevel && baseDef.colors.includes(ev.color)) {
      const cost = Math.max(0, ev.memoryCost - intrinsicReduction);
      // A multicolor base may satisfy multiple printed color rows with the same cost. They
      // are the same server intent, so presenting duplicate buttons adds no player choice.
      if (options.some((option) => option.type === "normal" && option.cost === cost)) continue;
      options.push({
        type: "normal",
        label: `${ev.color} Lv.${ev.level}`,
        cost,
      });
    }
  }

  // Alternate digivolution requirements (named paths + any derived Tamer-onto path).
  for (const { req } of alternateDigivolveMatches(handCardId, hand, base, baseDef, viewer)) {
    const cost = Math.max(0, req.cost - intrinsicReduction);
    options.push({ type: "alternate", label: alternateCostLabel(req, baseLevel), cost });
  }

  // Base-granted path (ST7-03/BT6-060): a fixed-cost path the base offers this card.
  const granted = baseGrantedMatch(hand, base, viewer, opponent);
  if (granted) {
    const gate = granted.target.traits?.length
      ? `[${granted.target.traits.join("/")}]`
      : (granted.target.namesExact ?? granted.target.names ?? []).join("/");
    options.push({ type: "alternate", label: `${gate} · ${granted.cost} memory`, cost: granted.cost });
  }

  return options;
}

/** Human-readable label for an alternate digivolution path (gate + cost + any placement cost). */
function alternateCostLabel(req: DigivolutionRequirement, baseLevel: number | undefined): string {
  const gate = req.baseIsTamer
    ? "onto a Tamer"
    : req.traits && req.traits.length > 0
      ? `[${req.traits.join("/")}] trait`
      : req.names && req.names.length > 0
        ? req.names.join("/")
        : req.namesExact && req.namesExact.length > 0
          ? req.namesExact.join("/")
          : "alternate";
  const levelLabel = req.baseIsTamer
    ? ""
    : req.level !== undefined
      ? ` Lv.${req.level}`
      : req.levelMin !== undefined || req.levelMax !== undefined
        ? ` Lv.${req.levelMin ?? "?"}-${req.levelMax ?? "?"}`
        : baseLevel !== undefined
          ? ` Lv.${baseLevel}`
          : "";
  let label = `${gate}${levelLabel}`;
  if (req.placementCost) {
    const kinds = (req.placementCost.kinds ?? []).join("/");
    const traits = (req.placementCost.traits ?? []).map((t) => `[${t}]`).join("/");
    const what = [traits, kinds].filter(Boolean).join("/");
    label += ` + place ${req.placementCost.count} ${what} cards`;
  }
  return label;
}

/** Identity color for a player: derived from their visible cards, else a fallback. */
export function playerColorKey(player: PlayerState | undefined, fallback: ColorName): ColorName {
  if (!player) return fallback;
  const sources: (string | undefined)[] = [
    player.battleArea?.[0]?.topCard?.cardId,
    player.breeding?.topCard?.cardId,
    player.trash?.at(-1)?.cardId,
    player.hand?.[0]?.cardId,
  ];
  for (const cardId of sources) {
    if (!cardId) continue;
    const def = getCardDefinition(cardId);
    const key = colorKey(def?.colors[0]);
    if (key !== "Neutral") return key;
  }
  return fallback;
}

/**
 * Derive a human label from an `orderTriggers` decision's trigger key
 * (`<instanceId>::<cardId>/<slug>`, built by `buildTriggerKey` — the instance
 * prefix is what makes two permanents of the same card independently
 * addressable in the decision; see resolverDecisions.ts). Only the effectKey
 * half is shown; when multiple triggering permanents share a card (and thus a
 * label), `triggerLabels` below appends a disambiguating suffix.
 */
export function triggerLabel(triggerKey: string): string {
  const { effectKey } = parseTriggerKey(triggerKey);
  const slashAt = effectKey.indexOf("/");
  if (slashAt === -1) return effectKey;
  const cardId = triggerCardId(triggerKey);
  const name = getCardDefinition(cardId)?.nameEn;
  const slug = effectKey.slice(slashAt + 1).replace(/-/g, " ");
  return name ? `${name} · ${slug}` : effectKey;
}

/** Card definition id carried by a pending trigger's effect key. */
export function triggerCardId(triggerKey: string): string {
  const { effectKey } = parseTriggerKey(triggerKey);
  const slashAt = effectKey.indexOf("/");
  return slashAt === -1 ? effectKey : effectKey.slice(0, slashAt);
}

/**
 * Label every triggerKey in an `orderTriggers` decision, appending "(copy N)"
 * only when two DIFFERENT permanents share a card — the one thing a copy number
 * can honestly mean.
 *
 * A permanent can queue two effects at once (Megadramon's [On Play] and [When
 * Digivolving] both fire when it is played onto a base). Those entries share an
 * instanceId, so numbering them as copies claimed a second Megadramon that was
 * never on the board. They are told apart by their firing window instead, which
 * the chooser renders beside the name (see DecisionOverlay).
 */
export function triggerLabels(
  triggerKeys: readonly string[],
  t: Translate,
  triggerCardIds: readonly string[] = [],
): string[] {
  if (triggerKeys.length === 1) {
    const cardId = triggerCardIds[0] ?? triggerCardId(triggerKeys[0]!);
    return [getCardDefinition(cardId)?.nameEn ?? cardId];
  }
  // Effect-key suffixes are implementation details (`ir-6-0`, `GainMemory`) and
  // are neither stable nor meaningful to a player. The server now carries timing
  // separately for the printed clause; rows identify the actual source card only.
  const entries = triggerKeys.map((key, index) => {
    const cardId = triggerCardIds[index] ?? triggerCardId(key);
    return { label: getCardDefinition(cardId)?.nameEn ?? cardId, instanceId: parseTriggerKey(key).instanceId };
  });
  // Copy numbers are per PERMANENT, not per entry, so a permanent that queued two
  // effects keeps one identity and a card with no second permanent keeps none.
  const instancesByLabel = new Map<string, string[]>();
  for (const entry of entries) {
    const seen = instancesByLabel.get(entry.label) ?? [];
    if (!seen.includes(entry.instanceId)) seen.push(entry.instanceId);
    instancesByLabel.set(entry.label, seen);
  }
  return entries.map(({ label, instanceId }) => {
    const instances = instancesByLabel.get(label) ?? [];
    if (instances.length <= 1) return label;
    return t("log.copySuffix", { label, n: instances.indexOf(instanceId) + 1 });
  });
}

/**
 * Label for the action-bar "play" button. Tamers share the `battleArea` zone
 * server-side with Digimon (apps/api/src/engine/actions/playCard.ts), but a
 * player picking a Tamer or Option from hand should not see "Play Digimon" —
 * that's misleading about what's about to happen. A selected Digi-Egg uses the
 * hatch verb even on surfaces that reuse this shared action label.
 */
export function playButtonLabel(kinds: readonly CardKind[], t: Translate): string {
  if (kinds.includes(CardKind.DigiEgg)) return t("game.hatchEgg");
  if (kinds.includes(CardKind.Option)) return t("game.playOption");
  if (kinds.includes(CardKind.Tamer)) return t("game.playTamer");
  return t("game.playDigimon");
}

/** Most recent effect source card id for a given seat, to label a decision overlay (best-effort). */
export function lastEffectSource(events: ServerEvent[], seat: Seat): string | undefined {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i]!;
    if ((e.kind === "effectActivated" || e.kind === "effectResolved") && e.seat === seat) return e.sourceCardId;
    if (e.kind === "cardPlayed" && e.seat === seat) return e.cardId;
  }
  return undefined;
}

/**
 * Source shown by a decision modal. Trigger ordering must never guess from the
 * event log: that log may already contain a different card's resolution, which
 * made BlackGatomon's pending effect appear as Angewomon. A lone order trigger
 * receives its authoritative source from the server; a multi-trigger choice stays
 * source-neutral and identifies each card in its rows.
 */
export function decisionEffectSource(request: DecisionRequest, events: ServerEvent[]): string | undefined {
  if (request.sourceCardId !== undefined) return request.sourceCardId;
  if (request.kind === "orderTriggers") return undefined;
  return lastEffectSource(events, request.seat);
}

/**
 * Record the card identities an event itself publishes.
 *
 * The log narrates history, so it cannot resolve a name through the CURRENT board:
 * `buildInstanceIndex` forgets a permanent the moment it is deleted or bounced, which
 * silently rewrote every past line about it. The event stream never forgets, so the
 * identities it carries are accumulated as the log walks forward through it.
 */
function rememberEventIdentities(identities: Map<string, string>, event: ServerEvent): void {
  switch (event.kind) {
    case "cardPlayed":
      if (event.permanentId !== undefined) identities.set(event.permanentId, event.cardId);
      return;
    case "digivolved":
    case "hatched":
    case "movedFromBreeding":
      identities.set(event.permanentId, event.cardId);
      return;
    case "attackDeclared":
      identities.set(event.attackerPermanentId, event.attackerCardId);
      if (event.target.kind === "permanent" && event.targetCardId !== undefined) {
        identities.set(event.target.permanentId, event.targetCardId);
      }
      return;
    default:
      return;
  }
}

/**
 * The most recent `limit` events as match-log lines, newest first.
 *
 * Walks the stream forwards, not backwards, so each line is described against the card
 * identities known AT that point in the match (see `rememberEventIdentities`) rather than
 * against a board that has moved on. `instanceIndex` seeds those identities, which is what
 * still names a permanent whose arrival predates the rolling event window.
 *
 * A paid play emits separate `playCard` and `payCost` memory events carrying the same
 * before/after values, which would render as duplicate player-facing lines; consecutive identical
 * MEMORY lines therefore collapse into one. Nothing else collapses: two identical lines of any
 * other kind are two things that really happened, and both players milling 2 cards reads the same
 * way while being two distinct moves.
 */
export function buildMatchLog(
  events: readonly ServerEvent[],
  viewerSeat: Seat,
  instanceIndex: Map<string, string>,
  t: Translate,
  limit = 30,
): LogLine[] {
  const identities = new Map(instanceIndex);
  const chronological: LogLine[] = [];
  for (const event of events) {
    rememberEventIdentities(identities, event);
    const line = describeEvent(event, viewerSeat, identities, t);
    if (!line) continue;
    const previous = chronological.at(-1);
    const duplicateMemoryLine =
      event.kind === "memoryChanged" && previous?.text === line.text && previous.kind === line.kind;
    if (!duplicateMemoryLine) chronological.push(line);
  }
  return chronological.reverse().slice(0, limit);
}

/**
 * Turn the server's event into a one-line match-log entry, or null to skip it.
 *
 * `identities` maps permanent and card-instance ids to card ids. Pass the accumulating
 * map `buildMatchLog` maintains; a live board index alone loses every card that has left
 * the field, which is exactly what a history line must keep naming.
 */
export function describeEvent(
  event: ServerEvent,
  viewerSeat: Seat,
  identities: ReadonlyMap<string, string>,
  t: Translate,
): LogLine | null {
  const mine = (seat: Seat): LogKind => (seat === viewerSeat ? "you" : "opp");
  const phaseName = (phase: string): string => t(`game.phase.${phase}` as TranslationKey);
  switch (event.kind) {
    case "matchStarted":
      return { text: t(event.firstSeat === viewerSeat ? "log.matchStartedYou" : "log.matchStartedOpp"), kind: "sys" };
    case "phaseChanged":
      return {
        text: t(event.turnSeat === viewerSeat ? "log.phaseYours" : "log.phaseOpponents", {
          phase: phaseName(event.phase),
          turn: event.turnCount,
        }),
        kind: "sys",
      };
    case "turnEnded": {
      const yours = event.endingSeat === viewerSeat;
      const nextIsYours = event.nextSeat === viewerSeat;
      const key = yours
        ? nextIsYours
          ? "log.turnEndedYoursNext"
          : "log.turnEndedYours"
        : nextIsYours
          ? "log.turnEndedOpp"
          : "log.turnEndedOppNext";
      return { text: t(key), kind: yours ? "you" : "opp" };
    }
    case "cardPlayed":
      return {
        text: t(event.seat === viewerSeat ? "log.youPlayed" : "log.oppPlayed", { card: cardName(event.cardId) }),
        kind: mine(event.seat),
        cardIds: [event.cardId],
      };
    case "hatched":
      return {
        text: t("log.hatched", { card: cardName(event.cardId) }),
        kind: mine(event.seat),
        cardIds: [event.cardId],
      };
    case "movedFromBreeding":
      return {
        text: t("log.movedFromBreeding", { card: cardName(event.cardId) }),
        kind: mine(event.seat),
        cardIds: [event.cardId],
      };
    case "digivolved":
      return { text: t("log.digivolved", { card: cardName(event.cardId) }), kind: "sys", cardIds: [event.cardId] };
    case "memoryChanged":
      // The server reason is an internal event name (for example `playCard` or
      // `payCost`). It is useful for diagnostics, but exposing it in the match
      // history makes the UI read like a debug trace. Card-play, digivolution,
      // and effect events already provide the player-facing context, so keep
      // this line focused on the observable memory change.
      return { text: t("log.memoryChanged", { from: event.from, to: event.to }), kind: "sys" };
    case "attackDeclared": {
      // The event carries the attacker's identity, so the line keeps its name (and its
      // link) after the attacker has been deleted. Naming the target too gives the
      // `targetCardId` the line already carried something to link to.
      const targetCardId = event.target.kind === "player" ? undefined : event.targetCardId;
      const target =
        event.target.kind === "player"
          ? t("log.targetSecurity")
          : targetCardId === undefined
            ? t("log.targetDigimon")
            : cardName(targetCardId);
      return {
        text: t("log.attackOnBy", { target, card: cardName(event.attackerCardId) }),
        kind: "sys",
        // Ordered as the sentence names them: the target, then the attacker.
        cardIds: [targetCardId, event.attackerCardId].filter((id): id is string => id !== undefined),
      };
    }
    case "blockWindowOpened":
      return { text: t("log.blockWindow"), kind: "sys" };
    case "blocked":
      return { text: t("log.blocked"), kind: "sys" };
    case "blockDeclined":
      // The open block window is logged, so its outcome has to be too; otherwise the
      // history ends on a question the reader can't answer.
      return { text: t("log.blockDeclined"), kind: "sys" };
    case "counterResolved":
      // A passed window is a non-event: only an activated [Counter] changed anything.
      return event.activated ? { text: t("log.counterActivated"), kind: "sys" } : null;
    case "evadeResolved": {
      if (!event.accepted) return null; // declining leaves the deletion to be logged on its own
      const cardId = identities.get(event.permanentId);
      return {
        text: t("log.evadeUsed", { card: cardId === undefined ? t("log.targetDigimon") : cardName(cardId) }),
        kind: "sys",
        ...(cardId === undefined ? {} : { cardIds: [cardId] }),
      };
    }
    case "barrierResolved": {
      if (!event.accepted) return null;
      const cardId = identities.get(event.permanentId);
      return {
        text: t("log.barrierUsed", { card: cardId === undefined ? t("log.targetDigimon") : cardName(cardId) }),
        kind: "sys",
        ...(cardId === undefined ? {} : { cardIds: [cardId] }),
      };
    }
    case "combatResolved": {
      const deleted = event.deletedPermanentIds.map((id) => identities.get(id));
      const named = deleted.filter((id): id is string => id !== undefined);
      // All or nothing: a partial list would read as the complete one.
      if (named.length > 0 && named.length === deleted.length) {
        return {
          text: t("log.combatResolvedDeletedNamed", { cards: named.map(cardName).join(", ") }),
          kind: "sys",
          cardIds: named,
        };
      }
      return {
        text: deleted.length ? t("log.combatResolvedDeleted", { count: deleted.length }) : t("log.combatResolved"),
        kind: "sys",
      };
    }
    case "securityChecked":
      return {
        text: t(event.seat === viewerSeat ? "log.securityCheckYou" : "log.securityCheckOpp", {
          card: cardName(event.revealedCardId),
          resolution: event.resolution,
        }),
        kind: mine(otherSeat(event.seat)),
        cardIds: [event.revealedCardId],
      };
    case "securityRecovered":
      return {
        text: t(event.seat === viewerSeat ? "log.recoveryYou" : "log.recoveryOpp", { count: event.amount }),
        kind: mine(event.seat),
      };
    case "cardRevealed": {
      const yours = event.seat === viewerSeat;
      const source = event.sourceCardId === undefined ? undefined : cardName(event.sourceCardId);
      return {
        text: t(
          source === undefined
            ? yours
              ? "log.cardRevealedYou"
              : "log.cardRevealedOpp"
            : yours
              ? "log.cardRevealedByYou"
              : "log.cardRevealedByOpp",
          source === undefined ? { card: cardName(event.cardId) } : { card: cardName(event.cardId), source },
        ),
        kind: mine(event.seat),
        cardIds: [event.cardId, event.sourceCardId].filter((id): id is string => id !== undefined),
      };
    }
    case "effectActivated":
      // Only the source card is linked. The description is generated text: the card names
      // inside it cannot be tied back to a card id without guessing which printing is meant,
      // and a wrong link is worse than none.
      return {
        text: t("log.effectActivated", { card: cardName(event.sourceCardId), description: event.description }),
        kind: "sys",
        cardIds: [event.sourceCardId],
      };
    case "effectResolved":
      // The transient clause overlay disappears, so the log is the only permanent record a
      // triggered effect gets. It records THAT the effect resolved and leaves the wording to
      // the overlay: repeating the description here would print the same sentence twice on
      // screen at the same moment, and the log cannot narrow a raw engine description down
      // to the printed clause the way the overlay does.
      return {
        text: t("log.effectResolved", { card: cardName(event.sourceCardId) }),
        kind: "sys",
        cardIds: [event.sourceCardId],
      };
    case "cardsMoved": {
      const from = logZoneLabel(event.from, t);
      const to = logZoneLabel(event.to, t);
      // A single move is the case worth naming; several cards would push the names past
      // what one log line can carry. `cardsMoved` publishes no identity of its own, so this
      // name comes from wherever the card is now — the line falls back to the count once
      // nothing on the board can identify that instance any more.
      const movedCardId = event.instanceIds.length === 1 ? identities.get(event.instanceIds[0]!) : undefined;
      if (movedCardId !== undefined) {
        return {
          text: t("log.cardMovedNamed", { card: cardName(movedCardId), from, to }),
          kind: "sys",
          cardIds: [movedCardId],
        };
      }
      return {
        text: t(event.instanceIds.length === 1 ? "log.cardMoved" : "log.cardsMoved", {
          count: event.instanceIds.length,
          from,
          to,
        }),
        kind: "sys",
      };
    }
    case "gameOver": {
      if (event.result.outcome === "draw") {
        return { text: t("log.gameOverDraw", { reason: event.reason }), kind: "sys" };
      }
      const won = event.result.winnerSeat === viewerSeat;
      return {
        text: t(won ? "log.gameOverWin" : "log.gameOverLoss", { reason: event.reason }),
        kind: won ? "you" : "opp",
      };
    }
    case "actionRejected":
      return null; // surfaced as a transient toast instead of a log line
    default:
      return null;
  }
}

export interface ActiveBlockWindow {
  attackerPermanentId: string;
  eligibleBlockerIds: string[];
  /** ＜Collision＞: the block is compulsory, so the window offers no way out of it. */
  mustBlock: boolean;
}

/** Derive a real, still-pending block response from the synchronized event stream. */
export function activeBlockWindow(events: readonly ServerEvent[], isViewerTurn: boolean): ActiveBlockWindow | null {
  if (isViewerTurn) return null;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]!;
    if (event.kind === "blockWindowOpened") {
      // Empty events from older/replayed servers were diagnostic markers, not a
      // pending decision. Rendering them creates a ghost prompt while combat proceeds.
      if (event.eligibleBlockerIds.length === 0) return null;
      return {
        attackerPermanentId: event.attackerPermanentId,
        eligibleBlockerIds: event.eligibleBlockerIds,
        mustBlock: event.mustBlock === true,
      };
    }
    if (
      event.kind === "blocked" ||
      event.kind === "blockDeclined" ||
      event.kind === "combatResolved" ||
      event.kind === "securityChecked" ||
      event.kind === "gameOver" ||
      event.kind === "phaseChanged"
    )
      return null;
  }
  return null;
}

export interface ActiveCounterWindow {
  attackerPermanentId: string;
  eligibleCounters: { instanceId: string; effectKey: string; description: string }[];
}

/** Derive a real, still-pending Counter response from the synchronized event stream. */
export function activeCounterWindow(
  events: readonly ServerEvent[],
  viewerSeat: Seat,
  isViewerTurn: boolean,
): ActiveCounterWindow | null {
  if (isViewerTurn) return null;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]!;
    if (event.kind === "counterWindowOpened") {
      if (event.defendingSeat !== viewerSeat || event.eligibleCounters.length === 0) return null;
      return {
        attackerPermanentId: event.attackerPermanentId,
        eligibleCounters: event.eligibleCounters,
      };
    }
    if (
      event.kind === "blockWindowOpened" ||
      event.kind === "blocked" ||
      event.kind === "counterResolved" ||
      event.kind === "combatResolved" ||
      event.kind === "securityChecked" ||
      event.kind === "gameOver" ||
      event.kind === "phaseChanged"
    )
      return null;
  }
  return null;
}
