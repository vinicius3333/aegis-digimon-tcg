import { expect } from "vitest";
import {
  GameState,
  PlayerState,
  Permanent,
  CardInstance,
  Phase,
  Zone,
  getCardDefinition,
  type Seat,
  type ServerEvent,
  type DecisionRequest,
} from "@aegis/shared";
import { GameEngine, type GameEngineHooks } from "../GameEngine.js";
import {
  fillZone,
  insertCard,
  linkCard,
  placePermanent,
  pushOnStack,
  setBreeding,
  setTopCard,
  type CardZone,
} from "../state/access.js";

/**
 * Shared test harness for engine behavioral suites (A3 mechanic tests, KB conformance
 * chapter tests, and any future suite driving the real `GameEngine`). Extracted verbatim
 * from `mechanic.test.ts` (board-builder + engine-setup helpers) and
 * `security/securityCheck.test.ts` (subsystem-level security-state builders) — see the
 * pilot migration of `mechanic.test.ts` for the behavior-preservation proof: all of its
 * pre-existing tests pass unchanged against these exports.
 */

let seq = 0;

/** Build a bare `CardInstance` — a hand/deck/trash/security card, not yet on the board. */
export function makeInstance(cardId: string, seat: Seat, faceUp: boolean): CardInstance {
  seq += 1;
  const card = new CardInstance();
  card.instanceId = `inst-${seq}`;
  card.cardId = cardId;
  card.ownerSeat = seat;
  card.faceUp = faceUp;
  return card;
}

/**
 * Build a battle-area `Permanent` with a face-up top card. `cardId` only affects what the
 * top card claims to be (`AD1-001` — an arbitrary Lv.4 Digimon — unless overridden); `dp`
 * is the permanent's actual (base and current) DP.
 */
export function makeDigimon(seat: Seat, dp: number, cardId = "AD1-001"): Permanent {
  seq += 1;
  const top = makeInstance(cardId, seat, true);
  const permanent = new Permanent();
  // Distinct id namespace: the engine mints its own `perm-N` for permanents it creates
  // (plays, merges), so a hand-laid `perm-N` could collide and falsely look "still
  // present" after e.g. a DNA merge consumes the hand-laid permanent.
  permanent.permanentId = `seed-perm-${seq}`;
  permanent.controllerSeat = seat;
  setTopCard(permanent, top);
  permanent.isSuspended = false;
  permanent.inBreeding = false;
  permanent.baseDP = dp;
  permanent.currentDP = dp;
  // A manually seeded battle-area Digimon is established by default, matching
  // Board Spec fixtures. Tests for summoning sickness opt in by setting the
  // entry turn explicitly.
  permanent.enterFieldTurnCount = ESTABLISHED_TURN;
  return permanent;
}

/**
 * A permanent laid by a Board Spec is ESTABLISHED by default: it entered the field before
 * the current turn, so summoning sickness (§16-1) and the ＜Delay＞ activation gate treat it
 * as an old permanent. A test wanting a freshly-arrived permanent sets `enteredThisTurn`.
 *
 * The sentinel exists because "entered before now" has no natural value at `turnCount` 0 —
 * the engine records the turn a permanent arrived (`enterFieldTurnCount = state.turnCount`)
 * and both gates compare it for equality, so any value the current turn will never take
 * reads as "arrived earlier". Raising the board's `turnCount` instead would arm summoning
 * sickness for every scenario at once, which is a rules change, not a setup detail.
 */
const ESTABLISHED_TURN = 4294967295;

/** A card in a zone: a bare card id, or the same plus an alias to address it by later. */
export type CardSpec = string | { card: string; as?: string; faceUp?: boolean };

/** A permanent on the battle area or in breeding. */
export interface PermanentSpec {
  card: string;
  /** Alias for `perm(alias)`. Aliases are unique per Board Spec. */
  as?: string;
  /** Base and current DP. Defaults to the card definition's printed DP. */
  dp?: number;
  suspended?: boolean;
  /** Opt in to summoning sickness / the ＜Delay＞ gate. Established by default. */
  enteredThisTurn?: boolean;
  /** Digivolution cards, bottom-most first. */
  under?: CardSpec[];
  /** Linked cards (Link mechanic). */
  linked?: CardSpec[];
}

export interface SeatSpec {
  hand?: CardSpec[];
  deck?: CardSpec[];
  eggDeck?: CardSpec[];
  trash?: CardSpec[];
  delayZone?: CardSpec[];
  /** Explicit cards, or a count of anonymous face-down cards. `[0]` is the top of the stack. */
  security?: CardSpec[] | number;
  battleArea?: (PermanentSpec | string)[];
  breeding?: PermanentSpec | string;
}

/** Both seats' starting zones. Seat 0 is the turn player unless a test says otherwise. */
export type BoardSpec = { 0?: SeatSpec; 1?: SeatSpec };

export interface EngineSetup {
  engine: GameEngine;
  state: GameState;
  events: ServerEvent[];
  decisions: { seat: Seat; req: DecisionRequest }[];
  /** The permanent an alias names, resolved fresh — survives digivolve and DNA merge. */
  perm(alias: string): Permanent;
  /** The card instance an alias names, resolved fresh across zones. */
  inst(alias: string): CardInstance;
  /** Add a card to a loose zone mid-test, through the Mutation Seam. */
  give(seat: Seat, zone: CardZone, card: CardSpec): CardInstance;
  /** Put a permanent on the battle area mid-test. */
  putOnBoard(seat: Seat, spec: PermanentSpec | string): Permanent;
  /**
   * Await the board's continuous recompute. `setupEngine` already starts one, and its
   * installation work lands synchronously, so this is only needed by a test that wants the
   * guarantee stated rather than relied upon — or that arranges more board mid-test.
   */
  ready(): Promise<void>;
}

export interface SetupEngineOptions {
  autoAcceptOptional?: boolean;
  /**
   * Answer every "use this effect?" prompt with no — the declined branch. Mutually exclusive
   * in practice with `autoAcceptOptional` (a test wants one behavior or the other per run);
   * setting both answers whichever the engine asks first and leaves the rest to the first
   * flag that matches, so pass exactly one.
   */
  autoDeclineOptional?: boolean;
  autoSelectCards?: boolean;
  autoChooseOption?: boolean;
  /**
   * Answer an `orderTriggers` decision (simultaneous same-timing effects that need a resolve
   * order) by keeping the engine's own offered order. Enabled by default because every
   * mandatory trigger requires confirmation in production; pass `false` only when a test
   * explicitly asserts the pending `orderTriggers` decision itself.
   */
  autoOrderTriggers?: boolean;
  /** Keep an `orderCards` request in offered order by default; pass false to inspect/reorder it manually. */
  autoOrderCards?: boolean;
  /**
   * Bias `autoSelectCards`'s pick toward these instance ids: when a capped `selectCards`/
   * `chooseTargets` decision's candidates include one, it sorts first, so a count:1 (or
   * otherwise capped) selection lands on a specific board permanent/card instead of an
   * arbitrary candidate. A live array — populate it with `s.perm(alias).topCard.instanceId` /
   * `s.inst(alias).instanceId` after `setupEngine` returns (aliases resolve immediately) and
   * before the intent that triggers the decision. Falls back to candidate order untouched.
   */
  preferInstanceIds?: string[];
  /**
   * Answer a `chooseOption` decision with this option index instead of `autoChooseOption`'s
   * default of 0 — for a card whose intended (or asserted) branch isn't the first-listed one.
   */
  preferOptionIndex?: number;
}

/**
 * Seat both players on empty staged decks and lay the board by hand. `autoAcceptOptional`
 * answers "use this effect?" prompts with yes (`autoDeclineOptional` answers no);
 * `autoSelectCards` answers a card-selection prompt by taking the maximum allowed from the
 * candidate set; `autoChooseOption` picks option index 0 for a `chooseOption` prompt;
 * `autoOrderTriggers` keeps the engine's offered order for a simultaneous-trigger prompt —
 * all on a microtask so a chain of prompts resolves without a manual respondDecision per step.
 */
/** Alias -> its stable card identity and, for a seeded field card, original permanent identity. */
type AliasTable = Map<string, { kind: "permanent" | "instance"; id: string; instanceId?: string }>;

function cardOf(spec: CardSpec): { card: string; as?: string; faceUp?: boolean } {
  return typeof spec === "string" ? { card: spec } : spec;
}

function permanentSpecOf(spec: PermanentSpec | string): PermanentSpec {
  return typeof spec === "string" ? { card: spec } : spec;
}

function buildInstance(spec: CardSpec, seat: Seat, defaultFaceUp: boolean, aliases: AliasTable): CardInstance {
  const { card, as, faceUp } = cardOf(spec);
  const instance = makeInstance(card, seat, faceUp ?? defaultFaceUp);
  if (as !== undefined) aliases.set(as, { kind: "instance", id: instance.instanceId });
  return instance;
}

function buildPermanent(spec: PermanentSpec | string, seat: Seat, aliases: AliasTable): Permanent {
  const resolved = permanentSpecOf(spec);
  const dp = resolved.dp ?? getCardDefinition(resolved.card)?.dp ?? 0;
  const permanent = makeDigimon(seat, dp, resolved.card);
  permanent.isSuspended = resolved.suspended ?? false;
  permanent.enterFieldTurnCount = resolved.enteredThisTurn === true ? 0 : ESTABLISHED_TURN;
  for (const under of resolved.under ?? []) pushOnStack(permanent, buildInstance(under, seat, true, aliases));
  for (const linked of resolved.linked ?? []) linkCard(permanent, buildInstance(linked, seat, true, aliases), "bottom");
  if (resolved.as !== undefined) {
    aliases.set(resolved.as, {
      kind: "permanent",
      id: permanent.permanentId,
      instanceId: permanent.topCard!.instanceId,
    });
  }
  return permanent;
}

const LOOSE_ZONES: [keyof SeatSpec, CardZone, boolean][] = [
  ["hand", Zone.Hand, true],
  ["deck", Zone.Deck, false],
  ["eggDeck", Zone.EggDeck, false],
  ["trash", Zone.Trash, true],
  ["delayZone", Zone.Delay, false],
];

function layBoard(state: GameState, board: BoardSpec, aliases: AliasTable): void {
  for (const seat of [0, 1] as Seat[]) {
    const spec = board[seat];
    const player = state.players[seat];
    if (spec === undefined || player === undefined) continue;

    for (const [key, zone, faceUp] of LOOSE_ZONES) {
      const cards = spec[key] as CardSpec[] | undefined;
      if (cards === undefined) continue;
      fillZone(
        player,
        zone,
        cards.map((card) => buildInstance(card, seat, faceUp, aliases)),
      );
    }

    if (spec.security !== undefined) {
      const cards =
        typeof spec.security === "number"
          ? Array.from({ length: spec.security }, (_, n) => makeSecurityCard(seat, n))
          : spec.security.map((card) => buildInstance(card, seat, false, aliases));
      fillZone(player, Zone.Security, cards);
    }

    for (const permanent of spec.battleArea ?? []) {
      placePermanent(player, buildPermanent(permanent, seat, aliases));
    }

    if (spec.breeding !== undefined) {
      const permanent = buildPermanent(spec.breeding, seat, aliases);
      permanent.inBreeding = true;
      setBreeding(player, permanent);
    }
  }
}

function isBoardSpec(value: BoardSpec | SetupEngineOptions | undefined): value is BoardSpec {
  return value !== undefined && ("0" in value || "1" in value);
}

/**
 * Seat both players, lay the board from a Board Spec, and hand back the Test Seam.
 *
 * Arrange with the Board Spec, act through Intents, observe through the returned
 * affordances. Reaching past this into `GameEngine` fails `testkitSeam.guard.test.ts`.
 *
 * `autoAcceptOptional` answers "use this effect?" prompts with yes; `autoSelectCards`
 * answers a card-selection prompt by taking the maximum allowed from the candidate set;
 * `autoChooseOption` picks option index 0. `autoOrderTriggers` defaults to true and confirms
 * the first offered trigger; pass false to inspect that decision manually. All responders run
 * on a microtask so a chain of prompts resolves without a manual respondDecision per step.
 */
export function setupEngine(board?: BoardSpec, opts?: SetupEngineOptions): EngineSetup;
export function setupEngine(opts?: SetupEngineOptions): EngineSetup;
export function setupEngine(boardOrOpts?: BoardSpec | SetupEngineOptions, maybeOpts?: SetupEngineOptions): EngineSetup {
  const board = isBoardSpec(boardOrOpts) ? boardOrOpts : undefined;
  const opts = isBoardSpec(boardOrOpts) ? maybeOpts : (boardOrOpts as SetupEngineOptions | undefined);
  const state = new GameState();
  const events: ServerEvent[] = [];
  const decisions: EngineSetup["decisions"] = [];
  let engineRef: GameEngine | undefined;
  const hooks: GameEngineHooks = {
    seed: 1,
    requestDecision: (seat, req) => {
      decisions.push({ seat, req });
      if (opts?.autoAcceptOptional && req.kind === "optional") {
        queueMicrotask(() =>
          engineRef?.applyIntent(seat, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: { kind: "optional", accept: true },
          }),
        );
      }
      if (opts?.autoDeclineOptional && req.kind === "optional") {
        queueMicrotask(() =>
          engineRef?.applyIntent(seat, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: { kind: "optional", accept: false },
          }),
        );
      }
      if (opts?.autoOrderTriggers !== false && req.kind === "orderTriggers") {
        queueMicrotask(() =>
          engineRef?.applyIntent(seat, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: { kind: "orderTriggers", order: (req.options?.triggerKeys ?? []).slice(0, 1) },
          }),
        );
      }
      if (opts?.autoOrderCards !== false && req.kind === "orderCards") {
        queueMicrotask(() =>
          engineRef?.applyIntent(seat, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: { kind: "orderCards", order: req.options?.candidateInstanceIds ?? [] },
          }),
        );
      }
      if (opts?.autoSelectCards && (req.kind === "selectCards" || req.kind === "chooseTargets")) {
        const candidates = req.options?.candidateInstanceIds ?? [];
        // Bias toward `preferInstanceIds`: when a capped selection's candidates include one,
        // pick it first so the effect lands on the asserted/intended target, not an arbitrary
        // candidate. Falls back to candidate order.
        const prefer = opts?.preferInstanceIds ?? [];
        const ordered = [...candidates].sort((a, b) => {
          const preferred = (id: string): boolean => {
            if (prefer.includes(id)) return true;
            // `selectCards` candidates are exact loose-card identities. Expanding one
            // through its host would make every sibling in that stack equally preferred.
            // `chooseTargets` may instead expose a permanent id for a preferred top card.
            if (req.kind === "selectCards") return false;
            const permanent = findPermanentForDecisionId(state, id);
            return permanent?.topCard !== undefined && prefer.includes(permanent.topCard.instanceId);
          };
          const pa = preferred(a) ? 0 : 1;
          const pb = preferred(b) ? 0 : 1;
          return pa - pb;
        });
        // A malformed/NaN `max` (e.g. a compiled action with an unset materials.count) must not
        // collapse the selection to empty: Array.prototype.slice treats a NaN end as 0.
        const rawMax = req.options?.max;
        const cap = typeof rawMax === "number" && Number.isFinite(rawMax) ? rawMax : ordered.length;
        const visibleCardIds = new Map((req.options?.visibleCards ?? []).map((card) => [card.instanceId, card.cardId]));
        const ids: string[] = [];
        const selectedCardIds = new Set<string>();
        let selectedDP = 0;
        for (const instanceId of ordered) {
          if (ids.length >= cap) break;
          const cardId = visibleCardIds.get(instanceId);
          if (req.options?.distinctCardIds === true && (cardId === undefined || selectedCardIds.has(cardId))) continue;
          if (req.kind === "chooseTargets" && req.options?.maxTotalDP !== undefined) {
            const permanent = findPermanentForDecisionId(state, instanceId);
            if (permanent === undefined || selectedDP + permanent.currentDP > req.options.maxTotalDP) continue;
            selectedDP += permanent.currentDP;
          }
          ids.push(instanceId);
          if (cardId !== undefined) selectedCardIds.add(cardId);
        }
        const response =
          req.kind === "selectCards"
            ? { kind: "selectCards" as const, instanceIds: ids }
            : { kind: "chooseTargets" as const, instanceIds: ids };
        queueMicrotask(() =>
          engineRef?.applyIntent(seat, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response,
          }),
        );
      }
      if ((opts?.autoChooseOption || opts?.preferOptionIndex !== undefined) && req.kind === "chooseOption") {
        queueMicrotask(() =>
          engineRef?.applyIntent(seat, {
            type: "respondDecision",
            decisionId: req.decisionId,
            response: { kind: "chooseOption", optionIndex: opts?.preferOptionIndex ?? 0 },
          }),
        );
      }
    },
    emit: (e) => events.push(e),
  };
  const engine = new GameEngine(state, hooks);
  engineRef = engine;
  engine.seatPlayer(0, "sa", { displayName: "A", deck: { mainDeck: [], eggDeck: [] } });
  engine.seatPlayer(1, "sb", { displayName: "B", deck: { mainDeck: [], eggDeck: [] } });
  state.phase = Phase.Main;
  state.turnSeat = 0;

  const aliases: AliasTable = new Map();
  if (board !== undefined) layBoard(state, board, aliases);
  // Deliberately NOT recomputed here. A hand-laid board has no continuous effects installed
  // until something recomputes, which is why a hand card's colour waiver and a `[Your Turn]`
  // watcher look absent to a test's first intent — three failures were misdiagnosed as engine
  // bugs before that was understood. But recomputing at setup is worse: it installs state at a
  // moment the test has not finished arranging (turn, phase, extra permanents), and that state
  // then persists until the next recompute, which silently breaks negative controls such as
  // `continuousColor.test.ts`'s "on the opponent's turn the grant is absent". Measured: 27
  // tests regress. A test that needs an arranged board to behave like a played one awaits
  // `ready()` once its arrangement is complete.

  const lookup = (alias: string) => {
    const entry = aliases.get(alias);
    expect(entry, `alias "${alias}" is not declared in the Board Spec`).toBeDefined();
    return entry as { kind: "permanent" | "instance"; id: string; instanceId?: string };
  };

  const setup: EngineSetup = {
    engine,
    state,
    events,
    decisions,
    perm(alias) {
      const entry = lookup(alias);
      const found =
        entry.kind === "permanent"
          ? findPermanentById(state, entry.id)
          : findPermanentContainingInstance(state, entry.id);
      expect(found, `permanent for "${alias}" (${entry.id}) is no longer on the board`).toBeDefined();
      return found as Permanent;
    },
    inst(alias) {
      const entry = lookup(alias);
      const id = entry.kind === "instance" ? entry.id : entry.instanceId!;
      const found = findInstanceById(state, id);
      expect(found, `card "${alias}" (${id}) is no longer in the match`).toBeDefined();
      return found as CardInstance;
    },
    give(seat, zone, card) {
      const player = state.players[seat] as PlayerState;
      const instance = buildInstance(card, seat, zone === Zone.Hand || zone === Zone.Trash, aliases);
      insertCard(player, zone, instance);
      return instance;
    },
    async ready() {
      await engine.recomputeContinuousEffects();
    },
    putOnBoard(seat, spec) {
      const player = state.players[seat] as PlayerState;
      const permanent = buildPermanent(spec, seat, aliases);
      placePermanent(player, permanent);
      return permanent;
    },
  };
  return setup;
}

function findPermanentById(state: GameState, permanentId: string): Permanent | undefined {
  for (const player of state.players) {
    const onBoard = player.battleArea.find((p) => p.permanentId === permanentId);
    if (onBoard !== undefined) return onBoard;
    if (player.breeding?.permanentId === permanentId) return player.breeding;
  }
  return undefined;
}

function findInstanceById(state: GameState, instanceId: string): CardInstance | undefined {
  for (const player of state.players) {
    for (const zone of [player.hand, player.deck, player.eggDeck, player.trash, player.security, player.delayZone]) {
      const found = zone.find((card) => card.instanceId === instanceId);
      if (found !== undefined) return found;
    }
    for (const permanent of player.battleArea) {
      if (permanent.topCard?.instanceId === instanceId) return permanent.topCard;
      const inStack = permanent.stack.find((card) => card.instanceId === instanceId);
      if (inStack !== undefined) return inStack;
      const inLinked = permanent.linked.find((card) => card.instanceId === instanceId);
      if (inLinked !== undefined) return inLinked;
    }
    const breeding = player.breeding;
    if (breeding?.topCard?.instanceId === instanceId) return breeding.topCard;
    const breedingStack = breeding?.stack.find((card) => card.instanceId === instanceId);
    if (breedingStack !== undefined) return breedingStack;
    const breedingLinked = breeding?.linked.find((card) => card.instanceId === instanceId);
    if (breedingLinked !== undefined) return breedingLinked;
  }
  return undefined;
}

function findPermanentContainingInstance(state: GameState, instanceId: string): Permanent | undefined {
  for (const player of state.players) {
    for (const permanent of [...player.battleArea, ...(player.breeding === undefined ? [] : [player.breeding])]) {
      if (
        permanent.topCard?.instanceId === instanceId ||
        permanent.stack.some((card) => card.instanceId === instanceId) ||
        permanent.linked.some((card) => card.instanceId === instanceId)
      ) {
        return permanent;
      }
    }
  }
  return undefined;
}

function findPermanentForDecisionId(state: GameState, id: string): Permanent | undefined {
  for (const player of state.players) {
    const permanent = [...player.battleArea, ...(player.breeding === undefined ? [] : [player.breeding])].find(
      ({ permanentId }) => permanentId === id,
    );
    if (permanent !== undefined) return permanent;
  }
  return findPermanentContainingInstance(state, id);
}

/**
 * Tick the microtask queue until a predicate holds (bounded). Omit the predicate (or pass
 * `() => false`) to just flush pending microtasks for `maxTicks` iterations.
 *
 * The bound exists to stop a never-satisfied predicate hanging the suite, not to assert how
 * many ticks a flow costs — so it is set generously. It was raised from 200 when combat
 * suspension gained its `whenSuspended` fire (each fire trails a continuous recompute), which
 * pushed the attack flow past the old bound and failed several tests that were in fact correct.
 *
 * Do NOT floor or globally raise per-call `maxTicks`: under `autoSelectCards` a longer drain
 * auto-answers decisions it reaches, so a predicate-less settle's observed state genuinely
 * depends on its tick budget. When a legitimate change makes flows cost more ticks (the
 * per-family action dispatch added one promise hop per action), raise the budgets of the
 * specific tests that outgrew theirs.
 */
/**
 * Tick the microtask queue until `predicate` holds, or `maxTicks` elapse. The predicate is read
 * for truthiness, so an optional-chained probe that can yield `undefined` is a legal predicate.
 */
export async function settle(predicate: () => boolean | undefined = () => false, maxTicks = 500): Promise<void> {
  // Awaiting the same fulfilled promise still yields one microtask per tick, without
  // allocating another promise for every step of the drain.
  const tick = Promise.resolve();
  for (let i = 0; i < maxTicks * 10; i++) {
    await tick;
    if (predicate()) {
      // A production action may publish its observable milestone before the final action in
      // the same effect continuation (P-130 suspends before its trailing GainMemory). Give
      // that continuation one turn through the microtask queue before callers inspect state.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      for (let flush = 0; flush < 20; flush += 1) await tick;
      return;
    }
  }
}

export function findPermanent(s: EngineSetup, seat: Seat, cardId: string): Permanent {
  const permanent = (s.state.players[seat] as PlayerState).battleArea.find((p) => p.topCard?.cardId === cardId);
  expect(permanent, `permanent ${cardId} on seat ${seat}`).toBeDefined();
  return permanent as Permanent;
}

/**
 * The loud-gap detector. A play/digivolve continuation that throws UnsupportedEffectError
 * is caught at GameEngine.ts's intent-apply catch and re-emitted as an `actionRejected`
 * event carrying the error message. Any such event means a mechanic hit an unwired
 * interpreter branch.
 */
export function assertNoLoudGap(s: EngineSetup): void {
  const gap = s.events.find((e) => e.kind === "actionRejected" && "reason" in e && /Unsupported effect/.test(e.reason));
  expect(gap && "reason" in gap ? gap.reason : undefined).toBeUndefined();
}

/**
 * GameState with a defender (`seat 1`) holding `securityCards.length` security cards and
 * an attacker permanent controlled by seat 0. implemented from `securityCheck.test.ts`'s
 * `makeState`, renamed for clarity now that it lives alongside the board-builder helpers
 * above (a `makeState` next to `makeInstance`/`makeDigimon` would read as if it built a
 * generic engine state, not the security-check-specific fixture it actually is).
 */
export function makeSecurityState(securityCards: CardInstance[], attackerPermanentId: string): GameState {
  const state = new GameState();
  for (const seat of [0, 1] as Seat[]) {
    const player = new PlayerState();
    player.seat = seat;
    state.players[seat] = player;
  }
  const defender = state.players[1];
  if (defender) fillZone(defender, Zone.Security, securityCards);

  const attacker = new Permanent();
  attacker.permanentId = attackerPermanentId;
  attacker.controllerSeat = 0;
  const top = new CardInstance();
  top.instanceId = "attacker-top";
  top.cardId = "BT15-002";
  top.ownerSeat = 0;
  setTopCard(attacker, top);
  const attackerController = state.players[0];
  if (attackerController) placePermanent(attackerController, attacker);
  return state;
}

/** A face-down security card owned by `seat`. */
export function makeSecurityCard(seat: Seat, n: number, cardId = "BT1-001"): CardInstance {
  const card = new CardInstance();
  card.instanceId = `sec-${seat}-${n}`;
  card.cardId = cardId;
  card.ownerSeat = seat;
  card.faceUp = false; // face-down in security
  return card;
}
