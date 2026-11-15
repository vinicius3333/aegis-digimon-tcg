import { useMemo } from "react";
import { drawBoosterPack } from "@aegis/shared/packOpening/drawBoosterPack";
import { BOOSTER_BOX_PACK_COUNT } from "@/packOpening/BoosterProgress";
import { listBoosterSets } from "@/packOpening/listBoosterSets";
import { planBoosterBox } from "@/packOpening/planBoosterBox";
import { useBoosterProgress } from "@/packOpening/useBoosterProgress";
import type { PackOpeningSource } from "@/packOpening/PackOpeningSource";

type DrawParams = { setId: string; count: number };

export function useSoloPackOpeningSource(): PackOpeningSource {
  const { progress, saveFailed, recordPacks, ensurePlannedBox, startBox, startNextBox } = useBoosterProgress();
  const sets = useMemo(listBoosterSets, []);
  function drawPacks({ setId, count }: DrawParams) {
    const set = sets.find((candidate) => candidate.setId === setId);
    if (!set) {
      return [];
    }
    const box = ensurePlannedBox({
      setId,
      createHits: () => planBoosterBox({ setId, cards: set.cards, random: Math.random }),
    });
    if (count < 1 || count > BOOSTER_BOX_PACK_COUNT - box.packs.length) {
      return [];
    }
    const packs = Array.from({ length: count }, (_, index) =>
      drawBoosterPack({ setId, cards: set.cards, random: Math.random, hit: box.hits?.[box.packs.length + index] }),
    );
    return recordPacks({ setId, packs }) ? packs : [];
  }
  return {
    sets,
    initialSetId: sets.find((set) => set.setId === progress.activeBox?.setId)?.setId ?? sets[0]?.setId ?? "",
    progress,
    saveFailed,
    totalPacks: BOOSTER_BOX_PACK_COUNT,
    drawPacks,
    startBox,
    startNextBox,
  };
}
