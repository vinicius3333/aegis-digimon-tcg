import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CompiledEffects } from "@aegis/shared";
import { compiled as bt25099 } from "./BT25-099.js";
import { compiled as bt25102 } from "./BT25-102.js";

const effectsPath = fileURLToPath(
  new URL("../../../../../packages/shared/src/effects/effects.json", import.meta.url),
);
const catalog = JSON.parse(readFileSync(effectsPath, "utf8")) as CompiledEffects;

describe("BT25 persisted IR", () => {
  it.each([
    ["BT25-099", bt25099, "Alliance", "Piercing", "Bacchusmon"],
    ["BT25-102", bt25102, "Blocker", "Link", "Vulcanusmon"],
  ] as const)("keeps %s synchronized with its authoritative module", (cardId, compiled, baseKeyword, conditionalKeyword, namedCard) => {
    expect(catalog[cardId]).toEqual(compiled);
    expect(catalog[cardId]?.coverage).toBe("full");
    expect(catalog[cardId]?.residual).toEqual([]);

    const effects = catalog[cardId]!.effects;
    const waiver = effects.find((effect) => effect.trigger === "Static")!.actions.find(
      (action) => action.kind === "WaiveColorRequirement",
    );
    expect(waiver?.condition?.filter).toEqual({ zone: "security", faceUp: true, controllerDefault: "mine" });

    const grants = effects.find((effect) => effect.trigger === "YourTurn" || effect.trigger === "AllTurns")!.actions;
    expect(grants.some((action) => action.keyword?.keyword === baseKeyword)).toBe(true);
    expect(
      grants.some(
        (action) =>
          action.keyword?.keyword === conditionalKeyword &&
          JSON.stringify(action.condition?.filter?.nameOrTrait).includes(namedCard),
      ),
    ).toBe(true);

    const main = effects.find((effect) => effect.trigger === "Main")!;
    expect(main.actions.some((action) => action.kind === "PlayWithoutCost" && action.costReduction === 3)).toBe(true);
  });
});
