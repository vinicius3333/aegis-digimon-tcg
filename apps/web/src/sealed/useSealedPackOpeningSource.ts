import { useCallback, useMemo, useRef, useState } from "react";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import { findBoosterProduct } from "@aegis/shared/packOpening/findBoosterProduct";
import { getPackCardRarity } from "@aegis/shared/packOpening/getPackCardRarity";
import type { PackCard } from "@aegis/shared/packOpening/PackCard";
import type { SealedOwnPool } from "@aegis/shared/sealed/SealedContracts";
import type { PackOpeningPresentation, PackOpeningSource } from "@/packOpening/PackOpeningSource";
import { PackOpeningPhase } from "@/packOpening/PackOpeningPhase";
import { getPackCardKey } from "@/packOpening/getPackCardKey";
import { getSealedPoolManifest } from "@/sealed/getSealedPoolManifest";

type StoredPresentation = Omit<PackOpeningPresentation, "cards" | "batch"> & { cards: number[]; batch: number[][] };
type StoredOpening = { version?: 3; opened: number; completed: number; presentation?: StoredPresentation };
type ReadParams = { key: string; packs: PackCard[][] };

function readOpening({ key, packs }: ReadParams): StoredOpening {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? "null") as StoredOpening | null;
    if (
      !saved ||
      (saved.version !== undefined && saved.version !== 3) ||
      !Number.isInteger(saved.opened) ||
      saved.opened < 0 ||
      saved.opened > packs.length
    ) {
      return { opened: 0, completed: 0 };
    }
    const state = saved.presentation;
    const available = packs.slice(0, saved.opened).flat().length;
    function isCardIndex(index: number) {
      return Number.isInteger(index) && index >= 0 && index < available;
    }
    if (
      state &&
      Object.values(PackOpeningPhase).some((entry) => entry.value === state.phase) &&
      Array.isArray(state.cards) &&
      state.cards.every(isCardIndex) &&
      Array.isArray(state.batch) &&
      state.batch.every((pack) => Array.isArray(pack) && pack.every(isCardIndex)) &&
      Number.isInteger(state.revealedCount) &&
      state.revealedCount >= 0 &&
      state.revealedCount <= state.cards.length &&
      Number.isInteger(state.batchIndex) &&
      state.batchIndex >= 0 &&
      (state.batch.length === 0 ? state.batchIndex <= packs.length : state.batchIndex < state.batch.length) &&
      Number.isInteger(state.summaryPage) &&
      state.summaryPage >= 0 &&
      Number.isInteger(state.bulkOpenedCount) &&
      state.bulkOpenedCount >= 0 &&
      state.bulkOpenedCount <= saved.opened &&
      (state.selectedPack === undefined ||
        (Number.isInteger(state.selectedPack) && state.selectedPack >= 0 && state.selectedPack < packs.length))
    ) {
      if (saved.version === 3) {
        if (!Number.isInteger(saved.completed) || saved.completed < 0 || saved.completed > saved.opened) {
          return { opened: 0, completed: 0 };
        }
        return saved;
      }
      let completed = 0;
      if (state.phase === PackOpeningPhase.SUMMARY.value && state.revealedCount === state.cards.length) {
        const cards = state.cards.map((index) => packs.flat()[index]!);
        const expected = packs.slice(0, saved.opened).flat();
        if (
          cards.length !== expected.length ||
          !cards.every((card, index) => getPackCardKey(card) === getPackCardKey(expected[index]!))
        ) {
          return { opened: 0, completed: 0 };
        }
        completed = saved.opened;
      } else if (state.batch.length === saved.opened && state.batch.length > 0) {
        completed = state.batchIndex;
      } else if (
        saved.opened !== 1 ||
        state.batch.length > 0 ||
        (state.phase !== PackOpeningPhase.REVEALING.value &&
          state.phase !== PackOpeningPhase.CHARGING.value &&
          state.phase !== PackOpeningPhase.BURST.value)
      ) {
        return { opened: 0, completed: 0 };
      }
      return { ...saved, version: 3, completed };
    }
  } catch {
    return { opened: 0, completed: 0 };
  }
  return { opened: 0, completed: 0 };
}

type DrawParams = { setId: string; count: number };

export function useSealedPackOpeningSource(pool: SealedOwnPool): PackOpeningSource {
  const manifest = getSealedPoolManifest({ packs: pool.packs });
  const setId = pool.configuration.setId;
  const packs = useMemo(
    () =>
      (JSON.parse(manifest) as SealedOwnPool["packs"]).map((pack) =>
        pack.map((pull) => {
          const card = getCardDefinition(pull.cardId);
          if (!card) {
            throw new Error(`Missing allocated card ${pull.cardId}`);
          }
          return {
            ...card,
            rarity: getPackCardRarity({ card, setId }),
            ...(pull.artId && pull.artId !== pull.cardId ? { artId: pull.artId } : {}),
          };
        }),
      ),
    [manifest, setId],
  );
  const key = `aegis:sealed-opening:v2:${setId}:${manifest}`;
  const [initial] = useState(() => readOpening({ key, packs }));
  const current = useRef(initial);
  const [saved, setSaved] = useState(initial);
  const [saveFailed, setSaveFailed] = useState(false);
  const flat = useMemo(() => packs.flat(), [packs]);
  const presentation = useMemo(
    () =>
      saved.presentation
        ? {
            ...saved.presentation,
            cards: saved.presentation.cards.map((index) => flat[index]!),
            batch: saved.presentation.batch.map((pack) => pack.map((index) => flat[index]!)),
          }
        : undefined,
    [saved, flat],
  );
  const persistOpening = useCallback(
    (next: StoredOpening) => {
      current.current = next;
      setSaved(next);
      try {
        sessionStorage.setItem(key, JSON.stringify(next));
        setSaveFailed(false);
      } catch {
        setSaveFailed(true);
      }
    },
    [key],
  );
  const savePresentation = useCallback(
    (next: PackOpeningPresentation) => {
      function findIndex(card: PackCard) {
        return flat.findIndex((candidate) => getPackCardKey(candidate) === getPackCardKey(card));
      }
      persistOpening({
        ...current.current,
        version: 3,
        presentation: {
          ...next,
          cards: next.cards.map(findIndex),
          batch: next.batch.map((pack) => pack.map(findIndex)),
        },
      });
    },
    [flat, persistOpening],
  );
  const completeOpening = useCallback(
    (remainingPacks = 0) => {
      const next = current.current;
      if (!Number.isInteger(remainingPacks) || remainingPacks < 0 || remainingPacks > next.opened) {
        return;
      }
      persistOpening({
        ...next,
        version: 3,
        completed: Math.max(next.completed, next.opened - remainingPacks),
      });
    },
    [persistOpening],
  );
  function drawPacks({ setId: requestedSet, count }: DrawParams) {
    if (
      current.current.opened !== current.current.completed ||
      requestedSet !== setId ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > packs.length - current.current.opened
    ) {
      return [];
    }
    const drawn = packs.slice(current.current.opened, current.current.opened + count);
    let index = packs.slice(0, current.current.opened).flat().length;
    const batch = drawn.map((pack) => pack.map(() => index++));
    persistOpening({
      ...current.current,
      version: 3,
      opened: current.current.opened + count,
      presentation: {
        phase: PackOpeningPhase.CHARGING.value,
        cards: batch[0]!,
        revealedCount: 0,
        bulkOpenedCount: count > 1 ? count : 0,
        batch: count > 1 ? batch : [],
        batchIndex: 0,
        summaryPage: 0,
      },
    });
    return drawn;
  }
  const product = findBoosterProduct(setId);
  return {
    sets: [{ setId, label: product?.label ?? setId, coverUrl: product?.coverUrl ?? `/sets/${setId}.jpg`, cards: flat }],
    initialSetId: setId,
    progress: {
      version: 2,
      activeBox: { setId, packs: packs.slice(0, saved.completed).map((cards) => ({ openedAt: 0, cards })) },
    },
    saveFailed,
    totalPacks: packs.length,
    allocation: packs,
    completedAllocation: packs.slice(0, saved.completed),
    remainingPacks: packs.length - saved.opened,
    completeOpening,
    presentation,
    savePresentation,
    drawPacks,
    startBox: () => undefined,
    startNextBox: () => undefined,
  };
}
