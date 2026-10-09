import type { AccountNotification } from "@aegis/shared";
import { useEffect, useId, useRef, useState } from "react";
import { FEEDBACK_STATUS_TONE, relativeTime } from "../bugs/feedbackStatus";
import { Badge } from "../design/primitives";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import type { NotificationInbox } from "./useNotificationInbox";
import "./notificationBell.css";

const BADGE_CAP = 9;

export function NotificationBell({
  inbox,
  onOpenFeedback,
}: {
  inbox: NotificationInbox;
  /** Opens the reporter's own feedback page, focused on one report when given. */
  onOpenFeedback: (feedbackId?: number) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const { load } = inbox;

  useEffect(() => {
    if (!open) return;
    void load();
    const closeOnOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, load]);

  const label = inbox.unread > 0 ? t("notifications.openUnread", { count: inbox.unread }) : t("notifications.open");

  const select = (notification: AccountNotification) => {
    void inbox.markRead([notification.id]);
    setOpen(false);
    onOpenFeedback(notification.payload.feedbackId);
  };

  return (
    <div className="aegis-notifications" ref={root}>
      <button
        ref={button}
        className="aegis-icon-button aegis-notifications__button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <Icons.Bell size={18} />
        {inbox.unread > 0 ? (
          <span className="aegis-notifications__badge" aria-hidden="true">
            {inbox.unread > BADGE_CAP ? `${BADGE_CAP}+` : inbox.unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <section id={panelId} className="aegis-notifications__panel" aria-label={t("notifications.title")}>
          <header className="aegis-notifications__header">
            <h2>{t("notifications.title")}</h2>
            <button
              className="aegis-notifications__text-button"
              disabled={inbox.unread === 0}
              onClick={() => void inbox.markAllRead()}
            >
              {t("notifications.markAllRead")}
            </button>
          </header>
          {inbox.failed ? <p className="aegis-notifications__state">{t("notifications.failed")}</p> : null}
          {!inbox.failed && inbox.loading && inbox.items.length === 0 ? (
            <p className="aegis-notifications__state" role="status">
              {t("common.loading")}
            </p>
          ) : null}
          {!inbox.failed && !inbox.loading && inbox.items.length === 0 ? (
            <p className="aegis-notifications__state">{t("notifications.empty")}</p>
          ) : null}
          {inbox.items.length ? (
            <ul className="aegis-notifications__list">
              {inbox.items.map((notification) => (
                <li key={notification.id}>
                  <NotificationItem notification={notification} onSelect={() => select(notification)} />
                </li>
              ))}
            </ul>
          ) : null}
          {inbox.nextBefore !== null ? (
            <button
              className="aegis-notifications__text-button aegis-notifications__more"
              disabled={inbox.loading}
              onClick={() => void inbox.loadMore()}
            >
              {t("notifications.older")}
            </button>
          ) : null}
          <footer className="aegis-notifications__footer">
            <button
              className="aegis-notifications__text-button"
              onClick={() => {
                setOpen(false);
                onOpenFeedback();
              }}
            >
              {t("notifications.viewAllFeedback")}
              <Icons.ArrowRight size={14} />
            </button>
          </footer>
        </section>
      ) : null}
    </div>
  );
}

function NotificationItem({ notification, onSelect }: { notification: AccountNotification; onSelect: () => void }) {
  const { t, locale } = useTranslation();
  const { payload } = notification;
  const unread = notification.readAt === null;
  return (
    <button className="aegis-notifications__item" data-unread={unread || undefined} onClick={onSelect}>
      <span className="aegis-notifications__dot" aria-hidden="true" />
      <span className="aegis-notifications__copy">
        <span className="aegis-notifications__headline">
          {unread ? <span className="aegis-sr-only">{t("notifications.unread")} </span> : null}
          {payload.bugConfirmed && payload.previousStatus === payload.status
            ? t("notifications.feedback.confirmed", { summary: payload.summary })
            : t(`notifications.feedback.${payload.status}`, { summary: payload.summary })}
        </span>
        {payload.replyExcerpt ? <span className="aegis-notifications__excerpt">{payload.replyExcerpt}</span> : null}
        {payload.bugConfirmed ? (
          <span className="aegis-notifications__bonus">{t("notifications.bugConfirmedPoint")}</span>
        ) : null}
        <time dateTime={new Date(notification.createdAt).toISOString()}>
          {relativeTime(notification.createdAt, locale)}
        </time>
      </span>
      <Badge tone={FEEDBACK_STATUS_TONE[payload.status]}>{t(`feedback.status.${payload.status}`)}</Badge>
    </button>
  );
}
