import { expect } from "vitest";
import { setupEngine, settle, type BoardSpec, type EngineSetup } from "../../engine/testkit/harness.js";

export interface OfferedTrigger {
  key: string;
  cardId: string;
  description: string;
}

export function offeredTriggers(s: EngineSetup): OfferedTrigger[] {
  const options = s.decisions.at(-1)!.req.options!;
  return options.triggerKeys!.map((key, index) => ({
    key,
    cardId: options.triggerCardIds![index]!,
    description: options.triggerDescriptions?.[index] ?? "",
  }));
}

export async function answerOrder(s: EngineSetup, key: string) {
  const pending = s.state.pendingDecision!;
  expect(
    s.engine.applyIntent(s.decisions.at(-1)!.seat, {
      type: "respondDecision",
      decisionId: pending.decisionId,
      response: { kind: "orderTriggers", order: [key] },
    }),
  ).toEqual({ ok: true });
}

/**
 * Q: this card's effects trigger simultaneously when it is played; in what order do they
 * activate? A: the player chooses the order.
 *
 * Plays `alias` from seat 0's hand, checks every one of `cardId`'s simultaneous triggers is
 * offered in one `orderTriggers` choice, picks the one offered LAST, and checks it resolves
 * before the others.
 */
export async function expectPlayerOrdersSimultaneousTriggers(
  board: BoardSpec,
  alias: string,
  cardId: string,
  expectedCount: number,
): Promise<EngineSetup> {
  const s = setupEngine(board, {
    autoAcceptOptional: true,
    autoSelectCards: true,
    autoChooseOption: true,
    autoOrderTriggers: false,
  });
  s.state.memory = 20;
  await s.ready();

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
  await settle(() => s.state.pendingDecision?.kind === "orderTriggers");

  const offered = offeredTriggers(s).filter((trigger) => trigger.cardId === cardId);
  expect(offered).toHaveLength(expectedCount);
  const chosen = offered.at(-1)!;
  await answerOrder(s, chosen.key);

  const resolvedFromCard = () =>
    s.events.flatMap((event) =>
      event.kind === "effectResolved" && event.sourceCardId === cardId ? [event.description] : [],
    );
  await answerRemainingOrdersUntil(s, () => resolvedFromCard().length >= expectedCount);

  const resolved = resolvedFromCard();
  expect(resolved).toHaveLength(expectedCount);
  expect(resolved[0]).toBe(chosen.description);
  expect(new Set(resolved)).toEqual(new Set(offered.map(({ description }) => description)));
  return s;
}

/** Answer every further `orderTriggers` prompt with its first offered entry until `done` holds. */
export async function answerRemainingOrdersUntil(s: EngineSetup, done: () => boolean) {
  for (let step = 0; step < 20 && !done(); step += 1) {
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers" || done(), 200);
    if (s.state.pendingDecision?.kind === "orderTriggers") await answerOrder(s, offeredTriggers(s)[0]!.key);
  }
}
