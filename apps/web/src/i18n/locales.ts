/* Locale identity and persistence. Kept free of React so non-component code
   (storage, formatting helpers) can import it without pulling in the provider. */

export const LOCALES = ["en", "pt-BR"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  "pt-BR": "Português (Brasil)",
};

const STORAGE_KEY = "aegis:locale";

function isLocale(value: string | null): value is Locale {
  return value !== null && (LOCALES as readonly string[]).includes(value);
}

/** Best match for a browser language tag, e.g. `pt`, `pt-br`, `pt-PT` → `pt-BR`. */
export function matchLocale(languageTag: string): Locale | undefined {
  const tag = languageTag.toLowerCase();
  return (
    LOCALES.find((locale) => locale.toLowerCase() === tag) ??
    LOCALES.find((locale) => locale.toLowerCase().split("-")[0] === tag.split("-")[0])
  );
}

/** Stored choice first, then the browser's languages, then English. */
export function loadLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // ignore unavailable or malformed storage
  }
  if (typeof navigator !== "undefined") {
    for (const tag of navigator.languages ?? [navigator.language]) {
      const match = matchLocale(tag ?? "");
      if (match) return match;
    }
  }
  return DEFAULT_LOCALE;
}

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore unavailable storage
  }
}
