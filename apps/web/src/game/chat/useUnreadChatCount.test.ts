// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Seat } from "@aegis/shared";
import { playSound } from "../../design/sound";
import type { ChatEntry } from "./useMatchChat";
import { useUnreadChatCount } from "./useUnreadChatCount";

vi.mock("../../design/sound", () => ({ playSound: vi.fn<(kind: string) => void>() }));

function entry(id: number, own: boolean, seat: Seat = own ? 0 : 1): ChatEntry {
  return { id, own, sender: { kind: "player", seat }, message: { kind: "text", text: `message ${id}` } };
}

function render(initial: { entries: readonly ChatEntry[]; open: boolean }) {
  return renderHook(({ entries, open }) => useUnreadChatCount(entries, open), { initialProps: initial });
}

afterEach(() => vi.mocked(playSound).mockClear());

describe("useUnreadChatCount", () => {
  it("counts only other senders' messages that arrive while the window is closed", () => {
    const hook = render({ entries: [], open: false });
    hook.rerender({ entries: [entry(0, true), entry(1, false), entry(2, false)], open: false });

    expect(hook.result.current).toBe(2);
  });

  it("does not count the history that was already there when the board mounted", () => {
    const hook = render({ entries: [entry(0, false), entry(1, false)], open: false });

    expect(hook.result.current).toBe(0);
  });

  it("clears when the window opens and stays clear for messages read while it is open", () => {
    const hook = render({ entries: [], open: false });
    hook.rerender({ entries: [entry(0, false)], open: false });
    hook.rerender({ entries: [entry(0, false)], open: true });
    hook.rerender({ entries: [entry(0, false), entry(1, false)], open: true });
    hook.rerender({ entries: [entry(0, false), entry(1, false)], open: false });

    expect(hook.result.current).toBe(0);
  });

  it("chimes once for the first unread message, not for each one after it", () => {
    const hook = render({ entries: [], open: false });
    hook.rerender({ entries: [entry(0, false)], open: false });
    hook.rerender({ entries: [entry(0, false), entry(1, false)], open: false });

    expect(playSound).toHaveBeenCalledTimes(1);
    expect(playSound).toHaveBeenCalledWith("prompt");
  });

  it("stays silent for the viewer's own messages", () => {
    const hook = render({ entries: [], open: false });
    hook.rerender({ entries: [entry(0, true)], open: false });

    expect(hook.result.current).toBe(0);
    expect(playSound).not.toHaveBeenCalled();
  });
});
