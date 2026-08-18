// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { Alert, Avatar, Badge, Dialog, Field, Switch, TopNav, type Screen } from "./primitives";

describe("design primitives", () => {
  it("associates a field with its label and validation message", () => {
    render(<Field label="Room code" name="roomCode" error="Use at least four characters" />);

    const input = screen.getByRole("textbox", { name: "Room code" });
    const message = screen.getByText("Use at least four characters");

    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(message.id);
  });

  it("exposes switch state and toggles through a native button", () => {
    const onChange = vi.fn<(checked: boolean) => void>();
    render(<Switch checked={false} label="Sound" onChange={onChange} />);

    const toggle = screen.getByRole("switch", { name: "Sound" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("exposes semantic tones without inline palette values", () => {
    render(
      <>
        <Badge tone="success">Legal</Badge>
        <Alert tone="danger" title="Invalid deck">Fix the restricted cards.</Alert>
      </>,
    );

    expect(screen.getByText("Legal").getAttribute("data-tone")).toBe("success");
    expect(screen.getByRole("alert").getAttribute("data-tone")).toBe("danger");
  });

  it("moves focus into dialogs and closes them with Escape", () => {
    const onClose = vi.fn<() => void>();
    render(<Dialog labelledBy="test-dialog-title" onClose={onClose}><h2 id="test-dialog-title">Choose a card</h2></Dialog>);

    const dialog = screen.getByRole("dialog", { name: "Choose a card" });
    expect(document.activeElement).toBe(dialog);

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("falls back from a Digimon portrait to the provider avatar and then initials", () => {
    const { container } = render(
      <Avatar name="Tai Kamiya" avatarId="tyrannomon" avatarUrl="https://example.com/provider.png" />,
    );

    const digimonImage = container.querySelector("img");
    expect(digimonImage?.getAttribute("src")).toBe("/avatars/digimon-world-1/tyrannomon.png");
    fireEvent.error(digimonImage!);

    const providerImage = container.querySelector("img");
    expect(providerImage?.getAttribute("src")).toBe("https://example.com/provider.png");
    fireEvent.error(providerImage!);

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("TK")).toBeTruthy();
  });

  it("opens settings only from the profile avatar", () => {
    const onNav = vi.fn<(screen: Screen) => void>();
    render(
      <I18nProvider>
        <TopNav screen="home" onNav={onNav} player={{ name: "Tai Kamiya", color: "Blue", shards: 0, avatarId: "tyrannomon" }} />
      </I18nProvider>,
    );

    const playerNames = screen.getAllByText("Tai Kamiya");
    expect(playerNames.every((name) => name.closest("button") === null)).toBe(true);

    const settingsButtons = screen.getAllByRole("button", { name: "Settings" });
    fireEvent.click(settingsButtons[1]!);
    expect(onNav).toHaveBeenCalledWith("settings");
  });
});
