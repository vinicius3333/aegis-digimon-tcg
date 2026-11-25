import type { ForumDetail } from "@aegis/shared/feedback/Forum";
import type { ForumBoard } from "@aegis/shared/feedback/ForumBoard";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import { ForumConversation } from "@/bugs/ForumConversation";
import { ForumResult } from "@/bugs/ForumResult";
import { forumApi } from "@/bugs/forumClient";
import { getForumCopyPrefix } from "@/bugs/getForumCopyPrefix";

export function ForumDiscussion({ board, reportId }: { board: ForumBoard; reportId: number }) {
  const { t } = useTranslation();
  const api = useMemo(() => forumApi(board), [board]);
  const [detail, setDetail] = useState<ForumDetail>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void api
      .read(reportId, controller.signal)
      .then(setDetail)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [api, reportId]);

  if (failed) return <Alert tone="warning" title={t("bugForum.failed")} />;
  if (!detail) return <p role="status">{t("common.loading")}</p>;
  return (
    <div className="forum-thread-admin">
      {detail.upvotes !== null ? (
        <p className="forum-thread-muted">
          {t("ideaForum.upvoteLabel", { title: detail.summary, count: detail.upvotes })}
        </p>
      ) : null}
      {detail.tally ? (
        <ForumResult api={api} board={board} detail={detail} tally={detail.tally} onChange={setDetail} />
      ) : null}
      <ForumConversation
        api={api}
        detail={detail}
        placeholder={t(`${getForumCopyPrefix(board)}.commentPlaceholder`)}
        onChange={setDetail}
      />
    </div>
  );
}
