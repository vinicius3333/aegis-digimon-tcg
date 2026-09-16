/* Decisions answered on the board instead of in a dialog: the left rail that
   carries the prompt and its actions while the cards are picked in place, and
   the pill that tells the viewer the opponent is busy picking cards of their
   own. Which decisions land here is decided by ./decisionPresentation; this file
   only draws them. */

import { useEffect, type ReactNode } from "react";
import { Button } from "../design/primitives";
import { CardMini } from "../design/cards";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { cardDisplayName, useCardOpener } from "./cardLinks";

function useEscapeToDialog(onOpenDialog: (() => void) | undefined) {
  useEffect(() => {
    if (!onOpenDialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onOpenDialog();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenDialog]);
}

/** What the viewer answers the decision with. A `selection` picks cards from
    the hand, so the phone sheet must leave the hand uncovered; a `prompt` is
    answered with the sheet's own buttons, so the sheet may cover the hand and
    give the board the space instead. */
type BoardPromptVariant = "prompt" | "selection";

/** The art of the card asking the question, big enough to recognise beside its clause. */
const BOARD_PROMPT_ART_WIDTH = 92;

/**
 * The card asking the question. With the name gone from the rail, the art is the only
 * route to the card, so it carries the link's role and label rather than being decorative.
 */
function BoardPromptArt({ cardId }: { cardId: string }) {
  const { t } = useTranslation();
  const openCard = useCardOpener();
  const art = <CardMini cardId={cardId} width={BOARD_PROMPT_ART_WIDTH} zoomOnHover={false} />;
  if (!openCard) return <span className="board-prompt__art">{art}</span>;
  return (
    <button
      type="button"
      className="board-prompt__art"
      aria-label={t("feed.openCard", { card: cardDisplayName(cardId, t) })}
      onClick={() => openCard(cardId)}
    >
      {art}
    </button>
  );
}

function BoardPromptRail({
  variant,
  label,
  art,
  eyebrow,
  prompt,
  clause,
  detail,
  onOpenDialog,
  showDialogButton,
  children,
}: {
  variant: BoardPromptVariant;
  label: string;
  /** The card asking the question. Its picture says which card this is, so the name does not have to. */
  art?: string;
  eyebrow?: ReactNode;
  prompt: string;
  clause?: string;
  detail?: string;
  /** Escape hands the decision back to its dialog whenever this is set. */
  onOpenDialog?: () => void;
  /** Also offer that hand-off as a visible control; only worth it when the dialog shows more than the rail does. */
  showDialogButton?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  useEscapeToDialog(onOpenDialog);
  return (
    <>
      {/* Phone only (see game.css): dims the board under the sheet, not the hand
          a selection picks from nor the notices that explain the decision. */}
      <div className="board-prompt-scrim" data-variant={variant} aria-hidden />
      <section className="board-prompt" aria-label={label} data-testid="board-prompt" data-variant={variant}>
        <div className="board-prompt__grip" aria-hidden />
        {onOpenDialog && showDialogButton ? (
          <Button
            className="board-prompt__back"
            size="sm"
            variant="ghost"
            icon={Icons.ArrowLeft}
            onClick={onOpenDialog}
            aria-label={t("overlay.openDecisionDialog")}
          >
            {t("overlay.openDecisionDialog")}
          </Button>
        ) : null}
        <div className="board-prompt__heading">
          {eyebrow ? <p className="board-prompt__eyebrow">{eyebrow}</p> : null}
          {/* The card's printed clause is the question. A restated prompt over it says the
              same thing twice, so it stays only as the live region that announces the
              decision — and becomes the visible question when no clause explains it. */}
          <p className="board-prompt__text" aria-live="polite" data-quiet={clause ? true : undefined}>
            {prompt}
          </p>
        </div>
        {/* The clause leads and the art sits beside it, against the top: the text is what
            the player reads, the picture only says which card is asking. */}
        {clause || art ? (
          <div className="board-prompt__body">
            {clause ? <p className="board-prompt__clause">{clause}</p> : null}
            {art ? <BoardPromptArt cardId={art} /> : null}
          </div>
        ) : null}
        {detail ? <p className="board-prompt__detail">{detail}</p> : null}
        <div className="board-prompt__actions">{children}</div>
      </section>
    </>
  );
}

/** `selectCards` answered out of the viewer's hand: the rail counts the picks. */
export function BoardSelectionRail({
  sourceCardId,
  prompt,
  clause,
  min,
  max,
  pickCount,
  canConfirm,
  onConfirm,
  onNoSelection,
  onOpenDialog,
}: {
  /** The card asking for the selection, shown as the same art cue the optional rail uses. */
  sourceCardId?: string;
  prompt: string;
  /** The printed clause that asked for the selection, so the rail carries the same context the dialog did. */
  clause?: string;
  min: number;
  max: number;
  pickCount: number;
  canConfirm: boolean;
  onConfirm: () => void;
  onNoSelection: () => void;
  onOpenDialog?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <BoardPromptRail
      variant="selection"
      label={t("overlay.handSelection")}
      eyebrow={t("overlay.handSelection")}
      art={sourceCardId}
      prompt={prompt}
      clause={clause}
      detail={t("overlay.selectedOfRange", { count: pickCount, range: min === max ? `${max}` : `${min}–${max}` })}
      onOpenDialog={onOpenDialog}
    >
      {/* Keep both action slots mounted. Besides making both ways out of a selection
          immediately discoverable, this prevents the rail from jumping when the first
          card is picked. */}
      <Button full icon={Icons.Check} disabled={pickCount === 0 || !canConfirm} onClick={onConfirm}>
        {t("overlay.endSelection")}
      </Button>
      <Button full variant="secondary" onClick={onNoSelection}>
        {t("overlay.noSelection")}
      </Button>
    </BoardPromptRail>
  );
}

/** `optional` answered beside the field: the question over the clause, with Use / Not use. */
export function BoardOptionalPrompt({
  sourceCardId,
  prompt,
  clause,
  onUse,
  onDecline,
  onOpenDialog,
}: {
  sourceCardId?: string;
  /** The engine's question, already filtered of internal summaries; falls back to a generic one. */
  prompt?: string;
  clause?: string;
  onUse: () => void;
  onDecline: () => void;
  onOpenDialog?: () => void;
}) {
  const { t } = useTranslation();
  const sourceName = sourceCardId ? cardDisplayName(sourceCardId, t) : undefined;
  return (
    <BoardPromptRail
      variant="prompt"
      label={sourceName ? t("overlay.cardEffect", { name: sourceName }) : t("overlay.useEffectPrompt")}
      // The art is the card, so the name below it would only repeat the picture. The link
      // is kept when there is no art to show instead.
      art={sourceCardId}
      prompt={prompt ?? t("overlay.useEffectPrompt")}
      clause={clause}
      // The dialog shows nothing the rail does not, so Escape is the only way back to it.
      onOpenDialog={onOpenDialog}
    >
      <Button className="board-prompt__use" full icon={Icons.Sparkles} onClick={onUse}>
        {t("overlay.use")}
      </Button>
      <Button className="board-prompt__decline" full variant="secondary" onClick={onDecline}>
        {t("overlay.notUse")}
      </Button>
    </BoardPromptRail>
  );
}

/**
 * The opponent has a decision open. Their seat is public in the synchronized
 * state (only the decision's payload is view-gated), so this needs no extra
 * server signal and leaks nothing about what they are choosing.
 */
export function OpponentSelectingPill() {
  const { t } = useTranslation();
  return (
    <div className="board-opponent-pill" role="status" data-testid="opponent-selecting-pill">
      <span className="board-opponent-pill__dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {t("game.opponentIsSelecting")}
    </div>
  );
}
