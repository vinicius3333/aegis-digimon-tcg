import type { MutableRefObject } from "react";
import type { ServerEvent } from "@aegis/shared";
import type { SecurityClashAttacker } from "../../securityClash";

/**
 * An attack on the player: remember the physical card the security
 * check to come will be fought against.
 *
 * The attacker is captured while it is still on the field, because an effect deletion names
 * the card instance rather than the permanent — so both ways in are kept. A Raid redirect
 * keeps that memory: Piercing may continue the same attack into security after the field
 * battle, and the reveal event identifies that same permanent.
 */
export function presentSecurityAttack({
  securityAttack,
  cardSiteRef,
  securityAttackerRef,
}: {
  securityAttack: ServerEvent | undefined;
  cardSiteRef: MutableRefObject<{ topInstanceOf: (permanentId: string) => string | undefined }>;
  /** Mutated: the attacker the next security check is resolved against. */
  securityAttackerRef: MutableRefObject<SecurityClashAttacker | undefined>;
}) {
  if (securityAttack?.kind === "attackDeclared") {
    securityAttackerRef.current = {
      seat: securityAttack.seat,
      cardId: securityAttack.attackerCardId,
      artId: securityAttack.attackerArtId,
      permanentId: securityAttack.attackerPermanentId,
      topInstanceId: cardSiteRef.current.topInstanceOf(securityAttack.attackerPermanentId),
    };
  }
}
