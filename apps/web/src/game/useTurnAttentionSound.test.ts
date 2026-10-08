// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { playAttentionSound } from "../design/sound";
import { useTurnAttentionSound } from "./useTurnAttentionSound";

vi.mock("../design/sound", () => ({ playAttentionSound: vi.fn<(kind: string) => void>() }));

function render(isMyTurn: boolean) {
  return renderHook(({ isMyTurn }) => useTurnAttentionSound(isMyTurn), { initialProps: { isMyTurn } });
}

afterEach(() => {
  vi.mocked(playAttentionSound).mockClear();
  vi.restoreAllMocks();
});

describe("useTurnAttentionSound", () => {
  it("rings when the viewer's turn starts while the page is unfocused", () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
    const hook = render(false);
    hook.rerender({ isMyTurn: true });

    expect(playAttentionSound).toHaveBeenCalledExactlyOnceWith("turnChange");
  });

  it("stays silent while the page has focus", () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    const hook = render(false);
    hook.rerender({ isMyTurn: true });

    expect(playAttentionSound).not.toHaveBeenCalled();
  });

  it("does not ring for a turn that was already running at mount or when the turn ends", () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
    const hook = render(true);
    hook.rerender({ isMyTurn: false });

    expect(playAttentionSound).not.toHaveBeenCalled();
  });
});
