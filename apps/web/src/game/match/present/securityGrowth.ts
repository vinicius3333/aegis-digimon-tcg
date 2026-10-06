import type { MutableRefObject } from "react";
import type { Seat, ServerEvent } from "@aegis/shared";

/** The seat whose stack `event` says grew, when the event names one. */
export function securityGrowthSeatOf(event: ServerEvent): Seat | undefined {
  if (event.kind === "securityRecovered") return event.seat;
  if (event.kind === "cardsMoved" && event.to === "security" && event.instanceIds.length > 0) return event.seat;
  return undefined;
}

/**
 * Security growth receipts share the causal gate and painted clock of their stack reaction.
 *
 * A claim is good for the patch that follows the batch it was made in. One that never met a
 * growth — the stack lost a card in the same patch it gained one — is stale by the next batch
 * and must not swallow a growth that batch leaves to the count watcher, so the claims are
 * cleared before this batch makes its own.
 *
 * Paired movement and recovery receipts describe one reaction; a multi-card recovery
 * changes the stack once. Separate recoveries retain their own queued reactions.
 */
export function enqueueSecurityGrowth({
  fresh,
  stateVersion,
  securityGrowthClaimedRef,
  launchSecurityGainFlight,
}: {
  fresh: readonly ServerEvent[];
  stateVersion: number;
  /** Mutated: the latest state revision whose event accounts for each seat's growth. */
  securityGrowthClaimedRef: MutableRefObject<Map<Seat, number>>;
  launchSecurityGainFlight: (seat: Seat) => void;
}) {
  const recoveredSeats = new Set(
    fresh.flatMap((event) => (event.kind === "securityRecovered" && event.amount > 0 ? [event.seat] : [])),
  );
  // A card an effect stacked lands with the same bounce a recovery plays. The event names
  // the seat, so the notice is its own (see `securityGainNoticeFromEvent`).
  for (const event of fresh) {
    if (event.kind !== "cardsMoved" || event.to !== "security" || event.seat === undefined) continue;
    if (event.instanceIds.length === 0) continue;
    securityGrowthClaimedRef.current.set(event.seat, stateVersion);
    if (!recoveredSeats.has(event.seat)) launchSecurityGainFlight(event.seat);
  }
  for (const event of fresh) {
    if (event.kind !== "securityRecovered" || event.amount <= 0) continue;
    const seat = event.seat;
    securityGrowthClaimedRef.current.set(seat, stateVersion);
    launchSecurityGainFlight(seat);
  }
}
