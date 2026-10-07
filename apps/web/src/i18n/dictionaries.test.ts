import { describe, expect, it } from "vitest";
import { en } from "./en";
import { es } from "./es";
import { LOCALES, type Locale } from "./locales";
import { ptBR } from "./pt-BR";

const TRANSLATIONS: Record<Exclude<Locale, "en">, Record<string, string>> = {
  "pt-BR": ptBR,
  es,
};

const translatedLocales = LOCALES.filter((locale): locale is Exclude<Locale, "en"> => locale !== "en");

function placeholders(text: string): string[] {
  return [...new Set([...text.matchAll(/\{\w+\}/g)].map(([placeholder]) => placeholder))].sort();
}

describe.each(translatedLocales)("%s dictionary", (locale) => {
  const dictionary = TRANSLATIONS[locale];

  it("has exactly the English keys", () => {
    expect(Object.keys(dictionary).sort()).toEqual(Object.keys(en).sort());
  });

  it("has a non-empty string for every key", () => {
    const empty = Object.entries(dictionary)
      .filter(([, value]) => typeof value !== "string" || value.trim() === "")
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });

  it("uses the same placeholders as English", () => {
    const mismatches = Object.entries(en)
      .filter(([key, value]) => placeholders(dictionary[key] ?? "").join() !== placeholders(value).join())
      .map(([key, value]) => ({ key, en: placeholders(value), [locale]: placeholders(dictionary[key] ?? "") }));
    expect(mismatches).toEqual([]);
  });
});
