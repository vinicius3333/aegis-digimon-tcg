import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { CompiledEffects } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled as bt23001 } from "./BT23-001.js";
import { compiled as bt23002 } from "./BT23-002.js";
import { compiled as bt23003 } from "./BT23-003.js";
import { compiled as bt23004 } from "./BT23-004.js";
import { compiled as bt23005 } from "./BT23-005.js";
import { compiled as bt23006 } from "./BT23-006.js";
import { compiled as bt23007 } from "./BT23-007.js";
import { compiled as bt23008 } from "./BT23-008.js";
import { compiled as bt23009 } from "./BT23-009.js";
import { compiled as bt23010 } from "./BT23-010.js";
import { compiled as bt23011 } from "./BT23-011.js";
import { compiled as bt23012 } from "./BT23-012.js";
import { compiled as bt23013 } from "./BT23-013.js";
import { compiled as bt23014 } from "./BT23-014.js";
import { compiled as bt23015 } from "./BT23-015.js";
import { compiled as bt23016 } from "./BT23-016.js";
import { compiled as bt23017 } from "./BT23-017.js";
import { compiled as bt23018 } from "./BT23-018.js";
import { compiled as bt23019 } from "./BT23-019.js";
import { compiled as bt23020 } from "./BT23-020.js";
import { compiled as bt23021 } from "./BT23-021.js";
import { compiled as bt23022 } from "./BT23-022.js";
import { compiled as bt23023 } from "./BT23-023.js";
import { compiled as bt23024 } from "./BT23-024.js";
import { compiled as bt23025 } from "./BT23-025.js";
import { compiled as bt23026 } from "./BT23-026.js";
import { compiled as bt23027 } from "./BT23-027.js";
import { compiled as bt23028 } from "./BT23-028.js";
import { compiled as bt23029 } from "./BT23-029.js";
import { compiled as bt23030 } from "./BT23-030.js";
import { compiled as bt23031 } from "./BT23-031.js";
import { compiled as bt23032 } from "./BT23-032.js";
import { compiled as bt23033 } from "./BT23-033.js";
import { compiled as bt23034 } from "./BT23-034.js";
import { compiled as bt23035 } from "./BT23-035.js";
import { compiled as bt23036 } from "./BT23-036.js";
import { compiled as bt23037 } from "./BT23-037.js";
import { compiled as bt23038 } from "./BT23-038.js";
import { compiled as bt23039 } from "./BT23-039.js";
import { compiled as bt23040 } from "./BT23-040.js";
import { compiled as bt23041 } from "./BT23-041.js";
import { compiled as bt23042 } from "./BT23-042.js";
import { compiled as bt23043 } from "./BT23-043.js";
import { compiled as bt23044 } from "./BT23-044.js";
import { compiled as bt23045 } from "./BT23-045.js";
import { compiled as bt23046 } from "./BT23-046.js";
import { compiled as bt23047 } from "./BT23-047.js";
import { compiled as bt23048 } from "./BT23-048.js";
import { compiled as bt23049 } from "./BT23-049.js";
import { compiled as bt23050 } from "./BT23-050.js";
import { compiled as bt23051 } from "./BT23-051.js";
import { compiled as bt23052 } from "./BT23-052.js";
import { compiled as bt23053 } from "./BT23-053.js";
import { compiled as bt23054 } from "./BT23-054.js";
import { compiled as bt23055 } from "./BT23-055.js";
import { compiled as bt23056 } from "./BT23-056.js";
import { compiled as bt23057 } from "./BT23-057.js";
import { compiled as bt23058 } from "./BT23-058.js";
import { compiled as bt23059 } from "./BT23-059.js";
import { compiled as bt23060 } from "./BT23-060.js";
import { compiled as bt23061 } from "./BT23-061.js";
import { compiled as bt23062 } from "./BT23-062.js";
import { compiled as bt23063 } from "./BT23-063.js";
import { compiled as bt23064 } from "./BT23-064.js";
import { compiled as bt23065 } from "./BT23-065.js";
import { compiled as bt23066 } from "./BT23-066.js";
import { compiled as bt23067 } from "./BT23-067.js";
import { compiled as bt23068 } from "./BT23-068.js";
import { compiled as bt23069 } from "./BT23-069.js";
import { compiled as bt23070 } from "./BT23-070.js";
import { compiled as bt23071 } from "./BT23-071.js";
import { compiled as bt23072 } from "./BT23-072.js";
import { compiled as bt23073 } from "./BT23-073.js";
import { compiled as bt23074 } from "./BT23-074.js";
import { compiled as bt23075 } from "./BT23-075.js";
import { compiled as bt23076 } from "./BT23-076.js";
import { compiled as bt23077 } from "./BT23-077.js";
import { compiled as bt23078 } from "./BT23-078.js";
import { compiled as bt23079 } from "./BT23-079.js";
import { compiled as bt23080 } from "./BT23-080.js";
import { compiled as bt23081 } from "./BT23-081.js";
import { compiled as bt23082 } from "./BT23-082.js";
import { compiled as bt23083 } from "./BT23-083.js";
import { compiled as bt23084 } from "./BT23-084.js";
import { compiled as bt23085 } from "./BT23-085.js";
import { compiled as bt23086 } from "./BT23-086.js";
import { compiled as bt23087 } from "./BT23-087.js";
import { compiled as bt23088 } from "./BT23-088.js";
import { compiled as bt23089 } from "./BT23-089.js";
import { compiled as bt23090 } from "./BT23-090.js";
import { compiled as bt23091 } from "./BT23-091.js";
import { compiled as bt23092 } from "./BT23-092.js";
import { compiled as bt23093 } from "./BT23-093.js";
import { compiled as bt23094 } from "./BT23-094.js";
import { compiled as bt23095 } from "./BT23-095.js";
import { compiled as bt23096 } from "./BT23-096.js";
import { compiled as bt23097 } from "./BT23-097.js";
import { compiled as bt23098 } from "./BT23-098.js";
import { compiled as bt23099 } from "./BT23-099.js";
import { compiled as bt23100 } from "./BT23-100.js";
import { compiled as bt23101 } from "./BT23-101.js";
import { compiled as bt23102 } from "./BT23-102.js";

const effectsPath = fileURLToPath(new URL("../../../../../packages/shared/src/effects/effects.json", import.meta.url));
const catalog = JSON.parse(readFileSync(effectsPath, "utf8")) as CompiledEffects;
const authoritative = {
  "BT23-001": bt23001,
  "BT23-002": bt23002,
  "BT23-003": bt23003,
  "BT23-004": bt23004,
  "BT23-005": bt23005,
  "BT23-006": bt23006,
  "BT23-007": bt23007,
  "BT23-008": bt23008,
  "BT23-009": bt23009,
  "BT23-010": bt23010,
  "BT23-011": bt23011,
  "BT23-012": bt23012,
  "BT23-013": bt23013,
  "BT23-014": bt23014,
  "BT23-015": bt23015,
  "BT23-016": bt23016,
  "BT23-017": bt23017,
  "BT23-018": bt23018,
  "BT23-019": bt23019,
  "BT23-020": bt23020,
  "BT23-021": bt23021,
  "BT23-022": bt23022,
  "BT23-023": bt23023,
  "BT23-024": bt23024,
  "BT23-025": bt23025,
  "BT23-026": bt23026,
  "BT23-027": bt23027,
  "BT23-028": bt23028,
  "BT23-029": bt23029,
  "BT23-030": bt23030,
  "BT23-031": bt23031,
  "BT23-032": bt23032,
  "BT23-033": bt23033,
  "BT23-034": bt23034,
  "BT23-035": bt23035,
  "BT23-036": bt23036,
  "BT23-037": bt23037,
  "BT23-038": bt23038,
  "BT23-039": bt23039,
  "BT23-040": bt23040,
  "BT23-041": bt23041,
  "BT23-042": bt23042,
  "BT23-043": bt23043,
  "BT23-044": bt23044,
  "BT23-045": bt23045,
  "BT23-046": bt23046,
  "BT23-047": bt23047,
  "BT23-048": bt23048,
  "BT23-049": bt23049,
  "BT23-050": bt23050,
  "BT23-051": bt23051,
  "BT23-052": bt23052,
  "BT23-053": bt23053,
  "BT23-054": bt23054,
  "BT23-055": bt23055,
  "BT23-056": bt23056,
  "BT23-057": bt23057,
  "BT23-058": bt23058,
  "BT23-059": bt23059,
  "BT23-060": bt23060,
  "BT23-061": bt23061,
  "BT23-062": bt23062,
  "BT23-063": bt23063,
  "BT23-064": bt23064,
  "BT23-065": bt23065,
  "BT23-066": bt23066,
  "BT23-067": bt23067,
  "BT23-068": bt23068,
  "BT23-069": bt23069,
  "BT23-070": bt23070,
  "BT23-071": bt23071,
  "BT23-072": bt23072,
  "BT23-073": bt23073,
  "BT23-074": bt23074,
  "BT23-075": bt23075,
  "BT23-076": bt23076,
  "BT23-077": bt23077,
  "BT23-078": bt23078,
  "BT23-079": bt23079,
  "BT23-080": bt23080,
  "BT23-081": bt23081,
  "BT23-082": bt23082,
  "BT23-083": bt23083,
  "BT23-084": bt23084,
  "BT23-085": bt23085,
  "BT23-086": bt23086,
  "BT23-087": bt23087,
  "BT23-088": bt23088,
  "BT23-089": bt23089,
  "BT23-090": bt23090,
  "BT23-091": bt23091,
  "BT23-092": bt23092,
  "BT23-093": bt23093,
  "BT23-094": bt23094,
  "BT23-095": bt23095,
  "BT23-096": bt23096,
  "BT23-097": bt23097,
  "BT23-098": bt23098,
  "BT23-099": bt23099,
  "BT23-100": bt23100,
  "BT23-101": bt23101,
  "BT23-102": bt23102,
};

describe("BT23 persisted IR", () => {
  it("contains exactly the authoritative BT23 card keys", () => {
    const persistedCardIds = Object.keys(catalog)
      .filter((cardId) => /^BT23-\d{3}$/.test(cardId))
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
