// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { InterfaceThemeDialog } from "./InterfaceThemePicker";
import { getDarkMode, setDarkMode } from "./darkMode";
import { contrastRatio, interfaceThemeTokens, presetColors, THEME_PRESETS } from "./interfaceThemeColors";
import {
  getInterfaceColors,
  getInterfaceTheme,
  resetInterfaceTheme,
  setCustomInterfaceColor,
  setInterfaceTheme,
} from "./interfaceTheme";

const token = (name: string) => document.documentElement.style.getPropertyValue(`--ds-${name}`);

afterEach(() => {
  cleanup();
  resetInterfaceTheme();
  setDarkMode(false);
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("interface palettes", () => {
  it("applies a preset globally and updates it through existing mode controls", () => {
    setInterfaceTheme("adventure");
    const light = token("accent");
    expect(token("ink")).toBe("#102b47");
    setDarkMode(true);
    expect(token("accent")).not.toBe(light);
    expect(token("paper")).toBe(getInterfaceColors().background);
    expect(JSON.parse(localStorage.getItem("aegis:interfaceTheme")!).preset).toBe("adventure");
  });

  it("keeps custom colors separately for each mode and when revisiting a preset", () => {
    setCustomInterfaceColor("accent", "#186da1");
    setDarkMode(true);
    setCustomInterfaceColor("accent", "#82ccff");
    setInterfaceTheme("digi-egg");
    setInterfaceTheme("custom");
    expect(getInterfaceColors().accent).toBe("#82ccff");
    setDarkMode(false);
    expect(getInterfaceColors().accent).toBe("#186da1");
  });

  it("uses one classic choice for the site and the arena while preserving the board color pair", async () => {
    const arena = await import("./arenaPalette");
    setInterfaceTheme("red-blue");
    expect(token("accent")).not.toBe("");
    expect(token("game-accent")).not.toBe("");
    expect(arena.getArenaPaletteId()).toBe("red-blue");
    expect(arena.arenaPaletteById("red-blue").player).toEqual(["#2f6fe0", "#ff8cc8"]);
    expect(arena.arenaPaletteById("red-blue").opponent).toEqual(["#c4495a", "var(--ds-rim-threat)"]);
  });

  it("restores stylesheet colors without clearing unrelated root properties", () => {
    document.documentElement.style.setProperty("--ds-text-scale", "1.15");
    setInterfaceTheme("next-order");
    resetInterfaceTheme();
    expect(token("accent")).toBe("");
    expect(token("paper")).toBe("");
    expect(token("text-scale")).toBe("1.15");
    document.documentElement.style.removeProperty("--ds-text-scale");
  });

  it("ignores invalid colors and still works if storage is blocked", () => {
    setCustomInterfaceColor("accent", "red");
    expect(getInterfaceTheme().preset).toBe("aegis");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Blocked");
    });
    setInterfaceTheme("digital-world");
    expect(token("ink")).toBe("#10291c");
  });

  it.each(THEME_PRESETS.flatMap((preset) => [false, true].map((dark) => ({ id: preset.id, dark }))))(
    "keeps $id readable in dark=$dark",
    ({ id, dark }) => {
      const tokens = interfaceThemeTokens(presetColors(id, dark));
      for (const ground of ["paper", "sheet", "fill"]) {
        for (const text of ["text", "text-2", "text-3", "accent"]) {
          expect(contrastRatio(tokens[`--ds-${text}`]!, tokens[`--ds-${ground}`]!)).toBeGreaterThanOrEqual(4.5);
        }
      }
      for (const background of ["accent", "accent-strong"]) {
        expect(contrastRatio(tokens["--ds-on-accent"]!, tokens[`--ds-${background}`]!)).toBeGreaterThanOrEqual(4.5);
      }
      for (const ground of ["accent-soft", "accent-active"]) {
        for (const text of ["text", "accent"]) {
          expect(contrastRatio(tokens[`--ds-${text}`]!, tokens[`--ds-${ground}`]!)).toBeGreaterThanOrEqual(4.5);
        }
      }
      expect(contrastRatio(tokens["--ds-on-ink"]!, tokens["--ds-ink"]!)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("keeps text readable when custom surfaces conflict", () => {
    const tokens = interfaceThemeTokens({
      accent: "#aaaaaa",
      background: "#ffffff",
      surface: "#000000",
      text: "#ffffff",
      header: "#ffff00",
    });
    for (const ground of ["paper", "sheet", "fill"]) {
      expect(contrastRatio(tokens["--ds-text"]!, tokens[`--ds-${ground}`]!)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatio(tokens["--ds-on-ink"]!, tokens["--ds-ink-raised"]!)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["#ffffff", "#777777", "#747474", "#ffff00", "#000000"])(
    "keeps arena controls readable with a custom header %s",
    (header) => {
      const tokens = interfaceThemeTokens({ ...presetColors("digi-egg", false), header });
      for (const ground of ["paper", "sheet", "fill", "accent-soft", "accent-active"]) {
        for (const text of ["text", "accent"]) {
          expect(contrastRatio(tokens[`--ds-game-${text}`]!, tokens[`--ds-game-${ground}`]!)).toBeGreaterThanOrEqual(
            4.5,
          );
        }
      }
      for (const status of ["success", "warning", "danger"]) {
        expect(contrastRatio(tokens[`--ds-game-${status}`]!, tokens["--ds-game-sheet"]!)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(tokens["--ds-game-on-status"]!, tokens[`--ds-game-${status}`]!)).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    },
  );

  it("offers accessible choices, custom inputs, and Escape dismissal", () => {
    const close = vi.fn<() => void>();
    render(
      <I18nProvider>
        <InterfaceThemeDialog dark={getDarkMode()} onToggleDark={setDarkMode} onClose={close} />
      </I18nProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: "Themes and colors" });
    fireEvent.click(screen.getByRole("radio", { name: "Cyber Sleuth" }));
    expect((screen.getByRole("radio", { name: "Cyber Sleuth" }) as HTMLInputElement).checked).toBe(true);
    expect(getInterfaceTheme().preset).toBe("cyber-sleuth");
    fireEvent.click(screen.getByRole("radio", { name: "Custom" }));
    fireEvent.change(screen.getByLabelText("Buttons and highlights"), { target: { value: "#3388bb" } });
    expect(getInterfaceColors().accent).toBe("#3388bb");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(close).toHaveBeenCalledOnce();
  });
});

describe("saved interface palettes", () => {
  it("restores the saved palette at startup", async () => {
    setInterfaceTheme("next-order");
    vi.resetModules();
    const fresh = await import("./interfaceTheme");
    fresh.applyInterfaceTheme();
    expect(fresh.getInterfaceTheme().preset).toBe("next-order");
    expect(token("ink")).toBe("#0b2038");
    fresh.resetInterfaceTheme();
  });

  it.each(["red-blue", "green-purple", "gold-black", "deck-colors"])(
    "preserves the production board choice %s on first load",
    async (id) => {
      localStorage.removeItem("aegis:interfaceTheme");
      localStorage.setItem("aegis.arenaPalette", id);
      vi.resetModules();
      const fresh = await import("./interfaceTheme");
      const arena = await import("./arenaPalette");
      expect(fresh.getInterfaceTheme().preset).toBe(id);
      expect(arena.getArenaPaletteId()).toBe(id);
      fresh.applyInterfaceTheme();
      expect(token("accent")).not.toBe("");
      expect(token("game-accent")).not.toBe("");
      fresh.setInterfaceTheme("adventure");
      expect(arena.getArenaPaletteId()).toBe("aegis");
      expect(localStorage.getItem("aegis.arenaPalette")).toBe("aegis");
      fresh.resetInterfaceTheme();
    },
  );

  it("uses the unified preference ahead of an older board key", async () => {
    setInterfaceTheme("crest");
    localStorage.setItem("aegis.arenaPalette", "gold-black");
    vi.resetModules();
    const fresh = await import("./interfaceTheme");
    expect(fresh.getInterfaceTheme().preset).toBe("crest");
    fresh.resetInterfaceTheme();
  });

  it.each(["{broken", '{"preset":"missing"}', '{"preset":"custom","custom":{"light":{"accent":"invalid"}}}'])(
    "recovers safely from malformed preferences: %s",
    async (saved) => {
      localStorage.setItem("aegis:interfaceTheme", saved);
      vi.resetModules();
      const fresh = await import("./interfaceTheme");
      fresh.applyInterfaceTheme();
      expect(fresh.getInterfaceColors(false)).toEqual(presetColors("aegis", false));
      fresh.resetInterfaceTheme();
    },
  );
});
