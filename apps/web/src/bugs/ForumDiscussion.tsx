import type { BugForumDetail } from "@aegis/shared/feedback/BugForum";
import { useEffect, useState } from "react";
import { Alert } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import { BugForumConversation } from "@/bugs/BugForumConversation";
import { BugForumResult } from "@/bugs/BugForumResult";
import { bugForumApi } from "@/bugs/bugForumClient";

export function BugForumDiscussion({ bugId }: { bugId: number }) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<BugForumDetail>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void bugForumApi
      .read(bugId, controller.signal)
      .then(setDetail)
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [bugId]);

  if (failed) return <Alert tone="warning" title={t("bugForum.failed")} />;
  if (!detail) return <p role="status">{t("common.loading")}</p>;
  return (
    <div className="bug-thread-admin">
      {detail.tally ? <BugForumResult detail={detail} tally={detail.tally} /> : null}
      <BugForumConversation detail={detail} onChange={setDetail} />
    </div>
  );
}
