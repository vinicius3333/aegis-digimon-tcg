/* Simple actions use the left dialog. Hand and field choices use their physical cards;
   other card choices use the central gallery. The pill tells
   the viewer when the opponent is choosing. */

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Button } from "../design/primitives";
import { CardMini } from "../design/cards";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { en } from "../i18n/en";
import { cardDisplayName, useCardOpener } from "./cardLinks";
import { DecisionBoardReturn } from "./overlay/choice/DecisionBoardReturn";
import { useEffectPromptFocus } from "./overlay/choice/useEffectPromptFocus";
import "./overlay/fieldDecisionRail.css";
import { usePromptHandSpace } from "./overlay/choice/usePromptHandSpace";
import { useDecisionSourceMask } from "./overlay/choice/useDecisionSourceMask";

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

/** Hand and field selections use physical cards; other prompts use their own buttons. */
export type BoardPromptVariant = "prompt" | "selection" | "field-selection";

/** A small illustration cue; the full card remains available through its opener. */
const BOARD_PROMPT_ART_WIDTH = 64;

/**
 * The card asking the question. With the name gone from the rail, the art is the only
 * route to the card, so it carries the link's role and label rather than being decorative.
 */
function BoardPromptArt({ cardId, width }: { cardId: string; width: number }) {
  const { t } = useTranslation();
  const openCard = useCardOpener();
  const art = (
    <span className="board-prompt__art-crop">
      <CardMini cardId={cardId} width={width} zoomOnHover={false} />
    </span>
  );
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

export function BoardPromptRail({
  variant,
  sourcePermanentId,
  label,
  art,
  artWidth = BOARD_PROMPT_ART_WIDTH,
  eyebrow,
  prompt,
  clause,
  clauseLang,
  detail,
  budgetText,
  handClearance,
  className,
  onOpenDialog,
  showDialogButton,
  children,
}: {
  variant: BoardPromptVariant;
  sourcePermanentId?: string;
  label: string;
  /** The card asking the question. Its picture says which card this is, so the name does not have to. */
  art?: string;
  artWidth?: number;
  eyebrow?: ReactNode;
  prompt: string;
  clause?: string;
  clauseLang?: string;
  detail?: string;
  budgetText?: string;
  handClearance?: number;
  className?: string;
  /** Escape hands the decision back to its dialog whenever this is set. */
  onOpenDialog?: () => void;
  /** Also offer that hand-off as a visible control; only worth it when the dialog shows more than the rail does. */
  showDialogButton?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  useEscapeToDialog(onOpenDialog);
  const modal = variant === "prompt";
  const sourceMask = useDecisionSourceMask(modal ? sourcePermanentId : undefined);
  const focusProps = useEffectPromptFocus(!modal);
  usePromptHandSpace(focusProps.ref, !modal);
  return (
    <>
      <div
        className={modal ? "decision-overlay-backdrop" : "board-prompt-scrim"}
        data-variant={variant}
        data-source-permanent-id={sourceMask ? sourcePermanentId : undefined}
        style={sourceMask}
        aria-hidden
      />
      <section
        className={`board-prompt${variant === "field-selection" ? " combat-prompt" : ""}${className ? ` ${className}` : ""}`}
        aria-label={label}
        role={modal ? "dialog" : "region"}
        aria-modal={modal || undefined}
        {...(modal ? focusProps : {})}
        ref={focusProps.ref}
        data-testid="board-prompt"
        data-variant={variant}
        data-prompt-surface="left"
        style={
          {
            "--decision-hand-clearance": handClearance === undefined ? undefined : `${handClearance}px`,
          } as CSSProperties
        }
      >
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
          {/* Announce the action first; the printed clause supplies its context below. */}
          <p className="board-prompt__text" aria-live="polite">
            {prompt}
          </p>
        </div>
        {/* The clause leads and the art sits beside it, against the top: the text is what
            the player reads, the picture only says which card is asking. */}
        {clause || art ? (
          <div className="board-prompt__body">
            {clause ? (
              <p className="board-prompt__clause" lang={clauseLang}>
                {clause}
              </p>
            ) : null}
            {art ? <BoardPromptArt cardId={art} width={artWidth} /> : null}
          </div>
        ) : null}
        {detail ? <p className="board-prompt__detail">{detail}</p> : null}
        {budgetText ? (
          <p className="board-prompt__detail board-prompt__budget" role="status">
            {budgetText}
          </p>
        ) : null}
        <div className="board-prompt__actions">{children}</div>
      </section>
    </>
  );
}

/** `selectCards` answered out of the viewer's hand: the rail counts the picks. */
export function BoardSelectionRail({
  fieldSelection = false,
  attackSelection = false,
  sourceCardId,
  prompt,
  clause,
  min,
  max,
  pickCount,
  canConfirm,
  confirmLabel,
  budgetText,
  onConfirm,
  onNoSelection,
  onOpenDialog,
}: {
  fieldSelection?: boolean;
  /** Attack declarations pick their target on the field even when the only candidate is the opposing player. */
  attackSelection?: boolean;
  /** The card asking for the selection, shown as the same art cue the optional rail uses. */
  sourceCardId?: string;
  prompt: string;
  /** The printed clause that asked for the selection, so the rail carries the same context the dialog did. */
  clause?: string;
  min: number;
  max: number;
  pickCount: number;
  canConfirm: boolean;
  /** Names what confirming does, such as the attack it declares, in place of the generic confirm. */
  confirmLabel?: string;
  budgetText?: string;
  onConfirm: () => void;
  onNoSelection: () => void;
  onOpenDialog?: () => void;
}) {
  const { t } = useTranslation();
  const [isViewingBoard, setIsViewingBoard] = useState(false);
  const [handClearance, setHandClearance] = useState<number>();
  const returnControlRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (fieldSelection || attackSelection || isViewingBoard) return;
    const hand = document.querySelector<HTMLElement>(".game-hand-dock");
    if (!hand) return;
    const update = () => {
      // The fan and selected cards can rise above the dock's layout box.
      // Reserve their painted bounds as well as the dock's scroll controls.
      const cardTops = [...hand.querySelectorAll<HTMLElement>(".game-hand-card")]
        .map((card) => card.getBoundingClientRect())
        .filter((bounds) => bounds.width > 0 && bounds.height > 0)
        .map((bounds) => bounds.top);
      const top = Math.min(hand.getBoundingClientRect().top, ...cardTops);
      setHandClearance(Math.max(0, window.innerHeight - top));
    };
    update();
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(update);
    observer?.observe(hand);
    const mutations = new MutationObserver(update);
    mutations.observe(hand, { attributes: true, childList: true, subtree: true });
    window.addEventListener("resize", update);
    hand.addEventListener("transitionend", update);
    hand.addEventListener("scroll", update, true);
    return () => {
      observer?.disconnect();
      mutations.disconnect();
      window.removeEventListener("resize", update);
      hand.removeEventListener("transitionend", update);
      hand.removeEventListener("scroll", update, true);
    };
  }, [fieldSelection, attackSelection, isViewingBoard]);

  useEffect(() => {
    if (fieldSelection || attackSelection || isViewingBoard) return;
    document.querySelector<HTMLElement>(".game-hand-dock .game-hand-card--pickable")?.focus({ preventScroll: true });
  }, [fieldSelection, attackSelection, isViewingBoard]);

  useEffect(() => {
    if (isViewingBoard) returnControlRef.current?.querySelector("button")?.focus();
  }, [isViewingBoard]);

  if (isViewingBoard) {
    return <DecisionBoardReturn returnControlRef={returnControlRef} onReturn={() => setIsViewingBoard(false)} />;
  }

  const selectionLabel = attackSelection
    ? t("overlay.attackTarget")
    : fieldSelection
      ? t("overlay.confirmTargets")
      : t("overlay.handSelection");
  return (
    <BoardPromptRail
      variant={fieldSelection || attackSelection ? "field-selection" : "selection"}
      className={fieldSelection || attackSelection ? "board-prompt--target-selection" : ""}
      label={selectionLabel}
      eyebrow={selectionLabel}
      art={sourceCardId}
      prompt={prompt}
      clause={clause}
      detail={t("overlay.selectedOfRange", { count: pickCount, range: min === max ? `${max}` : `${min}–${max}` })}
      budgetText={budgetText}
      handClearance={handClearance}
      onOpenDialog={fieldSelection ? undefined : onOpenDialog}
    >
      {/* Keep the confirm slot mounted so the rail does not jump when the first card is
          picked. No Selection only exists for an up-to selection (min 0); a mandatory
          one (BT24-016 forcing the opponent to place a card as security) has no way out,
          so offering the button would promise an answer the server rejects. */}
      <Button full icon={Icons.Check} disabled={pickCount === 0 || !canConfirm} onClick={onConfirm}>
        {confirmLabel ?? t(fieldSelection || attackSelection ? "overlay.confirmTargets" : "overlay.endSelection")}
      </Button>
      {min === 0 ? (
        <Button full variant="secondary" onClick={onNoSelection}>
          {t(fieldSelection || attackSelection ? "overlay.passNoSelection" : "overlay.noSelection")}
        </Button>
      ) : null}
      <Button
        className="board-prompt__select-on-board"
        full
        variant="secondary"
        icon={Icons.Map}
        onClick={() => setIsViewingBoard(true)}
      >
        {t(fieldSelection || attackSelection ? "overlay.selectOnBoard" : "overlay.viewBoard")}
      </Button>
    </BoardPromptRail>
  );
}

/** A block window is answered from the battle area; the rail only carries context and decline. */
export function BoardBlockPrompt({
  attackerCardId,
  mustBlock,
  onDecline,
}: {
  attackerCardId?: string;
  mustBlock: boolean;
  onDecline: () => void;
}) {
  const { t } = useTranslation();
  const { boardReturn, viewBoard } = useBoardView();
  if (boardReturn) return boardReturn;
  return (
    <BoardPromptRail
      variant="field-selection"
      className="board-prompt--block"
      label={t("overlay.blockWindow")}
      eyebrow={mustBlock ? "＜Collision＞" : "＜Blocker＞"}
      art={attackerCardId}
      prompt={t("overlay.blockChooseCard")}
      clause={en[mustBlock ? "overlay.blockForcedPrompt" : "overlay.blockPrompt"]}
      clauseLang="en"
    >
      {!mustBlock ? (
        <Button full variant="secondary" icon={Icons.Shield} onClick={onDecline}>
          {t("overlay.takeAttack")}
        </Button>
      ) : null}
      <ViewBoardButton onClick={viewBoard} />
    </BoardPromptRail>
  );
}

/** Alliance is answered by choosing an eligible Digimon directly in the battle area. */
export function BoardAlliancePrompt({ attackerCardId, onPass }: { attackerCardId?: string; onPass: () => void }) {
  const { t } = useTranslation();
  const [isViewingBoard, setIsViewingBoard] = useState(false);
  const returnControlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isViewingBoard) returnControlRef.current?.querySelector("button")?.focus();
  }, [isViewingBoard]);

  if (isViewingBoard) {
    return <DecisionBoardReturn returnControlRef={returnControlRef} onReturn={() => setIsViewingBoard(false)} />;
  }
  return (
    <BoardPromptRail
      variant="field-selection"
      className="board-prompt--alliance"
      label={t("overlay.allianceWindow")}
      eyebrow="＜Alliance＞"
      art={attackerCardId}
      prompt={t("overlay.allianceChooseCard")}
      clause={en["overlay.alliancePrompt"]}
      clauseLang="en"
    >
      <Button variant="secondary" onClick={onPass}>
        {t("overlay.passAlliance")}
      </Button>
      <Button variant="secondary" icon={Icons.Map} onClick={() => setIsViewingBoard(true)}>
        {t("overlay.viewBoard")}
      </Button>
    </BoardPromptRail>
  );
}

/**
 * A rail's "View board" toggle: while viewing, the rail steps aside for a single Return
 * control, which takes focus so the keyboard can bring the question back.
 */
function useBoardView() {
  const [isViewingBoard, setIsViewingBoard] = useState(false);
  const returnControlRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isViewingBoard) returnControlRef.current?.querySelector("button")?.focus();
  }, [isViewingBoard]);
  const boardReturn = isViewingBoard ? (
    <DecisionBoardReturn returnControlRef={returnControlRef} onReturn={() => setIsViewingBoard(false)} />
  ) : null;
  return { boardReturn, viewBoard: () => setIsViewingBoard(true) };
}

export function ViewBoardButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <Button full variant="secondary" icon={Icons.Map} onClick={onClick}>
      {t("overlay.viewBoard")}
    </Button>
  );
}

/**
 * First step of a one-card pick from several Digimon's digivolution cards: the viewer taps
 * the Digimon on the board, and the dialog then shows only the cards under it.
 */
export function BoardSourceHostPrompt({
  sourceCardId,
  clause,
  onNoSelection,
}: {
  sourceCardId?: string;
  clause?: string;
  /** Set when the pick may be declined. */
  onNoSelection?: () => void;
}) {
  const { t } = useTranslation();
  const { boardReturn, viewBoard } = useBoardView();
  if (boardReturn) return boardReturn;
  return (
    <BoardPromptRail
      variant="field-selection"
      className="board-prompt--target-selection"
      label={t("overlay.chooseSourceHost")}
      eyebrow={t("overlay.chooseSourceHost")}
      art={sourceCardId}
      prompt={t("overlay.chooseSourceHostPrompt")}
      clause={clause}
    >
      {onNoSelection ? (
        <Button full variant="secondary" onClick={onNoSelection}>
          {t("overlay.noSelection")}
        </Button>
      ) : null}
      <ViewBoardButton onClick={viewBoard} />
    </BoardPromptRail>
  );
}

/** `optional` answered beside the field: the question over the clause, with Use / Not use. */
export function BoardOptionalPrompt({
  sourceCardId,
  sourcePermanentId,
  contextText,
  clause,
  onUse,
  onDecline,
  onOpenDialog,
}: {
  sourceCardId?: string;
  sourcePermanentId?: string;
  /** Additional decision context belongs below the standard activation heading. */
  contextText?: string;
  clause?: string;
  onUse: () => void;
  onDecline: () => void;
  onOpenDialog?: () => void;
}) {
  const { t } = useTranslation();
  const { boardReturn, viewBoard } = useBoardView();
  const sourceName = sourceCardId ? cardDisplayName(sourceCardId, t) : undefined;
  if (boardReturn) return boardReturn;
  return (
    <BoardPromptRail
      variant="prompt"
      sourcePermanentId={sourcePermanentId}
      label={sourceName ? t("overlay.cardEffect", { name: sourceName }) : t("overlay.useEffectPrompt")}
      // The art is the card, so the name below it would only repeat the picture. The link
      // is kept when there is no art to show instead.
      art={sourceCardId}
      prompt={t("overlay.useEffectPrompt")}
      clause={clause ?? contextText}
      detail={clause ? contextText : undefined}
      // The dialog shows nothing the rail does not, so Escape is the only way back to it.
      onOpenDialog={onOpenDialog}
    >
      <Button className="board-prompt__use" full icon={Icons.Sparkles} onClick={onUse}>
        {t("overlay.use")}
      </Button>
      <Button className="board-prompt__decline" full variant="secondary" onClick={onDecline}>
        {t("overlay.notUse")}
      </Button>
      <ViewBoardButton onClick={viewBoard} />
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
