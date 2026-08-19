import type { Seat } from "@aegis/shared";
import type { DecisionApi, EffectContext, SeatScopedDecisionApi } from "../effects/EffectContext.js";
import type { DecisionManager } from "./index.js";

/**
 * Concrete {@link DecisionApi} (`ctx.ask.*`) backed by the {@link DecisionManager}
 * (subsystem: intent-protocol-and-room).
 *
 * The interface (`optional` / `chooseTargets` / `selectCards` / `chooseOption`)
 * lives in the effect-framework contract (EffectContext.ts) because card modules
 * are written against it (card-module contract). This file is the runtime
 * binding that turns each call into a DecisionRequest on the deciding seat and
 * awaits the matching respondDecision — the direct port of the source per-decision
 * coroutine waits (documented behavior `SelectOptional`, documented behavior's
 * select-which-effect prompt), minus all presentation UI.
 *
 * `ctx.ask.*` addresses the effect's controller (`ctx.source.ownerSeat`): the
 * documented rules prompts `cardEffect.EffectSourceCard.Owner` (documented behavior
 * 60), i.e. the source card's owner. `ctx.ask.opponent.*` addresses the other seat
 * (`ctx.game.opponentOf(ctx.source.ownerSeat)`) — for printed text that explicitly
 * assigns the choice to "your opponent" (e.g. "your opponent trashes 1 card in
 * their hand"). Both facades share one implementation (`buildSeatScopedApi`)
 * parameterized only by which seat each call resolves to; there is no flag that
 * defaults to the controller, so a card that needs the opponent's choice cannot
 * accidentally fall back to the controller's.
 *
 * Routing safety: `DecisionManager.request` mirrors the seat into
 * `state.pendingDecision` and the room (`AegisRoom.requestDecision`) unicasts the
 * `DecisionRequest` only to the client mapped to that seat — the other seat's
 * client never receives it. `DecisionManager.respond` re-checks the responding
 * seat against the open decision's seat (not the caller-supplied one) before
 * resolving, so only the addressed seat's `respondDecision` intent can answer —
 * a client cannot answer on the other seat's behalf even by guessing the
 * decisionId. Candidates for an opponent-addressed `selectCards` (e.g. "trash 1
 * card in their hand") are drawn from that seat's OWN hand, so the seat asked to
 * choose already holds the information the choice requires — nothing hidden from
 * seat A is disclosed to seat A, because seat A is never sent the request.
 *
 * Note on scope: the FULL ordered, interruptible resolution loop (collect ->
 * order turn-player-first -> prompt optional -> resolve one-at-a-time -> rescan)
 * is the effect-stack-resolution subsystem (stack.ts). This adapter provides only
 * the decision round-trip those steps (and `activateEffect`) need; it does not
 * order or sequence multiple effects.
 */
export function createDecisionApi(manager: DecisionManager): DecisionApi {
  const controller = buildSeatScopedApi(manager, (ctx) => ctx.source.ownerSeat);
  const opponent = buildSeatScopedApi(manager, (ctx) => ctx.game.opponentOf(ctx.source.ownerSeat));
  return { ...controller, opponent };
}

/**
 * `ctx.ask.opponent` is typed optional (see the `DecisionApi.opponent` doc comment)
 * so pre-existing test fixtures do not all need updating. Card code must go through
 * this accessor rather than `ctx.ask.opponent` directly: it throws immediately if
 * the facade is missing, so a fixture that omits it fails loudly the first time an
 * opponent-addressed decision actually runs, instead of resolving `undefined?.foo()`
 * to `undefined` and letting the card silently treat that as an empty selection.
 */
export function requireOpponentAsk(ctx: EffectContext): SeatScopedDecisionApi {
  const opponent = ctx.ask.opponent;
  if (opponent === undefined) {
    throw new Error(
      "ctx.ask.opponent is not wired for this EffectContext — an opponent-addressed " +
        "decision (ctx.ask.opponent.*) was called from a test/context fixture built " +
        "without one. Real game contexts always have it (createDecisionApi).",
    );
  }
  return opponent;
}

/**
 * Builds one facade of the decision API. `resolveSeat` is the ONLY thing that
 * differs between `ctx.ask.*` and `ctx.ask.opponent.*` — every request-shaping,
 * response-unwrapping, and clamping rule below is shared.
 */
function buildSeatScopedApi(
  manager: DecisionManager,
  resolveSeat: (ctx: EffectContext) => Seat,
): SeatScopedDecisionApi {
  const provenance = (ctx: EffectContext) => ({
    timing: ctx.activeTiming,
    effectText: ctx.activeEffectText,
  });
  return {
    async optional(ctx: EffectContext, prompt: string): Promise<boolean> {
      const response = await manager.request({
        seat: resolveSeat(ctx),
        kind: "optional",
        promptText: prompt,
        sourceCardId: ctx.source.cardId,
        options: provenance(ctx),
      });
      return response.kind === "optional" ? response.accept : false;
    },

    async chooseTargets(
      ctx: EffectContext,
      opts: { candidates: string[]; min: number; max: number; visible?: string[]; maxTotalPlayCost?: number },
    ): Promise<string[]> {
      const response = await manager.request({
        seat: resolveSeat(ctx),
        kind: "chooseTargets",
        promptText: ctx.source.definition.nameEn || ctx.source.cardId,
        sourceCardId: ctx.source.cardId,
        options: {
          candidateInstanceIds: opts.candidates,
          visibleInstanceIds: opts.visible ?? opts.candidates,
          min: opts.min,
          max: opts.max,
          ...(opts.maxTotalPlayCost !== undefined ? { maxTotalPlayCost: opts.maxTotalPlayCost } : {}),
          ...provenance(ctx),
        },
      });
      const selected = clampSelection(
        response.kind === "chooseTargets" ? response.instanceIds : [],
        opts.candidates,
        opts.max,
      );
      return clampToCostBudget(ctx, selected, opts.maxTotalPlayCost, (id) => loosePlayCost(ctx, id));
    },

    async selectCards(
      ctx: EffectContext,
      opts: {
        candidates: string[];
        min: number;
        max: number;
        visible?: string[];
        visibleCards?: { instanceId: string; cardId: string }[];
        maxTotalPlayCost?: number;
        differentColors?: boolean;
        distinctCardIds?: boolean;
      },
    ): Promise<string[]> {
      const response = await manager.request({
        seat: resolveSeat(ctx),
        kind: "selectCards",
        promptText: ctx.source.definition.nameEn || ctx.source.cardId,
        sourceCardId: ctx.source.cardId,
        options: {
          candidateInstanceIds: opts.candidates,
          visibleInstanceIds: opts.visible ?? opts.candidates,
          visibleCards: opts.visibleCards,
          maxTotalPlayCost: opts.maxTotalPlayCost,
          min: opts.min,
          max: opts.max,
          differentColors: opts.differentColors,
          distinctCardIds: opts.distinctCardIds,
          ...provenance(ctx),
        },
      });
      const selected = clampSelection(
        response.kind === "selectCards" ? response.instanceIds : [],
        opts.candidates,
        opts.max,
      );
      return clampToCostBudget(ctx, selected, opts.maxTotalPlayCost, (id) => loosePlayCost(ctx, id));
    },

    async selectPermanents(
      ctx: EffectContext,
      opts: { candidates: string[]; min: number; max: number; maxTotalPlayCost?: number },
    ): Promise<string[]> {
      const response = await manager.request({
        seat: resolveSeat(ctx),
        kind: "chooseTargets",
        promptText: ctx.source.definition.nameEn || ctx.source.cardId,
        sourceCardId: ctx.source.cardId,
        options: {
          candidateInstanceIds: opts.candidates,
          min: opts.min,
          max: opts.max,
          ...(opts.maxTotalPlayCost !== undefined ? { maxTotalPlayCost: opts.maxTotalPlayCost } : {}),
          ...provenance(ctx),
        },
      });
      const selected = clampSelection(
        response.kind === "chooseTargets" ? response.instanceIds : [],
        opts.candidates,
        opts.max,
      );
      return clampToCostBudget(ctx, selected, opts.maxTotalPlayCost, (id) => permanentPlayCost(ctx, id));
    },

    async orderCards(
      ctx: EffectContext,
      opts: {
        candidates: string[];
        visibleCards?: { instanceId: string; cardId: string }[];
        destination?: "deckTop" | "deckBottom" | "stackBottom";
      },
    ): Promise<string[]> {
      const response = await manager.request({
        seat: resolveSeat(ctx),
        kind: "orderCards",
        promptText: "Choose the card order",
        sourceCardId: ctx.source.cardId,
        options: {
          candidateInstanceIds: opts.candidates,
          visibleInstanceIds: opts.candidates,
          visibleCards: opts.visibleCards,
          orderDestination: opts.destination,
          min: opts.candidates.length,
          max: opts.candidates.length,
          ...provenance(ctx),
        },
      });
      if (response.kind !== "orderCards") return opts.candidates;
      const allowed = new Set(opts.candidates);
      const unique = [...new Set(response.order)].filter((id) => allowed.has(id));
      return unique.length === opts.candidates.length ? unique : opts.candidates;
    },

    async chooseOption(ctx: EffectContext, choices: string[]): Promise<number> {
      const response = await manager.request({
        seat: resolveSeat(ctx),
        kind: "chooseOption",
        promptText: ctx.source.definition.nameEn || ctx.source.cardId,
        sourceCardId: ctx.source.cardId,
        options: { choices, ...provenance(ctx) },
      });
      if (response.kind !== "chooseOption") return 0;
      // Guard the index into range; an out-of-range pick falls back to the first
      // choice (the safe-default behaviour the manager also applies on timeout).
      if (response.optionIndex < 0 || response.optionIndex >= choices.length) return 0;
      return response.optionIndex;
    },
  };
}

/**
 * Keep only candidate ids the client was actually offered, de-duplicate, and cap at
 * `max`. The server never trusts the raw selection: a buggy/malicious client could
 * echo ids it was not given or exceed the count, so the engine re-enforces both
 * (API-CONTRACT.md "Intent validation contract"; the count is "enforced
 * server-side").
 */
/**
 * Server-side enforcement of a summed play-cost budget ("play any number whose total play costs
 * add up to N or less", BT11-044). The client picks; the server keeps the picks in the order it
 * received them only while the running total stays within budget, so an over-budget response
 * cannot buy a free play the printed text does not allow.
 */
function clampToCostBudget(
  ctx: EffectContext,
  chosen: readonly string[],
  budget: number | undefined,
  costOf: (instanceId: string) => number | undefined,
): string[] {
  if (budget === undefined) return [...chosen];
  const kept: string[] = [];
  let spent = 0;
  for (const id of chosen) {
    const cost = costOf(id) ?? 0;
    if (spent + cost > budget) continue;
    spent += cost;
    kept.push(id);
  }
  return kept;
}

/** The printed play cost of a loose card (hand, deck, trash, security, stack or link card). */
function loosePlayCost(ctx: EffectContext, instanceId: string): number | undefined {
  for (const owner of ctx.game.state.players) {
    if (owner === undefined) continue;
    const zones = [owner.hand, owner.deck, owner.trash, owner.security];
    for (const zone of zones) {
      const card = zone.find((c) => c.instanceId === instanceId);
      if (card) return ctx.game.definitionOf(card).playCost;
    }
    const permanents = [...owner.battleArea, ...(owner.breeding !== undefined ? [owner.breeding] : [])];
    for (const permanent of permanents) {
      const card =
        (permanent.topCard?.instanceId === instanceId ? permanent.topCard : undefined) ??
        permanent.stack.find((c) => c.instanceId === instanceId) ??
        permanent.linked.find((c) => c.instanceId === instanceId);
      if (card) return ctx.game.definitionOf(card).playCost;
    }
  }
  return undefined;
}

/** The printed play cost of a permanent's top card. */
function permanentPlayCost(ctx: EffectContext, permanentId: string): number | undefined {
  const permanent = ctx.game.permanentById(permanentId);
  const top = permanent?.topCard;
  return top ? ctx.game.definitionOf(top).playCost : undefined;
}

function clampSelection(chosen: readonly string[], candidates: readonly string[], max: number): string[] {
  const allowed = new Set(candidates);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of chosen) {
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}
