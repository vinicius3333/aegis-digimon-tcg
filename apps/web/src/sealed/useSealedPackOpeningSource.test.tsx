import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { getSealedConfiguration } from "@aegis/shared/sealed/getSealedConfiguration";
import type { SealedOwnPool } from "@aegis/shared/sealed/SealedContracts";
import { getSealedPoolManifest } from "@/sealed/getSealedPoolManifest";
import { useSealedPackOpeningSource } from "@/sealed/useSealedPackOpeningSource";

const pool: SealedOwnPool = {
  configuration: getSealedConfiguration({ setId: "BT4" }),
  packs: Array.from({ length: 6 }, (_, index) =>
    Array.from({ length: 12 }, () => ({ cardId: `BT4-${String(9 + index).padStart(3, "0")}` })),
  ),
  revision: 0,
  window: "initial",
  deck: null,
  ready: false,
  editable: true,
  deadlineAt: Date.now() + 600000,
};
const key = `aegis:sealed-opening:v2:BT4:${getSealedPoolManifest({ packs: pool.packs })}`;

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

it.each(["charging", "burst", "revealing"])("does not treat the legacy %s draw cursor as a finalized pack", (phase) => {
  sessionStorage.setItem(
    key,
    JSON.stringify({
      opened: 1,
      presentation: {
        phase,
        cards: Array.from({ length: 12 }, (_, index) => index),
        revealedCount: 12,
        batch: [],
        batchIndex: 0,
        summaryPage: 0,
        bulkOpenedCount: 0,
      },
    }),
  );
  const { result } = renderHook(() => useSealedPackOpeningSource(pool));
  expect(result.current.completedAllocation).toHaveLength(0);
  expect(result.current.presentation?.phase).toBe(phase);
  expect(result.current.remainingPacks).toBe(5);
  act(() => {
    expect(result.current.drawPacks({ setId: "BT4", count: 1 })).toEqual([]);
  });
});

it("migrates a valid completed legacy bulk summary without granting any later allocation", () => {
  sessionStorage.setItem(
    key,
    JSON.stringify({
      opened: 6,
      presentation: {
        phase: "summary",
        cards: Array.from({ length: 72 }, (_, index) => index),
        revealedCount: 72,
        batch: [],
        batchIndex: 0,
        summaryPage: 0,
        bulkOpenedCount: 6,
      },
    }),
  );
  const { result } = renderHook(() => useSealedPackOpeningSource(pool));
  expect(result.current.completedAllocation?.flat()).toHaveLength(72);
  expect(result.current.progress.activeBox?.packs).toHaveLength(6);
  expect(result.current.remainingPacks).toBe(0);
});

it.each([
  null,
  "bad",
  { opened: 6 },
  { version: 3, opened: 6, completed: 6, presentation: { phase: "summary", cards: [-1] } },
])("falls back to no eligible cards for missing or invalid progress %j", (saved) => {
  sessionStorage.setItem(key, JSON.stringify(saved));
  const { result } = renderHook(() => useSealedPackOpeningSource(pool));
  expect(result.current.completedAllocation).toHaveLength(0);
  expect(result.current.remainingPacks).toBe(6);
});

it("isolates a different player's manifest and restores completed progress", () => {
  const first = renderHook(() => useSealedPackOpeningSource(pool));
  act(() => {
    first.result.current.drawPacks({ setId: "BT4", count: 1 });
  });
  act(() => {
    first.result.current.completeOpening?.();
  });
  act(() => {
    first.result.current.savePresentation?.({
      phase: "summary",
      cards: first.result.current.allocation![0]!.slice(),
      revealedCount: 12,
      batch: [],
      batchIndex: 0,
      summaryPage: 0,
      bulkOpenedCount: 0,
    });
  });
  first.unmount();
  const restored = renderHook(() =>
    useSealedPackOpeningSource({ ...pool, packs: JSON.parse(JSON.stringify(pool.packs)) }),
  );
  expect(restored.result.current.completedAllocation?.flat()).toHaveLength(12);
  const other = renderHook(() => useSealedPackOpeningSource({ ...pool, packs: [...pool.packs].reverse() }));
  expect(other.result.current.completedAllocation).toHaveLength(0);
});

it("keeps bulk completion idempotent when a completed transition is replayed after reconnect", () => {
  const { result } = renderHook(() => useSealedPackOpeningSource(pool));
  act(() => {
    result.current.drawPacks({ setId: "BT4", count: 6 });
  });
  act(() => {
    result.current.completeOpening?.(5);
  });
  expect(result.current.completedAllocation?.flat()).toHaveLength(12);
  act(() => {
    result.current.completeOpening?.(5);
  });
  expect(result.current.completedAllocation?.flat()).toHaveLength(12);
  act(() => {
    result.current.completeOpening?.(4);
  });
  expect(result.current.completedAllocation?.flat()).toHaveLength(24);
  act(() => {
    result.current.completeOpening?.();
  });
  expect(result.current.completedAllocation?.flat()).toHaveLength(72);
});

it("persists a pending draw atomically before the renderer can save its presentation", () => {
  const first = renderHook(() => useSealedPackOpeningSource(pool));
  act(() => {
    first.result.current.drawPacks({ setId: "BT4", count: 1 });
  });
  first.unmount();
  const restored = renderHook(() => useSealedPackOpeningSource(pool));
  expect(restored.result.current.completedAllocation).toHaveLength(0);
  expect(restored.result.current.presentation?.phase).toBe("charging");
  expect(restored.result.current.presentation?.cards).toHaveLength(12);
  expect(restored.result.current.remainingPacks).toBe(5);
});

it("does not migrate a legacy history summary into completion of identical unrevealed packs", () => {
  const identical = { ...pool, packs: Array.from({ length: 6 }, () => pool.packs[0]!) };
  const storageKey = `aegis:sealed-opening:v2:BT4:${getSealedPoolManifest({ packs: identical.packs })}`;
  sessionStorage.setItem(
    storageKey,
    JSON.stringify({
      opened: 6,
      presentation: {
        phase: "summary",
        cards: Array.from({ length: 12 }, (_, index) => index),
        revealedCount: 12,
        batch: [],
        batchIndex: 0,
        summaryPage: 0,
        bulkOpenedCount: 0,
      },
    }),
  );
  const { result } = renderHook(() => useSealedPackOpeningSource(identical));
  expect(result.current.completedAllocation).toHaveLength(0);
  expect(result.current.remainingPacks).toBe(6);
});

it.each([4, null, "3"])("keeps an unsupported stored version %j empty instead of migrating it as legacy", (version) => {
  sessionStorage.setItem(
    key,
    JSON.stringify({
      version,
      opened: 6,
      completed: 6,
      presentation: {
        phase: "summary",
        cards: Array.from({ length: 72 }, (_, index) => index),
        revealedCount: 72,
        batch: [],
        batchIndex: 0,
        summaryPage: 0,
        bulkOpenedCount: 6,
      },
    }),
  );
  const { result } = renderHook(() => useSealedPackOpeningSource(pool));
  expect(result.current.completedAllocation).toHaveLength(0);
  expect(result.current.remainingPacks).toBe(6);
});
