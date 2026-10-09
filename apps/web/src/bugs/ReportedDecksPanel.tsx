import type { ReportedCommunityDeck } from "@aegis/shared";
import { useEffect, useState } from "react";
import { communityApi } from "../community/client";
import { Badge } from "../design/primitives";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";
import { relativeTime } from "./feedbackStatus";

/**
 * Public decks players reported that no moderator has handled yet. Opening one leads to the deck
 * page, where hiding it or dismissing its reports takes it off this list. Absent when empty.
 */
export function ReportedDecksPanel({ onOpenDeck }: { onOpenDeck: (deckId: string) => void }) {
  const { t, locale } = useTranslation();
  const [decks, setDecks] = useState<ReportedCommunityDeck[]>([]);

  useEffect(() => {
    let current = true;
    communityApi
      .reportedDecks()
      .then((loaded) => {
        if (current) setDecks(loaded);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, []);

  if (!decks.length) return null;

  return (
    <details className="reported-decks">
      <summary>
        <Icons.Flag size={16} />
        {t("feedback.reportedDecks.title", { count: decks.length })}
      </summary>
      <ul>
        {decks.map((deck) => (
          <li key={deck.id}>
            <button type="button" onClick={() => onOpenDeck(deck.id)}>
              <span className="reported-decks__name">{deck.name}</span>
              <span className="reported-decks__meta">
                {t("community.byAuthor", { name: deck.authorName })} ·{" "}
                {t("feedback.reportedDecks.reports", { count: deck.openReports })} ·{" "}
                <time dateTime={new Date(deck.lastReportedAt).toISOString()}>
                  {relativeTime(deck.lastReportedAt, locale)}
                </time>
              </span>
              {deck.status === "hidden" ? <Badge tone="danger">{t("community.moderation.hiddenBadge")}</Badge> : null}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
