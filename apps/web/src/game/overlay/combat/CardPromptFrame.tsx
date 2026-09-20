import { useEffect, useId, useRef, type ReactNode } from "react";
import { CardArt } from "../CardArt";
import { useCardOpener } from "../../cardLinks";
import { printedCardName } from "../printedCardName";
import { useTranslation } from "../../../i18n";
import { useBoardPreview } from "../choice/useBoardPreview";
import { DecisionViewBoardButton } from "../choice/DecisionViewBoardButton";
import "./counterOverlay.css";

/** Shared artwork header and keyboard boundary for the arena's combat questions. */
export function CardPromptFrame({
  cardId,
  fallback,
  eyebrow,
  title,
  description,
  className = "",
  label,
  onBack,
  children,
}: {
  cardId?: string;
  fallback?: ReactNode;
  eyebrow: ReactNode;
  title: string;
  description: ReactNode;
  className?: string;
  label?: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const { t } = useTranslation();
  const openCard = useCardOpener();
  const { isViewingBoard, openBoard, boardReturn } = useBoardPreview();
  const panel = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    return () => {
      queueMicrotask(() => {
        if (previous instanceof HTMLElement && previous.isConnected && document.activeElement === document.body)
          previous.focus();
      });
    };
  }, []);
  useEffect(() => {
    if (!isViewingBoard) heading.current?.focus();
  }, [title, isViewingBoard]);
  if (isViewingBoard) return boardReturn;
  return (
    <div
      className={`combat-prompt counter-overlay ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-labelledby={label ? undefined : titleId}
      ref={panel}
      onKeyDown={(event) => {
        if (event.key === "Escape" && onBack) {
          event.preventDefault();
          onBack();
        }
        if (event.key !== "Tab") return;
        const buttons = panel.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        const first = buttons?.[0];
        const last = buttons?.[buttons.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <header className="counter-overlay__header">
        {cardId ? (
          openCard ? (
            <button
              className="counter-overlay__art-link"
              aria-label={t("feed.openCard", { card: printedCardName(cardId) })}
              onClick={() => openCard(cardId)}
            >
              <CardArt cardId={cardId} width={64} />
            </button>
          ) : (
            <CardArt cardId={cardId} width={64} />
          )
        ) : (
          fallback
        )}
        <div>
          <div className="counter-overlay__eyebrow">{eyebrow}</div>
          <h2 id={titleId} ref={heading} tabIndex={-1}>
            {title}
          </h2>
          <p>{description}</p>
        </div>
      </header>
      {children}
      <div className="counter-overlay__board-action">
        <DecisionViewBoardButton onOpenBoard={openBoard} />
      </div>
    </div>
  );
}
