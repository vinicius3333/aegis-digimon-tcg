import type { MatchReplay } from "@aegis/shared";
import { useState } from "react";
import { Icons } from "@/design/icons";
import { Button } from "@/design/primitives";
import type { TranslationKey } from "@/i18n/translationTypes";
import { useTranslation } from "@/i18n/useTranslation";
import { readReplay } from "@/replays/files";
import "@/bugs/forum.css";

type ReplayFileButtonParams = {
  load: () => Promise<Blob>;
  onOpen: (replay: MatchReplay) => void;
  labels: { watch: TranslationKey; loading: TranslationKey; unavailable: TranslationKey };
};

export function ReplayFileButton({ load, onOpen, labels }: ReplayFileButtonParams) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const open = async () => {
    setLoading(true);
    setFailed(false);
    try {
      onOpen(await readReplay(await load()));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="forum-replay">
      <Button variant="secondary" size="sm" icon={Icons.PlayCircle} disabled={loading} onClick={() => void open()}>
        {t(loading ? labels.loading : labels.watch)}
      </Button>
      {failed ? <p className="forum-thread-muted">{t(labels.unavailable)}</p> : null}
    </div>
  );
}
