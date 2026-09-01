import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { CompiledEffects } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled as bt22001 } from "./BT22-001.js";
import { compiled as bt22002 } from "./BT22-002.js";
import { compiled as bt22003 } from "./BT22-003.js";
import { compiled as bt22004 } from "./BT22-004.js";
import { compiled as bt22005 } from "./BT22-005.js";
import { compiled as bt22006 } from "./BT22-006.js";
import { compiled as bt22007 } from "./BT22-007.js";
import { compiled as bt22008 } from "./BT22-008.js";
import { compiled as bt22009 } from "./BT22-009.js";
import { compiled as bt22010 } from "./BT22-010.js";
import { compiled as bt22011 } from "./BT22-011.js";
import { compiled as bt22012 } from "./BT22-012.js";
import { compiled as bt22013 } from "./BT22-013.js";
import { compiled as bt22014 } from "./BT22-014.js";
import { compiled as bt22015 } from "./BT22-015.js";
import { compiled as bt22016 } from "./BT22-016.js";
import { compiled as bt22017 } from "./BT22-017.js";
import { compiled as bt22018 } from "./BT22-018.js";
import { compiled as bt22019 } from "./BT22-019.js";
import { compiled as bt22020 } from "./BT22-020.js";
import { compiled as bt22021 } from "./BT22-021.js";
import { compiled as bt22022 } from "./BT22-022.js";
import { compiled as bt22023 } from "./BT22-023.js";
import { compiled as bt22024 } from "./BT22-024.js";
import { compiled as bt22025 } from "./BT22-025.js";
import { compiled as bt22026 } from "./BT22-026.js";
import { compiled as bt22027 } from "./BT22-027.js";
import { compiled as bt22028 } from "./BT22-028.js";
import { compiled as bt22029 } from "./BT22-029.js";
import { compiled as bt22030 } from "./BT22-030.js";
import { compiled as bt22031 } from "./BT22-031.js";
import { compiled as bt22032 } from "./BT22-032.js";
import { compiled as bt22033 } from "./BT22-033.js";
import { compiled as bt22034 } from "./BT22-034.js";
import { compiled as bt22035 } from "./BT22-035.js";
import { compiled as bt22036 } from "./BT22-036.js";
import { compiled as bt22037 } from "./BT22-037.js";
import { compiled as bt22038 } from "./BT22-038.js";
import { compiled as bt22039 } from "./BT22-039.js";
import { compiled as bt22040 } from "./BT22-040.js";
import { compiled as bt22041 } from "./BT22-041.js";
import { compiled as bt22042 } from "./BT22-042.js";
import { compiled as bt22043 } from "./BT22-043.js";
import { compiled as bt22044 } from "./BT22-044.js";
import { compiled as bt22045 } from "./BT22-045.js";
import { compiled as bt22046 } from "./BT22-046.js";
import { compiled as bt22047 } from "./BT22-047.js";
import { compiled as bt22048 } from "./BT22-048.js";
import { compiled as bt22049 } from "./BT22-049.js";
import { compiled as bt22050 } from "./BT22-050.js";
import { compiled as bt22051 } from "./BT22-051.js";
import { compiled as bt22052 } from "./BT22-052.js";
import { compiled as bt22053 } from "./BT22-053.js";
import { compiled as bt22054 } from "./BT22-054.js";
import { compiled as bt22055 } from "./BT22-055.js";
import { compiled as bt22056 } from "./BT22-056.js";
import { compiled as bt22057 } from "./BT22-057.js";
import { compiled as bt22058 } from "./BT22-058.js";
import { compiled as bt22059 } from "./BT22-059.js";
import { compiled as bt22060 } from "./BT22-060.js";
import { compiled as bt22061 } from "./BT22-061.js";
import { compiled as bt22062 } from "./BT22-062.js";
import { compiled as bt22063 } from "./BT22-063.js";
import { compiled as bt22064 } from "./BT22-064.js";
import { compiled as bt22065 } from "./BT22-065.js";
import { compiled as bt22066 } from "./BT22-066.js";
import { compiled as bt22067 } from "./BT22-067.js";
import { compiled as bt22068 } from "./BT22-068.js";
import { compiled as bt22069 } from "./BT22-069.js";
import { compiled as bt22070 } from "./BT22-070.js";
import { compiled as bt22071 } from "./BT22-071.js";
import { compiled as bt22072 } from "./BT22-072.js";
import { compiled as bt22073 } from "./BT22-073.js";
import { compiled as bt22074 } from "./BT22-074.js";
import { compiled as bt22075 } from "./BT22-075.js";
import { compiled as bt22076 } from "./BT22-076.js";
import { compiled as bt22077 } from "./BT22-077.js";
import { compiled as bt22078 } from "./BT22-078.js";
import { compiled as bt22079 } from "./BT22-079.js";
import { compiled as bt22080 } from "./BT22-080.js";
import { compiled as bt22081 } from "./BT22-081.js";
import { compiled as bt22082 } from "./BT22-082.js";
import { compiled as bt22083 } from "./BT22-083.js";
import { compiled as bt22084 } from "./BT22-084.js";
import { compiled as bt22085 } from "./BT22-085.js";
import { compiled as bt22086 } from "./BT22-086.js";
import { compiled as bt22087 } from "./BT22-087.js";
import { compiled as bt22088 } from "./BT22-088.js";
import { compiled as bt22089 } from "./BT22-089.js";
import { compiled as bt22090 } from "./BT22-090.js";
import { compiled as bt22091 } from "./BT22-091.js";
import { compiled as bt22092 } from "./BT22-092.js";
import { compiled as bt22093 } from "./BT22-093.js";
import { compiled as bt22094 } from "./BT22-094.js";
import { compiled as bt22095 } from "./BT22-095.js";
import { compiled as bt22096 } from "./BT22-096.js";
import { compiled as bt22097 } from "./BT22-097.js";
import { compiled as bt22098 } from "./BT22-098.js";
import { compiled as bt22099 } from "./BT22-099.js";
import { compiled as bt22100 } from "./BT22-100.js";
import { compiled as bt22101 } from "./BT22-101.js";
import { compiled as bt22102 } from "./BT22-102.js";

const effectsPath = fileURLToPath(new URL("../../../../../packages/shared/src/effects/effects.json", import.meta.url));
const catalog = JSON.parse(readFileSync(effectsPath, "utf8")) as CompiledEffects;
const authoritative = {
  "BT22-001": bt22001,
  "BT22-002": bt22002,
  "BT22-003": bt22003,
  "BT22-004": bt22004,
  "BT22-005": bt22005,
  "BT22-006": bt22006,
  "BT22-007": bt22007,
  "BT22-008": bt22008,
  "BT22-009": bt22009,
  "BT22-010": bt22010,
  "BT22-011": bt22011,
  "BT22-012": bt22012,
  "BT22-013": bt22013,
  "BT22-014": bt22014,
  "BT22-015": bt22015,
  "BT22-016": bt22016,
  "BT22-017": bt22017,
  "BT22-018": bt22018,
  "BT22-019": bt22019,
  "BT22-020": bt22020,
  "BT22-021": bt22021,
  "BT22-022": bt22022,
  "BT22-023": bt22023,
  "BT22-024": bt22024,
  "BT22-025": bt22025,
  "BT22-026": bt22026,
  "BT22-027": bt22027,
  "BT22-028": bt22028,
  "BT22-029": bt22029,
  "BT22-030": bt22030,
  "BT22-031": bt22031,
  "BT22-032": bt22032,
  "BT22-033": bt22033,
  "BT22-034": bt22034,
  "BT22-035": bt22035,
  "BT22-036": bt22036,
  "BT22-037": bt22037,
  "BT22-038": bt22038,
  "BT22-039": bt22039,
  "BT22-040": bt22040,
  "BT22-041": bt22041,
  "BT22-042": bt22042,
  "BT22-043": bt22043,
  "BT22-044": bt22044,
  "BT22-045": bt22045,
  "BT22-046": bt22046,
  "BT22-047": bt22047,
  "BT22-048": bt22048,
  "BT22-049": bt22049,
  "BT22-050": bt22050,
  "BT22-051": bt22051,
  "BT22-052": bt22052,
  "BT22-053": bt22053,
  "BT22-054": bt22054,
  "BT22-055": bt22055,
  "BT22-056": bt22056,
  "BT22-057": bt22057,
  "BT22-058": bt22058,
  "BT22-059": bt22059,
  "BT22-060": bt22060,
  "BT22-061": bt22061,
  "BT22-062": bt22062,
  "BT22-063": bt22063,
  "BT22-064": bt22064,
  "BT22-065": bt22065,
  "BT22-066": bt22066,
  "BT22-067": bt22067,
  "BT22-068": bt22068,
  "BT22-069": bt22069,
  "BT22-070": bt22070,
  "BT22-071": bt22071,
  "BT22-072": bt22072,
  "BT22-073": bt22073,
  "BT22-074": bt22074,
  "BT22-075": bt22075,
  "BT22-076": bt22076,
  "BT22-077": bt22077,
  "BT22-078": bt22078,
  "BT22-079": bt22079,
  "BT22-080": bt22080,
  "BT22-081": bt22081,
  "BT22-082": bt22082,
  "BT22-083": bt22083,
  "BT22-084": bt22084,
  "BT22-085": bt22085,
  "BT22-086": bt22086,
  "BT22-087": bt22087,
  "BT22-088": bt22088,
  "BT22-089": bt22089,
  "BT22-090": bt22090,
  "BT22-091": bt22091,
  "BT22-092": bt22092,
  "BT22-093": bt22093,
  "BT22-094": bt22094,
  "BT22-095": bt22095,
  "BT22-096": bt22096,
  "BT22-097": bt22097,
  "BT22-098": bt22098,
  "BT22-099": bt22099,
  "BT22-100": bt22100,
  "BT22-101": bt22101,
  "BT22-102": bt22102,
};

describe("BT22 persisted IR", () => {
  it("contains exactly the authoritative BT22 card keys", () => {
    const persistedCardIds = Object.keys(catalog)
      .filter((cardId) => /^BT22-\d{3}$/.test(cardId))
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
