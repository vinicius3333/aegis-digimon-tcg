import { describe, expect, it } from "vitest";
import type { Action } from "@aegis/shared/effects/ir/actions/action";
import { allCards } from "@aegis/shared/cards/registry";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter/compiledCards";
import "#api/cards/index";

const useRequirementCardIds = allCards()
  .filter((card) =>
    [card.effectText, card.optionEffect, card.securityEffectText].some((text) => /Use Req\./.test(text ?? "")),
  )
  .map((card) => card.cardId);

function findColorWaivers(cardId: string): Action[] {
  return (runtimeCompiledCard(cardId)?.effects ?? []).flatMap((effect) =>
    effect.actions.filter((action) => action.kind === "WaiveColorRequirement"),
  );
}

describe("Use Req. counts specified cards anywhere on the field", () => {
  it("covers every printed Use Req. card", () => {
    expect(useRequirementCardIds.length).toBeGreaterThan(40);
  });

  it.each(useRequirementCardIds)("%s reads the battle and breeding areas for its waiver", (cardId) => {
    const waivers = findColorWaivers(cardId);
    expect(waivers.length).toBeGreaterThan(0);
    for (const waiver of waivers) {
      expect(waiver.condition).toMatchObject({ filter: { zone: expect.arrayContaining(["battleArea", "breeding"]) } });
    }
  });
});
