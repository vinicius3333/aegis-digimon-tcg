/* Decisions answered on the board instead of in a dialog: the left rail that
   carries the prompt and its actions while the cards are picked in place, and
   the pill that tells the viewer the opponent is busy picking cards of their
   own. Which decisions land here is decided by ./decisionPresentation; this file
   only draws them. */

import { useEffect, type ReactNode } from "react";
import { Button } from "../design/primitives";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { CardLink, cardDisplayName } from "./cardLinks";

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

function BoardPromptRail({
  label,
  eyebrow,
  prompt,
  clause,
  detail,
  onOpenDialog,
  children,
}: {
  label: string;
  eyebrow?: ReactNode;
  prompt: string;
  clause?: string;
  detail?: string;
  onOpenDialog?: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  useEscapeToDialog(onOpenDialog);
  return (
    <section className="board-prompt" aria-label={label} data-testid="board-prompt">
      {onOpenDialog ? (
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
      {eyebrow ? <p className="board-prompt__eyebrow">{eyebrow}</p> : null}
      <p className="board-prompt__text" aria-live="polite">
        {prompt}
      </p>
      {clause ? <p className="board-prompt__clause">{clause}</p> : null}
      {detail ? <p className="board-prompt__detail">{detail}</p> : null}
      <div className="board-prompt__actions">{children}</div>
    </section>
  );
}

/** `selectCards` answered out of the viewer's hand: the rail counts the picks. */
export function BoardSelectionRail({
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
      label={t("overlay.handSelection")}
      eyebrow={t("overlay.handSelection")}
      prompt={prompt}
      clause={clause}
      detail={t("overlay.selectedOfRange", { count: pickCount, range: min === max ? `${max}` : `${min}–${max}` })}
      onOpenDialog={onOpenDialog}
    >
      <Button full icon={Icons.Check} disabled={!canConfirm} onClick={onConfirm}>
        {t("overlay.endSelection")}
      </Button>
      {min === 0 ? (
        <Button full variant="secondary" onClick={onNoSelection}>
          {t("overlay.noSelection")}
        </Button>
      ) : null}
    </BoardPromptRail>
  );
}

/** `optional` answered beside the field: "Will you use …?" with Use / Not use. */
export function BoardOptionalPrompt({
  sourceCardId,
  prompt,
  clause,
  onUse,
  onDecline,
  onOpenDialog,
}: {
  sourceCardId?: string;
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
      label={sourceName ? t("overlay.cardEffect", { name: sourceName }) : t("overlay.useEffectPrompt")}
      // The prompt and the clause below are the card's own printed text, which names
      // other cards only as prose this client cannot resolve to ids. The source is the
      // one card the rail holds an id for, so it is the one name that links.
      eyebrow={sourceCardId ? <CardLink cardId={sourceCardId} /> : undefined}
      prompt={prompt ?? (clause ? t("overlay.willYouUse", { effect: clause }) : t("overlay.useEffectPrompt"))}
      clause={prompt && clause ? clause : undefined}
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
