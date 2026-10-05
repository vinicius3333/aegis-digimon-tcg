import { CardKind, getCardDefinition, type ServerEvent } from "@aegis/shared";
import { createPresentationGate, type CostClause } from "../presentationGate";

const DELAY_KEYWORD = /[<＜]\s*Delay\s*[>＞]/i;

/**
 * The ＜Delay＞ clause an Option on the field just triggered, or null. Paying ＜Delay＞ trashes
 * the Option itself (CR 16-17-1), so the trigger is the only batch that can announce what the
 * following ones will do to it.
 */
export function isFieldDelay(
  event: ServerEvent,
): event is Extract<ServerEvent, { kind: "effectTriggered" }> & { sourcePermanentId: string } {
  return (
    event.kind === "effectTriggered" &&
    event.sourcePermanentId !== undefined &&
    DELAY_KEYWORD.test(event.description) &&
    getCardDefinition(event.sourceCardId)?.kinds.includes(CardKind.Option) === true
  );
}

export function costClauseFromEvent(event: ServerEvent): CostClause | null {
  if (!isFieldDelay(event)) return null;
  return {
    sourceKey: `${event.seat}:${event.sourceCardId}`,
    seat: event.seat,
    permanentId: event.sourcePermanentId,
    focused: createPresentationGate(),
    departing: createPresentationGate(),
    read: createPresentationGate(),
  };
}
