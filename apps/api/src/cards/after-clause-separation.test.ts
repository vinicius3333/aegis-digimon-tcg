import type { Action, CompiledCard } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { compiled as bt26093 } from "./BT26/BT26-093.js";
import { compiled as bt26095 } from "./BT26/BT26-095.js";
import { compiled as ex11056 } from "./EX11/EX11-056.js";
import { compiled as ex11062 } from "./EX11/EX11-062.js";
import { compiled as ex13029 } from "./EX13/EX13-029.js";
import { compiled as ex13069 } from "./EX13/EX13-069.js";

const CARDS_WITH_AFTER = {
  "BT26-093": bt26093,
  "BT26-095": bt26095,
  "EX11-056": ex11056,
  "EX11-062": ex11062,
  "EX13-029": ex13029,
  "EX13-069": ex13069,
} satisfies Record<string, CompiledCard>;

function nestedActions(action: Action): readonly Action[] {
  if ("actions" in action && Array.isArray(action.actions)) return action.actions;
  return [];
}

function flattenActions(actions: readonly Action[]): Action[] {
  return actions.flatMap((action) => [action, ...flattenActions(nestedActions(action))]);
}

describe("printed After clause presentation", () => {
  it.each(Object.entries(CARDS_WITH_AFTER))("separates %s into initial and After decision text", (_cardId, card) => {
    const actions = card.effects.flatMap((effect) => flattenActions(effect.actions));
    const authoredParts = actions.flatMap((action) =>
      "effectTextPart" in action && typeof action.effectTextPart === "string" ? [action.effectTextPart] : [],
    );

    expect(authoredParts.some((part) => !part.trimStart().startsWith("After,"))).toBe(true);
    expect(authoredParts.some((part) => part.trimStart().startsWith("After,"))).toBe(true);
  });
});
