import { useTranslatedCardName } from "@/i18n/useTranslatedCardName";
import { useModalFocus } from "@/design/useModalFocus";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCardArts, resolveCardArt } from "@aegis/shared";
import { ArtRegion } from "@aegis/shared/cards/ArtRegion";
import { artRegionOf } from "@aegis/shared/cards/artRegionOf";
import { CardFull } from "../design/cards";
import { Badge, Button } from "../design/primitives";
import { useTranslation, type TranslationKey } from "../i18n";
import "./deckArtworkPicker.css";

const REGION_LABEL_KEYS: Record<ArtRegion, TranslationKey> = {
  [ArtRegion.JAPANESE.value]: "library.japaneseArt",
  [ArtRegion.KOREAN.value]: "library.koreanArt",
  [ArtRegion.CHINESE.value]: "library.chineseArt",
};

/** Edits cosmetic choices for physical copies, leaving the canonical deck untouched. */
export function DeckArtworkPicker({
  cardId,
  arts,
  count,
  onChoose,
  onClose,
}: {
  cardId: string;
  arts: readonly string[];
  count: number;
  onChoose: (artId: string, copy: number | "all") => void;
  onClose: () => void;
}) {
  const getCardName = useTranslatedCardName();
  const { t } = useTranslation();
  const [target, setTarget] = useState<number | "all">(count > 1 ? "all" : 0);
  const panel = useRef<HTMLDivElement>(null);
  useModalFocus({ surfaceRef: panel, onClose, focusFirst: true });
  const copyArtIds = Array.from({ length: count }, (_, index) => resolveCardArt(cardId, arts[index]).artId);
  const sharedArtId = copyArtIds.every((artId) => artId === copyArtIds[0]) ? copyArtIds[0] : undefined;
  const selected = target === "all" ? sharedArtId : copyArtIds[target];
  return createPortal(
    <div className="deck-art-picker-backdrop" onClick={onClose}>
      <div
        ref={panel}
        tabIndex={-1}
        className="deck-art-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-art-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="deck-art-picker__header">
          <div>
            <h2 id="deck-art-picker-title">{t("deck.editArtwork")}</h2>
            <p>
              {getCardName(cardId)} · {cardId}
            </p>
          </div>
          <button type="button" className="deck-art-picker__close" aria-label={t("common.close")} onClick={onClose}>
            ×
          </button>
        </div>
        <div className="deck-art-picker__copies" role="group" aria-label={t("deck.artCopyPrompt")}>
          {count > 1 ? (
            <button type="button" aria-pressed={target === "all"} onClick={() => setTarget("all")}>
              {t("deck.artAllCopies")}
            </button>
          ) : null}
          {Array.from({ length: count }, (_, index) => (
            <button key={index} type="button" aria-pressed={target === index} onClick={() => setTarget(index)}>
              {t("deck.copyArtwork", { number: index + 1 })}
            </button>
          ))}
        </div>
        <p className="deck-art-picker__hint" role="status">
          {target === "all" ? t("deck.artEditingAllCopies") : t("deck.artEditingCopy", { number: target + 1 })}
        </p>
        <div className="deck-art-picker__grid" role="group" aria-label={t("library.artworks")}>
          {getCardArts(cardId).map((art, index) => {
            const label = index === 0 ? t("library.baseArt") : t("library.alternateArt", { number: index });
            const region = artRegionOf(art.artId);
            return (
              <button
                className="deck-art-picker__art"
                key={art.artId}
                type="button"
                aria-label={region ? t(REGION_LABEL_KEYS[region.value], { label }) : label}
                aria-pressed={art.artId === selected}
                onClick={() => onChoose(art.artId, target)}
              >
                <CardFull cardId={cardId} artId={art.artId} width={140} zoomOnHover={false} />
                {region ? (
                  <Badge tone="primary" className="deck-art-picker__region">
                    {region.badge}
                  </Badge>
                ) : null}
                <span className="deck-art-picker__label">{label}</span>
              </button>
            );
          })}
        </div>
        <div className="deck-art-picker__footer">
          <Button onClick={onClose}>{t("common.done")}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
