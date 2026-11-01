import type { MatchQueueCounts } from "@aegis/shared/matchmaking/MatchQueueCounts";
import type { MatchQueueSelection } from "@aegis/shared/matchmaking/MatchQueueSelection";
import { Icons } from "@/design/icons";
import { useTranslation } from "@/i18n/useTranslation";
import { getMatchQueueActivity } from "@/matchmaking/getMatchQueueActivity";
import { useMatchQueueCounts } from "@/matchmaking/useMatchQueueCounts";
import "./MatchQueueActivity.css";

type Props = {
  selection: MatchQueueSelection;
  viewerQueued?: boolean;
  className?: string;
  load?: () => Promise<MatchQueueCounts>;
};

export function MatchQueueActivity({ selection, viewerQueued = false, className, load }: Props) {
  const { t } = useTranslation();
  const counts = useMatchQueueCounts({ load });
  if (!counts) {
    return null;
  }
  const { matching, total } = getMatchQueueActivity({ counts, selection, viewerQueued });
  return (
    <p
      className={["match-queue-activity", className].filter(Boolean).join(" ")}
      data-searching={matching > 0 || undefined}
    >
      <Icons.Users size={14} />
      <span>{t(viewerQueued ? "matchQueue.activityWhileWaiting" : "matchQueue.activity", { matching, total })}</span>
    </p>
  );
}
