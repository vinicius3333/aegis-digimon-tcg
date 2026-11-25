import { ForumState, type ForumItem, type ForumSummary } from "@aegis/shared/feedback/Forum";
import { ForumBoard } from "@aegis/shared/feedback/ForumBoard";
import { useEffect, useState } from "react";
import { Button } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { ForumVotePill } from "@/bugs/ForumVotePill";
import { forumApi } from "@/bugs/forumClient";
import { HomeCard } from "@/home/HomeCard";
import { useTranslation } from "@/i18n/useTranslation";
import "@/bugs/forum.css";

const HOME_BUG_PREVIEW_COUNT = 3;

type HomeBugForumCardParams = {
  signedIn: boolean;
  onOpen: () => void;
  onOpenReport: (reportId: number) => void;
  onSignIn: () => void;
};

function awaitsVote(item: ForumItem): boolean {
  return !item.ownReport && !item.myVote && item.outcome === null;
}

function pickPreviews(items: ForumItem[]): ForumItem[] {
  return [...items.filter(awaitsVote), ...items.filter((item) => !awaitsVote(item))].slice(0, HOME_BUG_PREVIEW_COUNT);
}

export function HomeBugForumCard({ signedIn, onOpen, onOpenReport, onSignIn }: HomeBugForumCardParams) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<ForumSummary>();
  const [previews, setPreviews] = useState<ForumItem[]>();

  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    const api = forumApi(ForumBoard.BUGS.value);
    void api
      .summary(controller.signal)
      .then(setSummary)
      .catch(() => undefined);
    void api
      .list(ForumState.OPEN.value, 1, controller.signal)
      .then((page) => setPreviews(pickPreviews(page.items)))
      .catch(() => undefined);
    return () => controller.abort();
  }, [signedIn]);

  const awaiting = summary?.awaitingVote ?? 0;
  return (
    <HomeCard
      className="home-forum"
      title={
        <>
          <Icons.Bug size={16} aria-hidden="true" />
          {t("bugForum.home.title")}
        </>
      }
      action={{ label: t("bugForum.home.open"), onClick: onOpen }}
    >
      <div className="home-bug-forum__body">
        {!signedIn ? (
          <>
            <p>{t("bugForum.home.guest")}</p>
            <Button size="sm" variant="secondary" onClick={onSignIn}>
              {t("bugForum.signInTitle")}
            </Button>
          </>
        ) : (
          <>
            {summary ? (
              <p>{awaiting > 0 ? t("bugForum.home.awaiting", { count: awaiting }) : t("bugForum.home.caughtUp")}</p>
            ) : null}
            {previews?.length === 0 ? <p>{t("bugForum.empty.open")}</p> : null}
            {previews?.length ? (
              <ul className="home-bug-forum__list">
                {previews.map((item) => (
                  <li key={item.id}>
                    <a
                      className="home-bug-forum__item"
                      href={`/community/${ForumBoard.BUGS.value}/${item.id}`}
                      onClick={(event) => {
                        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
                        event.preventDefault();
                        onOpenReport(item.id);
                      }}
                    >
                      <span className="home-bug-forum__meta">
                        #{item.id}
                        {item.cardIds[0] ? ` · ${item.cardIds[0]}` : null}
                      </span>
                      <span className="home-bug-forum__summary">{item.summary}</span>
                      <ForumVotePill item={item} />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
    </HomeCard>
  );
}
