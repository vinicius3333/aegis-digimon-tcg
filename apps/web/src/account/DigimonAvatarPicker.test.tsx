// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import type { DigimonWorldAvatarId } from "./avatars";
import { DigimonAvatarPicker } from "./DigimonAvatarPicker";

describe("DigimonAvatarPicker", () => {
  it("filters the original roster and saves a keyboard-accessible selection", async () => {
    const save = vi.fn<(avatarId: DigimonWorldAvatarId) => Promise<void>>(async (_avatarId) => undefined);

    function Harness() {
      const [selected, setSelected] = useState<DigimonWorldAvatarId | null>(null);
      return (
        <DigimonAvatarPicker
          selectedAvatarId={selected}
          onSelect={async (avatarId) => {
            await save(avatarId);
            setSelected(avatarId);
          }}
        />
      );
    }

    render(
      <I18nProvider>
        <Harness />
      </I18nProvider>,
    );
    expect(screen.getAllByRole("button")).toHaveLength(65);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search Digimon" }), {
      target: { value: "tyran" },
    });
    const choice = screen.getByRole("button", { name: "Use Tyrannomon as your avatar" });
    expect(screen.getAllByRole("button")).toHaveLength(1);
    choice.focus();
    fireEvent.click(choice);

    await waitFor(() => expect(save).toHaveBeenCalledWith("tyrannomon"));
    await waitFor(() => expect(choice.getAttribute("aria-pressed")).toBe("true"));
    expect(await screen.findByText("Tyrannomon is now your avatar.")).toBeTruthy();
  });

  it("keeps the picker usable after a save failure", async () => {
    const save = vi.fn<(avatarId: DigimonWorldAvatarId) => Promise<void>>().mockRejectedValue(new Error("offline"));
    render(
      <I18nProvider>
        <DigimonAvatarPicker selectedAvatarId={null} onSelect={save} />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Use Numemon as your avatar" }));

    expect(await screen.findByText("Could not save your avatar. Try again.")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByRole<HTMLButtonElement>("button", { name: "Use Numemon as your avatar" }).disabled).toBe(
        false,
      ),
    );
  });
});
