import { MAX_SAVED_REPLAYS, type ReplaySaveMessage } from "@aegis/shared";
import { Button } from "../design/primitives";
import { Icons } from "../design/icons";
import { useTranslation } from "../i18n";

export interface ReplaySaveProps {
  onSaveReplay?: () => void;
  replaySave?: ReplaySaveMessage | { kind: "saving" };
}

export function ReplaySaveButton({ onSaveReplay, replaySave }: ReplaySaveProps) {
  const { t } = useTranslation();
  if (!onSaveReplay) return null;
  const done = replaySave?.kind === "saved";
  const saving = replaySave?.kind === "saving";
  return (
    <div className="replay-save">
      <Button size="sm" variant="secondary" icon={Icons.Check} disabled={done || saving} onClick={onSaveReplay}>
        {t(done ? "replay.saved" : saving ? "replay.saving" : "replay.saveAccount")}
      </Button>
      {replaySave?.kind === "failed" ? (
        <p role="alert">{t(`replay.saveError.${replaySave.reason}`, { limit: MAX_SAVED_REPLAYS })}</p>
      ) : null}
      {done ? <small role="status">{t("replay.savedHint")}</small> : null}
    </div>
  );
}
