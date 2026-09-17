import { EffectText } from "./EffectText";
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
import { DESKTOP_NOTICE_QUERY, useMediaQuery } from "../design/useMediaQuery";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { CardLink, useCardOpener } from "./cardLinks";
import { TIMING_LABELS, playerFacingEffectClause } from "./overlays";
import { type MatchNotice, type NoticeKeyword } from "./notices";

/** The art beside the clause: a thumbnail on a phone, a readable card on a desktop board. */
const NOTICE_THUMB_WIDTH = 46;
const NOTICE_THUMB_WIDTH_DESKTOP = 92;

/**
 * The notice's art, opening the card when the board has somewhere to open it.
 *
 * Decorative: the notice already names the card next to it as a link, and a
 * second accessible copy would make every card on screen ambiguous.
 */
function NoticeThumb({ cardId, artId }: { cardId: string; artId?: string }) {
  const openCard = useCardOpener();
  const desktop = useMediaQuery(DESKTOP_NOTICE_QUERY);
  const width = desktop ? NOTICE_THUMB_WIDTH_DESKTOP : NOTICE_THUMB_WIDTH;
  return (
    <span className="match-notice__thumb" aria-hidden="true">
      <CardMini
        cardId={cardId}
        artId={artId}
        width={width}
        zoomOnHover={false}
        onClick={openCard ? () => openCard(cardId, artId) : undefined}
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
  /* The clause prints its own timing in brackets and the art says which card raised it, so
     with a clause on screen the label and the name only repeat what is already there. They
     stay in the DOM — the name is how a keyboard and a screen reader open the card — and a
     notice with no clause still shows both, because then they are all it has. */
  const restated = Boolean(clause);
  return (
    <div className="match-notice__copy">
      <span className="match-notice__label" data-quiet={restated || undefined}>
        {label}
      </span>
      <strong className="match-notice__title" data-quiet={restated || undefined}>
        <CardLink cardId={cardId} />
      </strong>
      {/* The clause is the card's printed text: it names other cards, but only as
          prose this client cannot resolve to ids, so it stays unlinked. */}
      {clause ? (
        <p className="match-notice__text">
          <EffectText text={clause} />
        </p>
      ) : null}
    </div>
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
          <>
            <EffectNoticeBody
              cardId={body.cardId}
              timing={body.timing}
              description={body.description}
              isInherited={body.isInherited}
            />
            <NoticeThumb cardId={body.cardId} />
          </>
        ) : body.variant === "recovery" || body.variant === "securityGain" ? (
          <SecurityGainNoticeBody
            amount={body.amount}
            mine={notice.side === "you"}
            recovery={body.variant === "recovery"}
          />
        ) : body.variant === "keyword" ? (
          <KeywordNoticeBody keyword={body.keyword} cardId={body.cardId} />
        ) : body.variant === "rejection" ? (
          <RejectionNoticeBody reason={body.reason} />
        ) : /* A deletion is a titled list of cards, so the board draws it with the panel
               component the trashed-cards list already uses (`narration.ts`,
               `deletionPanel`) rather than in this frame. */
        null}
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
