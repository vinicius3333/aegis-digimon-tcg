// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../i18n";

const sound = vi.hoisted(() => ({
  useCustomMusicName: vi.fn<() => string | undefined>(() => undefined),
  setCustomMusicFile: vi.fn<(file: File) => boolean>(() => true),
  clearCustomMusic: vi.fn<() => void>(),
  getMusicTrack: vi.fn<() => string>(() => "digitalBattle"),
  getMusicVolume: vi.fn<() => number>(() => 0.25),
  getSoundVolume: vi.fn<() => number>(() => 0.7),
  isMusicEnabled: vi.fn<() => boolean>(() => true),
  isSoundEnabled: vi.fn<() => boolean>(() => true),
  playSound: vi.fn<(kind: string) => void>(),
  setMusicEnabled: vi.fn<(enabled: boolean) => void>(),
  setMusicTrack: vi.fn<(track: string) => void>(),
  setMusicVolume: vi.fn<(volume: number) => void>(),
  setSoundEnabled: vi.fn<(enabled: boolean) => void>(),
  setSoundVolume: vi.fn<(volume: number) => void>(),
  unlockAudio: vi.fn<() => void>(),
}));
vi.mock("../../../design/sound", () => sound);

const { ArenaAudioSettings } = await import("./ArenaAudioSettings");

describe("ArenaAudioSettings", () => {
  beforeEach(() => {
    localStorage.setItem("aegis.locale", "en");
    render(
      <I18nProvider>
        <ArenaAudioSettings />
      </I18nProvider>,
    );
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the stored music and effect levels as percentages", () => {
    expect(screen.getByRole("switch", { name: "Music" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("switch", { name: "Sound effects and cues" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("slider", { name: "Music volume" })).toHaveProperty("value", "25");
    expect(screen.getByRole("slider", { name: "Effects volume" })).toHaveProperty("value", "70");
    expect(screen.getByText("25%")).toBeTruthy();
    expect(screen.getByText("70%")).toBeTruthy();
  });

  it("lays out each channel as one row of switch, slider and level, with the soundtrack on its own row", () => {
    const rows = [...document.querySelectorAll(".game-arena-audio__row")];
    expect(rows).toHaveLength(3);
    const [music, track, effects] = rows as HTMLElement[];

    expect(within(music!).getByRole("switch", { name: "Music" })).toBeTruthy();
    expect(within(music!).getByRole("slider", { name: "Music volume" })).toBeTruthy();
    expect(within(music!).getByText("25%")).toBeTruthy();
    expect(within(track!).getByRole("combobox", { name: "Soundtrack" })).toBeTruthy();
    expect(within(track!).queryByRole("slider")).toBeNull();
    expect(within(effects!).getByRole("switch", { name: "Sound effects and cues" })).toBeTruthy();
    expect(within(effects!).getByRole("slider", { name: "Effects volume" })).toBeTruthy();
    expect(within(effects!).getByText("70%")).toBeTruthy();
  });

  it("flips a channel switch and dims only that row", () => {
    const toggle = screen.getByRole("switch", { name: "Music" });
    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(toggle.closest(".game-arena-audio__row")?.getAttribute("data-disabled")).toBe("true");
    expect(
      screen
        .getByRole("switch", { name: "Sound effects and cues" })
        .closest(".game-arena-audio__row")
        ?.hasAttribute("data-disabled"),
    ).toBe(false);
  });

  it("switches the soundtrack to the chosen track", () => {
    const picker = screen.getByRole("combobox", { name: "Soundtrack" });
    expect(picker).toHaveProperty("value", "digitalBattle");

    fireEvent.change(picker, { target: { value: "warmDrive" } });

    expect(sound.setMusicTrack).toHaveBeenCalledWith("warmDrive");
    expect(picker).toHaveProperty("value", "warmDrive");
  });

  it("turns music off on its own and disables only its slider", () => {
    fireEvent.click(screen.getByRole("switch", { name: "Music" }));

    expect(sound.unlockAudio).toHaveBeenCalled();
    expect(sound.setMusicEnabled).toHaveBeenCalledWith(false);
    expect(sound.setSoundEnabled).not.toHaveBeenCalled();
    expect(screen.getByRole("slider", { name: "Music volume" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("slider", { name: "Effects volume" })).toHaveProperty("disabled", false);
  });

  it("turns sound effects off on its own and leaves music playing", () => {
    fireEvent.click(screen.getByRole("switch", { name: "Sound effects and cues" }));

    expect(sound.unlockAudio).toHaveBeenCalled();
    expect(sound.setSoundEnabled).toHaveBeenCalledWith(false);
    expect(sound.setMusicEnabled).not.toHaveBeenCalled();
    expect(sound.playSound).not.toHaveBeenCalled();
    expect(screen.getByRole("slider", { name: "Effects volume" })).toHaveProperty("disabled", true);
  });

  it("applies each volume immediately to its own channel", () => {
    fireEvent.change(screen.getByRole("slider", { name: "Music volume" }), { target: { value: "40" } });
    fireEvent.change(screen.getByRole("slider", { name: "Effects volume" }), { target: { value: "15" } });

    expect(sound.setMusicVolume).toHaveBeenCalledWith(0.4);
    expect(sound.setSoundVolume).toHaveBeenCalledWith(0.15);
    expect(screen.getByText("40%")).toBeTruthy();
    expect(screen.getByText("15%")).toBeTruthy();
  });

  it("previews the effect level after a keyboard change", () => {
    const slider = screen.getByRole("slider", { name: "Effects volume" });
    fireEvent.keyUp(slider, { key: "Tab" });
    expect(sound.playSound).not.toHaveBeenCalled();

    fireEvent.keyUp(slider, { key: "ArrowRight" });
    expect(sound.playSound).toHaveBeenCalledWith("select");
  });
});
