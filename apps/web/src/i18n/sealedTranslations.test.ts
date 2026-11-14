import { expect, it } from "vitest";
import { loadDictionary } from "@/i18n/loadDictionary";
import { en } from "@/i18n/en";
import { dictionaryLoaders } from "@/i18n/dictionaryLoaders";
import type { Locale } from "@/i18n/locales";

it("keeps every sealed key translated in every supported locale", async () => {
  const keys = Object.keys(en).filter((key) => key.startsWith("sealed.")) as (keyof typeof en)[];
  for (const locale of Object.keys(dictionaryLoaders) as Locale[]) {
    const dictionary = await loadDictionary(locale);
    expect(keys.every((key) => typeof dictionary[key] === "string" && dictionary[key].length > 0)).toBe(true);
  }
  for (const locale of (Object.keys(dictionaryLoaders) as Locale[]).filter((candidate) => candidate !== "en")) {
    const dictionary = await loadDictionary(locale);
    expect(dictionary["sealed.title"]).not.toBe(en["sealed.title"]);
    expect(dictionary["sealed.policy"]).not.toBe(en["sealed.policy"]);
  }
});

it("describes preparation between matches without forbidding round-boundary edits", () => {
  expect(en["sealed.policy"]).toContain("Between-match");
  expect(en["sealed.policy"]).not.toContain("or at round boundaries");
});

it("describes independent private pools, BO3 sideboard fallback and restart limits in all eleven locales", async () => {
  const keys = Object.keys(en).filter((key) => key.startsWith("sealed.private.")) as (keyof typeof en)[];
  expect(Object.keys(dictionaryLoaders)).toHaveLength(11);
  for (const locale of Object.keys(dictionaryLoaders) as Locale[]) {
    const dictionary = await loadDictionary(locale);
    expect(keys.every((key) => typeof dictionary[key] === "string" && dictionary[key].length > 0)).toBe(true);
  }
  for (const locale of (Object.keys(dictionaryLoaders) as Locale[]).filter((candidate) => candidate !== "en")) {
    expect((await loadDictionary(locale))["sealed.private.policy"]).not.toBe(en["sealed.private.policy"]);
  }
  expect(en["sealed.private.description"]).toContain("six packs");
  expect(en["sealed.private.policy"]).toContain("last submitted legal decks");
  expect(en["sealed.private.policy"]).toContain("server restart");
});

it("keeps product selection localized without stale product-only claims", async () => {
  for (const locale of Object.keys(dictionaryLoaders) as Locale[]) {
    const dictionary = await loadDictionary(locale);
    for (const key of Object.keys(en).filter((candidate) => candidate.startsWith("sealed.")) as (keyof typeof en)[]) {
      expect(dictionary[key]).not.toContain("BT4");
    }
    expect(dictionary["sealed.product.upcoming"]).toContain("{date}");
    expect(dictionary["sealed.product.packs"].length).toBeLessThan(16);
    expect(dictionary["sealed.product.availability"].length).toBeLessThan(16);
    expect(dictionary["sealed.private.create"].length).toBeLessThan(16);
    expect(dictionary["sealed.private.join"].length).toBeLessThan(16);
    expect(dictionary["sealed.product.help"].length).toBeLessThan(100);
  }
});
