import { expect, it, vi } from "vitest";
import { requireCardDefinition, type CardEffect } from "@aegis/shared";
import type { EffectContext } from "./EffectContext.js";
import { runEffect } from "./interpreter/effect.js";
import { setupEngine } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";

it.each([false, true])("a reused unseeded context commits only its declared clause: fizzled=%s", async (fizzled) => {
  const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "source" }] } });
  s.state.memory = 10;
  const optional = vi.fn<EffectContext["ask"]["optional"]>(async () => false);
  const ctx = {
    source: observe(s.engine).cardSource(s.perm("source")),
    trigger: {},
    declaredProcessingCondition: true,
    game: { state: s.state, definitionOf: (card: { cardId: string }) => requireCardDefinition(card.cardId) },
    fx: {
      gainMemory: (amount: number) => {
        s.state.memory += amount;
      },
    },
    ask: { optional },
  } as unknown as EffectContext;
  const effect: CardEffect = {
    trigger: "Main",
    actions: [
      {
        kind: "CostGatedBlock",
        optional: true,
        abortOnDecline: true,
        cost: { kind: "payMemory", memory: 2 },
        actions: [],
      },
    ],
  };
  await runEffect(ctx, fizzled ? { ...effect, condition: { kind: "ifThisEffectDigivolved" } } : effect);
  const expectedMemory = fizzled ? 10 : 8;
  expect(s.state.memory).toBe(expectedMemory);
  expect(optional).not.toHaveBeenCalled();
  // A second effect resolution must offer its own choice on the original context.
  await runEffect(ctx, effect);
  expect(optional).toHaveBeenCalledTimes(1);
  expect(s.state.memory).toBe(expectedMemory);
});
