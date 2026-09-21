import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Seat, ServerEvent } from "@aegis/shared";
import type { AnimationStep } from "../../animationQueue";
import type { SecurityClashAttacker } from "../../securityClash";
import { TIMINGS } from "../../timings";
import { LungeDirection } from "../enums";
import type { AttackLunge } from "../types";

/**
 * An attack on the player: the attacker lunges, and is remembered as the card the security
 * check to come will be fought against.
 *
 * The attacker is captured while it is still on the field, because an effect deletion names
 * the card instance rather than the permanent — so both ways in are kept. A Raid redirect
 * keeps that memory: Piercing may continue the same attack into security after the field
 * battle, and the reveal event identifies that same permanent.
 */
export function presentSecurityAttack({
  securityAttack,
  viewerSeat,
  cardSiteRef,
  securityAttackerRef,
  setAttackLunge,
  enqueue,
}: {
  securityAttack: ServerEvent | undefined;
  viewerSeat: Seat;
  cardSiteRef: MutableRefObject<{ topInstanceOf: (permanentId: string) => string | undefined }>;
  /** Mutated: the attacker the next security check is resolved against. */
  securityAttackerRef: MutableRefObject<SecurityClashAttacker | undefined>;
  setAttackLunge: Dispatch<SetStateAction<AttackLunge | null>>;
  enqueue: (step: AnimationStep) => void;
}) {
  if (securityAttack?.kind === "attackDeclared") {
    const lunge: AttackLunge = {
      permanentId: securityAttack.attackerPermanentId,
      direction: securityAttack.seat === viewerSeat ? LungeDirection.Up : LungeDirection.Down,
    };
    enqueue({
      id: `lunge-${lunge.permanentId}`,
      track: "attackLunge",
      replace: true,
      async run(context) {
        setAttackLunge(lunge);
        await context.wait(TIMINGS.attackLunge);
        if (context.cancelled) return;
        setAttackLunge(null);
      },
    });
    securityAttackerRef.current = {
      seat: securityAttack.seat,
      cardId: securityAttack.attackerCardId,
      artId: securityAttack.attackerArtId,
      permanentId: securityAttack.attackerPermanentId,
      topInstanceId: cardSiteRef.current.topInstanceOf(securityAttack.attackerPermanentId),
    };
  }
}
