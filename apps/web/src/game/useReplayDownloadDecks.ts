import { useEffect, useState } from "react";
import type { ReplayDecks } from "@aegis/shared/replays/ReplayDeck";
import { readReplay, replayBlob, type ReadyReplay } from "@/replays/files";

export function useReplayDownloadDecks(download: ReadyReplay | undefined): ReplayDecks | undefined {
  const [decks, setDecks] = useState<ReplayDecks>();
  useEffect(() => {
    if (!download) return;
    let active = true;
    void readReplay(replayBlob(download))
      .then((replay) => {
        if (active) setDecks(replay.decks);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [download]);
  return download ? decks : undefined;
}
