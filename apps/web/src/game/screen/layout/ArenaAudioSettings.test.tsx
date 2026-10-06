// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../../i18n";

const sound = vi.hoisted(() => ({
  getMusicVolume: vi.fn<() => number>(() => 0.25),
  getSoundVolume: vi.fn<() => number>(() => 0.7),
  isMusicEnabled: vi.fn<() => boolean>(() => true),
  isSoundEnabled: vi.fn<() => boolean>(() => true),
  playSound: vi.fn<(kind: string) => void>(),
  setMusicEnabled: vi.fn<(enabled: boolean) => void>(),
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
    expect(screen.getByRole("checkbox", { name: "Music" })).toHaveProperty("checked", true);
    expect(screen.getByRole("checkbox", { name: "Sound effects and cues" })).toHaveProperty("checked", true);
    expect(screen.getByRole("slider", { name: "Music volume" })).toHaveProperty("value", "25");
    expect(screen.getByRole("slider", { name: "Effects volume" })).toHaveProperty("value", "70");
    expect(screen.getByText("25%")).toBeTruthy();
    expect(screen.getByText("70%")).toBeTruthy();
  });

  it("turns music off on its own and disables only its slider", () => {
    fireEvent.click(screen.getByRole("checkbox", { name: "Music" }));

    expect(sound.unlockAudio).toHaveBeenCalled();
    expect(sound.setMusicEnabled).toHaveBeenCalledWith(false);
    expect(sound.setSoundEnabled).not.toHaveBeenCalled();
    expect(screen.getByRole("slider", { name: "Music volume" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("slider", { name: "Effects volume" })).toHaveProperty("disabled", false);
  });

  it("turns sound effects off on its own and leaves music playing", () => {
    fireEvent.click(screen.getByRole("checkbox", { name: "Sound effects and cues" }));

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
