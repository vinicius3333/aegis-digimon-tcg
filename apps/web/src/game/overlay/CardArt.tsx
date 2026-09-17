import { useState, useEffect } from "react";
import { cardImageUrls, getCardDefinition } from "@aegis/shared";
import { CardBack, Sigil } from "../../design/cards";
import { COLORS, colorKey } from "../../design/theme";

/** Self-contained card art with image fallback to the color Sigil (no hover zoom). */
export function CardArt({ cardId, artId, width }: { cardId: string; artId?: string; width: number }) {
  const def = getCardDefinition(cardId);
  const urls = cardImageUrls(cardId, artId);
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [cardId, artId]);
  const h = Math.round(width * 1.4);
  if (!def) return <CardBack width={width} label={cardId} />;
  if (idx >= urls.length) {
    return (
      <div
        style={{
          width,
          height: h,
          borderRadius: 10,
          background: `radial-gradient(${COLORS[colorKey(def.colors[0])].soft}, var(--ds-surface-muted))`,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Sigil cardId={def.cardId} color={colorKey(def.colors[0])} size={Math.round(h * 0.4)} />
      </div>
    );
  }
  return (
    <img
      src={urls[idx]}
      alt={def.nameEn}
      onError={() => setIdx((i) => i + 1)}
      style={{ width, height: h, borderRadius: 10, objectFit: "cover", objectPosition: "top", flexShrink: 0 }}
    />
  );
}
