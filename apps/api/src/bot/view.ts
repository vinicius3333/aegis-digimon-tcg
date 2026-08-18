import {
  CardKind,
  Phase,
  getCardDefinition,
  type CardDefinition,
  type GameState,
  type Seat,
} from "@aegis/shared";

/**
 * A flat, allocation-cheap snapshot of everything the bot's policy is allowed to see,
 * taken fresh before each decision.
 *
 * Two reasons this exists rather than the policy reading `GameState` directly:
 *   - the synchronized schema is `ArraySchema`/optional-heavy, so every scoring site
 *     would otherwise repeat the same defensive unwrapping;
 *   - it pins the bot to public information plus its own private zones, exactly what a
 *     human in that seat can see. Nothing here reads the opponent's hand, deck, or
 *     face-down security.
 */

/** The memory gauge may travel up to 10 toward the opponent, so this is the spend ceiling. */
const GAUGE_RANGE = 10;

/** Security stack size a match starts with; stands in for an opponent seat we cannot read. */
const FULL_SECURITY_STACK = 5;

export interface BotUnit {
  permanentId: string;
  /**
   * The top card's instance id. Decision candidates are permanent ids when an effect targets
   * the board and instance ids when it selects cards, and the request does not say which, so
   * a policy ranking candidates has to be able to recognise a unit under either name.
   */
  topCardInstanceId?: string;
  cardId?: string;
  definition?: CardDefinition;
  dp: number;
  level: number;
  suspended: boolean;
  inBreeding: boolean;
  keywords: readonly string[];
  /** Engine-projected: may this Digimon attack the opponent right now? */
  canAttackPlayer: boolean;
  /** Engine-projected: opposing permanents this Digimon may legally attack right now. */
  attackablePermanentIds: readonly string[];
  activatableEffects: readonly ActivatableEffect[];
}

export interface ActivatableEffect {
  instanceId: string;
  effectKey: string;
  description: string;
}

export interface BotHandCard {
  instanceId: string;
  cardId: string;
  definition?: CardDefinition;
  activatableEffects: readonly ActivatableEffect[];
}

export interface BotView {
  seat: Seat;
  opponentSeat: Seat;
  phase: Phase;
  turnSeat: Seat;
  gameOver: boolean;
  /** Signed toward the turn player; positive means the turn player has that much to spend. */
  memory: number;
  /** How much the bot may still spend before the gauge hits the opponent's extreme. */
  maxAffordable: number;
  /** Memory the bot can spend without handing any to the opponent. */
  freeMemory: number;
  hand: readonly BotHandCard[];
  board: readonly BotUnit[];
  breeding?: BotUnit;
  opponentBoard: readonly BotUnit[];
  securityCount: number;
  opponentSecurityCount: number;
  deckCount: number;
  eggDeckCount: number;
  trashCount: number;
  /** Own Digimon that could still declare an attack this turn. */
  readyAttackers: readonly BotUnit[];
  /** Opposing colors present on the board — used for Option color requirements. */
  ownFieldColors: ReadonlySet<string>;
}

function toArray<T>(value: ArrayLike<T> | Iterable<T> | undefined): T[] {
  if (value === undefined) return [];
  return Array.from(value as ArrayLike<T>);
}

/**
 * Size of a zone, preferring the real array (the bot runs server-side and shares the
 * authoritative state) and falling back to the synchronized count mirror, which is only
 * refreshed before a broadcast and can therefore lag.
 */
function zoneSize(zone: ArrayLike<unknown> | undefined, mirroredCount: number | undefined): number {
  if (zone !== undefined) return zone.length;
  return mirroredCount ?? 0;
}

function parseActivatable(json: string | undefined): ActivatableEffect[] {
  if (json === undefined || json === "") return [];
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as ActivatableEffect[]) : [];
  } catch {
    return [];
  }
}

function toUnit(permanent: PermanentLike): BotUnit {
  const cardId = permanent.topCard?.cardId;
  const definition = cardId === undefined ? undefined : getCardDefinition(cardId);
  return {
    permanentId: permanent.permanentId,
    topCardInstanceId: permanent.topCard?.instanceId,
    cardId,
    definition,
    dp: permanent.currentDP ?? 0,
    level: definition?.level ?? 0,
    suspended: permanent.isSuspended === true,
    inBreeding: permanent.inBreeding === true,
    keywords: toArray(permanent.keywords),
    canAttackPlayer: permanent.canAttackPlayer === true,
    attackablePermanentIds: toArray(permanent.attackablePermanentIds),
    activatableEffects: parseActivatable(permanent.activatableEffectsJson),
  };
}

/**
 * Build the snapshot for `seat`. Returns undefined when the seat has no PlayerState
 * yet (the room seats the bot before setup runs), so callers can simply skip acting.
 */
export function buildBotView(state: GameState, seat: Seat): BotView | undefined {
  const players = toArray<PlayerLike | undefined>(state.players as unknown as ArrayLike<PlayerLike | undefined>);
  const me = players[seat];
  const opponentSeat = (seat === 0 ? 1 : 0) as Seat;
  const opponent = players[opponentSeat];
  if (me === undefined) return undefined;

  const board = toArray(me.battleArea).map(toUnit);
  const breeding = me.breeding === undefined ? undefined : toUnit(me.breeding);
  const opponentBoard = toArray(opponent?.battleArea).map(toUnit);

  const memory = state.memory ?? 0;
  const isMyTurn = state.turnSeat === seat;
  // Mirrors the engine's MemoryGauge.maxAffordable: the remaining distance this seat
  // can push the shared gauge toward the opponent's extreme.
  const maxAffordable = isMyTurn ? memory + GAUGE_RANGE : GAUGE_RANGE - memory;
  // Only a Digimon or Tamer supplies a color for an Option's printed requirement
  // (Comprehensive Rules §4-21-2); a hatched Digi-Egg counts as a Digimon while it sits
  // in the raising area. This mirrors the engine's own play-time gate.
  const ownFieldColors = new Set<string>();
  for (const unit of [...board, breeding]) {
    if (unit === undefined) continue;
    const supplies =
      isDigimonCard(unit.definition) ||
      isTamerCard(unit.definition) ||
      (unit.inBreeding && isDigiEggCard(unit.definition));
    if (!supplies) continue;
    for (const color of unit.definition?.colors ?? []) ownFieldColors.add(color);
  }

  const hand = toArray(me.hand).map((card) => ({
    instanceId: card.instanceId,
    cardId: card.cardId,
    definition: getCardDefinition(card.cardId),
    activatableEffects: parseActivatable(card.activatableEffectsJson),
  }));

  return {
    seat,
    opponentSeat,
    phase: state.phase,
    turnSeat: state.turnSeat,
    gameOver: state.gameOver === true,
    memory,
    maxAffordable,
    freeMemory: isMyTurn ? Math.max(0, memory) : 0,
    hand,
    board,
    breeding,
    opponentBoard,
    securityCount: zoneSize(me.security, me.securityCount),
    // An unseated opponent (the room seats the bot before setup runs) has no zones at all,
    // and reporting that as "no security left" would score every attack as lethal. Report a
    // full stack instead: the safe reading of an unknown board is the least urgent one.
    opponentSecurityCount:
      opponent === undefined
        ? FULL_SECURITY_STACK
        : zoneSize(opponent.security, opponent.securityCount),
    deckCount: zoneSize(me.deck, me.deckCount),
    eggDeckCount: zoneSize(me.eggDeck, me.eggDeckCount),
    trashCount: toArray(me.trash).length,
    readyAttackers: board.filter((unit) => !unit.suspended && (unit.canAttackPlayer || unit.attackablePermanentIds.length > 0)),
    ownFieldColors,
  };
}

/** Cards that are Digimon (and therefore attack, digivolve, and hold the board). */
export function isDigimonCard(definition: CardDefinition | undefined): boolean {
  return definition?.kinds.includes(CardKind.Digimon) === true;
}

export function isTamerCard(definition: CardDefinition | undefined): boolean {
  return definition?.kinds.includes(CardKind.Tamer) === true;
}

export function isOptionCard(definition: CardDefinition | undefined): boolean {
  return definition?.kinds.includes(CardKind.Option) === true;
}

export function isDigiEggCard(definition: CardDefinition | undefined): boolean {
  return definition?.kinds.includes(CardKind.DigiEgg) === true;
}

/** Structural shapes the view reads. Kept local so tests can hand in plain objects. */
interface PermanentLike {
  permanentId: string;
  topCard?: { cardId: string; instanceId?: string };
  currentDP?: number;
  isSuspended?: boolean;
  inBreeding?: boolean;
  keywords?: ArrayLike<string>;
  canAttackPlayer?: boolean;
  attackablePermanentIds?: ArrayLike<string>;
  activatableEffectsJson?: string;
}

interface HandCardLike {
  instanceId: string;
  cardId: string;
  activatableEffectsJson?: string;
}

interface PlayerLike {
  hand?: ArrayLike<HandCardLike>;
  deck?: ArrayLike<unknown>;
  eggDeck?: ArrayLike<unknown>;
  security?: ArrayLike<unknown>;
  trash?: ArrayLike<unknown>;
  battleArea?: ArrayLike<PermanentLike>;
  breeding?: PermanentLike;
  eggDeckCount?: number;
  securityCount?: number;
  deckCount?: number;
}

