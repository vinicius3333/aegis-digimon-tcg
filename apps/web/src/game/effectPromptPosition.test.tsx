// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { Settings } from "../screens/Settings";
import { ArenaBoardSettings } from "./screen/layout/ArenaBoardSettings";
import { DecisionOverlay } from "./overlay/choice/DecisionOverlay";
import { getEffectPromptPosition, setEffectPromptPosition } from "./effectPromptPosition";

beforeEach(() => {
  localStorage.clear();
  setEffectPromptPosition("left");
});
afterEach(() => cleanup());

it("moves an activation immediately from the match setting without answering it", () => {
  const respond = vi.fn<() => void>();
  render(
    <I18nProvider>
      <ArenaBoardSettings />
      <DecisionOverlay
        request={{ decisionId: "activation", seat: 0, kind: "optional", promptText: "Activate this effect?" }}
        candidates={[]}
        picks={[]}
        onTogglePick={() => undefined}
        onRespond={respond}
      />
    </I18nProvider>,
  );
  const dialog = screen.getByRole("dialog");
  expect(dialog.dataset.promptSurface).toBe("left");
  expect(dialog.dataset.effectActivation).toBe("true");
  const setting = screen.getByRole("combobox", { name: "Effect prompt position" });
  fireEvent.change(setting, { target: { value: "center" } });
  expect(dialog.dataset.promptSurface).toBe("center");
  expect(localStorage.getItem("aegis.effect-prompt-position")).toBe("center");
  expect(respond).not.toHaveBeenCalled();
  fireEvent.change(setting, { target: { value: "left" } });
  expect(dialog.dataset.promptSurface).toBe("left");
});

describe("persisted activation position", () => {
  it("defaults a fresh device to the lower left", async () => {
    localStorage.clear();
    vi.resetModules();
    expect((await import("./effectPromptPosition")).getEffectPromptPosition()).toBe("left");
  });

  it("preserves an explicitly stored center choice", async () => {
    localStorage.setItem("aegis.effect-prompt-position", "center");
    vi.resetModules();
    expect((await import("./effectPromptPosition")).getEffectPromptPosition()).toBe("center");
  });

  it("restores the lower-left preference after reloading", async () => {
    setEffectPromptPosition("left");
    expect(getEffectPromptPosition()).toBe("left");
    vi.resetModules();
    expect((await import("./effectPromptPosition")).getEffectPromptPosition()).toBe("left");
  });

  it("defaults unknown stored values to the lower left", async () => {
    localStorage.setItem("aegis.effect-prompt-position", "obsolete");
    vi.resetModules();
    expect((await import("./effectPromptPosition")).getEffectPromptPosition()).toBe("left");
  });

  it("keeps the choice when device storage is unavailable", () => {
    const blockedStorage = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    try {
      setEffectPromptPosition("left");
      expect(getEffectPromptPosition()).toBe("left");
    } finally {
      blockedStorage.mockRestore();
    }
  });
});

it("shares the global Settings preference with Match Settings", () => {
  render(
    <I18nProvider>
      <Settings
        player={{ name: "Guest Tamer", color: "Blue", shards: 0, guestAvatarId: null }}
        account={null}
        dark={false}
        onToggleDark={() => undefined}
      />
      <ArenaBoardSettings />
    </I18nProvider>,
  );
  expect(screen.getByRole("button", { name: "Lower left (default)" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Center" }));
  expect(screen.getByRole("combobox", { name: "Effect prompt position" })).toHaveProperty("value", "center");
  expect(screen.getByRole("button", { name: "Center" }).getAttribute("aria-pressed")).toBe("true");
});
