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
