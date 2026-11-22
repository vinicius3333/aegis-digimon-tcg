// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("match chat preference", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("is on by default", async () => {
    const { isMatchChatEnabled } = await import("./isMatchChatEnabled");

    expect(isMatchChatEnabled()).toBe(true);
  });

  it("keeps chat off across reloads once the player turns it off", async () => {
    const { setMatchChatEnabled } = await import("./setMatchChatEnabled");
    setMatchChatEnabled(false);

    expect(localStorage.getItem("aegis.chat.enabled")).toBe("false");

    vi.resetModules();
    const { isMatchChatEnabled } = await import("./isMatchChatEnabled");
    expect(isMatchChatEnabled()).toBe(false);
  });
});
