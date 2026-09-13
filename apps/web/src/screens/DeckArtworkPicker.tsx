import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCardArts, getCardDefinition, resolveCardArt } from "@aegis/shared";
import { CardFull } from "../design/cards";
import { Button } from "../design/primitives";
import { useTranslation } from "../i18n";
import "./deckArtworkPicker.css";

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
  const { t } = useTranslation();
  const [copy, setCopy] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const selected = resolveCardArt(cardId, arts[copy]).artId;
  const definition = getCardDefinition(cardId);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
      if (event.key !== "Tab") return;
      const buttons = panel.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      if (!buttons?.length) return;
      const first = buttons[0]!;
      const last = buttons[buttons.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, []);
  return createPortal(
    <div className="deck-art-picker-backdrop" onClick={onClose}>
      <div
        ref={panel}
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
              {definition?.nameEn} · {cardId}
            </p>
          </div>
          <button
            ref={close}
            type="button"
            className="deck-art-picker__close"
            aria-label={t("common.close")}
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="deck-art-picker__copies" role="group" aria-label={t("deck.artCopyPrompt")}>
          {Array.from({ length: count }, (_, index) => (
            <button key={index} type="button" aria-pressed={copy === index} onClick={() => setCopy(index)}>
              {t("deck.copyArtwork", { number: index + 1 })}
            </button>
          ))}
        </div>
        <p className="deck-art-picker__hint" role="status">
          {t("deck.artEditingCopy", { number: copy + 1 })}
        </p>
        <div className="deck-art-picker__grid" role="group" aria-label={t("library.artworks")}>
          {getCardArts(cardId).map((art, index) => {
            const label = index === 0 ? t("library.baseArt") : t("library.alternateArt", { number: index });
            return (
              <button
                className="deck-art-picker__art"
                key={art.artId}
                type="button"
                aria-label={label}
                aria-pressed={art.artId === selected}
                onClick={() => onChoose(art.artId, copy)}
              >
                <CardFull cardId={cardId} artId={art.artId} width={140} />
                <span>{label}</span>
                <strong>{art.artId === selected ? `✓ ${t("deck.artSelected")}` : t("deck.artSelect")}</strong>
              </button>
            );
          })}
        </div>
        <div className="deck-art-picker__footer">
          <Button variant="secondary" onClick={() => onChoose(selected, "all")}>
            {t("deck.artApplyAll")}
          </Button>
          <Button onClick={onClose}>{t("common.done")}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
