import { useSyncExternalStore } from "react";
import { getDarkMode, subscribeDarkMode } from "./darkMode";
import {
  interfaceThemeTokens,
  presetColors,
  THEME_PRESETS,
  isBoardThemeId,
  type InterfaceColors,
  type InterfaceThemeId,
} from "./interfaceThemeColors";

const STORAGE_KEY = "aegis:interfaceTheme";
interface InterfaceThemePreference {
  preset: InterfaceThemeId;
  custom: { light: InterfaceColors; dark: InterfaceColors };
}

const DEFAULT: InterfaceThemePreference = {
  preset: "aegis",
  custom: { light: presetColors("aegis", false), dark: presetColors("aegis", true) },
};

function isThemeId(value: unknown): value is InterfaceThemeId {
  return value === "custom" || isBoardThemeId(value) || THEME_PRESETS.some((preset) => preset.id === value);
}

function isColors(value: unknown): value is InterfaceColors {
  if (!value || typeof value !== "object") return false;
  return Object.keys(DEFAULT.custom.light).every((key) => {
    const color = (value as Record<string, unknown>)[key];
    return typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color);
  });
}

function readPreference(): InterfaceThemePreference {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!saved || !isThemeId(saved.preset)) {
      const previousBoard = localStorage.getItem("aegis.arenaPalette");
      return isBoardThemeId(previousBoard) ? { ...DEFAULT, preset: previousBoard } : DEFAULT;
    }
    return {
      preset: saved.preset,
      custom: {
        light: isColors(saved.custom?.light) ? saved.custom.light : DEFAULT.custom.light,
        dark: isColors(saved.custom?.dark) ? saved.custom.dark : DEFAULT.custom.dark,
      },
    };
  } catch {
    // Invalid JSON or blocked storage must never prevent the UI from loading.
    return DEFAULT;
  }
}

let current = readPreference();
const listeners = new Set<() => void>();
const tokenNames = Object.keys(interfaceThemeTokens(DEFAULT.custom.light));

export function getInterfaceTheme(): InterfaceThemePreference {
  return current;
}

export function getInterfaceColors(dark = getDarkMode()): InterfaceColors {
  return current.preset === "custom" ? current.custom[dark ? "dark" : "light"] : presetColors(current.preset, dark);
}

export function applyInterfaceTheme(): void {
  const root = document.documentElement;
  root.dataset.interfaceTheme = current.preset;
  if (current.preset === "aegis") {
    for (const name of tokenNames) root.style.removeProperty(name);
    return;
  }
  for (const [name, value] of Object.entries(interfaceThemeTokens(getInterfaceColors()))) {
    root.style.setProperty(name, value);
  }
}

function savePreference(next: InterfaceThemePreference): void {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    // Keep the old key valid for older tabs/bundles while the unified choice wins.
    localStorage.setItem("aegis.arenaPalette", isBoardThemeId(current.preset) ? current.preset : "aegis");
  } catch {
    // Storage can be unavailable; colors still work for the current session.
  }
  applyInterfaceTheme();
  for (const listener of listeners) listener();
}

export function setInterfaceTheme(preset: InterfaceThemeId): void {
  if (!isThemeId(preset) || preset === current.preset) return;
  savePreference({ ...current, preset });
}

export function setCustomInterfaceColor(key: keyof InterfaceColors, color: string): void {
  if (!Object.hasOwn(DEFAULT.custom.light, key) || !/^#[0-9a-f]{6}$/i.test(color)) return;
  const mode = getDarkMode() ? "dark" : "light";
  savePreference({
    preset: "custom",
    custom: { ...current.custom, [mode]: { ...getInterfaceColors(), [key]: color } },
  });
}

export function resetInterfaceTheme(): void {
  savePreference(DEFAULT);
}

export function subscribeInterfaceTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInterfaceTheme(): InterfaceThemePreference {
  return useSyncExternalStore(subscribeInterfaceTheme, getInterfaceTheme, () => DEFAULT);
}

// All existing light/dark controls, including the arena, keep the palette in step.
subscribeDarkMode(applyInterfaceTheme);
