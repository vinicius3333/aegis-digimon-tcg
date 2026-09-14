import { useEffect, useState, type CSSProperties } from "react";
import { cardImageUrls, getCardDefinition } from "@aegis/shared";
import { CardBack } from "../design/cards";
import { useMediaQuery } from "../design/useMediaQuery";
import { securityCardEffects } from "./securityCardEffects";

export const SECURITY_FLIP_DURATION = 420;

type PublicCard = { cardId: string; artId?: string; faceUp: boolean };

export function SecurityCardSlot({ cardId = "", artId, faceUp = false }: Partial<PublicCard>) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [previous, setPrevious] = useState<PublicCard>({ cardId, artId, faceUp });
  const [turningDown, setTurningDown] = useState<PublicCard | null>(null);
  // Keep a value snapshot: Colyseus can mutate the original instance in place and
  // redact its identity in the same patch that changes faceUp.
  if (previous.cardId !== cardId || previous.artId !== artId || previous.faceUp !== faceUp) {
    if (previous.faceUp && previous.cardId && !faceUp && !reducedMotion) setTurningDown(previous);
    else if (faceUp || reducedMotion) setTurningDown(null);
    setPrevious({ cardId, artId, faceUp });
  }
  useEffect(() => {
    if (!turningDown) return;
    const timer = window.setTimeout(() => setTurningDown(null), SECURITY_FLIP_DURATION);
    return () => window.clearTimeout(timer);
  }, [turningDown]);
  const publicCard = faceUp && cardId ? { cardId, artId } : turningDown;
  return (
    <i
      className={
        [publicCard ? "game-security-card--revealed" : "", turningDown ? "game-security-card--turning-down" : ""]
          .filter(Boolean)
          .join(" ") || undefined
      }
      style={{ "--security-flip-duration": `${SECURITY_FLIP_DURATION}ms` } as CSSProperties}
    >
      {publicCard ? (
        <span className="game-security-card__faces" aria-hidden={!faceUp || undefined}>
          <img
            src={cardImageUrls(publicCard.cardId, publicCard.artId)[0]}
            alt={getCardDefinition(publicCard.cardId)?.nameEn ?? publicCard.cardId}
          />
          {turningDown ? (
            <span className="game-security-card__back">
              <CardBack width={64} useSelectedSleeve={false} />
            </span>
          ) : null}
        </span>
      ) : null}
      {faceUp && cardId
        ? securityCardEffects(cardId).map((effect) => (
            <span className="game-security-card__buff" key={effect.text} title={effect.text}>
              {effect.badge}
            </span>
          ))
        : null}
    </i>
  );
}
