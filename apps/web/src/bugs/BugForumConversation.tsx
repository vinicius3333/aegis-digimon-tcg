import type { BugForumDetail } from "@aegis/shared/feedback/BugForum";
import { MAX_BUG_FORUM_COMMENT } from "@aegis/shared/feedback/limits";
import { isClosedFeedbackStatus } from "@aegis/shared/feedback/isClosedFeedbackStatus";
import { useId, useState } from "react";
import { Alert, Button } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import { relativeTime } from "@/i18n/relativeTime";
import { bugForumApi } from "@/bugs/bugForumClient";
import { getBugForumError } from "@/bugs/getBugForumError";
import "@/bugs/bugForum.css";

type BugForumConversationParams = {
  detail: BugForumDetail;
  onChange: (detail: BugForumDetail) => void;
};

export function BugForumConversation({ detail, onChange }: BugForumConversationParams) {
  const { t, locale } = useTranslation();
  const fieldId = useId();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string>();
  const closed = isClosedFeedbackStatus(detail.status);

  const submit = async () => {
    setSaving(true);
    setFailure(undefined);
    try {
      onChange(await bugForumApi.comment(detail.id, body));
      setBody("");
    } catch (error) {
      setFailure(getBugForumError(error, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bug-thread-section" aria-labelledby={`${fieldId}-title`}>
      <h3 id={`${fieldId}-title`}>
        {t("bugForum.discussion")} <span className="bug-thread-section__count">{detail.comments.length}</span>
      </h3>
      {detail.comments.length ? (
        <ol className="bug-comments">
          {detail.comments.map((comment) => {
            const author = comment.authorName ?? t("bugForum.formerPlayer");
            return (
              <li key={comment.id}>
                <span className="bug-comments__avatar" aria-hidden="true">
                  {author.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p className="bug-comments__meta">
                    <strong>{author}</strong>
                    <time dateTime={new Date(comment.createdAt).toISOString()}>
                      {relativeTime({ at: comment.createdAt, locale })}
                    </time>
                  </p>
                  <p className="bug-comments__body">{comment.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="bug-thread-muted">{t("bugForum.noComments")}</p>
      )}
      {closed ? null : (
        <form
          className="bug-compose"
          onSubmit={(event) => {
            event.preventDefault();
            if (body.trim() && !saving) void submit();
          }}
        >
          <label htmlFor={fieldId}>{t("bugForum.commentLabel")}</label>
          <textarea
            id={fieldId}
            rows={3}
            value={body}
            maxLength={MAX_BUG_FORUM_COMMENT}
            placeholder={t("bugForum.commentPlaceholder")}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="bug-compose__footer">
            <small>
              {body.length} / {MAX_BUG_FORUM_COMMENT}
            </small>
            <Button type="submit" size="sm" disabled={!body.trim() || saving}>
              {t("bugForum.commentSubmit")}
            </Button>
          </div>
          {failure ? <Alert tone="danger" title={failure} /> : null}
        </form>
      )}
    </section>
  );
}
