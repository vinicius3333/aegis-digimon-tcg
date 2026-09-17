import { Zone, CardInstance, type Seat } from "@aegis/shared";
import { insertCard, takeBottom, takeTop } from "../../state/access.js";
import { spliceById } from "../verbs/looseInstances.js";

import type { PrimitivesContext } from "./context.js";

/**
 * Trashing out of a security stack.
 */

export function createSecurityTrashVerbs(pc: PrimitivesContext) {
  const { engine, access, player } = pc;

  const trashFromSecurity = async (
    seat: Seat,
    n: number,
    opts?: { fromTop?: boolean; instanceIds?: string[]; cause?: "effect" | "barrierCost" },
  ): Promise<CardInstance[]> => {
    const p = player(seat);
    const fromTop = opts?.fromTop ?? false;
    const moved: CardInstance[] = [];
    for (let i = 0; i < n; i++) {
      const requestedId = opts?.instanceIds?.[i];
      const card =
        requestedId !== undefined
          ? spliceById(p.security, requestedId)
          : fromTop
            ? takeTop(p, Zone.Security)
            : takeBottom(p, Zone.Security);
      if (card === undefined) break;
      card.faceUp = true;
      insertCard(p, Zone.Trash, card);
      moved.push(card);
    }
    if (moved.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: moved.map((c) => c.instanceId),
        from: Zone.Security,
        to: Zone.Trash,
        // The cards are face-up in a public trash the moment this is emitted, so their
        // identities are public. Carried on the event because it is broadcast before
        // the state patch lands them in the trash a client could look them up in.
        cardIds: moved.map((c) => c.cardId),
        artIds: moved.map((c) => c.artId || c.cardId),
        seat,
      });
      // SubTrigger bus: a resolving EFFECT removed cards from `seat`'s security stack
      // attack-driven security check, which routes through its own seam. The payload names
      // the affected seat so a "when an effect removes from YOUR security" watcher (BT15-084)
      // gates on its own stack.
      const removedByEffect = opts?.cause !== "barrierCost";
      if (removedByEffect) {
        await engine.fireSubTrigger?.("whenEffectRemovesFromSecurity", { removedFromSecuritySeat: seat });
      }
      // Generic removal watchers (BT4-088) care that a card left security regardless of
      // whether it was checked or removed by an effect. Security checks already fire this
      // event at their own movement seam; effect-driven trash must reach the same bus too.
      await engine.fireSubTrigger?.("whenSecurityRemoved", {
        removedFromSecuritySeat: seat,
        ...(removedByEffect ? { securityRemovedByEffect: true } : {}),
      });
      await engine.fireSubTrigger?.("whenCardTrashedFromSecurity", {
        removedFromSecuritySeat: seat,
        trashedFromSecurityInstanceIds: moved.map((c) => c.instanceId),
      });
      // Effect-only counterpart for cards whose wording says "trashed from your security
      // stack by an effect" (BT17-036). Unlike whenCardTrashedFromSecurity, this event does
      // not fire for an ordinary security check, which also sends its checked card to trash.
      if (removedByEffect) {
        await engine.fireSubTrigger?.("whenEffectTrashesFromSecurity", {
          removedFromSecuritySeat: seat,
          trashedFromSecurityInstanceIds: moved.map((c) => c.instanceId),
        });
      }
      // Each trashed security card's own OnDiscardSecurity clause (ST22-10) fires now that it is in trash.
      await engine.fireDiscardedFromSecurity?.(moved.map((c) => c.instanceId));
    }
    return moved;
  };

  /**
   * "By trashing the top security card of 1 player with the most security cards, ..."
   * (ST23-05, BT26-031). A player is eligible when they have >=1 security card AND >=
   * the other player's count (a tie leaves BOTH eligible — the controller chooses, KB
   * Q6167). The whole thing is OPTIONAL: `controllerSeat` may decline. Uses sentinel
   * candidate ids ("mine"/"opponent", mirroring `forceAttack`'s "player" sentinel) rather
   * than the actual (face-down, hidden) security card instance ids, so the decision
   * itself leaks no card identity. Returns which seat (if any) was trashed from and the
   * trashed card, the source `...AndProcessAccordingToResult` shape — the caller
   * branches on whether anything was actually trashed.
   */
  const trashTopSecurityOfPlayerWithMostSecurity = async (
    controllerSeat: Seat,
  ): Promise<{ seat: Seat; trashed: CardInstance[] }> => {
    const opponentSeat = access.opponentOf(controllerSeat);
    const myCount = player(controllerSeat).security.length;
    const oppCount = player(opponentSeat).security.length;
    const MINE = "mine";
    const OPPONENT = "opponent";
    const candidates: string[] = [];
    if (myCount > 0 && myCount >= oppCount) candidates.push(MINE);
    if (oppCount > 0 && oppCount >= myCount) candidates.push(OPPONENT);
    if (candidates.length === 0) return { seat: controllerSeat, trashed: [] };
    const chosen = await engine.ask.selectInstances(
      controllerSeat,
      candidates,
      0,
      1,
      "Trash the top security card of 1 player with the most security cards?",
    );
    if (chosen.length === 0) return { seat: controllerSeat, trashed: [] };
    const seat = chosen[0] === OPPONENT ? opponentSeat : controllerSeat;
    const trashed = await trashFromSecurity(seat, 1, { fromTop: true });
    return { seat, trashed };
  };

  /**
   * Delete permanents from the field, sending each one's top card, whole digivolution
   * stack, and linked cards to their owners' trash (source
   * DeletePeremanentAndProcessAccordingToResult -> rule implementation.Destroy).
   * Reuses GameStateAccess.deletePermanent for the movement, then drops the permanent's
   * duration modifiers and emits a combatResolved-style narration. Async because it
   * fires WhenPermanentWouldBeDeleted here via engine.fireTiming before the movement,
   * and OnDestroyedAnyone (with deletedPermanentId/deletedInstanceIds) fires from
   * GameEngine after the movement completes.
   *
   * `cause` (default `byEffect`) is forwarded to `consultLeavePrevention` so a
   * leave-prevention reaction can discriminate WHY the permanent is leaving. The
   * ruleProcess fixpoint (state-based-action deletion) passes `byRule` so a
   * "can't be deleted by your opponent's effects" reaction does NOT wrongly fire on
   * a rule-based DP-0 deletion (RESEARCH Pitfall 5).
   */
  /** Top-card snapshot of live permanents, captured before they move out of the battle area. */

  return { trashFromSecurity, trashTopSecurityOfPlayerWithMostSecurity };
}
