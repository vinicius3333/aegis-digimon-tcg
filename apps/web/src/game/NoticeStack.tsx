/* The framed notices of the reference client: a blue corner-bracketed panel
   carrying the clause that just resolved next to the art of the card that
   resolved it, anchored to the corner belonging to whoever caused it.

   The model, the anchoring and the clocks live in ./notices; this file only
   draws them. Every notice wears the border that erodes clockwise as its
   reading time runs out, and a close button for a player who has read it
   already. */

import { getCardDefinition } from "@aegis/shared";
import { CardMini } from "../design/cards";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { TIMING_LABELS, playerFacingEffectClause } from "./overlays";
import {
  noticeRemaining,
  noticesAt,
  occupiedAnchors,
  type MatchNotice,
  type NoticeAnchor,
  type NoticeHorizontal,
} from "./notices";

const NOTICE_THUMB_WIDTH = 46;

function EffectNoticeBody({ cardId, timing, description }: { cardId: string; timing?: string; description?: string }) {
  const { t } = useTranslation();
  const clause = playerFacingEffectClause({ cardId, timing, description });
  const label = (timing ? TIMING_LABELS[timing] : undefined) ?? t("overlay.effect");
  return (
    <>
      {/* Decorative: the notice already names the card in its title, and a second
          accessible copy would make every card on screen ambiguous. */}
      <span className="match-notice__thumb" aria-hidden="true">
        <CardMini cardId={cardId} width={NOTICE_THUMB_WIDTH} zoomOnHover={false} />
      </span>
      <div className="match-notice__copy">
        <span className="match-notice__label">{label}</span>
        <strong className="match-notice__title">{getCardDefinition(cardId)?.nameEn ?? cardId}</strong>
        {clause ? <p className="match-notice__text">{clause}</p> : null}
      </div>
    </>
  );
}

function RecoveryNoticeBody({ amount, mine }: { amount: number; mine: boolean }) {
  const { t } = useTranslation();
  return (
    <>
      <span className="match-notice__icon">
        <Icons.ShieldCheck size={22} />
      </span>
      <div className="match-notice__copy">
        <span className="match-notice__label">{t(mine ? "overlay.recoveryYou" : "overlay.recoveryOpp")}</span>
        <strong className="match-notice__title">{t("overlay.recovery", { count: amount })}</strong>
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
        <EffectNoticeBody cardId={body.cardId} timing={body.timing} description={body.description} />
      ) : body.variant === "recovery" ? (
        <RecoveryNoticeBody amount={body.amount} mine={notice.side === "you"} />
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

export function NoticeStack({
  notices,
  panelSide = "right",
  nowMs,
  onDismiss,
}: {
  notices: readonly MatchNotice[];
  /** Which half the timed side panels occupy, so security notices can mirror away from them. */
  panelSide?: NoticeHorizontal;
  /** Injected so the eroding borders start at the right point after a re-render. */
  nowMs?: number;
  onDismiss: (id: string) => void;
}) {
  if (notices.length === 0) return null;
  const now = nowMs ?? Date.now();
  return (
    <>
      {occupiedAnchors(notices, panelSide).map((anchor: NoticeAnchor) => (
        <div className="match-notice-stack" data-anchor={anchor} data-testid="match-notice-stack" key={anchor}>
          {noticesAt(notices, anchor, panelSide).map((notice) => (
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
