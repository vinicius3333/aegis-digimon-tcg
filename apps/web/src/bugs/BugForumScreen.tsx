import { BugForumState, type BugForumItem } from "@aegis/shared/feedback/BugForum";
import { useEffect, useState } from "react";
import { CommunityPage } from "@/community/CommunityPage";
import { CommunitySection } from "@/community/CommunitySection";
import { Icons } from "@/design/icons";
import { Alert, Badge, Button } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import { AegisCoinBalance } from "@/bugs/AegisCoinBalance";
import { BugForumThread } from "@/bugs/BugForumThread";
import { bugForumApi } from "@/bugs/bugForumClient";
import "@/bugs/bugForum.css";

type BugForumScreenParams = {
  bugId?: number;
  signedIn: boolean;
  metaAvailable: boolean;
  onSignIn: () => void;
  onOpen: (id?: number) => void;
  onSectionChange: (section: CommunitySection) => void;
};

export function BugForumScreen({
  bugId,
  signedIn,
  metaAvailable,
  onSignIn,
  onOpen,
  onSectionChange,
}: BugForumScreenParams) {
  const { t } = useTranslation();
  const [coins, setCoins] = useState<number | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    void bugForumApi
      .summary(controller.signal)
      .then((summary) => setCoins(summary.aegisCoins))
      .catch(() => undefined);
    return () => controller.abort();
  }, [signedIn, bugId]);

  return (
    <CommunityPage
      section={CommunitySection.BUGS.value}
      metaAvailable={metaAvailable}
      onSectionChange={onSectionChange}
      actions={coins === null ? undefined : <AegisCoinBalance coins={coins} />}
    >
      {!signedIn ? (
        <div className="bug-forum">
          <BugForumIntro />
          <Alert tone="info" title={t("bugForum.signInTitle")}>
            <p>{t("bugForum.signInCopy")}</p>
            <Button size="sm" onClick={onSignIn}>
              {t("nav.signIn")}
            </Button>
          </Alert>
        </div>
      ) : bugId === undefined ? (
        <BugForumBoard onOpen={onOpen} />
      ) : (
        <BugForumThread key={bugId} bugId={bugId} onBack={() => onOpen()} />
      )}
    </CommunityPage>
  );
}

function BugForumIntro() {
  const { t } = useTranslation();
  return (
    <header className="bug-forum-intro">
      <div>
        <h2>{t("bugForum.title")}</h2>
        <p>{t("bugForum.subtitle")}</p>
      </div>
      <ol className="bug-forum-steps">
        <li>
          <span aria-hidden="true">1</span>
          {t("bugForum.step.read")}
        </li>
        <li>
          <span aria-hidden="true">2</span>
          {t("bugForum.step.vote")}
        </li>
        <li>
          <span aria-hidden="true">3</span>
          {t("bugForum.step.earn")}
        </li>
      </ol>
    </header>
  );
}

function BugForumBoard({ onOpen }: { onOpen: (id: number) => void }) {
  const { t } = useTranslation();
  const [state, setState] = useState<BugForumState>(BugForumState.OPEN.value);
  const [items, setItems] = useState<BugForumItem[]>();
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setItems(undefined);
    setFailed(false);
    setLoading(true);
    void bugForumApi
      .list(state, undefined, controller.signal)
      .then((page) => {
        setItems(page.items);
        setNextBefore(page.nextBefore);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [state]);

  const loadMore = async () => {
    if (nextBefore === null) return;
    setLoading(true);
    try {
      const page = await bugForumApi.list(state, nextBefore);
      setItems((current) => [...(current ?? []), ...page.items]);
      setNextBefore(page.nextBefore);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bug-forum">
      <BugForumIntro />
      <div className="bug-forum-switch" role="group" aria-label={t("bugForum.title")}>
        {[BugForumState.OPEN.value, BugForumState.DECIDED.value].map((value) => (
          <button key={value} type="button" aria-pressed={state === value} onClick={() => setState(value)}>
            {t(`bugForum.state.${value}`)}
          </button>
        ))}
      </div>
      {failed && !items?.length ? <Alert tone="warning" title={t("bugForum.failed")} /> : null}
      {!failed && !items ? <p role="status">{t("common.loading")}</p> : null}
      {items && !items.length ? <p className="bug-forum-empty">{t(`bugForum.empty.${state}`)}</p> : null}
      {items?.length ? (
        <ul className="bug-forum-list">
          {items.map((item) => (
            <li key={item.id}>
              <BugForumRow item={item} onOpen={() => onOpen(item.id)} />
            </li>
          ))}
        </ul>
      ) : null}
      {nextBefore !== null ? (
        <Button variant="secondary" disabled={loading} onClick={() => void loadMore()}>
          {t("bugForum.more")}
        </Button>
      ) : null}
    </div>
  );
}

function BugForumRow({ item, onOpen }: { item: BugForumItem; onOpen: () => void }) {
  const { t, locale } = useTranslation();
  const earned = item.outcome !== null && item.myVote?.verdict === item.outcome;
  return (
    <article className="bug-forum-row" data-voted={item.myVote ? true : undefined}>
      <div className="bug-forum-row__main">
        <p className="bug-forum-row__meta">
          #{item.id} · {new Date(item.createdAt).toLocaleDateString(locale, { dateStyle: "medium" })}
        </p>
        <h3>
          <a
            href={`/community/bugs/${item.id}`}
            onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
              event.preventDefault();
              onOpen();
            }}
          >
            {item.summary}
          </a>
        </h3>
        <p className="bug-forum-row__excerpt">{item.description}</p>
        {item.cardIds.length ? (
          <ul className="bug-forum-cards" aria-label={t("bugReport.cardsLabel")}>
            {item.cardIds.map((cardId) => (
              <li key={cardId}>{cardId}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="bug-forum-row__side">
        {item.outcome ? (
          <Badge tone={item.outcome === "bug" ? "danger" : "neutral"}>{t(`bugForum.verdict.${item.outcome}`)}</Badge>
        ) : null}
        {item.ownReport ? (
          <span className="bug-forum-pill">{t("bugForum.yourReport")}</span>
        ) : item.myVote ? (
          <span className="bug-forum-pill" data-tone="voted">
            <Icons.Check size={14} aria-hidden="true" />
            {t(`bugForum.youVoted.${item.myVote.verdict}`)}
          </span>
        ) : item.outcome === null ? (
          <span className="bug-forum-pill" data-tone="todo">
            {t("bugForum.votePrompt")}
          </span>
        ) : null}
        {earned ? <span className="bug-forum-earned">{t("bugForum.earnedShort")}</span> : null}
        <span className="bug-forum-row__comments">
          <Icons.MessageSquare size={14} aria-hidden="true" />
          {item.commentCount}
          <span className="aegis-sr-only">{t("bugForum.commentsLabel")}</span>
        </span>
      </div>
    </article>
  );
}
