import type { ForumSummary } from "@aegis/shared/feedback/Forum";
import { ForumBoard } from "@aegis/shared/feedback/ForumBoard";
import { useEffect, useState } from "react";
import { Button } from "@/design/primitives";
import { Icons } from "@/design/icons";
import { AegisCoinBalance } from "@/bugs/AegisCoinBalance";
import { forumApi } from "@/bugs/forumClient";
import { HomeCard } from "@/home/HomeCard";
import { useTranslation } from "@/i18n/useTranslation";

type HomeBugForumCardParams = {
  signedIn: boolean;
  onOpen: () => void;
  onSignIn: () => void;
};

export function HomeBugForumCard({ signedIn, onOpen, onSignIn }: HomeBugForumCardParams) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<ForumSummary>();

  useEffect(() => {
    const controller = new AbortController();
    void forumApi(ForumBoard.BUGS.value)
      .summary(controller.signal)
      .then(setSummary)
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
        {signedIn && summary?.aegisCoins !== null && summary?.aegisCoins !== undefined ? (
          <AegisCoinBalance coins={summary.aegisCoins} size="lg" />
        ) : null}
        <p>
          {!signedIn
            ? t("bugForum.home.guest")
            : awaiting > 0
              ? t("bugForum.home.awaiting", { count: awaiting })
              : t("bugForum.home.caughtUp")}
        </p>
        {!signedIn ? (
          <Button size="sm" variant="secondary" onClick={onSignIn}>
            {t("bugForum.signInTitle")}
          </Button>
        ) : (
          <Button size="sm" variant={awaiting > 0 ? "primary" : "secondary"} onClick={onOpen}>
            {t(awaiting > 0 ? "bugForum.home.voteNow" : "bugForum.home.browse")}
          </Button>
        )}
      </div>
    </HomeCard>
  );
}
