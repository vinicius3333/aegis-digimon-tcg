import { CardKind, DECK_BOTTOM, Zone, requireCardDefinition, CardInstance, type Seat } from "@aegis/shared";
import { applyOverflow, insertCard } from "../../state/access.js";
import {
  collectForReturn,
  hostOfStackInstance,
  looseZoneOfInstance,
  overflowOriginInstanceIds,
  ownerSeatOfLoose,
} from "../verbs/looseInstances.js";

import type { PrimitivesContext } from "./context.js";

/**
 * Returning permanents and loose cards to a hand or deck.
 */

export function createReturnsVerbs(pc: PrimitivesContext) {
  const { engine, access, currentHandAddProvenance, dropPermanentLedgers, effectSeatStack, player, state } = pc;
  // Reached through the context because these are built in sibling modules: the
  // whole set exists before any of it runs, so forwarding at call time is safe.
  const detachPermanentTopsToHand: PrimitivesContext["helpers"]["detachPermanentTopsToHand"] = (...args) =>
    pc.helpers.detachPermanentTopsToHand(...args);
  const filterBouncePrevented: PrimitivesContext["helpers"]["filterBouncePrevented"] = (...args) =>
    pc.helpers.filterBouncePrevented(...args);
  const filterLockedStackReturns: PrimitivesContext["helpers"]["filterLockedStackReturns"] = (...args) =>
    pc.helpers.filterLockedStackReturns(...args);
  const fireWhenReturnedPermanentsLeave: PrimitivesContext["helpers"]["fireWhenReturnedPermanentsLeave"] = (...args) =>
    pc.helpers.fireWhenReturnedPermanentsLeave(...args);

  const returnToHand = async (
    instanceIds: string[],
    opts?: { silent?: boolean; byEffectSeat?: Seat; detachPermanentTop?: boolean; publicIdentities?: boolean },
  ): Promise<CardInstance[]> => {
    if (opts?.detachPermanentTop === true) return detachPermanentTopsToHand(instanceIds, opts);
    instanceIds = filterLockedStackReturns(instanceIds, opts?.byEffectSeat ?? effectSeatStack.at(-1));
    instanceIds = await filterBouncePrevented(instanceIds);
    // Bind each battle-area target to the permanent identity selected by the return effect.
    // A would-be-returned reaction can replace that Digimon with a new permanent (BT20-074
    // DNA digivolving one of the materials; Q4400). The original return must then lose its
    // target rather than re-finding the same card instance underneath the new Digimon.
    const targetedPermanentByInstance = new Map<string, string>();
    // Fire `wouldBeReturned` for each battle-area permanent whose top-card is about to land in
    // hand (CAP-C-11). Fires BEFORE the move so a watcher (BT20-074 DNA digivolve) can respond.
    if (engine.fireSubTrigger) {
      for (const instanceId of instanceIds) {
        let foundPermId: string | undefined;
        outer: for (const owner of state.players) {
          for (const perm of owner.battleArea) {
            if (perm.topCard?.instanceId === instanceId) {
              foundPermId = perm.permanentId;
              break outer;
            }
          }
        }
        if (foundPermId !== undefined) {
          targetedPermanentByInstance.set(instanceId, foundPermId);
          await engine.fireSubTrigger("wouldBeReturned", {
            subjectPermanentId: foundPermId,
            returnDestination: "hand",
          });
        }
      }
    }
    instanceIds = instanceIds.filter((instanceId) => {
      const targetedPermanentId = targetedPermanentByInstance.get(instanceId);
      if (targetedPermanentId === undefined) return true;
      return access.permanentById(targetedPermanentId)?.topCard?.instanceId === instanceId;
    });
    await fireWhenReturnedPermanentsLeave(instanceIds, opts);
    // Record which of the requested instances start in TRASH before the move, for
    // whenCardReturnsFromTrashToHand (BT15-082/BT16-011: "a card returns from your trash to
    // your hand") — the move itself is zone-agnostic, so the origin must be captured now.
    const trashOriginIds = new Set<string>();
    for (const owner of state.players) {
      for (const card of owner.trash) {
        if (instanceIds.includes(card.instanceId)) trashOriginIds.add(card.instanceId);
      }
    }
    const moved: CardInstance[] = [];
    const movedToHand: CardInstance[] = [];
    const trashedAttachments: CardInstance[] = [];
    const overflowOrigins = overflowOriginInstanceIds(state);
    for (const instanceId of instanceIds) {
      const collected = collectForReturn(state, instanceId, dropPermanentLedgers);
      if (collected === undefined) continue;
      for (const card of collected) {
        card.faceUp = true;
        if (card.instanceId === instanceId || collected.length === 1) {
          // A Digi-Egg selected by a generic "return ... to hand" effect cannot enter a hand;
          // it returns face-down to the bottom of its owner's Digi-Egg deck (KB BT25-080 Q6715).
          const definition = requireCardDefinition(card.cardId);
          if (definition.isToken === true) {
            // A token can pay a return-to-hand processing condition, but ceases to exist instead
            // of entering any zone (BT14-030 Q2404). Keep it in `moved` as a successful leave
            // receipt while deliberately excluding it from hand-addition trigger payloads.
            moved.push(card);
          } else if (definition.kinds.includes(CardKind.DigiEgg)) {
            card.faceUp = false;
            insertCard(player(card.ownerSeat), Zone.EggDeck, card);
            moved.push(card);
          } else {
            insertCard(player(card.ownerSeat), Zone.Hand, card);
            moved.push(card);
            movedToHand.push(card);
          }
        } else {
          insertCard(player(card.ownerSeat), Zone.Trash, card);
          trashedAttachments.push(card);
        }
      }
    }
    // <Overflow> (CR 4-19-1): a bounced permanent's top/stack/linked cards just left the
    // field (or left from under it) for hand — a genuine leave, same as deletion.
    applyOverflow(
      engine.memory,
      [...moved, ...trashedAttachments].filter((card) => overflowOrigins.has(card.instanceId)),
      state.turnSeat,
    );
    if (trashedAttachments.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: trashedAttachments.map((card) => card.instanceId),
        from: "battleArea",
        to: Zone.Trash,
      });
    }
    if (movedToHand.length > 0) {
      // A hand is redacted per seat, so the identities have to ride on the event for the
      // opponent to read them — but only when the rules already made these cards public
      // (a card taken from a reveal), never for an ordinary private hand addition.
      const artIds = movedToHand.map((c) => c.artId ?? "");
      engine.emit({
        kind: "cardsMoved",
        instanceIds: movedToHand.map((c) => c.instanceId),
        from: "various",
        to: Zone.Hand,
        ...(opts?.publicIdentities === true
          ? {
              cardIds: movedToHand.map((c) => c.cardId),
              ...(artIds.some((artId) => artId !== "") ? { artIds } : {}),
            }
          : {}),
      });
      // A card can carry a hand-resident static effect whose eligibility changes at the
      // instant it reaches hand (for example, BT6-105 waives its own color requirement
      // while its controller has a Three Musketeers Digimon). Re-derive the continuous
      // tier before any return-to-hand reactions or the caller's next action inspect the
      // card. Without this boundary recompute, a nested effect such as BT6-112's
      // "return, then use" sees the card in hand but still reads the stale pre-move
      // continuous ledger.
      await engine.recomputeContinuousEffects?.();
      // Returning a card to its owner's hand is an effect-driven hand addition
      // ("when an effect adds cards to your [opponent's] hand"). Fire once per distinct
      // recipient seat; each watcher gates on the seat being its own controller/opponent.
      // `silent` suppresses this for a transient stage-to-hand that is immediately followed
      // by a play/digivolve (RevealAdd `to:play`/`to:digivolve`): the card never settles in
      // the owner's usable hand, so it is not a hand addition the watcher should observe.
      if (opts?.silent !== true) {
        const recipientSeats = new Set(movedToHand.map((c) => c.ownerSeat));
        for (const seat of recipientSeats) {
          const addedToHand = {
            instanceIds: movedToHand.filter((c) => c.ownerSeat === seat).map((c) => c.instanceId),
            byEffect: currentHandAddProvenance(),
          };
          await engine.fireSubTrigger?.("whenEffectAddsToOpponentHand", { effectAddedToHandSeat: seat, addedToHand });
          await engine.fireSubTrigger?.("whenEffectAddsToHand", { effectAddedToHandSeat: seat, addedToHand });
        }
        const trashReturned = movedToHand.filter((c) => trashOriginIds.has(c.instanceId));
        if (trashReturned.length > 0) {
          const trashReturnSeats = new Set(trashReturned.map((c) => c.ownerSeat));
          for (const seat of trashReturnSeats) {
            await engine.fireSubTrigger?.("whenCardReturnsFromTrashToHand", {
              returnedFromTrashSeat: seat,
              returnedFromTrashCardIds: trashReturned.filter((c) => c.ownerSeat === seat).map((c) => c.cardId),
            });
          }
        }
        const returnedDigimon = movedToHand.filter((card) =>
          requireCardDefinition(card.cardId).kinds.includes(CardKind.Digimon),
        );
        for (const seat of new Set(returnedDigimon.map((card) => card.ownerSeat))) {
          await engine.fireSubTrigger?.("whenDigimonReturnsToHand", {
            returnedDigimonToHandSeat: seat,
            returnedDigimonToHandInstanceIds: returnedDigimon
              .filter((card) => card.ownerSeat === seat)
              .map((card) => card.instanceId),
          });
        }
      }
    }
    return moved;
  };

  /**
   * Return cards to the top or bottom of their owners' decks (source
   * WhenReturntoLibrary / DeckBottomBounce). `toTop` puts them on top (index 0),
   * otherwise the bottom. As with returnToHand, a permanent's top-card instance
   * bounces the whole permanent. Cards go face-down (deck is hidden). Returns the
   * instances moved.
   */
  const returnToDeck = async (
    instanceIds: string[],
    opts?: {
      toTop?: boolean;
      byEffectSeat?: Seat;
      byEffectCardId?: string;
      suppressWhenEffectAddsToDeck?: boolean;
    },
  ): Promise<CardInstance[]> => {
    instanceIds = filterLockedStackReturns(instanceIds, opts?.byEffectSeat ?? effectSeatStack.at(-1));
    instanceIds = await filterBouncePrevented(instanceIds);
    const toTop = opts?.toTop ?? false;
    const returnedFromTrashById = new Map<string, Seat>();
    for (const instanceId of instanceIds) {
      if (looseZoneOfInstance(state, instanceId) !== "trash") continue;
      const ownerSeat = ownerSeatOfLoose(state, instanceId);
      if (ownerSeat !== undefined) returnedFromTrashById.set(instanceId, ownerSeat);
    }
    // Bind each battle-area target to the permanent identity selected by the return effect.
    // A would-be-returned reaction can replace that Digimon with a new permanent (BT20-074
    // DNA digivolving one of the materials; Q4400). The original deck return must then lose its
    // target rather than re-finding the same card instance underneath the new Digimon.
    const targetedPermanentByInstance = new Map<string, string>();
    // Fire `wouldBeReturned` for each battle-area permanent whose top-card is about to land in
    // the deck (CAP-C-11). Fires BEFORE the move, consistent with returnToHand.
    if (engine.fireSubTrigger) {
      for (const instanceId of instanceIds) {
        let foundPermId: string | undefined;
        outer: for (const owner of state.players) {
          for (const perm of owner.battleArea) {
            if (perm.topCard?.instanceId === instanceId) {
              foundPermId = perm.permanentId;
              break outer;
            }
          }
        }
        if (foundPermId !== undefined) {
          targetedPermanentByInstance.set(instanceId, foundPermId);
          await engine.fireSubTrigger("wouldBeReturned", {
            subjectPermanentId: foundPermId,
            returnDestination: "deck",
          });
        }
      }
    }
    instanceIds = instanceIds.filter((instanceId) => {
      const targetedPermanentId = targetedPermanentByInstance.get(instanceId);
      if (targetedPermanentId === undefined) return true;
      return access.permanentById(targetedPermanentId)?.topCard?.instanceId === instanceId;
    });
    // Digivolution-stack cards being returned to the deck BOTTOM (toTop === false): record each
    // one's host permanent + cardId BEFORE removal so onDigivolutionCardReturnToDeckBottom can fire
    // for the host's own watcher once the card has landed (BT11-065 "[Vemmon] placed from this
    // Digimon's digivolution cards at the bottom of its owner's deck"). A whole-permanent return
    const stackReturns: { hostPermanentId: string; cardId: string; instanceId: string }[] = [];
    if (!toTop && engine.fireSubTrigger) {
      for (const instanceId of instanceIds) {
        const host = hostOfStackInstance(state, instanceId);
        if (host !== undefined) stackReturns.push({ ...host, instanceId });
      }
    }
    await fireWhenReturnedPermanentsLeave(instanceIds, opts);
    // Collect the entire batch before reinserting any card. Some callers order cards that are
    // already in the destination deck (RevealAdd keeps revealed cards face-up in place); a
    // collect-and-insert loop mutates that deck between removals and can invert the requested
    // order. Batch collection makes the move atomic and exposes no transient zone.
    const overflowOrigins = overflowOriginInstanceIds(state);
    const collectedBatches: { instanceId: string; cards: CardInstance[] }[] = [];
    for (const instanceId of instanceIds) {
      const collected = collectForReturn(state, instanceId, dropPermanentLedgers);
      if (collected === undefined) continue;
      collectedBatches.push({ instanceId, cards: collected });
    }
    const moved: CardInstance[] = [];
    const trashedAttachments: CardInstance[] = [];
    for (const { instanceId, cards } of collectedBatches) {
      for (const card of cards) {
        if (card.instanceId === instanceId || cards.length === 1) {
          card.faceUp = false;
          const definition = requireCardDefinition(card.cardId);
          const deckZone = definition.kinds.includes(CardKind.DigiEgg) ? Zone.EggDeck : Zone.Deck;
          insertCard(player(card.ownerSeat), deckZone, card, toTop ? "top" : "bottom");
          moved.push(card);
        } else {
          card.faceUp = true;
          insertCard(player(card.ownerSeat), Zone.Trash, card);
          trashedAttachments.push(card);
        }
      }
    }
    // <Overflow> (CR 4-19-1): same genuine leave as returnToHand, landing in the deck instead.
    applyOverflow(
      engine.memory,
      [...moved, ...trashedAttachments].filter((card) => overflowOrigins.has(card.instanceId)),
      state.turnSeat,
    );
    if (trashedAttachments.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: trashedAttachments.map((card) => card.instanceId),
        from: "battleArea",
        to: Zone.Trash,
      });
    }
    if (moved.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: moved.map((c) => c.instanceId),
        from: "various",
        // `toTop` is a per-call option, so one batch never splits across both ends. The
        // bottom gets its own destination name because "under the whole deck" is the part
        // the player must be able to read back; `cardsMoved.to` is already a free-form label
        // (`"various"`, `"suspended"`) that no rules code branches on, so naming the position
        // here is a smaller change than adding a placement field to every mover.
        to: toTop ? Zone.Deck : DECK_BOTTOM,
      });
      // The whenEffectAddsToHand sibling for deck-bound returns (BT26-015). Fire once per
      // distinct recipient seat, mirroring returnToHand's own-hand fire above. Revealed cards
      // being restored use the explicit suppression flag because Q6949 says that restoration
      // is not an "add to deck" trigger.
      if (opts?.suppressWhenEffectAddsToDeck !== true) {
        const recipientSeats = new Set(moved.map((c) => c.ownerSeat));
        for (const seat of recipientSeats) {
          await engine.fireSubTrigger?.("whenEffectAddsToDeck", {
            effectAddedToDeckSeat: seat,
            effectAddedToDeckBySeat: effectSeatStack.at(-1) ?? engine.controllerSeat(),
            ...(opts?.byEffectCardId !== undefined ? { byEffectCardId: opts.byEffectCardId } : {}),
          });
        }
      }
    }
    const movedIds = new Set(moved.map((c) => c.instanceId));
    const trashReturnSeats = new Set<Seat>();
    for (const [instanceId, seat] of returnedFromTrashById) {
      if (movedIds.has(instanceId)) trashReturnSeats.add(seat);
    }
    for (const seat of trashReturnSeats) {
      await engine.fireSubTrigger?.("whenCardReturnsFromTrashToDeck", {
        returnedFromTrashToDeckSeat: seat,
      });
    }
    for (const ret of stackReturns) {
      if (!movedIds.has(ret.instanceId)) continue;
      await engine.fireSubTrigger!("onDigivolutionCardReturnToDeckBottom", {
        subjectPermanentId: ret.hostPermanentId,
        returnedToDeckCardId: ret.cardId,
      });
    }
    return moved;
  };

  /**
   * Return a suffix of each complete Digimon stack to the top of its owner's deck. Unlike the
   * generic return verb, selecting the current top here does not bounce the whole permanent:
   * the highest card that remains underneath is promoted. This is the movement printed on
   * BT26-060 ("top 5 stacked cards"), whose rulings explicitly say to stop once one card
   * remains in a short stack.
   */

  return { returnToHand, returnToDeck };
}
