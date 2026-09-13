import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchNameOrTrait } from "./interpreter.js";
import { registeredCompiledCards } from "./interpreter/compiledCards.js";
import "../../cards/index.js";

// Printed bracket-only names in play/Decode clauses, plus the corresponding
// source, presence and placement gates. Clauses explicitly saying "in name"
// (including Sistermon family references) are intentionally excluded.
const cases = [
  ["AD1-003", ["Takato Matsuki", "Guilmon"]],
  ["AD1-016", ["Marcus Damon"]],
  ["BT10-075", ["Yuu Amano"]],
  ["BT10-081", ["Beelzemon"]],
  ["BT10-083", ["Mervamon"]],
  ["BT10-089", ["Dorulumon"]],
  ["BT10-090", ["Ballistamon"]],
  ["BT10-100", ["Pulsemon"]],
  ["BT10-107", ["Yuu Amano"]],
  ["BT11-036", ["Chuumon"]],
  ["BT11-082", ["Damemon"]],
  ["BT11-094", ["LadyDevimon", "Angewomon"]],
  ["BT12-010", ["Takato Matsuki"]],
  ["BT12-011", ["Taiki Kudo", "Yuu Amano", "Tagiru Akashi"]],
  ["BT12-012", ["Flamemon", "Takuya Kanbara"]],
  ["BT12-017", ["Takuya Kanbara"]],
  ["BT12-038", ["Marcus Damon"]],
  ["BT12-051", ["Airu Suzaki", "Ren Tobari"]],
  ["BT12-054", ["Yakiimon", "Potamon"]],
  ["BT12-104", ["Marcus Damon"]],
  ["BT14-020", ["Gomamon"]],
  ["BT14-076", ["Agumon"]],
  ["BT14-081", ["Eiji Nagasumi"]],
  ["BT14-086", ["Satsuki Tamahime"]],
  ["BT14-087", ["Eiji Nagasumi"]],
  ["BT14-093", ["Patamon"]],
  ["BT15-040", ["Numemon"]],
  ["BT15-041", ["Rosemon", "Jijimon"]],
  ["BT15-086", ["Marvin Jackson"]],
  ["BT15-087", ["Shuu Yulin"]],
  ["BT15-088", ["Biyomon"]],
  ["BT15-098", ["Myotismon", "VenomMyotismon"]],
  ["BT16-010", ["Loogamon", "Eiji Nagasumi"]],
  ["BT16-014", ["God Flame"]],
  ["BT16-083", ["Ukkomon"]],
  ["BT16-084", ["Hawkmon", "Salamon"]],
  ["BT16-085", ["Veemon", "Wormmon"]],
  ["BT16-086", ["Hacker Judge"]],
  ["BT16-087", ["Kosuke Kisakata"]],
  ["BT16-088", ["Armadillomon", "Patamon"]],
  ["BT16-091", ["Aquilamon", "Gatomon", "Hawkmon", "Salamon"]],
  ["BT16-092", ["ExVeemon", "Stingmon", "Veemon", "Wormmon"]],
  ["BT16-097", ["Ankylomon", "Angemon", "Armadillomon", "Patamon"]],
  ["BT17-048", ["Argomon"]],
  ["BT17-050", ["Parasitemon"]],
  ["BT17-068", ["Gulfmon"]],
  ["BT17-076", ["Eosmon"]],
  ["BT17-082", ["Labramon", "Seasarmon"]],
  ["BT17-086", ["Leon Alexander"]],
  ["BT18-019", ["Millenniummon"]],
  ["BT21-096", ["Marcus Damon"]],
  ["BT22-007", ["Mother Eater"]],
  ["BT22-030", ["Torajiro Asuka"]],
  ["BT22-057", ["Arata Sanada"]],
  ["BT22-071", ["Jimmy KEN"]],
  ["BT22-081", ["Yuuko Kamishiro"]],
  ["BT22-082", ["Arata Sanada"]],
  ["BT22-084", ["Agumon", "Gabumon"]],
  ["BT22-086", ["Yao Qinglan", "Sangomon"]],
  ["BT22-088", ["Arisa Kinosaki", "Shoemon"]],
  ["BT22-089", ["Mirei Mikagura"]],
  ["BT22-096", ["Sangomon", "Yao Qinglan"]],
  ["BT24-014", ["Aegiomon"]],
  ["BT25-023", ["Thomas H. Norstein"]],
  ["BT25-025", ["Aegiomon"]],
  ["BT25-039", ["Ceresmon"]],
  ["BT25-052", ["Kazuki & Itsuki"]],
  ["BT25-053", ["Aegiomon"]],
  ["BT7-063", ["SkullKnightmon", "DeadlyAxemon"]],
  ["BT8-080", ["Yukio Oikawa"]],
  ["BT8-093", ["MaloMyotismon"]],
  ["EX1-005", ["Taiga"]],
  ["EX10-044", ["Tuwarmon"]],
  ["EX10-060", ["Lucemon: Larva"]],
  ["EX10-069", ["Sunarizamon", "Close"]],
  ["EX2-023", ["Rika Nonaka"]],
  ["EX2-035", ["Ryo Akiyama"]],
  ["EX2-044", ["Impmon"]],
  ["EX2-059", ["Lopmon"]],
  ["EX3-011", ["Hina Kurihara"]],
  ["EX3-052", ["Hina Kurihara"]],
  ["EX3-061", ["Paildramon", "Wormmon"]],
  ["EX3-072", ["Guilmon"]],
  ["EX8-048", ["Close"]],
  ["EX9-055", ["Abbadomon Core"]],
  ["EX9-067", ["Arisa Kinosaki"]],
  ["LM-016", ["Hiro Amanokawa"]],
  ["ST14-09", ["Impmon"]],
  ["BT22-036", ["Shoemon", "ShoeShoemon", "Arisa Kinosaki"]],
] as const;

type NameReference = { tokens: string[]; match: "name" | "nameExact" };

function references(node: unknown): NameReference[] {
  if (node === null || typeof node !== "object") return [];
  const object = node as Record<string, unknown>;
  const own =
    (object.match === "name" || object.match === "nameExact") && Array.isArray(object.tokens)
      ? [object as NameReference]
      : [];
  return [...own, ...Object.values(object).flatMap(references)];
}

describe("printed exact names in named play effects", () => {
  it.each(cases)("%s accepts exact names and rejects longer variants", (cardId, tokens) => {
    const card = getCardDefinition(cardId)!;
    const text = [card.effectText, card.inheritedEffectText, card.securityEffectText, card.optionEffect].join("\n");
    const compiled = registeredCompiledCards.get(cardId);
    expect(compiled).toBeDefined();
    for (const token of tokens) {
      expect(text).toContain(`[${token}]`);
      const refs = references(compiled).filter((ref) => ref.tokens.includes(token));
      expect(refs.length).toBeGreaterThan(0);
      for (const ref of refs) {
        expect(matchNameOrTrait({ nameEn: token }, ref)).toBe(true);
        expect(matchNameOrTrait({ nameEn: `${token} (X Antibody)` }, ref)).toBe(false);
        expect(matchNameOrTrait({ nameEn: `Mega${token}` }, ref)).toBe(false);
      }
    }
  });

  it("keeps the legitimate Sistermon family selection", () => {
    for (const cardId of ["EX13-065", "EX13-066"]) {
      const ref = references(registeredCompiledCards.get(cardId)).find((entry) => entry.tokens.includes("Sistermon"));
      expect(ref).toBeDefined();
      expect(matchNameOrTrait(getCardDefinition("BT6-082")!, ref!)).toBe(true);
    }
  });
});
