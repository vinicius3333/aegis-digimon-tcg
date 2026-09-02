import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { CompiledEffects } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled as bt24001 } from "./BT24-001.js";
import { compiled as bt24002 } from "./BT24-002.js";
import { compiled as bt24003 } from "./BT24-003.js";
import { compiled as bt24004 } from "./BT24-004.js";
import { compiled as bt24005 } from "./BT24-005.js";
import { compiled as bt24006 } from "./BT24-006.js";
import { compiled as bt24007 } from "./BT24-007.js";
import { compiled as bt24008 } from "./BT24-008.js";
import { compiled as bt24009 } from "./BT24-009.js";
import { compiled as bt24010 } from "./BT24-010.js";
import { compiled as bt24011 } from "./BT24-011.js";
import { compiled as bt24012 } from "./BT24-012.js";
import { compiled as bt24013 } from "./BT24-013.js";
import { compiled as bt24014 } from "./BT24-014.js";
import { compiled as bt24015 } from "./BT24-015.js";
import { compiled as bt24016 } from "./BT24-016.js";
import { compiled as bt24017 } from "./BT24-017.js";
import { compiled as bt24018 } from "./BT24-018.js";
import { compiled as bt24019 } from "./BT24-019.js";
import { compiled as bt24020 } from "./BT24-020.js";
import { compiled as bt24021 } from "./BT24-021.js";
import { compiled as bt24022 } from "./BT24-022.js";
import { compiled as bt24023 } from "./BT24-023.js";
import { compiled as bt24024 } from "./BT24-024.js";
import { compiled as bt24025 } from "./BT24-025.js";
import { compiled as bt24026 } from "./BT24-026.js";
import { compiled as bt24027 } from "./BT24-027.js";
import { compiled as bt24028 } from "./BT24-028.js";
import { compiled as bt24029 } from "./BT24-029.js";
import { compiled as bt24030 } from "./BT24-030.js";
import { compiled as bt24031 } from "./BT24-031.js";
import { compiled as bt24032 } from "./BT24-032.js";
import { compiled as bt24033 } from "./BT24-033.js";
import { compiled as bt24034 } from "./BT24-034.js";
import { compiled as bt24035 } from "./BT24-035.js";
import { compiled as bt24036 } from "./BT24-036.js";
import { compiled as bt24037 } from "./BT24-037.js";
import { compiled as bt24038 } from "./BT24-038.js";
import { compiled as bt24039 } from "./BT24-039.js";
import { compiled as bt24040 } from "./BT24-040.js";
import { compiled as bt24041 } from "./BT24-041.js";
import { compiled as bt24042 } from "./BT24-042.js";
import { compiled as bt24043 } from "./BT24-043.js";
import { compiled as bt24044 } from "./BT24-044.js";
import { compiled as bt24045 } from "./BT24-045.js";
import { compiled as bt24046 } from "./BT24-046.js";
import { compiled as bt24047 } from "./BT24-047.js";
import { compiled as bt24048 } from "./BT24-048.js";
import { compiled as bt24049 } from "./BT24-049.js";
import { compiled as bt24050 } from "./BT24-050.js";
import { compiled as bt24051 } from "./BT24-051.js";
import { compiled as bt24052 } from "./BT24-052.js";
import { compiled as bt24053 } from "./BT24-053.js";
import { compiled as bt24054 } from "./BT24-054.js";
import { compiled as bt24055 } from "./BT24-055.js";
import { compiled as bt24056 } from "./BT24-056.js";
import { compiled as bt24057 } from "./BT24-057.js";
import { compiled as bt24058 } from "./BT24-058.js";
import { compiled as bt24059 } from "./BT24-059.js";
import { compiled as bt24060 } from "./BT24-060.js";
import { compiled as bt24061 } from "./BT24-061.js";
import { compiled as bt24062 } from "./BT24-062.js";
import { compiled as bt24063 } from "./BT24-063.js";
import { compiled as bt24064 } from "./BT24-064.js";
import { compiled as bt24065 } from "./BT24-065.js";
import { compiled as bt24066 } from "./BT24-066.js";
import { compiled as bt24067 } from "./BT24-067.js";
import { compiled as bt24068 } from "./BT24-068.js";
import { compiled as bt24069 } from "./BT24-069.js";
import { compiled as bt24070 } from "./BT24-070.js";
import { compiled as bt24071 } from "./BT24-071.js";
import { compiled as bt24072 } from "./BT24-072.js";
import { compiled as bt24073 } from "./BT24-073.js";
import { compiled as bt24074 } from "./BT24-074.js";
import { compiled as bt24075 } from "./BT24-075.js";
import { compiled as bt24076 } from "./BT24-076.js";
import { compiled as bt24077 } from "./BT24-077.js";
import { compiled as bt24078 } from "./BT24-078.js";
import { compiled as bt24079 } from "./BT24-079.js";
import { compiled as bt24080 } from "./BT24-080.js";
import { compiled as bt24081 } from "./BT24-081.js";
import { compiled as bt24082 } from "./BT24-082.js";
import { compiled as bt24083 } from "./BT24-083.js";
import { compiled as bt24084 } from "./BT24-084.js";
import { compiled as bt24085 } from "./BT24-085.js";
import { compiled as bt24086 } from "./BT24-086.js";
import { compiled as bt24087 } from "./BT24-087.js";
import { compiled as bt24088 } from "./BT24-088.js";
import { compiled as bt24089 } from "./BT24-089.js";
import { compiled as bt24090 } from "./BT24-090.js";
import { compiled as bt24091 } from "./BT24-091.js";
import { compiled as bt24092 } from "./BT24-092.js";
import { compiled as bt24093 } from "./BT24-093.js";
import { compiled as bt24094 } from "./BT24-094.js";
import { compiled as bt24095 } from "./BT24-095.js";
import { compiled as bt24096 } from "./BT24-096.js";
import { compiled as bt24097 } from "./BT24-097.js";
import { compiled as bt24098 } from "./BT24-098.js";
import { compiled as bt24099 } from "./BT24-099.js";
import { compiled as bt24100 } from "./BT24-100.js";
import { compiled as bt24101 } from "./BT24-101.js";
import { compiled as bt24102 } from "./BT24-102.js";

const effectsPath = fileURLToPath(new URL("../../../../../packages/shared/src/effects/effects.json", import.meta.url));
const catalog = JSON.parse(readFileSync(effectsPath, "utf8")) as CompiledEffects;
const authoritative = {
  "BT24-001": bt24001,
  "BT24-002": bt24002,
  "BT24-003": bt24003,
  "BT24-004": bt24004,
  "BT24-005": bt24005,
  "BT24-006": bt24006,
  "BT24-007": bt24007,
  "BT24-008": bt24008,
  "BT24-009": bt24009,
  "BT24-010": bt24010,
  "BT24-011": bt24011,
  "BT24-012": bt24012,
  "BT24-013": bt24013,
  "BT24-014": bt24014,
  "BT24-015": bt24015,
  "BT24-016": bt24016,
  "BT24-017": bt24017,
  "BT24-018": bt24018,
  "BT24-019": bt24019,
  "BT24-020": bt24020,
  "BT24-021": bt24021,
  "BT24-022": bt24022,
  "BT24-023": bt24023,
  "BT24-024": bt24024,
  "BT24-025": bt24025,
  "BT24-026": bt24026,
  "BT24-027": bt24027,
  "BT24-028": bt24028,
  "BT24-029": bt24029,
  "BT24-030": bt24030,
  "BT24-031": bt24031,
  "BT24-032": bt24032,
  "BT24-033": bt24033,
  "BT24-034": bt24034,
  "BT24-035": bt24035,
  "BT24-036": bt24036,
  "BT24-037": bt24037,
  "BT24-038": bt24038,
  "BT24-039": bt24039,
  "BT24-040": bt24040,
  "BT24-041": bt24041,
  "BT24-042": bt24042,
  "BT24-043": bt24043,
  "BT24-044": bt24044,
  "BT24-045": bt24045,
  "BT24-046": bt24046,
  "BT24-047": bt24047,
  "BT24-048": bt24048,
  "BT24-049": bt24049,
  "BT24-050": bt24050,
  "BT24-051": bt24051,
  "BT24-052": bt24052,
  "BT24-053": bt24053,
  "BT24-054": bt24054,
  "BT24-055": bt24055,
  "BT24-056": bt24056,
  "BT24-057": bt24057,
  "BT24-058": bt24058,
  "BT24-059": bt24059,
  "BT24-060": bt24060,
  "BT24-061": bt24061,
  "BT24-062": bt24062,
  "BT24-063": bt24063,
  "BT24-064": bt24064,
  "BT24-065": bt24065,
  "BT24-066": bt24066,
  "BT24-067": bt24067,
  "BT24-068": bt24068,
  "BT24-069": bt24069,
  "BT24-070": bt24070,
  "BT24-071": bt24071,
  "BT24-072": bt24072,
  "BT24-073": bt24073,
  "BT24-074": bt24074,
  "BT24-075": bt24075,
  "BT24-076": bt24076,
  "BT24-077": bt24077,
  "BT24-078": bt24078,
  "BT24-079": bt24079,
  "BT24-080": bt24080,
  "BT24-081": bt24081,
  "BT24-082": bt24082,
  "BT24-083": bt24083,
  "BT24-084": bt24084,
  "BT24-085": bt24085,
  "BT24-086": bt24086,
  "BT24-087": bt24087,
  "BT24-088": bt24088,
  "BT24-089": bt24089,
  "BT24-090": bt24090,
  "BT24-091": bt24091,
  "BT24-092": bt24092,
  "BT24-093": bt24093,
  "BT24-094": bt24094,
  "BT24-095": bt24095,
  "BT24-096": bt24096,
  "BT24-097": bt24097,
  "BT24-098": bt24098,
  "BT24-099": bt24099,
  "BT24-100": bt24100,
  "BT24-101": bt24101,
  "BT24-102": bt24102,
};

describe("BT24 persisted IR", () => {
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
