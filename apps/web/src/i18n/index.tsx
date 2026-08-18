/* The i18n runtime: one dictionary per locale, a `t(key, params)` translator, and
   the provider/hook the whole client reads from. Card names and printed card text
   come from @aegis/shared and stay in English — only chrome is translated. */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, loadLocale, saveLocale, type Locale } from "./locales";
import { en } from "./en";
import { ptBR } from "./pt-BR";

export type TranslationKey = keyof typeof en;
export type TranslationParams = Record<string, string | number>;
export type Translate = (key: TranslationKey, params?: TranslationParams) => string;

const DICTIONARIES: Record<Locale, Record<TranslationKey, string>> = {
  en,
  "pt-BR": ptBR,
};

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

/** A standalone translator, for code that runs outside the React tree. */
export function translator(locale: Locale): Translate {
  const dictionary = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
  return (key, params) => interpolate(dictionary[key] ?? en[key] ?? key, params);
}

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(loadLocale);

  const setLocale = useCallback((next: Locale) => {
    saveLocale(next);
    setLocaleState(next);
    if (typeof document !== "undefined") document.documentElement.lang = next;
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t: translator(locale) }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useTranslation must be used inside <I18nProvider>");
  return value;
}

export { LOCALES, LOCALE_LABELS, type Locale } from "./locales";
