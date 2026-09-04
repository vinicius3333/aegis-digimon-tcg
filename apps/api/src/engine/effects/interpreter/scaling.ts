// Counting the board to resolve a `for each ...` multiplier.

import type { EffectContext } from "../EffectContext.js";
import { definitionMatches } from "./matching/definition.js";
import { permanentMatchesFilter, seatsForController } from "./matching/permanent.js";
import { candidatePermanents } from "./targeting/permanents.js";
import { CardColor } from "@aegis/shared";
import type { Filter, Scaling, Target } from "@aegis/shared";

// ---------------------------------------------------------------------------
// Condition evaluation
// ---------------------------------------------------------------------------

/**
 * Count cards/permanents matching a filter across the right seats.
 * When `filter.zone` is "trash", counts loose card instances in the trash that match
 * `definitionMatches` (no permanent wrapper). Otherwise counts battle-area permanents
 * (the default for conditions like `youHave` and `opponentHas`). Default possession
 * includes breeding-area permanents; an explicit `battleArea` zone excludes breeding,
 * while an explicit `breeding` zone selects it alone.
 */
export function countMatching(ctx: EffectContext, filter: Filter): number {
  const seats = seatsForController(ctx, filter);
  let n = 0;
  // `filter.zone` may name several LOOSE-CARD zones to sum across (e.g. "in your trash
  // or your Digimon's digivolution cards" — EX9-054/EX9-005 Negamon archetype). A single
  // zone is treated as a one-element list so the existing single-zone behavior is
  // unchanged. Only these three zones hold loose cards outside the permanent model;
  // "battleArea" (the default for `youHave`/`opponentHas`, e.g. BT2-031) and any other
  // zone value must fall through to the default per-permanent scan below — special-
  // casing on `zone !== undefined` alone silently dropped that scan to 0 (regression).
  const looseCardZones: readonly string[] = ["trash", "hand", "security", "digivolutionCards"];
  if (filter.zone === "breeding") {
    for (const seat of seats) {
      const permanent = ctx.game.player(seat).breeding;
      if (permanent !== undefined && permanentMatchesFilter(ctx, permanent, filter, ctx.source)) n++;
    }
    return n;
  }
  if (filter.zone !== undefined) {
    const zones = Array.isArray(filter.zone) ? filter.zone : [filter.zone];
    if (zones.some((z) => looseCardZones.includes(z))) {
      for (const zone of zones) {
        if (zone === "trash") {
          for (const seat of seats) {
            const trash = ctx.game.player(seat).trash;
            for (const card of trash) {
              if (definitionMatches(filter, ctx.game.definitionOf(card))) n++;
            }
          }
        } else if (zone === "hand") {
          for (const seat of seats) {
            const hand = ctx.game.player(seat).hand;
            for (const card of hand) {
              if (definitionMatches(filter, ctx.game.definitionOf(card))) n++;
            }
          }
        } else if (zone === "security") {
          for (const seat of seats) {
            const security = ctx.game.player(seat).security;
            for (const card of security) {
              if (filter.faceUp === true && card.faceUp !== true) continue;
              if (filter.faceUp === false && card.faceUp === true) continue;
              if (definitionMatches(filter, ctx.game.definitionOf(card))) n++;
            }
          }
        } else if (zone === "digivolutionCards") {
          // All of the controller's battle-area permanents' digivolution-stack cards, not
          // just the source's own stack (distinct from Scaling unit "digivolutionCards").
          for (const seat of seats) {
            for (const permanent of ctx.game.player(seat).battleArea) {
              if (
                filter.hostFilter !== undefined &&
                !permanentMatchesFilter(ctx, permanent, filter.hostFilter, ctx.source)
              )
                continue;
              for (const card of permanent.stack) {
                if (definitionMatches(filter, ctx.game.definitionOf(card))) n++;
              }
            }
          }
        }
      }
      return n;
    }
  }
  if (filter.zone === "battleArea") {
    for (const seat of seats) {
      for (const permanent of ctx.game.player(seat).battleArea) {
        if (permanentMatchesFilter(ctx, permanent, filter, ctx.source)) n++;
      }
    }
    return n;
  }
  for (const seat of seats) {
    for (const permanent of ctx.game.player(seat).battleArea) {
      if (permanentMatchesFilter(ctx, permanent, filter, ctx.source)) n++;
    }
    const breeding = ctx.game.player(seat).breeding;
    if (breeding !== undefined && permanentMatchesFilter(ctx, breeding, filter, ctx.source)) n++;
  }
  return n;
}

/** Distinct colors among battle-area permanents matching a filter. */
function countColors(ctx: EffectContext, filter: Filter): number {
  const seats = seatsForController(ctx, filter);
  const colors = new Set<CardColor>();
  const zones = Array.isArray(filter.zone) ? filter.zone : filter.zone === undefined ? [] : [filter.zone];
  // "for each different color in your opponent's trash" counts cards, not battle-area
  // permanents. This is the form used by BT18-085 and similar effects; routing every
  // color scale through permanent matching silently returned zero for a loose-card zone.
  if (zones.includes("trash")) {
    for (const seat of seats) {
      for (const card of ctx.game.player(seat).trash) {
        const definition = ctx.game.definitionOf(card);
        if (!definitionMatches(filter, definition)) continue;
        for (const color of definition.colors) colors.add(color);
      }
    }
    return colors.size;
  }
  if (zones.includes("digivolutionCards")) {
    const self = ctx.source.permanent();
    if (self === undefined) return 0;
    for (const card of self.stack) {
      const definition = ctx.game.definitionOf(card);
      if (!definitionMatches(filter, definition)) continue;
      for (const color of definition.colors) colors.add(color);
    }
    return colors.size;
  }
  for (const seat of seats) {
    for (const permanent of ctx.game.player(seat).battleArea) {
      if (!permanentMatchesFilter(ctx, permanent, filter, ctx.source)) continue;
      if (permanent.topCard === undefined) continue;
      const effectiveColors = ctx.game.effectiveColors?.(permanent) ?? ctx.game.definitionOf(permanent.topCard).colors;
      for (const c of effectiveColors) colors.add(c);
    }
  }
  return colors.size;
}

/** Total linked cards across the battle-area permanents matching a filter (BT25-075). */
function countLinkCards(ctx: EffectContext, filter: Filter): number {
  const seats = seatsForController(ctx, filter);
  let n = 0;
  for (const seat of seats) {
    for (const permanent of ctx.game.player(seat).battleArea) {
      if (!permanentMatchesFilter(ctx, permanent, filter, ctx.source)) continue;
      n += permanent.linked?.length ?? 0;
    }
  }
  return n;
}

/**
 * The multiplier a `for each/every` clause contributes: count the relevant pool
 * (cards / colors / security / trash / digivolution cards), divide by `per`, floor.
 * Returns 0 when nothing is counted (so "for each X" with no X does nothing).
 */
export function scaleFactor(ctx: EffectContext, scaling: Scaling): number {
  let raw = 0;
  const filter = scaling.filter ?? {};
  if (filter.deletedByTrigger === true) {
    const snapshots = ctx.trigger.deletedPermanentSnapshots;
    if (snapshots === undefined) {
      raw = ctx.trigger.deletedPermanentIds?.length ?? 0;
    } else {
      const allowedSeats = seatsForController(ctx, filter);
      raw = snapshots.filter(
        ({ controllerSeat, topCardId }) =>
          allowedSeats.includes(controllerSeat) &&
          definitionMatches(filter, ctx.game.definitionOf({ cardId: topCardId } as never)),
      ).length;
    }
    const per = scaling.per > 0 ? scaling.per : 1;
    return Math.floor(raw / per);
  }
  if ((filter as { suspendedByThisEffect?: boolean }).suspendedByThisEffect === true) {
    const { suspendedByThisEffect: _receipt, ...matchingFilter } = filter as typeof filter & {
      suspendedByThisEffect?: boolean;
    };
    raw = (ctx.lastSuspendedPermanentIds ?? []).filter((id) => {
      const permanent = ctx.game.permanentById(id);
      if (permanent === undefined || !permanent.isSuspended) return false;
      if (
        matchingFilter.controller === "opponent" &&
        permanent.controllerSeat !== ctx.game.opponentOf(ctx.source.ownerSeat)
      )
        return false;
      if (matchingFilter.controller === "mine" && permanent.controllerSeat !== ctx.source.ownerSeat) return false;
      return permanentMatchesFilter(ctx, permanent, matchingFilter, ctx.source);
    }).length;
    const per = scaling.per > 0 ? scaling.per : 1;
    return Math.floor(raw / per);
  }
  // `deletedByThisEffect` overrides the normal counting source: count the permanents
  // actually deleted by the preceding DeleteByDPBudget action in this resolution (CAP-A3).
  if (filter.deletedByThisEffect) {
    const ids = ctx.lastDeletedByThisEffectIds ?? [];
    const per = scaling.per > 0 ? scaling.per : 1;
    return Math.floor(ids.length / per);
  }
  switch (scaling.unit) {
    case "lastDeletedLevel":
      raw = ctx.lastDeletedLevel ?? 0;
      break;
    case "memory": {
      const ownPerspective =
        ctx.source.ownerSeat === ctx.game.state.turnSeat ? ctx.game.state.memory : -ctx.game.state.memory;
      const controller = filter.controller ?? "mine";
      raw = controller === "opponent" ? Math.max(0, -ownPerspective) : Math.max(0, ownPerspective);
      break;
    }
    case "cards":
      if (filter.zone === "revealed") {
        raw = (ctx.lastRevealedCards ?? []).filter((card) =>
          definitionMatches(filter, ctx.game.definitionOf({ cardId: card.cardId } as never)),
        ).length;
      } else {
        raw = countMatching(ctx, filter);
      }
      break;
    case "placedCards":
      raw = ctx.placedUnderInstanceIdsThisEffect?.length ?? 0;
      break;
    case "colors":
      raw = countColors(ctx, filter);
      break;
    case "distinctNames": {
      // "For each of your red Tamers with DIFFERENT NAMES" (BT21-082) — documented behavior
      // `Combinations.GetUniqueNameCardCount`. Same-named permanents collapse to one, so a
      // second copy of the same Tamer adds nothing. KB Q4595: the source counts itself.
      const names = new Set<string>();
      for (const seat of seatsForController(ctx, filter)) {
        for (const permanent of ctx.game.player(seat).battleArea) {
          if (!permanentMatchesFilter(ctx, permanent, filter, ctx.source)) continue;
          if (permanent.topCard === undefined) continue;
          names.add((ctx.game.definitionOf(permanent.topCard).nameEn ?? "").toLowerCase());
        }
      }
      raw = names.size;
      break;
    }
    case "security": {
      const seats = seatsForController(ctx, { ...filter, controller: filter.controller ?? "mine" });
      for (const seat of seats) {
        const stack = ctx.game.player(seat).security;
        // Honor faceUp:true on the scaling filter — count only face-up security cards
        // (BT19-096 "for each of your face-up security cards").
        raw += filter.faceUp === true ? stack.filter((c) => c.faceUp === true).length : stack.length;
      }
      break;
    }
    case "trash": {
      const seats = seatsForController(ctx, { ...filter, controller: filter.controller ?? "mine" });
      const names = filter.distinctNames === true ? new Set<string>() : undefined;
      for (const seat of seats) {
        const trash = ctx.game.player(seat).trash;
        const alternatives = (filter as Filter & { orFilters?: Filter[] }).orFilters ?? [];
        for (const card of trash) {
          if (filter.excludeSelf === true && card.instanceId === ctx.source.instanceId) continue;
          const definition = ctx.game.definitionOf(card);
          const matches =
            definitionMatches(filter, definition) ||
            alternatives.some((alternative) => definitionMatches(alternative, definition));
          if (!matches) continue;
          if (names !== undefined) {
            names.add((definition.nameEn ?? card.cardId).toLowerCase());
          } else {
            raw++;
          }
        }
      }
      if (names !== undefined) raw = names.size;
      break;
    }
    case "digivolutionCards": {
      const self = ctx.source.permanent();
      raw = self
        ? self.stack.filter(
            (card) =>
              (filter.faceDown !== true || !card.faceUp) &&
              (filter.faceUp !== true || card.faceUp) &&
              definitionMatches(filter, ctx.game.definitionOf(card)),
          ).length
        : 0;
      break;
    }
    case "sameLevelDigivolutionPairs": {
      const self = ctx.source.permanent();
      const byLevel = new Map<number, number>();
      for (const card of self?.stack ?? []) {
        const level = ctx.game.definitionOf(card).level;
        if (level === undefined) continue;
        byLevel.set(level, (byLevel.get(level) ?? 0) + 1);
      }
      raw = Array.from(byLevel.values()).reduce((pairs, count) => pairs + Math.floor(count / 2), 0);
      break;
    }
    case "selfFaceDownDigivolutionCards": {
      // EX9-061 "for every 2 of this Digimon's face-down digivolution cards" — unlike
      // "digivolutionCards", only stack cards NOT face-up count.
      const self = ctx.source.permanent();
      raw = self ? self.stack.filter((c) => c.faceUp !== true).length : 0;
      break;
    }
    case "digivolutionCardsOfFiltered": {
      // Count the digivolution-stack of ONE battle-area permanent that matches `filter`
      // (the one with the LARGEST stack when multiple qualify — maximizes the player's benefit
      // and avoids a prompt in the common single-match case). This is distinct from
      // `digivolutionCards` which always reads the SOURCE permanent's stack (BT19-100:
      // "for each of 1 of your [Mother D-Reaper]'s digivolution cards").
      const candidates = candidatePermanents(ctx, { filter, count: "all" } as Target);
      raw = candidates.reduce((max, p) => Math.max(max, p.stack.length), 0);
      break;
    }
    case "targetFaceDownDigivolutionCards":
      // ModifyDP resolves this per target after selection; returning 1 keeps the generic
      // dispatch path alive until each target's own stack is available.
      raw = 1;
      break;
    case "digivolutionCardColors": {
      // Distinct colors among the SOURCE permanent's digivolution-stack cards (BT18-018).
      const self = ctx.source.permanent();
      if (self) {
        const colors = new Set<CardColor>();
        for (const card of self.stack) {
          for (const c of ctx.game.definitionOf(card).colors) colors.add(c);
        }
        raw = colors.size;
      }
      break;
    }
    case "selfAndDigivolutionCardColors": {
      const self = ctx.source.permanent();
      if (self?.topCard) {
        const colors = new Set<CardColor>(ctx.game.definitionOf(self.topCard).colors);
        for (const card of self.stack) {
          for (const color of ctx.game.definitionOf(card).colors) colors.add(color);
        }
        raw = colors.size;
      }
      break;
    }
    case "linkCards": {
      // Total linked cards across the battle-area permanents matching the filter ("for each of
      // your link cards", BT25-075). Counts the cards in each matching permanent's `linked` list.
      raw = countLinkCards(ctx, filter);
      break;
    }
    case "namedCount": {
      raw = scaling.countSource !== undefined ? (ctx.namedCounts?.get(scaling.countSource) ?? 0) : 0;
      break;
    }
    case "deletedThisEffect": {
      raw = ctx.deletedThisEffectIds?.length ?? ctx.lastDeletedByThisEffectIds?.length ?? 0;
      break;
    }
    default:
      raw = 0;
  }
  const per = scaling.per > 0 ? scaling.per : 1;
  const scaled = Math.floor(raw / per);
  // A `floor` clamps the multiplier UP (BT7-040: 0 security => cost 1, not 0).
  return scaling.floor !== undefined && scaled < scaling.floor ? scaling.floor : scaled;
}
