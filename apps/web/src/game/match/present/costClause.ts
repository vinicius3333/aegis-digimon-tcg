import { CardKind, getCardDefinition, type ServerEvent } from "@aegis/shared";
import { createPresentationGate, type CostClause } from "../presentationGate";

const DELAY_KEYWORD = /[<＜]\s*Delay\s*[>＞]/i;

/**
 * The ＜Delay＞ clause an Option on the field just triggered, or null. Paying ＜Delay＞ trashes
 * the Option itself (CR 16-17-1), so the trigger is the only batch that can announce what the
 * following ones will do to it.
 */
export function costClauseFromEvent(event: ServerEvent): CostClause | null {
  if (event.kind !== "effectTriggered" || event.sourcePermanentId === undefined) return null;
  if (!DELAY_KEYWORD.test(event.description)) return null;
  if (!getCardDefinition(event.sourceCardId)?.kinds.includes(CardKind.Option)) return null;
  return {
    sourceKey: `${event.seat}:${event.sourceCardId}`,
    seat: event.seat,
    permanentId: event.sourcePermanentId,
    focused: createPresentationGate(),
    departing: createPresentationGate(),
    read: createPresentationGate(),
  };
}
