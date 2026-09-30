// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Settings } from "./Settings";
import { I18nProvider } from "../i18n";

const player = { name: "Guest Tamer", color: "Blue", shards: 0, guestAvatarId: null };

describe("settings portrait picker", () => {
  afterEach(() => cleanup());

  it("lets a signed-out player pick a Digimon World portrait", () => {
    const onSelectAvatar = vi.fn<(avatarId: string) => void>();
    render(
      <I18nProvider>
        <Settings
          player={player}
          account={null}
          dark={false}
          onToggleDark={() => undefined}
          onSelectAvatar={onSelectAvatar}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Use Greymon as your avatar" }));

    expect(onSelectAvatar).toHaveBeenCalledWith("greymon");
  });
});

describe("settings effect speed", () => {
  afterEach(() => {
    cleanup();
    vi.doUnmock("../features");
    vi.resetModules();
  });

  async function renderSettings() {
    const { Settings: FreshSettings } = await import("./Settings");
    const { I18nProvider: FreshProvider } = await import("../i18n");
    const pacing = await import("../game/pacing");
    render(
      <FreshProvider>
        <FreshSettings player={player} account={null} dark={false} onToggleDark={() => undefined} />
      </FreshProvider>,
    );
    return pacing;
  }

  it("stays hidden while sequential pacing is off", async () => {
    vi.resetModules();
    vi.doMock("../features", () => ({ RANKED_ENABLED: false, SEQUENTIAL_PACING_ENABLED: false }));
    await renderSettings();
    expect(screen.queryByRole("group", { name: "Effect speed" })).toBeNull();
  });

  it("sets the effect speed when sequential pacing is on", async () => {
    vi.resetModules();
    vi.doMock("../features", () => ({ RANKED_ENABLED: false, SEQUENTIAL_PACING_ENABLED: true }));
    const pacing = await renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Fast" }));
    expect(pacing.getEffectSpeed()).toBe("fast");
    expect(screen.getByRole("button", { name: "Fast" }).getAttribute("aria-pressed")).toBe("true");
    pacing.setEffectSpeed("normal");
  });
});
