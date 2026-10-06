// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { FieldLayout } from "../../../design/fieldLayout";
import { PORTRAIT_ARENA_QUERY, SIDELINE_ARENA_QUERY, SHORT_BOARD_QUERY } from "../queries";
import { useArenaLayout } from "./useArenaLayout";

const viewport = vi.hoisted(() => ({ queries: new Set<string>(), drawn: 65, heightFitted: 76, beside: 65 }));
vi.mock("../../../design/useMediaQuery", () => ({
  COARSE_POINTER_QUERY: "(pointer: coarse)",
  useMediaQuery: (query: string) => viewport.queries.has(query),
}));
vi.mock("../../../design/fieldLayout", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../design/fieldLayout")>()),
  useFieldLayout: () => FieldLayout.Organized,
}));
vi.mock("../layout/fieldCardWidth", () => ({
  useFieldCardWidth: () => ({ heightFitted: viewport.heightFitted, drawn: viewport.drawn, beside: viewport.beside }),
}));

afterEach(() => {
  cleanup();
  viewport.queries.clear();
  viewport.drawn = 65;
  viewport.heightFitted = 76;
  viewport.beside = 65;
});

it("lets portrait battlefield cards grow beyond auxiliary piles while raising fits its strip", () => {
  viewport.queries.add(PORTRAIT_ARENA_QUERY);
  viewport.queries.add(SHORT_BOARD_QUERY);
  viewport.queries.add("(max-width: 1023px) and (orientation: portrait) and (height < 650px)");
  const { result } = renderHook(useArenaLayout);
  expect(result.current.arenaPermanentWidth).toBe(76);
  expect(result.current.arenaPileWidth).toBe(36);
  expect(result.current.arenaRaisingWidth).toBe(36);
  expect(result.current.handCardWidth).toBe(52);
});

it("preserves shared battlefield and raising sizing on a desktop sideline board", () => {
  viewport.queries.add(SIDELINE_ARENA_QUERY);
  viewport.queries.add("(height < 950px)");
  const { result } = renderHook(useArenaLayout);
  expect(result.current.arenaPermanentWidth).toBe(100);
  expect(result.current.arenaRaisingWidth).toBe(viewport.drawn);
  expect(result.current.arenaPileWidth).toBe(56);
});

it("preserves the existing ceiling on compact landscape utility rails", () => {
  viewport.queries.add(SHORT_BOARD_QUERY);
  const { result } = renderHook(useArenaLayout);
  expect(result.current.arenaPermanentWidth).toBe(56);
});

it("keeps raising and security at the arena's size when one battle lane grows its cards", () => {
  viewport.queries.add(SIDELINE_ARENA_QUERY);
  viewport.queries.add("(height < 950px)");
  viewport.drawn = 120;
  viewport.heightFitted = 87;
  viewport.beside = 87;
  const { result } = renderHook(useArenaLayout);
  expect(result.current.arenaPermanentWidth).toBe(100);
  expect(result.current.arenaRaisingWidth).toBe(87);
  expect(result.current.arenaSidelineBasisWidth).toBe(87);
});
