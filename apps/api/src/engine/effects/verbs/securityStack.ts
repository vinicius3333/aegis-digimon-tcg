import { Zone, CardInstance, type Seat } from "@aegis/shared";
import { extractCardAt, insertCard, takeBottom, takeTop } from "../../state/access.js";

import type { PrimitivesContext } from "./context.js";

/**
 * Reordering, moving and flipping cards inside a security stack.
 */

export function createSecurityStackVerbs(pc: PrimitivesContext) {
  const { engine, continuous, effectSeatStack, player } = pc;

  const shuffleSecurity = (seat: Seat): void => {
    const stack = player(seat).security;
    for (let i = stack.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = stack[i]!;
      const b = stack[j]!;
      stack[i] = b;
      stack[j] = a;
    }
    // Shuffling re-hides every security card: a card turned face-up by an effect is
    // face-down again once the stack is shuffled (KB EX11-064 Q5929-5931, BT25-102).
    for (const card of stack) card.faceUp = false;
  };

  const revealCard = (seat: Seat, cardId: string, sourceCardId?: string): void => {
    engine.emit({ kind: "cardRevealed", seat, cardId, ...(sourceCardId !== undefined ? { sourceCardId } : {}) });
  };

  /**
   * Move `n` of `seat`'s security cards to its owner's hand (source
   * SecurityToHand / "add your top security card to the hand"). `fromTop` (default)
   * takes from index 0; otherwise the bottom. `instanceIds` selects exact cards from
   * the security stack for "look at your security stack, add 1" effects. Cards become
   * face-up in hand.
   */
  const securityToHand = async (
    seat: Seat,
    n: number,
    opts?: { fromTop?: boolean; instanceIds?: string[] },
  ): Promise<CardInstance[]> => {
    const p = player(seat);
    const fromTop = opts?.fromTop ?? true;
    const moved: CardInstance[] = [];
    if (opts?.instanceIds !== undefined) {
      const requested = new Set(opts.instanceIds.slice(0, n));
      for (let i = p.security.length - 1; i >= 0; i--) {
        const card = p.security[i];
        if (card === undefined || !requested.has(card.instanceId)) continue;
        extractCardAt(p, Zone.Security, i);
        card.faceUp = true;
        insertCard(p, Zone.Hand, card);
        moved.push(card);
      }
    } else {
      for (let i = 0; i < n; i++) {
        const card = fromTop ? takeTop(p, Zone.Security) : takeBottom(p, Zone.Security);
        if (card === undefined) break;
        card.faceUp = true;
        insertCard(p, Zone.Hand, card);
        moved.push(card);
      }
    }
    if (moved.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: moved.map((c) => c.instanceId),
        from: Zone.Security,
        to: Zone.Hand,
      });
      // A card added from security to hand still left the security stack. Publish the
      // same generic removal event used by checks and effect-driven trash so watchers
      // such as BT4-097 react to every printed form of security removal (KB Q1250).
      await engine.fireSubTrigger?.("whenSecurityRemoved", { removedFromSecuritySeat: seat });
    }
    return moved;
  };

  /**
   * ＜Recovery +N (Deck)＞: move the top `n` cards of `seat`'s deck onto the TOP of its
   * security stack, face-down (source Recovery keyword). The deck top becomes the
   * new security top. Stops at an empty deck. Security has no universal maximum;
   * card-specific ceilings such as EX2-018 Q3304 are enforced by that card's effect.
   * Returns the cards moved.
   */
  const recoverToSecurity = async (seat: Seat, n: number): Promise<CardInstance[]> => {
    if (continuous.cannotAddSecurityFromEffect(effectSeatStack.at(-1))) return [];
    const p = player(seat);
    const moved: CardInstance[] = [];
    // There is no universal security-stack maximum. Individual cards that say
    // they cannot raise security above a threshold enforce that condition locally.
    for (let i = 0; i < n; i++) {
      const card = takeTop(p, Zone.Deck);
      if (card === undefined) break;
      card.faceUp = false;
      insertCard(p, Zone.Security, card, "top");
      moved.push(card);
    }
    if (moved.length > 0) {
      engine.emit({
        kind: "cardsMoved",
        instanceIds: moved.map((c) => c.instanceId),
        from: Zone.Deck,
        to: Zone.Security,
      });
      // Narrate Recovery without revealing the face-down cards' identities. The
      // synchronized state remains authoritative; this event exists so clients can
      // explain the otherwise easy-to-miss increase in the security stack.
      engine.emit({ kind: "securityRecovered", seat, amount: moved.length });
      // SubTrigger bus: "when cards are added to security" watchers (documented behavior EffectTiming.OnAddSecurity,
      // documented behavior IAddSecurity.AddSecurity). Fired once per add operation, mirroring the
      // source single StackSkillInfos(OnAddSecurity) call — the counterpart to whenSecurityRemoved.
      // Awaited (not detached `void`) so a watcher body's decisions/mutations are sequenced after
      // this add and before the calling effect continues, matching the onDeletionOf seam (WR-01).
      if (engine.fireSubTrigger)
        await engine.fireSubTrigger("whenAddSecurity", {
          addedToSecuritySeat: seat,
          addedToSecurityInstanceIds: moved.map((c) => c.instanceId),
        });
    }
    return moved;
  };

  /**
   * Flip `seat`'s top FACE-UP security card face down (source the `SetReverse()`
   * loop in the "by flipping your top face-up security card face down" cost). Scans
   * from the top of the stack and flips the first face-up card; returns true when a
   * card was flipped (false when there was no face-up security card to flip). Used by
   * the flipSecurity prevention cost (BT23-043, EX11-031).
   */
  const flipTopSecurity = (seat: Seat): boolean => {
    const stack = player(seat).security;
    for (const card of stack) {
      if (card.faceUp) {
        card.faceUp = false;
        engine.emit({
          kind: "cardsMoved",
          instanceIds: [card.instanceId],
          from: Zone.Security,
          to: Zone.Security,
        });
        return true;
      }
    }
    return false;
  };

  /**
   * Flip `seat`'s top FACE-DOWN security card FACE UP (source the
   * `new IFlipSecurity(source).FlipFaceUp()` over the first non-flipped security card,
   * EX11-064). Scans from the top of the stack and flips the first face-down card; the
   * card stays in security but is now revealed (the visibility layer encodes a face-up
   * security card to both players). Returns true when a card was flipped, false when
   * there was no face-down security card. `fromTop` (default) scans from index 0.
   */
  const flipSecurityFaceUp = (seat: Seat, opts?: { fromTop?: boolean }): boolean => {
    const stack = player(seat).security;
    const fromTop = opts?.fromTop ?? true;
    const order = fromTop ? [...stack.keys()] : [...stack.keys()].reverse();
    for (const i of order) {
      const card = stack[i]!;
      if (!card.faceUp) {
        card.faceUp = true;
        engine.emit({
          kind: "cardsMoved",
          instanceIds: [card.instanceId],
          from: Zone.Security,
          to: Zone.Security,
        });
        return true;
      }
    }
    return false;
  };

  const flipSecurityFaceDown = (seat: Seat, instanceId: string): boolean => {
    const card = player(seat).security.find((candidate) => candidate.instanceId === instanceId);
    if (card === undefined || !card.faceUp) return false;
    card.faceUp = false;
    engine.emit({ kind: "cardsMoved", instanceIds: [instanceId], from: Zone.Security, to: Zone.Security });
    return true;
  };

  return {
    shuffleSecurity,
    revealCard,
    securityToHand,
    recoverToSecurity,
    flipTopSecurity,
    flipSecurityFaceUp,
    flipSecurityFaceDown,
  };
}
