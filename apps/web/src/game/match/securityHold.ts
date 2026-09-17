import type { Dispatch, SetStateAction } from "react";
import type { Seat, GameState } from "@aegis/shared";
import type { AnimationQueue } from "../animationQueue";

export interface SecurityHoldDeps {
  queue: AnimationQueue;
  state: GameState | undefined;
  setHeldSecurityCards: Dispatch<SetStateAction<ReadonlyMap<number, { seat: Seat; count: number }>>>;
}

export function securityHold(deps: SecurityHoldDeps) {
  const { queue, state, setHeldSecurityCards } = deps;

  /**
   * The figure this seat's shield is showing right now. Read as a scene is staged, which
   * is normally before the patch that removes the card has even landed — the server sends
   * events as they happen and patches on its own tick — so it is the figure that still
   * counts the card the scene is about to spend.
   */
  function securityCountOf(seat: Seat): number | undefined {
    return state?.players[seat]?.securityCount;
  }

  /** Keep this seat's shield on `count` until the scene `key` has shown the card leaving. */
  function holdSecurityCard(key: number, seat: Seat, count: number | undefined) {
    if (count === undefined) return;
    setHeldSecurityCards((held) => new Map(held).set(key, { seat, count }));
  }

  /**
   * A scene the queue drops before it ever starts — a newer check replacing the track —
   * runs no `finally`, and its hold would keep a card on the shield for the rest of the
   * match. Whatever it was holding is given back at the latest when nothing is running.
   * Call after the scene's steps are enqueued, or the queue is idle at that instant and
   * the figure is handed back before the scene has shown anything.
   */
  function releaseSecurityCardWhenIdle(key: number) {
    void queue.idle().then(() => releaseSecurityCard(key));
  }

  /** The card has been seen to go, so the shield catches up with the board. */
  function releaseSecurityCard(key: number) {
    setHeldSecurityCards((held) => {
      if (!held.has(key)) return held;
      const next = new Map(held);
      next.delete(key);
      return next;
    });
  }

  return { securityCountOf, holdSecurityCard, releaseSecurityCardWhenIdle, releaseSecurityCard };
}
