import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CompiledEffects } from "@aegis/shared";
import { compiled as bt20001 } from "./BT20-001.js";
import { compiled as bt20002 } from "./BT20-002.js";
import { compiled as bt20003 } from "./BT20-003.js";
import { compiled as bt20004 } from "./BT20-004.js";
import { compiled as bt20005 } from "./BT20-005.js";
import { compiled as bt20006 } from "./BT20-006.js";
import { compiled as bt20007 } from "./BT20-007.js";
import { compiled as bt20008 } from "./BT20-008.js";
import { compiled as bt20009 } from "./BT20-009.js";
import { compiled as bt20010 } from "./BT20-010.js";
import { compiled as bt20011 } from "./BT20-011.js";
import { compiled as bt20012 } from "./BT20-012.js";
import { compiled as bt20013 } from "./BT20-013.js";
import { compiled as bt20014 } from "./BT20-014.js";
import { compiled as bt20015 } from "./BT20-015.js";
import { compiled as bt20016 } from "./BT20-016.js";
import { compiled as bt20017 } from "./BT20-017.js";
import { compiled as bt20018 } from "./BT20-018.js";
import { compiled as bt20019 } from "./BT20-019.js";
import { compiled as bt20020 } from "./BT20-020.js";
import { compiled as bt20021 } from "./BT20-021.js";
import { compiled as bt20022 } from "./BT20-022.js";
import { compiled as bt20023 } from "./BT20-023.js";
import { compiled as bt20024 } from "./BT20-024.js";
import { compiled as bt20025 } from "./BT20-025.js";
import { compiled as bt20026 } from "./BT20-026.js";
import { compiled as bt20027 } from "./BT20-027.js";
import { compiled as bt20028 } from "./BT20-028.js";
import { compiled as bt20029 } from "./BT20-029.js";
import { compiled as bt20030 } from "./BT20-030.js";
import { compiled as bt20031 } from "./BT20-031.js";
import { compiled as bt20032 } from "./BT20-032.js";
import { compiled as bt20033 } from "./BT20-033.js";
import { compiled as bt20034 } from "./BT20-034.js";
import { compiled as bt20035 } from "./BT20-035.js";
import { compiled as bt20036 } from "./BT20-036.js";
import { compiled as bt20037 } from "./BT20-037.js";
import { compiled as bt20038 } from "./BT20-038.js";
import { compiled as bt20039 } from "./BT20-039.js";
import { compiled as bt20040 } from "./BT20-040.js";
import { compiled as bt20041 } from "./BT20-041.js";
import { compiled as bt20042 } from "./BT20-042.js";
import { compiled as bt20043 } from "./BT20-043.js";
import { compiled as bt20044 } from "./BT20-044.js";
import { compiled as bt20045 } from "./BT20-045.js";
import { compiled as bt20046 } from "./BT20-046.js";
import { compiled as bt20047 } from "./BT20-047.js";
import { compiled as bt20048 } from "./BT20-048.js";
import { compiled as bt20049 } from "./BT20-049.js";
import { compiled as bt20050 } from "./BT20-050.js";
import { compiled as bt20051 } from "./BT20-051.js";
import { compiled as bt20052 } from "./BT20-052.js";
import { compiled as bt20053 } from "./BT20-053.js";
import { compiled as bt20054 } from "./BT20-054.js";
import { compiled as bt20055 } from "./BT20-055.js";
import { compiled as bt20056 } from "./BT20-056.js";
import { compiled as bt20057 } from "./BT20-057.js";
import { compiled as bt20058 } from "./BT20-058.js";
import { compiled as bt20059 } from "./BT20-059.js";
import { compiled as bt20060 } from "./BT20-060.js";
import { compiled as bt20061 } from "./BT20-061.js";
import { compiled as bt20062 } from "./BT20-062.js";
import { compiled as bt20063 } from "./BT20-063.js";
import { compiled as bt20064 } from "./BT20-064.js";
import { compiled as bt20065 } from "./BT20-065.js";
import { compiled as bt20066 } from "./BT20-066.js";
import { compiled as bt20067 } from "./BT20-067.js";
import { compiled as bt20068 } from "./BT20-068.js";
import { compiled as bt20069 } from "./BT20-069.js";
import { compiled as bt20070 } from "./BT20-070.js";
import { compiled as bt20071 } from "./BT20-071.js";
import { compiled as bt20072 } from "./BT20-072.js";
import { compiled as bt20073 } from "./BT20-073.js";
import { compiled as bt20074 } from "./BT20-074.js";
import { compiled as bt20075 } from "./BT20-075.js";
import { compiled as bt20076 } from "./BT20-076.js";
import { compiled as bt20077 } from "./BT20-077.js";
import { compiled as bt20078 } from "./BT20-078.js";
import { compiled as bt20079 } from "./BT20-079.js";
import { compiled as bt20080 } from "./BT20-080.js";
import { compiled as bt20081 } from "./BT20-081.js";
import { compiled as bt20082 } from "./BT20-082.js";
import { compiled as bt20083 } from "./BT20-083.js";
import { compiled as bt20084 } from "./BT20-084.js";
import { compiled as bt20085 } from "./BT20-085.js";
import { compiled as bt20086 } from "./BT20-086.js";
import { compiled as bt20087 } from "./BT20-087.js";
import { compiled as bt20088 } from "./BT20-088.js";
import { compiled as bt20089 } from "./BT20-089.js";
import { compiled as bt20090 } from "./BT20-090.js";
import { compiled as bt20091 } from "./BT20-091.js";
import { compiled as bt20092 } from "./BT20-092.js";
import { compiled as bt20093 } from "./BT20-093.js";
import { compiled as bt20094 } from "./BT20-094.js";
import { compiled as bt20095 } from "./BT20-095.js";
import { compiled as bt20096 } from "./BT20-096.js";
import { compiled as bt20097 } from "./BT20-097.js";
import { compiled as bt20098 } from "./BT20-098.js";
import { compiled as bt20099 } from "./BT20-099.js";
import { compiled as bt20100 } from "./BT20-100.js";
import { compiled as bt20101 } from "./BT20-101.js";
import { compiled as bt20102 } from "./BT20-102.js";

const effectsPath = fileURLToPath(new URL("../../../../../packages/shared/src/effects/effects.json", import.meta.url));
const bt20Directory = fileURLToPath(new URL(".", import.meta.url));
const catalog = JSON.parse(readFileSync(effectsPath, "utf8")) as CompiledEffects;
const cardIds = Array.from({ length: 102 }, (_, index) => `BT20-${String(index + 1).padStart(3, "0")}`);
const directCards = [
  ["BT20-001", bt20001],
  ["BT20-002", bt20002],
  ["BT20-003", bt20003],
  ["BT20-004", bt20004],
  ["BT20-005", bt20005],
  ["BT20-006", bt20006],
  ["BT20-007", bt20007],
  ["BT20-008", bt20008],
  ["BT20-009", bt20009],
  ["BT20-010", bt20010],
  ["BT20-011", bt20011],
  ["BT20-012", bt20012],
  ["BT20-013", bt20013],
  ["BT20-014", bt20014],
  ["BT20-015", bt20015],
  ["BT20-016", bt20016],
  ["BT20-017", bt20017],
  ["BT20-018", bt20018],
  ["BT20-019", bt20019],
  ["BT20-020", bt20020],
  ["BT20-021", bt20021],
  ["BT20-022", bt20022],
  ["BT20-023", bt20023],
  ["BT20-024", bt20024],
  ["BT20-025", bt20025],
  ["BT20-026", bt20026],
  ["BT20-027", bt20027],
  ["BT20-028", bt20028],
  ["BT20-029", bt20029],
  ["BT20-030", bt20030],
  ["BT20-031", bt20031],
  ["BT20-032", bt20032],
  ["BT20-033", bt20033],
  ["BT20-034", bt20034],
  ["BT20-035", bt20035],
  ["BT20-036", bt20036],
  ["BT20-037", bt20037],
  ["BT20-038", bt20038],
  ["BT20-039", bt20039],
  ["BT20-040", bt20040],
  ["BT20-041", bt20041],
  ["BT20-042", bt20042],
  ["BT20-043", bt20043],
  ["BT20-044", bt20044],
  ["BT20-045", bt20045],
  ["BT20-046", bt20046],
  ["BT20-047", bt20047],
  ["BT20-048", bt20048],
  ["BT20-049", bt20049],
  ["BT20-050", bt20050],
  ["BT20-051", bt20051],
  ["BT20-052", bt20052],
  ["BT20-053", bt20053],
  ["BT20-054", bt20054],
  ["BT20-055", bt20055],
  ["BT20-056", bt20056],
  ["BT20-057", bt20057],
  ["BT20-058", bt20058],
  ["BT20-059", bt20059],
  ["BT20-060", bt20060],
  ["BT20-061", bt20061],
  ["BT20-062", bt20062],
  ["BT20-063", bt20063],
  ["BT20-064", bt20064],
  ["BT20-065", bt20065],
  ["BT20-066", bt20066],
  ["BT20-067", bt20067],
  ["BT20-068", bt20068],
  ["BT20-069", bt20069],
  ["BT20-070", bt20070],
  ["BT20-071", bt20071],
  ["BT20-072", bt20072],
  ["BT20-073", bt20073],
  ["BT20-074", bt20074],
  ["BT20-075", bt20075],
  ["BT20-076", bt20076],
  ["BT20-077", bt20077],
  ["BT20-078", bt20078],
  ["BT20-079", bt20079],
  ["BT20-080", bt20080],
  ["BT20-081", bt20081],
  ["BT20-082", bt20082],
  ["BT20-083", bt20083],
  ["BT20-084", bt20084],
  ["BT20-085", bt20085],
  ["BT20-086", bt20086],
  ["BT20-087", bt20087],
  ["BT20-088", bt20088],
  ["BT20-089", bt20089],
  ["BT20-090", bt20090],
  ["BT20-091", bt20091],
  ["BT20-092", bt20092],
  ["BT20-093", bt20093],
  ["BT20-094", bt20094],
  ["BT20-095", bt20095],
  ["BT20-096", bt20096],
  ["BT20-097", bt20097],
  ["BT20-098", bt20098],
  ["BT20-099", bt20099],
  ["BT20-100", bt20100],
  ["BT20-101", bt20101],
  ["BT20-102", bt20102],
] as const;

describe("BT20 persisted IR", () => {
  it("has exactly the 102 BT20 catalog records", () => {
    expect(
      Object.keys(catalog)
        .filter((cardId) => cardId.startsWith("BT20-"))
        .sort(),
    ).toEqual(cardIds);
  });

  it.each(directCards)("keeps %s synchronized with its authoritative module", (cardId, compiled) => {
    expect(catalog[cardId]).toEqual(compiled);
    expect(catalog[cardId]?.coverage).toBe("full");
    expect(catalog[cardId]?.residual).toEqual([]);
  });

  it("has exactly 102 IR-only production modules", () => {
    const productionFiles = readdirSync(bt20Directory)
      .filter((fileName) => /^BT20-\d{3}\.ts$/.test(fileName))
      .sort();
    expect(productionFiles).toEqual(cardIds.map((cardId) => `${cardId}.ts`));

    for (const cardId of cardIds) {
      const source = readFileSync(join(bt20Directory, `${cardId}.ts`), "utf8");
      expect(source.match(/registerIrCard\s*\(/g) ?? []).toHaveLength(1);
      expect(source).not.toMatch(/\bregisterCard\s*\(/);
    }
  });
});
