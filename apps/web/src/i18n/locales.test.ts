import { describe, expect, it } from "vitest";
import { isLocale, matchLocale } from "./locales";

describe("matchLocale", () => {
  it.each([
    ["en", "en"],
    ["en-US", "en"],
    ["pt", "pt-BR"],
    ["pt-br", "pt-BR"],
    ["pt-PT", "pt-BR"],
    ["es", "es"],
    ["es-419", "es"],
    ["es-MX", "es"],
    ["es-ES", "es"],
    ["ES-AR", "es"],
  ])("maps %s to %s", (tag, locale) => {
    expect(matchLocale(tag)).toBe(locale);
  });

  it("returns nothing for an unsupported language", () => {
    expect(matchLocale("fr-FR")).toBeUndefined();
  });
});

describe("isLocale", () => {
  it("accepts only exact supported locales", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("pt-BR")).toBe(true);
    expect(isLocale("es-MX")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});
