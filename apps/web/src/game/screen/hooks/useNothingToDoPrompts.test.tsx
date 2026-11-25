// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AegisRoom } from "../../../net/client";
import { intents } from "../../../net/intents";
import { setSkipNothingToDoEnabled } from "@/game/skipNothingToDo/setSkipNothingToDoEnabled";
import { useNothingToDoPrompts } from "./useNothingToDoPrompts";

const room = { roomId: "match-1", sessionId: "session-1" } as AegisRoom;

beforeEach(() => {
  setSkipNothingToDoEnabled(true);
  vi.spyOn(intents, "showNothingToDoPrompts").mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setSkipNothingToDoEnabled(true);
});

it("tells each new room once that prompts are skipped, the default, so no earlier choice lingers", () => {
  const { rerender } = renderHook(useNothingToDoPrompts, { initialProps: { room, ready: true }, wrapper: StrictMode });
  rerender({ room, ready: true });
  expect(intents.showNothingToDoPrompts).toHaveBeenCalledTimes(1);
  expect(intents.showNothingToDoPrompts).toHaveBeenLastCalledWith(room, false);

  const nextRoom = { roomId: "match-2", sessionId: "session-2" } as AegisRoom;
  rerender({ room: nextRoom, ready: true });
  expect(intents.showNothingToDoPrompts).toHaveBeenCalledTimes(2);
  expect(intents.showNothingToDoPrompts).toHaveBeenLastCalledWith(nextRoom, false);
});

it("asks the server to show prompts once when skipping is off, and stops when it is back on", () => {
  setSkipNothingToDoEnabled(false);
  const { rerender } = renderHook(useNothingToDoPrompts, {
    initialProps: { room, ready: false },
    wrapper: StrictMode,
  });
  expect(intents.showNothingToDoPrompts).not.toHaveBeenCalled();
  rerender({ room, ready: true });
  rerender({ room, ready: true });
  expect(intents.showNothingToDoPrompts).toHaveBeenCalledTimes(1);
  expect(intents.showNothingToDoPrompts).toHaveBeenLastCalledWith(room, true);
  act(() => setSkipNothingToDoEnabled(true));
  expect(intents.showNothingToDoPrompts).toHaveBeenCalledTimes(2);
  expect(intents.showNothingToDoPrompts).toHaveBeenLastCalledWith(room, false);
});
