/* The framed notices of the reference client: a blue corner-bracketed panel
   carrying the clause that just resolved next to the art of the card that
   resolved it, anchored to the corner belonging to whoever caused it.

   The model, the anchoring and the clocks live in ./notices; this file only
   draws them. Every notice wears the border that erodes clockwise as its
   reading time runs out, and a close button for a player who has read it
   already. */

import { CardMini } from "../design/cards";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { CardLink, useCardOpener } from "./cardLinks";
import { TIMING_LABELS, playerFacingEffectClause } from "./overlays";
import {
  noticeRemaining,
  noticesAt,
  noticesCollapsed,
  occupiedAnchors,
  type MatchNotice,
  type NoticeAnchor,
  type NoticeHorizontal,
  type NoticeKeyword,
} from "./notices";

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

function NoticeView({
  notice,
  remainingMs,
  onDismiss,
}: {
  notice: MatchNotice;
  remainingMs: number;
  onDismiss: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { body } = notice;
  return (
    <article
      className="match-notice"
      data-variant={body.variant}
      data-side={notice.side}
      data-testid="match-notice"
      role="status"
      aria-live="polite"
    >
      {/* The clock a player can see: a ring that erodes clockwise over exactly the
          time the queue is holding this notice for. */}
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
  );
}

/** Which of the notices a stack draws: every one, or one of the two families. */
export type NoticeFamily = "all" | "security" | "corners";

function inFamily(notice: MatchNotice, family: NoticeFamily): boolean {
  return family === "all" || (family === "security") === notice.fromSecurity;
}

export function NoticeStack({
  notices,
  family = "all",
  panelSide = "right",
  collapse = false,
  held = false,
  nowMs,
  onDismiss,
}: {
  /** Every notice on screen, whichever family this stack draws: the clocks are shared. */
  notices: readonly MatchNotice[];
  /**
   * The security notices ride the opponent's panel column while the rest keep their
   * corners, so the board mounts the two families in two places and each stack draws
   * only its own. The lifetime stays that of the whole set, so a split stack erodes on
   * the same clock the hook expires it on.
   */
  family?: NoticeFamily;
  /** Which half the timed side panels occupy, so security notices can mirror away from them. */
  panelSide?: NoticeHorizontal;
  /**
   * Fold every anchor into one top-center band — the phone layout, where a
   * corner-anchored notice landed on the hand or the field being read.
   */
  collapse?: boolean;
  /** The clocks are stopped (a decision is waiting), so the eroding borders pause with them. */
  held?: boolean;
  /** Injected so the eroding borders start at the right point after a re-render. */
  nowMs?: number;
  onDismiss: (id: string) => void;
}) {
  const shown = notices.filter((notice) => inFamily(notice, family));
  if (shown.length === 0) return null;
  const now = nowMs ?? Date.now();
  if (collapse) {
    return (
      <div
        className="match-notice-stack"
        data-anchor="top-center"
        data-held={held || undefined}
        data-testid="match-notice-stack"
      >
        {noticesCollapsed(shown).map((notice) => (
          <NoticeView
            key={notice.id}
            notice={notice}
            remainingMs={noticeRemaining(notices, notice, now)}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    );
  }
  return (
    <>
      {occupiedAnchors(shown, panelSide).map((anchor: NoticeAnchor) => (
        <div
          className="match-notice-stack"
          data-anchor={anchor}
          data-held={held || undefined}
          data-testid="match-notice-stack"
          key={anchor}
        >
          {noticesAt(shown, anchor, panelSide).map((notice) => (
            <NoticeView
              key={notice.id}
              notice={notice}
              remainingMs={noticeRemaining(notices, notice, now)}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      ))}
    </>
  );
}
