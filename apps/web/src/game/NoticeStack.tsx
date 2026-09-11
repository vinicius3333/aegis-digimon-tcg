/* The framed notice of the reference client: a blue corner-bracketed panel
   carrying the clause that just resolved next to the art of the card that
   resolved it.

   One notice, not a stack: the presentation queue decides which moment a slot is
   showing (narration.ts), and this file draws it. The name is kept because the
   frame — the eroding border, the close button, the corner brackets — is the same
   thing it always was.

   The clause is always printed, on every layout. It is the one thing on the notice
   the player cannot get from the board itself, and the phone's single slot now
   shows one moment at a time, so there is room for it. */

import { CardMini } from "../design/cards";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { CardLink, useCardOpener } from "./cardLinks";
import { TIMING_LABELS, playerFacingEffectClause } from "./overlays";
import { type MatchNotice, type NoticeKeyword } from "./notices";

const NOTICE_THUMB_WIDTH = 46;

/**
 * The notice's art, opening the card when the board has somewhere to open it.
 *
 * Decorative: the notice already names the card next to it as a link, and a
 * second accessible copy would make every card on screen ambiguous.
 */
function NoticeThumb({ cardId }: { cardId: string }) {
  const openCard = useCardOpener();
  return (
    <span className="match-notice__thumb" aria-hidden="true">
      <CardMini
        cardId={cardId}
        width={NOTICE_THUMB_WIDTH}
        zoomOnHover={false}
        onClick={openCard ? () => openCard(cardId) : undefined}
      />
    </span>
  );
}

function EffectNoticeBody({
  cardId,
  timing,
  description,
  isInherited,
}: {
  cardId: string;
  timing?: string;
  description?: string;
  isInherited?: boolean;
}) {
  const { t } = useTranslation();
  const clause = playerFacingEffectClause({ cardId, timing, description, isInherited });
  const label = (timing ? TIMING_LABELS[timing] : undefined) ?? t("overlay.effect");
  return (
    <>
      <NoticeThumb cardId={cardId} />
      <div className="match-notice__copy">
        <span className="match-notice__label">{label}</span>
        <strong className="match-notice__title">
          <CardLink cardId={cardId} />
        </strong>
        {/* The clause is the card's printed text: it names other cards, but only as
            prose this client cannot resolve to ids, so it stays unlinked. */}
        {clause ? <p className="match-notice__text">{clause}</p> : null}
      </div>
    </>
  );
}

/** The security-increase call-out, shared by ＜Recovery＞ and any other effect stacking a card there. */
function SecurityGainNoticeBody({ amount, mine, recovery }: { amount: number; mine: boolean; recovery: boolean }) {
  const { t } = useTranslation();
  return (
    <>
      <span className="match-notice__icon">
        <Icons.ShieldCheck size={22} />
      </span>
      <div className="match-notice__copy">
        <span className="match-notice__label">{t(mine ? "overlay.recoveryYou" : "overlay.recoveryOpp")}</span>
        <strong className="match-notice__title">
          {t(recovery ? "overlay.recovery" : "overlay.securityGain", { count: amount })}
        </strong>
      </div>
    </>
  );
}

/** The named-mechanic call-out: a pink pill saying what just happened, over the card that did it. */
function KeywordNoticeBody({ keyword, cardId }: { keyword: NoticeKeyword; cardId: string }) {
  const { t } = useTranslation();
  return (
    <>
      <NoticeThumb cardId={cardId} />
      <div className="match-notice__copy">
        <strong className="match-notice__keyword">{t(`notice.keyword.${keyword}` as const)}</strong>
        <span className="match-notice__label">
          <CardLink cardId={cardId} />
        </span>
      </div>
    </>
  );
}

function RejectionNoticeBody({ reason }: { reason: string }) {
  const { t } = useTranslation();
  return (
    <>
      <span className="match-notice__icon">
        <Icons.CircleAlert size={20} />
      </span>
      <div className="match-notice__copy">
        <span className="match-notice__label">{t("notice.rejected")}</span>
        <strong className="match-notice__title">{reason}</strong>
      </div>
    </>
  );
}

export function NoticeStack({
  notice,
  remainingMs,
  held = false,
  onDismiss,
}: {
  notice: MatchNotice;
  /** What is left of the item's reading time, which is what the border erodes over. */
  remainingMs: number;
  /** The clock is stopped (a decision is waiting), so the eroding border pauses with it. */
  held?: boolean;
  /** The close button, which advances to the next moment. */
  onDismiss: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { body } = notice;
  return (
    <div className="match-notice-stack" data-held={held || undefined} data-testid="match-notice-stack">
      <article
        className="match-notice"
        data-variant={body.variant}
        data-side={notice.side}
        data-testid="match-notice"
        role="status"
        aria-live="polite"
      >
        {/* The clock a player can see: a ring that erodes clockwise over exactly the
            time the queue is holding this item for. */}
        <span className="match-notice__erode" style={{ animationDuration: `${remainingMs}ms` }} aria-hidden="true" />
        {body.variant === "effect" ? (
          <EffectNoticeBody
            cardId={body.cardId}
            timing={body.timing}
            description={body.description}
            isInherited={body.isInherited}
          />
        ) : body.variant === "recovery" || body.variant === "securityGain" ? (
          <SecurityGainNoticeBody
            amount={body.amount}
            mine={notice.side === "you"}
            recovery={body.variant === "recovery"}
          />
        ) : body.variant === "keyword" ? (
          <KeywordNoticeBody keyword={body.keyword} cardId={body.cardId} />
        ) : (
          <RejectionNoticeBody reason={body.reason} />
        )}
        <button
          className="match-notice__close"
          type="button"
          aria-label={t("notice.dismiss")}
          onClick={() => onDismiss(notice.id)}
        >
          <span aria-hidden="true">×</span>
        </button>
      </article>
    </div>
  );
}
