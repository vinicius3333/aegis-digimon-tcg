import { ForumState, type ForumItem, type ForumPage } from "@aegis/shared/feedback/Forum";
import { ForumBoard } from "@aegis/shared/feedback/ForumBoard";
import { useEffect, useMemo, useState } from "react";
import { CommunityPage } from "@/community/CommunityPage";
import { CommunitySection } from "@/community/CommunitySection";
import { Icons } from "@/design/icons";
import { Alert, Badge, Button } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import { AegisCoinBalance } from "@/bugs/AegisCoinBalance";
import { ForumThread } from "@/bugs/ForumThread";
import { ForumUpvoteButton } from "@/bugs/ForumUpvoteButton";
import { forumApi, type ForumApi } from "@/bugs/forumClient";
import { getForumCopyPrefix } from "@/bugs/getForumCopyPrefix";
import "@/bugs/forum.css";

type ForumScreenParams = {
  board: ForumBoard;
  reportId?: number;
  signedIn: boolean;
  metaAvailable: boolean;
  onSignIn: () => void;
  onOpen: (id?: number) => void;
  onSectionChange: (section: CommunitySection) => void;
};

export function ForumScreen({
  board,
  reportId,
  signedIn,
  metaAvailable,
  onSignIn,
  onOpen,
  onSectionChange,
}: ForumScreenParams) {
  const { t } = useTranslation();
  const api = useMemo(() => forumApi(board), [board]);
  const [coins, setCoins] = useState<number | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    void api
      .summary(controller.signal)
      .then((summary) => setCoins(summary.aegisCoins))
      .catch(() => undefined);
    return () => controller.abort();
  }, [api, signedIn, reportId]);

  return (
    <CommunityPage
      section={board === ForumBoard.BUGS.value ? CommunitySection.BUGS.value : CommunitySection.IDEAS.value}
      metaAvailable={metaAvailable}
      onSectionChange={onSectionChange}
      actions={coins === null || board === ForumBoard.IDEAS.value ? undefined : <AegisCoinBalance coins={coins} />}
    >
      {!signedIn ? (
        <div className="forum">
          <ForumIntro board={board} />
          <Alert tone="info" title={t("bugForum.signInTitle")}>
            <p>{t("bugForum.signInCopy")}</p>
            <Button size="sm" onClick={onSignIn}>
              {t("nav.signIn")}
            </Button>
          </Alert>
        </div>
      ) : reportId === undefined ? (
        <ForumList key={board} api={api} board={board} onOpen={onOpen} />
      ) : (
        <ForumThread key={`${board}-${reportId}`} board={board} reportId={reportId} onBack={() => onOpen()} />
      )}
    </CommunityPage>
  );
}

function ForumIntro({ board }: { board: ForumBoard }) {
  const { t } = useTranslation();
  const copy = getForumCopyPrefix(board);
  return (
    <header className="forum-intro">
      <div>
        <h2>{t(`${copy}.title`)}</h2>
        <p>{t(`${copy}.subtitle`)}</p>
      </div>
    </header>
  );
}

function ForumList({ api, board, onOpen }: { api: ForumApi; board: ForumBoard; onOpen: (id: number) => void }) {
  const { t } = useTranslation();
  const copy = getForumCopyPrefix(board);
  const [state, setState] = useState<ForumState>(ForumState.OPEN.value);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ForumPage>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    void api
      .list(state, page, controller.signal)
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [api, state, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const items = data?.items;

  return (
    <div className="forum">
      <ForumIntro board={board} />
      <div className="forum-switch" role="group" aria-label={t(`${copy}.title`)}>
        {[ForumState.OPEN.value, ForumState.DECIDED.value].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={state === value}
            onClick={() => {
              setState(value);
              setPage(1);
              setData(undefined);
            }}
          >
            {t(`bugForum.state.${value}`)}
          </button>
        ))}
      </div>
      {failed ? <Alert tone="warning" title={t("bugForum.failed")} /> : null}
      {!failed && !items ? <p role="status">{t("common.loading")}</p> : null}
      {items && !items.length ? <p className="forum-empty">{t(`${copy}.empty.${state}`)}</p> : null}
      {items?.length ? (
        <ul className="forum-list">
          {items.map((item) => (
            <li key={item.id}>
              <ForumRow
                api={api}
                board={board}
                item={item}
                onOpen={() => onOpen(item.id)}
                onChange={(next) =>
                  setData((current) =>
                    current
                      ? {
                          ...current,
                          items: current.items.map((entry) => (entry.id === next.id ? { ...entry, ...next } : entry)),
                        }
                      : current,
                  )
                }
              />
            </li>
          ))}
        </ul>
      ) : null}
      {data && data.total > data.pageSize ? (
        <ForumPagination page={data.page} pages={pages} pageSize={data.pageSize} total={data.total} onPage={setPage} />
      ) : null}
    </div>
  );
}

type ForumPaginationParams = {
  page: number;
  pages: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
};

function ForumPagination({ page, pages, pageSize, total, onPage }: ForumPaginationParams) {
  const { t } = useTranslation();
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <footer className="forum-pagination">
      <span>{t("profile.pageRange", { from, to, total })}</span>
      <nav aria-label={t("profile.pagination")}>
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <Icons.ChevronLeft size={16} aria-hidden="true" />
          {t("profile.previous")}
        </button>
        {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
          <button
            key={number}
            type="button"
            className="forum-pagination__number"
            aria-label={t("profile.page", { page: number })}
            aria-current={number === page ? "page" : undefined}
            onClick={() => (number === page ? undefined : onPage(number))}
          >
            {number}
          </button>
        ))}
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          {t("profile.next")}
          <Icons.ChevronRight size={16} aria-hidden="true" />
        </button>
      </nav>
    </footer>
  );
}

type ForumRowParams = {
  api: ForumApi;
  board: ForumBoard;
  item: ForumItem;
  onOpen: () => void;
  onChange: (detail: ForumItem) => void;
};

function ForumRow({ api, board, item, onOpen, onChange }: ForumRowParams) {
  const { t, locale } = useTranslation();
  const earned = item.outcome !== null && item.myVote?.verdict === item.outcome;
  return (
    <article className="forum-row" data-voted={item.myVote ? true : undefined}>
      <div className="forum-row__main">
        <p className="forum-row__meta">
          #{item.id} · {new Date(item.createdAt).toLocaleDateString(locale, { dateStyle: "medium" })}
        </p>
        <h3>
          <a
            href={`/community/${board}/${item.id}`}
            onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
              event.preventDefault();
              onOpen();
            }}
          >
            {item.summary}
          </a>
        </h3>
        <p className="forum-row__excerpt">{item.description}</p>
        {item.cardIds.length ? (
          <ul className="forum-cards" aria-label={t("bugReport.cardsLabel")}>
            {item.cardIds.map((cardId) => (
              <li key={cardId}>{cardId}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="forum-row__side">
        {board === ForumBoard.IDEAS.value ? <ForumUpvoteButton api={api} item={item} onChange={onChange} /> : null}
        {item.outcome ? (
          <Badge tone={item.outcome === "yes" && board === ForumBoard.BUGS.value ? "danger" : "neutral"}>
            {t(`bugForum.verdict.${item.outcome}`)}
          </Badge>
        ) : null}
        {board === ForumBoard.IDEAS.value ? null : item.ownReport ? (
          <span className="forum-pill">{t("bugForum.yourReport")}</span>
        ) : item.myVote ? (
          <span className="forum-pill" data-tone="voted">
            <Icons.Check size={14} aria-hidden="true" />
            {t(`bugForum.youVoted.${item.myVote.verdict}`)}
          </span>
        ) : item.outcome === null ? (
          <span className="forum-pill" data-tone="todo">
            {t("bugForum.votePrompt")}
          </span>
        ) : null}
        {earned ? <span className="forum-earned">{t("bugForum.earnedShort")}</span> : null}
        <span className="forum-row__meta-icons">
          {item.hasReplay ? (
            <span className="forum-row__replay">
              <Icons.PlayCircle size={14} aria-hidden="true" />
              <span className="aegis-sr-only">{t("bugForum.watchReplay")}</span>
            </span>
          ) : null}
          <span className="forum-row__comments">
            <Icons.MessageSquare size={14} aria-hidden="true" />
            {item.commentCount}
            <span className="aegis-sr-only">{t("bugForum.commentsLabel")}</span>
          </span>
        </span>
      </div>
    </article>
  );
}
