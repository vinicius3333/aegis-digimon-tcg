import { readFileSync } from "node:fs";
import { irNode } from "../../engine/testkit/irNode.js";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CompiledEffects } from "@aegis/shared";
import { compiled as bt25010 } from "./BT25-010.js";
import { compiled as bt25019 } from "./BT25-019.js";
import { compiled as bt25020 } from "./BT25-020.js";
import { compiled as bt25033 } from "./BT25-033.js";
import { compiled as bt25034 } from "./BT25-034.js";
import { compiled as bt25035 } from "./BT25-035.js";
import { compiled as bt25036 } from "./BT25-036.js";
import { compiled as bt25037 } from "./BT25-037.js";
import { compiled as bt25038 } from "./BT25-038.js";
import { compiled as bt25058 } from "./BT25-058.js";
import { compiled as bt25101 } from "./BT25-101.js";
import { compiled as bt25099 } from "./BT25-099.js";
import { compiled as bt25102 } from "./BT25-102.js";
import { compiled as bt25039 } from "./BT25-039.js";
import { compiled as bt25040 } from "./BT25-040.js";
import { compiled as bt25041 } from "./BT25-041.js";
import { compiled as bt25042 } from "./BT25-042.js";
import { compiled as bt25043 } from "./BT25-043.js";
import { compiled as bt25044 } from "./BT25-044.js";
import { compiled as bt25045 } from "./BT25-045.js";
import { compiled as bt25046 } from "./BT25-046.js";
import { compiled as bt25047 } from "./BT25-047.js";
import { compiled as bt25048 } from "./BT25-048.js";
import { compiled as bt25049 } from "./BT25-049.js";
import { compiled as bt25050 } from "./BT25-050.js";
import { compiled as bt25051 } from "./BT25-051.js";
import { compiled as bt25052 } from "./BT25-052.js";
import { compiled as bt25053 } from "./BT25-053.js";
import { compiled as bt25054 } from "./BT25-054.js";
import { compiled as bt25055 } from "./BT25-055.js";
import { compiled as bt25056 } from "./BT25-056.js";

const effectsPath = fileURLToPath(new URL("../../../../../packages/shared/src/effects/effects.json", import.meta.url));
const catalog = JSON.parse(readFileSync(effectsPath, "utf8")) as CompiledEffects;

describe("BT25 persisted IR", () => {
  it.each([
    ["BT25-099", bt25099, "Alliance", "Piercing", "Bacchusmon"],
    ["BT25-102", bt25102, "Blocker", "Link", "Vulcanusmon"],
  ] as const)(
    "keeps %s synchronized with its authoritative module",
    (cardId, compiled, baseKeyword, conditionalKeyword, namedCard) => {
      expect(catalog[cardId]).toEqual(compiled);
      expect(catalog[cardId]?.coverage).toBe("full");
      expect(catalog[cardId]?.residual).toEqual([]);

      const effects = catalog[cardId]!.effects;
      const waiver = effects
        .find((effect) => effect.trigger === "Static")!
        .actions.find((action) => action.kind === "WaiveColorRequirement");
      expect(waiver?.condition?.filter).toEqual({ zone: "security", faceUp: true, controllerDefault: "mine" });

      const grants = effects.find((effect) => effect.trigger === "YourTurn" || effect.trigger === "AllTurns")!.actions;
      expect(grants.some((action) => irNode(action).keyword?.keyword === baseKeyword)).toBe(true);
      expect(
        grants.some(
          (action) =>
            irNode(action).keyword?.keyword === conditionalKeyword &&
            JSON.stringify(action.condition?.filter?.nameOrTrait).includes(namedCard),
        ),
      ).toBe(true);

      const main = effects.find((effect) => effect.trigger === "Main")!;
      expect(main.actions.some((action) => action.kind === "PlayWithoutCost" && action.reduceCostBy === 3)).toBe(true);
    },
  );

  it.each([
    ["BT25-010", bt25010],
    ["BT25-019", bt25019],
    ["BT25-020", bt25020],
    ["BT25-033", bt25033],
    ["BT25-034", bt25034],
    ["BT25-035", bt25035],
    ["BT25-036", bt25036],
    ["BT25-037", bt25037],
    ["BT25-038", bt25038],
    ["BT25-042", bt25042],
    ["BT25-043", bt25043],
    ["BT25-044", bt25044],
    ["BT25-045", bt25045],
    ["BT25-046", bt25046],
    ["BT25-047", bt25047],
    ["BT25-048", bt25048],
    ["BT25-049", bt25049],
    ["BT25-050", bt25050],
    ["BT25-051", bt25051],
    ["BT25-052", bt25052],
    ["BT25-053", bt25053],
    ["BT25-054", bt25054],
    ["BT25-055", bt25055],
    ["BT25-056", bt25056],
    ["BT25-058", bt25058],
    ["BT25-101", bt25101],
  ] as const)("keeps the stale-gap record %s synchronized", (cardId, compiled) => {
    expect(catalog[cardId]).toEqual(compiled);
    expect(catalog[cardId]?.coverage).toBe("full");
    expect(catalog[cardId]?.residual).toEqual([]);
  });

  it("keeps the corrected BT25-039 security, replacement, and evolution IR synchronized", () => {
    expect(catalog["BT25-039"]).toEqual(bt25039);
    expect(catalog["BT25-039"]?.coverage).toBe("full");
    expect(catalog["BT25-039"]?.residual).toEqual([]);
  });

  it("keeps the corrected BT25-040 security-cost IR synchronized", () => {
    expect(catalog["BT25-040"]).toEqual(bt25040);
    expect(catalog["BT25-040"]?.coverage).toBe("full");
    expect(catalog["BT25-040"]?.residual).toEqual([]);
  });

  it("keeps the corrected BT25-041 play-or-use and inherited IR synchronized", () => {
    expect(catalog["BT25-041"]).toEqual(bt25041);
    expect(catalog["BT25-041"]?.coverage).toBe("full");
    expect(catalog["BT25-041"]?.residual).toEqual([]);
  });
});
