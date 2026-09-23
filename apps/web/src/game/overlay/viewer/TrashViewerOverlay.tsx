import { useState } from "react";
import { createPortal } from "react-dom";
import { getCardDefinition } from "@aegis/shared";
import { Button } from "../../../design/primitives";
import { CardBack } from "../../../design/cards";
import { useTranslation } from "../../../i18n";
import { securityCardEffects } from "../../securityCardEffects";
import type { ActivatableEntry } from "../../boardModel";
import { Scrim } from "../Scrim";
import { CardArt } from "../CardArt";
import { CardZoomOverlay } from "./CardZoomOverlay";

/**
 * Modal listing every card in a player's trash (public information). Cards are
 * laid out newest-first in a wrapped grid of thumbnails; hovering one shows a
 * large preview on the right. The trash stays server-owned: the only action is
 * activating a `[Trash] [Main]` effect the server projected onto a card.
 */
export function TrashViewerOverlay({
  cardIds,
  artIds,
  effects,
  title,
  sheet,
  countLabel,
  emptyLabel,
  preserveOrder = false,
  onActivateEffect,
  onClose,
}: {
  cardIds: string[];
  artIds?: string[];
  /** Server-projected `[Trash] [Main]` activations per card, aligned with `cardIds`. */
  effects?: readonly (readonly ActivatableEntry[])[];
  preserveOrder?: boolean;
  title: string;
  /** Render as a bottom sheet with one scrollable row (touch layouts). */
  sheet?: boolean;
  /** Header count text; defaults to the trash card count. */
  countLabel?: string;
  /** Text shown when `cardIds` is empty; defaults to the trash empty message. */
  emptyLabel?: string;
  onActivateEffect?: (effect: ActivatableEntry) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const countText = countLabel ?? t("overlay.trashCount", { count: cardIds.length });
  const emptyText = emptyLabel ?? t("overlay.trashEmpty");
  const ordered = preserveOrder ? [...cardIds] : [...cardIds].reverse();
  const arts = cardIds.map((_, index) => artIds?.[index]);
  const orderedArts = preserveOrder ? arts : arts.reverse();
  const activations = cardIds.flatMap((cardId, index) =>
    (effects?.[index] ?? []).map((effect) => ({ cardId, effect })),
  );
  const activationButtons =
    onActivateEffect && activations.length > 0 ? (
      <div className="trash-viewer__activations" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {activations.map(({ cardId, effect }) => (
          <Button
            key={`${effect.instanceId}:${effect.effectKey}`}
            size="sm"
            full
            variant="secondary"
            title={effect.description}
            aria-label={`${t("game.activateMainEffect")}: ${getCardDefinition(cardId)?.nameEn ?? cardId}`}
            onClick={() => onActivateEffect(effect)}
          >
            {t("game.activateMainEffect")} · {getCardDefinition(cardId)?.nameEn ?? cardId}
          </Button>
        ))}
      </div>
    ) : null;
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, ordered.findIndex(Boolean)));
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);
  const zoomed = zoomedIndex === null ? undefined : ordered[zoomedIndex];
  const effectiveIndex = activeIndex < ordered.length ? activeIndex : 0;
  const preview = ordered[effectiveIndex];

  const zoomOverlay = zoomed ? (
    <CardZoomOverlay
      cardId={zoomed}
      artId={zoomedIndex === null ? undefined : orderedArts[zoomedIndex]}
      onClose={() => setZoomedIndex(null)}
    />
  ) : null;

  if (sheet) {
    return createPortal(
      <>
        <div
          className="card-action-sheet pile-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={onClose}
        >
          <div className="card-action-sheet__panel" onClick={(e) => e.stopPropagation()}>
            <div className="card-action-sheet__grip" aria-hidden />
            <div className="trash-sheet__header">
              <strong>{title}</strong>
              <span>{countText}</span>
            </div>
            {ordered.length === 0 ? (
              <p className="trash-sheet__empty">{emptyText}</p>
            ) : (
              <div className="trash-sheet__row">
                {ordered.map((cardId, i) => (
                  <button type="button" key={`${cardId}-${i}`} onClick={() => setZoomedIndex(i)}>
                    {cardId ? (
                      <CardArt cardId={cardId} artId={orderedArts[i]} width={96} />
                    ) : (
                      <CardBack width={96} useSelectedSleeve={false} />
                    )}
                    <figcaption>
                      {cardId ? (getCardDefinition(cardId)?.nameEn ?? cardId) : t("game.hiddenCard")}
                    </figcaption>
                    {preserveOrder && cardId
                      ? securityCardEffects(cardId).map((effect) => (
                          <span className="security-viewer__effect" key={effect.text}>
                            {effect.text}
                          </span>
                        ))
                      : null}
                  </button>
                ))}
              </div>
            )}
            <div className="card-action-sheet__actions">
              {activationButtons}
              <Button size="sm" full variant="ghost" onClick={onClose} autoFocus>
                {t("common.close")}
              </Button>
            </div>
          </div>
        </div>
        {zoomOverlay}
      </>,
      document.body,
    );
  }

  return createPortal(
    <>
      <Scrim onClick={onClose} className="game-modal pile-viewer">
        <div
          className="game-modal__panel"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "flex",
            gap: 22,
            width: 820,
            maxWidth: "92%",
            maxHeight: "86%",
            padding: 24,
            background: "var(--ds-surface)",
            borderRadius: 20,
            border: "1px solid var(--ds-border)",
            boxShadow: "var(--ds-shadow-summary)",
          }}
        >
          {/* left: header + wrapped thumbnail grid */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              flex: 1,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "var(--ds-fg)",
                  fontFamily: "var(--ds-font-display)",
                }}
              >
                {title}
              </div>
              <div
                style={{
                  fontFamily: "var(--ds-font-mono)",
                  fontSize: 11,
                  color: "var(--ds-fg-muted)",
                }}
              >
                {countText}
              </div>
            </div>
            {ordered.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: "grid",
                  placeItems: "center",
                  color: "var(--ds-fg-disabled)",
                  fontFamily: "var(--ds-font-mono)",
                  fontSize: 12,
                }}
              >
                {emptyText}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  overflowY: "auto",
                  alignContent: "flex-start",
                  paddingRight: 4,
                }}
              >
                {ordered.map((cardId, i) => {
                  const def = getCardDefinition(cardId);
                  const sel = activeIndex === i;
                  return (
                    <button
                      key={`${cardId}-${i}`}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => {
                        setActiveIndex(i);
                        if (cardId) setZoomedIndex(i);
                      }}
                      title={cardId ? (def?.nameEn ?? cardId) : t("game.hiddenCard")}
                      aria-label={cardId ? (def?.nameEn ?? cardId) : t("game.hiddenCard")}
                      onFocus={() => setActiveIndex(i)}
                      style={{
                        padding: 3,
                        borderRadius: 9,
                        cursor: "pointer",
                        background: sel ? "var(--ds-accent-surface)" : "transparent",
                        border: `1.5px solid ${sel ? "var(--ds-accent)" : "transparent"}`,
                        transition: "background 120ms, border-color 120ms",
                      }}
                    >
                      {cardId ? (
                        <CardArt cardId={cardId} artId={orderedArts[i]} width={preserveOrder ? 96 : 64} />
                      ) : (
                        <CardBack width={96} useSelectedSleeve={false} />
                      )}
                      {preserveOrder ? (
                        <span className="security-viewer__name">{def?.nameEn ?? t("game.hiddenCard")}</span>
                      ) : null}
                      {preserveOrder && cardId
                        ? securityCardEffects(cardId).map((effect) => (
                            <span className="security-viewer__badge" title={effect.text} key={effect.text}>
                              {effect.badge}
                            </span>
                          ))
                        : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* right: large preview of the hovered card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            {preview ? (
              <CardArt cardId={preview} artId={orderedArts[effectiveIndex]} width={260} />
            ) : ordered.length ? (
              <CardBack width={260} useSelectedSleeve={false} />
            ) : null}
            {preserveOrder && preview
              ? securityCardEffects(preview).map((effect) => (
                  <p className="security-viewer__effect" key={effect.text}>
                    {effect.text}
                  </p>
                ))
              : null}
            {activationButtons}
            <Button size="md" variant="ghost" full onClick={onClose}>
              {t("common.close")}
            </Button>
          </div>
        </div>
      </Scrim>
      {zoomOverlay}
    </>,
    document.body,
  );
}
