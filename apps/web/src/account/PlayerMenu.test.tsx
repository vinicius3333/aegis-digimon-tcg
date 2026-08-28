// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import type { Screen } from "../design/primitives";
import type { DigimonWorldAvatarId } from "./avatars";
import { PlayerMenu } from "./PlayerMenu";

const player = { name: "Tai Kamiya", color: "Blue", shards: 0, avatarId: "tyrannomon" as const };

function renderMenu(overrides: Partial<Parameters<typeof PlayerMenu>[0]> = {}) {
  const props = {
    player,
    signedIn: false,
    selectedAvatarId: "tyrannomon" as const,
    onSelectAvatar: vi.fn<(avatarId: DigimonWorldAvatarId) => void>(),
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

  it("picks a portrait", () => {
    const props = renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Greymon" }));
    expect(props.onSelectAvatar).toHaveBeenCalledWith("greymon");
  });

  it("filters portraits by name", () => {
    renderMenu();
    fireEvent.change(screen.getByLabelText("Search Digimon"), { target: { value: "greymon" } });

    expect(screen.getByRole("button", { name: "Greymon" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Angemon" })).toBeNull();
  });

  it("carries the sections that no longer fit the bottom nav", () => {
    const props = renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Tournaments" }));
    expect(props.onNav).toHaveBeenCalledWith("tournaments");

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(props.onNav).toHaveBeenCalledWith("settings");
  });
});
