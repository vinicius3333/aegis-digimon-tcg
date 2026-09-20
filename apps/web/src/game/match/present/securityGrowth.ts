import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Seat, ServerEvent } from "@aegis/shared";
import type { AnimationStep } from "../../animationQueue";
import { TIMINGS } from "../../timings";

/** The seat whose stack `event` says grew, when the event names one. */
export function securityGrowthSeatOf(event: ServerEvent): Seat | undefined {
  if (event.kind === "securityRecovered") return event.seat;
  if (event.kind === "cardsMoved" && event.to === "security" && event.instanceIds.length > 0) return event.seat;
  return undefined;
}

/**
 * Every card this batch put back on a security stack, flown onto the stack it joined.
 *
 * A claim is good for the patch that follows the batch it was made in. One that never met a
 * growth — the stack lost a card in the same patch it gained one — is stale by the next batch
 * and must not swallow a growth that batch leaves to the count watcher, so the claims are
 * cleared before this batch makes its own.
 *
 * Both passes claim the seat's growth ahead of the count watcher: these events name the seat,
 * so the flight and the notice are theirs to play.
 */
export function enqueueSecurityGrowth({
  fresh,
  stateVersion,
  securityGrowthClaimedRef,
  setSecurityFlights,
  launchSecurityGainFlight,
  enqueue,
}: {
  fresh: readonly ServerEvent[];
  stateVersion: number;
  /** Mutated: the latest state revision whose event accounts for each seat's growth. */
  securityGrowthClaimedRef: MutableRefObject<Map<Seat, number>>;
  setSecurityFlights: Dispatch<SetStateAction<ReadonlySet<number>>>;
  launchSecurityGainFlight: (seat: Seat) => void;
  enqueue: (step: AnimationStep) => void;
}) {
  // A card an effect stacked lands with the same bounce a recovery plays. The event names
  // the seat, so the notice is its own (see `securityGainNoticeFromEvent`).
  for (const event of fresh) {
    if (event.kind !== "cardsMoved" || event.to !== "security" || event.seat === undefined) continue;
    if (event.instanceIds.length === 0) continue;
    securityGrowthClaimedRef.current.set(event.seat, stateVersion);
    launchSecurityGainFlight(event.seat);
  }
  for (const event of fresh) {
    if (event.kind !== "securityRecovered") continue;
    const seat = event.seat;
    securityGrowthClaimedRef.current.set(seat, stateVersion);
    enqueue({
      id: `security-flight-${seat}-${event.amount}`,
      track: `securityFlight-${seat}`,
      replace: true,
      async run(context) {
        if (context.mode !== "live") return;
        try {
          setSecurityFlights((seats) => new Set(seats).add(seat));
          await context.wait(TIMINGS.securityFlight);
        } finally {
          setSecurityFlights((seats) => {
            if (!seats.has(seat)) return seats;
            const next = new Set(seats);
            next.delete(seat);
            return next;
          });
        }
      },
    });
  }
}
