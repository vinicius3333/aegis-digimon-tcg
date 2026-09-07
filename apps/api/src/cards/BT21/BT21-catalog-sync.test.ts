import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { CompiledEffects } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled as bt21001 } from "./BT21-001.js";
import { compiled as bt21002 } from "./BT21-002.js";
import { compiled as bt21003 } from "./BT21-003.js";
import { compiled as bt21004 } from "./BT21-004.js";
import { compiled as bt21005 } from "./BT21-005.js";
import { compiled as bt21006 } from "./BT21-006.js";
import { compiled as bt21007 } from "./BT21-007.js";
import { compiled as bt21008 } from "./BT21-008.js";
import { compiled as bt21009 } from "./BT21-009.js";
import { compiled as bt21010 } from "./BT21-010.js";
import { compiled as bt21011 } from "./BT21-011.js";
import { compiled as bt21012 } from "./BT21-012.js";
import { compiled as bt21013 } from "./BT21-013.js";
import { compiled as bt21014 } from "./BT21-014.js";
import { compiled as bt21015 } from "./BT21-015.js";
import { compiled as bt21016 } from "./BT21-016.js";
import { compiled as bt21017 } from "./BT21-017.js";
import { compiled as bt21018 } from "./BT21-018.js";
import { compiled as bt21019 } from "./BT21-019.js";
import { compiled as bt21020 } from "./BT21-020.js";
import { compiled as bt21021 } from "./BT21-021.js";
import { compiled as bt21022 } from "./BT21-022.js";
import { compiled as bt21023 } from "./BT21-023.js";
import { compiled as bt21024 } from "./BT21-024.js";
import { compiled as bt21025 } from "./BT21-025.js";
import { compiled as bt21026 } from "./BT21-026.js";
import { compiled as bt21027 } from "./BT21-027.js";
import { compiled as bt21028 } from "./BT21-028.js";
import { compiled as bt21029 } from "./BT21-029.js";
import { compiled as bt21030 } from "./BT21-030.js";
import { compiled as bt21031 } from "./BT21-031.js";
import { compiled as bt21032 } from "./BT21-032.js";
import { compiled as bt21033 } from "./BT21-033.js";
import { compiled as bt21034 } from "./BT21-034.js";
import { compiled as bt21035 } from "./BT21-035.js";
import { compiled as bt21036 } from "./BT21-036.js";
import { compiled as bt21037 } from "./BT21-037.js";
import { compiled as bt21038 } from "./BT21-038.js";
import { compiled as bt21039 } from "./BT21-039.js";
import { compiled as bt21040 } from "./BT21-040.js";
import { compiled as bt21041 } from "./BT21-041.js";
import { compiled as bt21042 } from "./BT21-042.js";
import { compiled as bt21043 } from "./BT21-043.js";
import { compiled as bt21044 } from "./BT21-044.js";
import { compiled as bt21045 } from "./BT21-045.js";
import { compiled as bt21046 } from "./BT21-046.js";
import { compiled as bt21047 } from "./BT21-047.js";
import { compiled as bt21048 } from "./BT21-048.js";
import { compiled as bt21049 } from "./BT21-049.js";
import { compiled as bt21050 } from "./BT21-050.js";
import { compiled as bt21051 } from "./BT21-051.js";
import { compiled as bt21052 } from "./BT21-052.js";
import { compiled as bt21053 } from "./BT21-053.js";
import { compiled as bt21054 } from "./BT21-054.js";
import { compiled as bt21055 } from "./BT21-055.js";
import { compiled as bt21056 } from "./BT21-056.js";
import { compiled as bt21057 } from "./BT21-057.js";
import { compiled as bt21058 } from "./BT21-058.js";
import { compiled as bt21059 } from "./BT21-059.js";
import { compiled as bt21060 } from "./BT21-060.js";
import { compiled as bt21061 } from "./BT21-061.js";
import { compiled as bt21062 } from "./BT21-062.js";
import { compiled as bt21063 } from "./BT21-063.js";
import { compiled as bt21064 } from "./BT21-064.js";
import { compiled as bt21065 } from "./BT21-065.js";
import { compiled as bt21066 } from "./BT21-066.js";
import { compiled as bt21067 } from "./BT21-067.js";
import { compiled as bt21068 } from "./BT21-068.js";
import { compiled as bt21069 } from "./BT21-069.js";
import { compiled as bt21070 } from "./BT21-070.js";
import { compiled as bt21071 } from "./BT21-071.js";
import { compiled as bt21072 } from "./BT21-072.js";
import { compiled as bt21073 } from "./BT21-073.js";
import { compiled as bt21074 } from "./BT21-074.js";
import { compiled as bt21075 } from "./BT21-075.js";
import { compiled as bt21076 } from "./BT21-076.js";
import { compiled as bt21077 } from "./BT21-077.js";
import { compiled as bt21078 } from "./BT21-078.js";
import { compiled as bt21079 } from "./BT21-079.js";
import { compiled as bt21080 } from "./BT21-080.js";
import { compiled as bt21081 } from "./BT21-081.js";
import { compiled as bt21082 } from "./BT21-082.js";
import { compiled as bt21083 } from "./BT21-083.js";
import { compiled as bt21084 } from "./BT21-084.js";
import { compiled as bt21085 } from "./BT21-085.js";
import { compiled as bt21086 } from "./BT21-086.js";
import { compiled as bt21087 } from "./BT21-087.js";
import { compiled as bt21088 } from "./BT21-088.js";
import { compiled as bt21089 } from "./BT21-089.js";
import { compiled as bt21090 } from "./BT21-090.js";
import { compiled as bt21091 } from "./BT21-091.js";
import { compiled as bt21092 } from "./BT21-092.js";
import { compiled as bt21093 } from "./BT21-093.js";
import { compiled as bt21094 } from "./BT21-094.js";
import { compiled as bt21095 } from "./BT21-095.js";
import { compiled as bt21096 } from "./BT21-096.js";
import { compiled as bt21097 } from "./BT21-097.js";
import { compiled as bt21098 } from "./BT21-098.js";
import { compiled as bt21099 } from "./BT21-099.js";
import { compiled as bt21100 } from "./BT21-100.js";
import { compiled as bt21101 } from "./BT21-101.js";
import { compiled as bt21102 } from "./BT21-102.js";

const effectsPath = fileURLToPath(new URL("../../../../../packages/shared/src/effects/effects.json", import.meta.url));
const catalog = JSON.parse(readFileSync(effectsPath, "utf8")) as CompiledEffects;
const printedCatalog = JSON.parse(
  readFileSync(new URL("../../../../../packages/shared/src/cards/data/cards.json", import.meta.url), "utf8"),
) as { cardId: string; set: string }[];
const authoritative = {
  "BT21-001": bt21001,
  "BT21-002": bt21002,
  "BT21-003": bt21003,
  "BT21-004": bt21004,
  "BT21-005": bt21005,
  "BT21-006": bt21006,
  "BT21-007": bt21007,
  "BT21-008": bt21008,
  "BT21-009": bt21009,
  "BT21-010": bt21010,
  "BT21-011": bt21011,
  "BT21-012": bt21012,
  "BT21-013": bt21013,
  "BT21-014": bt21014,
  "BT21-015": bt21015,
  "BT21-016": bt21016,
  "BT21-017": bt21017,
  "BT21-018": bt21018,
  "BT21-019": bt21019,
  "BT21-020": bt21020,
  "BT21-021": bt21021,
  "BT21-022": bt21022,
  "BT21-023": bt21023,
  "BT21-024": bt21024,
  "BT21-025": bt21025,
  "BT21-026": bt21026,
  "BT21-027": bt21027,
  "BT21-028": bt21028,
  "BT21-029": bt21029,
  "BT21-030": bt21030,
  "BT21-031": bt21031,
  "BT21-032": bt21032,
  "BT21-033": bt21033,
  "BT21-034": bt21034,
  "BT21-035": bt21035,
  "BT21-036": bt21036,
  "BT21-037": bt21037,
  "BT21-038": bt21038,
  "BT21-039": bt21039,
  "BT21-040": bt21040,
  "BT21-041": bt21041,
  "BT21-042": bt21042,
  "BT21-043": bt21043,
  "BT21-044": bt21044,
  "BT21-045": bt21045,
  "BT21-046": bt21046,
  "BT21-047": bt21047,
  "BT21-048": bt21048,
  "BT21-049": bt21049,
  "BT21-050": bt21050,
  "BT21-051": bt21051,
  "BT21-052": bt21052,
  "BT21-053": bt21053,
  "BT21-054": bt21054,
  "BT21-055": bt21055,
  "BT21-056": bt21056,
  "BT21-057": bt21057,
  "BT21-058": bt21058,
  "BT21-059": bt21059,
  "BT21-060": bt21060,
  "BT21-061": bt21061,
  "BT21-062": bt21062,
  "BT21-063": bt21063,
  "BT21-064": bt21064,
  "BT21-065": bt21065,
  "BT21-066": bt21066,
  "BT21-067": bt21067,
  "BT21-068": bt21068,
  "BT21-069": bt21069,
  "BT21-070": bt21070,
  "BT21-071": bt21071,
  "BT21-072": bt21072,
  "BT21-073": bt21073,
  "BT21-074": bt21074,
  "BT21-075": bt21075,
  "BT21-076": bt21076,
  "BT21-077": bt21077,
  "BT21-078": bt21078,
  "BT21-079": bt21079,
  "BT21-080": bt21080,
  "BT21-081": bt21081,
  "BT21-082": bt21082,
  "BT21-083": bt21083,
  "BT21-084": bt21084,
  "BT21-085": bt21085,
  "BT21-086": bt21086,
  "BT21-087": bt21087,
  "BT21-088": bt21088,
  "BT21-089": bt21089,
  "BT21-090": bt21090,
  "BT21-091": bt21091,
  "BT21-092": bt21092,
  "BT21-093": bt21093,
  "BT21-094": bt21094,
  "BT21-095": bt21095,
  "BT21-096": bt21096,
  "BT21-097": bt21097,
  "BT21-098": bt21098,
  "BT21-099": bt21099,
  "BT21-100": bt21100,
  "BT21-101": bt21101,
  "BT21-102": bt21102,
};

describe("BT21 persisted IR", () => {
  it("audits every BT21 card in the committed printed catalog", () => {
    expect(Object.keys(authoritative).sort()).toEqual(
      printedCatalog
        .filter((card) => card.set === "BT21")
        .map((card) => card.cardId)
        .sort(),
    );
  });

  it.each(Object.keys(authoritative))("registers %s exclusively through its compiled IR", (cardId) => {
    const source = readFileSync(new URL(`./${cardId}.ts`, import.meta.url), "utf8");
    expect(source.match(/\bregisterIrCard\s*\(/g)).toHaveLength(1);
    expect(source).toMatch(new RegExp(`registerIrCard\\((?:"${cardId}"|cardId), compiled\\)`));
    const registeredId =
      source.match(/registerIrCard\("([^"]+)", compiled\)/)?.[1] ?? source.match(/const cardId = "([^"]+)"/)?.[1];
    expect(registeredId).toBe(cardId);
    expect(source).not.toMatch(/\bregisterCard\s*\(/);
  });

  it("contains exactly the authoritative BT21 card keys", () => {
    const persistedCardIds = Object.keys(catalog)
      .filter((cardId) => /^BT21-\d{3}$/.test(cardId))
      .sort();

    expect(persistedCardIds).toEqual(Object.keys(authoritative));
  });

  it("keeps every record synchronized with its authoritative module", () => {
    const mismatches = Object.entries(authoritative)
      .filter(([cardId, compiled]) => JSON.stringify(catalog[cardId]) !== JSON.stringify(compiled))
      .map(([cardId]) => cardId);

    expect(mismatches).toEqual([]);
  });

  it.each(Object.keys(authoritative))("keeps %s at full coverage with no residual prose", (cardId) => {
    expect(catalog[cardId]?.coverage).toBe("full");
    expect(catalog[cardId]?.residual).toEqual([]);
  });
});
