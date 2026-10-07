export interface InterfaceColors {
  accent: string;
  background: string;
  surface: string;
  text: string;
  header: string;
}

export const THEME_PRESETS = [
  { id: "aegis", name: "Aegis", light: "#c0267a", dark: "#f472b6", header: "#07152b" },
  { id: "digi-egg", name: "Digi-Egg", light: "#7762ac", dark: "#c3afea", header: "#251e39" },
  { id: "adventure", name: "Adventure", light: "#b44908", dark: "#ffad5c", header: "#102b47" },
  { id: "crest", name: "Crest", light: "#926000", dark: "#f4ce69", header: "#29220f" },
  { id: "digital-world", name: "Digital World", light: "#24754b", dark: "#79d9a4", header: "#10291c" },
  { id: "cyber-sleuth", name: "Cyber Sleuth", light: "#08747e", dark: "#71d5dc", header: "#0b252a" },
  { id: "next-order", name: "Next Order", light: "#1961b8", dark: "#79baff", header: "#0b2038" },
  { id: "red-blue", name: "Blue vs red", light: "#2f6fe0", dark: "#85b5ff", header: "#07152b" },
  { id: "green-purple", name: "Green vs purple", light: "#1d8a5b", dark: "#79d9a4", header: "#10291c" },
  { id: "gold-black", name: "Gold vs black", light: "#9f7412", dark: "#e8bd66", header: "#221e15" },
  { id: "deck-colors", name: "Each deck's main color", light: "#b23548", dark: "#f48c9a", header: "#07152b" },
] as const;

export type ThemePresetId = (typeof THEME_PRESETS)[number]["id"];
export const BOARD_THEME_IDS = ["red-blue", "green-purple", "gold-black", "deck-colors"] as const;
export type BoardThemeId = (typeof BOARD_THEME_IDS)[number];
export type InterfaceThemeId = ThemePresetId | "custom";

export function isBoardThemeId(value: unknown): value is BoardThemeId {
  return BOARD_THEME_IDS.some((id) => id === value);
}

function rgb(hex: string): number[] {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
}

export function mixColor(from: string, to: string, amount: number): string {
  const target = rgb(to);
  return `#${rgb(from)
    .map((value, i) =>
      Math.round(value + (target[i]! - value) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function luminance(hex: string): number {
  const channels = rgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

export function contrastRatio(a: string, b: string): number {
  const values = [luminance(a), luminance(b)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

/** Keep the chosen hue, moving only as far toward black/white as readability needs. */
function readableColor(color: string, backgrounds: string[], minimum = 4.5): string {
  for (let step = 0; step <= 100; step += 1) {
    for (const end of ["#000000", "#ffffff"]) {
      const candidate = mixColor(color, end, step / 100);
      if (backgrounds.every((background) => contrastRatio(candidate, background) >= minimum)) return candidate;
    }
  }
  return color;
}

function readableTint(background: string, hue: string, text: string[], amount: number): string {
  for (let step = 100; step >= 0; step -= 1) {
    const candidate = mixColor(background, hue, (amount * step) / 100);
    if (text.every((color) => contrastRatio(color, candidate) >= 4.5)) return candidate;
  }
  return background;
}

export function presetColors(id: ThemePresetId, dark: boolean): InterfaceColors {
  const preset = THEME_PRESETS.find((option) => option.id === id) ?? THEME_PRESETS[0];
  const accent = dark ? preset.dark : preset.light;
  const tint = id === "aegis" ? 0 : 0.04;
  return {
    accent,
    background: mixColor(dark ? "#0a0c12" : "#f5f7f9", accent, tint),
    surface: mixColor(dark ? "#11141c" : "#ffffff", accent, tint),
    text: dark ? "#f2f3f6" : "#07152b",
    header: preset.header,
  };
}

function surfaceThemeTokens(colors: InterfaceColors): Record<string, string> {
  const paper = colors.background;
  const textEnd = contrastRatio("#000000", paper) >= contrastRatio("#ffffff", paper) ? "#000000" : "#ffffff";
  // Opposing custom surfaces cannot share readable text. Bring the panel toward
  // the page only when necessary, retaining the user's colors whenever possible.
  let sheet = colors.surface;
  for (let step = 1; contrastRatio(textEnd, sheet) < 4.5 && step <= 100; step += 1) {
    sheet = mixColor(colors.surface, paper, step / 100);
  }
  const fill = mixColor(sheet, textEnd === "#000000" ? "#ffffff" : "#000000", 0.04);
  const grounds = [paper, sheet, fill];
  const foreground = readableColor(colors.text, grounds);
  const accent = readableColor(colors.accent, grounds);
  const strong = readableColor(mixColor(accent, foreground, 0.08), grounds);
  const onAccent = ["#000000", "#ffffff"].sort(
    (a, b) =>
      Math.min(contrastRatio(b, accent), contrastRatio(b, strong)) -
      Math.min(contrastRatio(a, accent), contrastRatio(a, strong)),
  )[0]!;
  const onInk = readableColor("#f8fbff", [colors.header]);
  const inkTextEnd =
    contrastRatio("#000000", colors.header) >= contrastRatio("#ffffff", colors.header) ? "#000000" : "#ffffff";
  let inkRaised = mixColor(colors.header, onInk, 0.04);
  if (contrastRatio(inkTextEnd, inkRaised) < 4.5) {
    inkRaised = mixColor(colors.header, inkTextEnd === "#000000" ? "#ffffff" : "#000000", 0.04);
  }
  const inkGrounds = [colors.header, inkRaised];
  const status = ["#16803d", "#b45309", "#dc2626"].map((color) => readableColor(color, grounds));
  const onStatus = ["#000000", "#ffffff"].sort(
    (a, b) =>
      Math.min(...status.map((color) => contrastRatio(b, color))) -
      Math.min(...status.map((color) => contrastRatio(a, color))),
  )[0]!;
  return {
    "--ds-paper": paper,
    "--ds-sheet": sheet,
    "--ds-fill": fill,
    "--ds-text": foreground,
    "--ds-text-2": readableColor(mixColor(foreground, paper, 0.15), grounds),
    "--ds-text-3": readableColor(mixColor(foreground, paper, 0.3), grounds),
    "--ds-text-off": mixColor(foreground, sheet, 0.6),
    "--ds-line": mixColor(sheet, foreground, 0.16),
    "--ds-line-strong": readableColor(mixColor(sheet, foreground, 0.5), grounds, 3),
    "--ds-accent": accent,
    "--ds-accent-strong": strong,
    "--ds-on-accent": onAccent,
    "--ds-accent-soft": readableTint(sheet, accent, [accent, foreground], 0.12),
    "--ds-accent-active": readableTint(sheet, accent, [accent, foreground], 0.18),
    "--ds-focus": accent,
    "--ds-focus-ring": `0 0 0 4px ${accent}40`,
    "--ds-ink": colors.header,
    "--ds-ink-raised": inkRaised,
    "--ds-on-ink": readableColor(onInk, inkGrounds),
    "--ds-on-ink-2": readableColor(mixColor(onInk, colors.header, 0.25), inkGrounds),
    "--ds-ink-accent": readableColor(colors.accent, inkGrounds),
    "--ds-success": status[0]!,
    "--ds-success-soft": readableTint(sheet, status[0]!, [status[0]!, foreground], 0.12),
    "--ds-warning": status[1]!,
    "--ds-warning-soft": readableTint(sheet, status[1]!, [status[1]!, foreground], 0.12),
    "--ds-danger": status[2]!,
    "--ds-danger-soft": readableTint(sheet, status[2]!, [status[2]!, foreground], 0.12),
    "--ds-on-status": onStatus,
  };
}

export function interfaceThemeTokens(colors: InterfaceColors): Record<string, string> {
  const page = surfaceThemeTokens(colors);
  const arena = surfaceThemeTokens({
    ...colors,
    background: colors.header,
    surface: page["--ds-ink-raised"]!,
  });
  return {
    ...page,
    ...Object.fromEntries(Object.entries(arena).map(([key, value]) => [key.replace("--ds-", "--ds-game-"), value])),
  };
}
