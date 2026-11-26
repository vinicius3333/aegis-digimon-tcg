import type { ForumDetail } from "@aegis/shared/feedback/Forum";
import { MAX_FORUM_COMMENT } from "@aegis/shared/feedback/limits";
import { isClosedFeedbackStatus } from "@aegis/shared/feedback/isClosedFeedbackStatus";
import { useId, useState } from "react";
import { Icons } from "@/design/icons";
import { Alert, Button, IconButton } from "@/design/primitives";
import { useTranslation } from "@/i18n/useTranslation";
import { relativeTime } from "@/i18n/relativeTime";
import type { ForumApi } from "@/bugs/forumClient";
import { getForumError } from "@/bugs/getForumError";
import "@/bugs/forum.css";

type ForumConversationParams = {
  api: ForumApi;
  detail: ForumDetail;
  placeholder: string;
  onChange: (detail: ForumDetail) => void;
};

export function ForumConversation({ api, detail, placeholder, onChange }: ForumConversationParams) {
  const { t, locale } = useTranslation();
  const fieldId = useId();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string>();
  const closed = isClosedFeedbackStatus(detail.status);

  const run = async (work: () => Promise<ForumDetail>, after?: () => void) => {
    setSaving(true);
    setFailure(undefined);
    try {
      onChange(await work());
      after?.();
    } catch (error) {
      setFailure(getForumError(error, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="forum-thread-section" aria-labelledby={`${fieldId}-title`}>
      <h3 id={`${fieldId}-title`}>
        {t("bugForum.discussion")} <span className="forum-thread-section__count">{detail.comments.length}</span>
      </h3>
      {detail.comments.length ? (
        <ol className="forum-comments">
          {detail.comments.map((comment) => {
            const author = comment.authorName ?? t("bugForum.formerPlayer");
            return (
              <li key={comment.id}>
                <span className="forum-comments__avatar" aria-hidden="true">
                  {author.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p className="forum-comments__meta">
                    <strong>{author}</strong>
                    <time dateTime={new Date(comment.createdAt).toISOString()}>
                      {relativeTime({ at: comment.createdAt, locale })}
                    </time>
                    {detail.canModerate ? (
                      <IconButton
                        variant="ghost"
                        size="sm"
                        className="forum-moderate"
                        label={t("bugForum.deleteComment")}
                        disabled={saving}
                        onClick={() => void run(() => api.removeComment(detail.id, comment.id))}
                      >
                        <Icons.Trash size={14} />
                      </IconButton>
                    ) : null}
                  </p>
                  <p className="forum-comments__body">{comment.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="forum-thread-muted">{t("bugForum.noComments")}</p>
      )}
      {closed && !detail.canModerate ? null : (
        <form
          className="forum-compose"
          onSubmit={(event) => {
            event.preventDefault();
            if (body.trim() && !saving)
              void run(
                () => api.comment(detail.id, body),
                () => setBody(""),
              );
          }}
        >
          <label htmlFor={fieldId}>{t("bugForum.commentLabel")}</label>
          <textarea
            id={fieldId}
            rows={3}
            value={body}
            maxLength={MAX_FORUM_COMMENT}
            placeholder={placeholder}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="forum-compose__footer">
            <small>
              {body.length} / {MAX_FORUM_COMMENT}
            </small>
            <Button type="submit" size="sm" disabled={!body.trim() || saving}>
              {t("bugForum.commentSubmit")}
            </Button>
          </div>
        </form>
      )}
      {failure ? <Alert tone="danger" title={failure} /> : null}
    </section>
  );
}
