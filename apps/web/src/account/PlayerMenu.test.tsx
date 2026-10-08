// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import type { Screen } from "../design/primitives";
import type { DigimonWorldAvatarId } from "./avatars";
import { AccountApiError } from "./client";
import { PlayerMenu } from "./PlayerMenu";

const player = { name: "Tai Kamiya", color: "Blue", shards: 0, avatarId: "tyrannomon" as const };

function renderMenu(overrides: Partial<Parameters<typeof PlayerMenu>[0]> = {}) {
  const props = {
    player,
    signedIn: false,
    selectedAvatarId: "tyrannomon" as const,
    onSelectAvatar: vi.fn<(avatarId: DigimonWorldAvatarId | null) => void>(),
    onNav: vi.fn<(screen: Screen) => void>(),
    onReportBug: vi.fn<() => void>(),
    onClose: vi.fn<() => void>(),
    ...overrides,
  };
  render(
    <I18nProvider>
      <PlayerMenu {...props} />
    </I18nProvider>,
  );
  return props;
}

afterEach(() => cleanup());

describe("the player menu", () => {
  it("tells a guest where their progress lives and offers a way in", () => {
    const props = renderMenu({ signedIn: false });

    expect(screen.getByText("Guest · saved on this device")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(props.onClose).toHaveBeenCalled();
    expect(props.onNav).toHaveBeenCalledWith("login");
  });

  it("swaps the sign-in offer for a sign-out once there is an account", () => {
    const onSignOut = vi.fn<() => void>();
    renderMenu({ signedIn: true, onSignOut });

    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalled();
  });

  it("offers a Discord picture refresh only to Discord accounts", async () => {
    renderMenu({ signedIn: true });
    expect(screen.queryByRole("button", { name: "Refresh Discord picture" })).toBeNull();
    cleanup();

    const onRefreshDiscordAvatar = vi.fn<() => Promise<void>>(async () => undefined);
    renderMenu({ signedIn: true, onRefreshDiscordAvatar });
    fireEvent.click(screen.getByRole("button", { name: "Refresh Discord picture" }));
    expect(await screen.findByText("Discord picture updated.")).toBeTruthy();
    expect(onRefreshDiscordAvatar).toHaveBeenCalledTimes(1);
  });

  it("explains the Discord refresh cooldown", async () => {
    const onRefreshDiscordAvatar = vi.fn<() => Promise<void>>(async () => {
      throw new AccountApiError(429, "cooldown");
    });
    renderMenu({ signedIn: true, onRefreshDiscordAvatar });
    fireEvent.click(screen.getByRole("button", { name: "Refresh Discord picture" }));
    expect(await screen.findByText("You just refreshed it. Try again in a minute.")).toBeTruthy();
  });

  it("picks a portrait", () => {
    const props = renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Greymon" }));
    expect(props.onSelectAvatar).toHaveBeenCalledWith("greymon");
  });

  it.each([true, false])("#5255 resets to the account/default portrait (signedIn=%s)", (signedIn) => {
    const props = renderMenu({ signedIn, player: { ...player, avatarUrl: "https://example.com/provider.png" } });
    fireEvent.change(screen.getByLabelText("Search Digimon"), { target: { value: "no matches" } });
    const reset = screen.getByRole("button", { name: signedIn ? "Use account avatar" : "Use default avatar" });
    expect(reset.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(reset);
    expect(props.onSelectAvatar).toHaveBeenCalledWith(null);
  });

  it("#5255 marks the account portrait selected after reset", () => {
    renderMenu({ signedIn: true, selectedAvatarId: null, player: { ...player, avatarId: null } });
    expect(screen.getByRole("button", { name: "Use account avatar" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Tyrannomon" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("#5255 shows a failed save and lets the player retry", async () => {
    const onSelectAvatar = vi
      .fn<(avatarId: DigimonWorldAvatarId | null) => Promise<void>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    renderMenu({ signedIn: true, onSelectAvatar });
    fireEvent.click(screen.getByRole("button", { name: "Use account avatar" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Could not save your avatar. Try again.");
    expect(screen.getByRole("button", { name: "Tyrannomon" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Use account avatar" }));
    expect(onSelectAvatar).toHaveBeenCalledTimes(2);
  });

  it("#5255 prevents overlapping portrait changes while a reset is saving", async () => {
    let finish!: () => void;
    const onSelectAvatar = vi.fn<(avatarId: DigimonWorldAvatarId | null) => Promise<void>>().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    renderMenu({ signedIn: true, onSelectAvatar });
    const reset = screen.getByRole("button", { name: "Use account avatar" });
    const greymon = screen.getByRole("button", { name: "Greymon" });
    fireEvent.click(reset);
    expect(reset).toHaveProperty("disabled", true);
    expect(greymon).toHaveProperty("disabled", true);
    fireEvent.click(greymon);
    expect(onSelectAvatar).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    expect(reset).toHaveProperty("disabled", false);
    expect(greymon).toHaveProperty("disabled", false);
  });

  it("filters portraits by name", () => {
    renderMenu();
    fireEvent.change(screen.getByLabelText("Search Digimon"), { target: { value: "greymon" } });

    expect(screen.getByRole("button", { name: "Greymon" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Angemon" })).toBeNull();
  });

  it("carries the sections that no longer fit the bottom nav", () => {
    const props = renderMenu();
    expect(screen.queryByRole("button", { name: "Tournaments" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(props.onNav).toHaveBeenCalledWith("settings");
  });
});
