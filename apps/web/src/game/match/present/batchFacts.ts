import { getCardDefinition, isOption, type ServerEvent } from "@aegis/shared";
import { lastIndexOfKind } from "../eventLookup";

/** One event kind, narrowed the way the original ternaries narrowed it. */
type EventOfKind<K extends ServerEvent["kind"]> = Extract<ServerEvent, { kind: K }>;

export interface BatchFacts {
  refusal: EventOfKind<"actionRejected"> | undefined;
  revealIndex: number;
  checkIndex: number;
  securityReveal: ServerEvent | undefined;
  /** True when this batch's last close belongs to this batch's last reveal. */
  closesFreshReveal: boolean;
  securityCheck: ServerEvent | undefined;
  closingCheck: EventOfKind<"securityChecked"> | undefined;
  turnEnd: EventOfKind<"turnEnded"> | undefined;
  /** Compound predicates do not infer a type guard, so this stays the wide event. */
  securityAttack: ServerEvent | undefined;
  usedOption: ServerEvent | undefined;
  optionRouted: boolean;
}

/** The facts the rest of `presentBatch` branches on, derived from this batch's fresh events alone. */
export function batchFacts({ fresh }: { fresh: readonly ServerEvent[] }): BatchFacts {
  const refusal = [...fresh].reverse().find((event) => event.kind === "actionRejected");
  // Each segment carries one check, its opening, or its close. A decision inside a
  // [Security] effect can still split that check across server batches.
  const revealIndex = lastIndexOfKind(fresh, "securityRevealed");
  const checkIndex = lastIndexOfKind(fresh, "securityChecked");
  const securityReveal = revealIndex >= 0 ? fresh[revealIndex] : undefined;
  const closesFreshReveal = revealIndex >= 0 && checkIndex > revealIndex;
  // A close that precedes the batch's last reveal belongs to a card the newer reveal has
  // already taken off the stage, so it is dropped with the scene it closed.
  const securityCheck = checkIndex >= 0 && (revealIndex < 0 || closesFreshReveal) ? fresh[checkIndex] : undefined;
  const closingCheck = closesFreshReveal && securityCheck?.kind === "securityChecked" ? securityCheck : undefined;
  const turnEnd = [...fresh].reverse().find((event) => event.kind === "turnEnded");
  const securityAttack = [...fresh]
    .reverse()
    .find((event) => event.kind === "attackDeclared" && event.target.kind === "player");
  const usedOption = fresh.find(
    (event) =>
      event.kind === "cardPlayed" &&
      event.permanentId === undefined &&
      (() => {
        const definition = getCardDefinition(event.cardId);
        return definition !== undefined && isOption(definition);
      })(),
  );
  const optionRouted = fresh.some((event) => event.kind === "cardsMoved" && event.optionUsed === true);
  return {
    refusal,
    revealIndex,
    checkIndex,
    securityReveal,
    closesFreshReveal,
    securityCheck,
    closingCheck,
    turnEnd,
    securityAttack,
    usedOption,
    optionRouted,
  };
}
