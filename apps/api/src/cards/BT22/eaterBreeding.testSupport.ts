import { expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

/**
 * Play BT22-079 Eater (Species Form) from hand for its 3 cost while a Digimon carrying
 * `copies` of `inheritedCardId` sits in `zone`. Each "reduce the play cost by 1?" prompt is
 * answered in turn from `answers` (a missing answer declines). Returns the memory left from 3
 * and how many reduction prompts were offered.
 */
export async function playEaterWithBreedingReductions(
  inheritedCardId: string,
  zone: "breeding" | "battleArea",
  answers: boolean[],
) {
  const host = { card: "BT1-009", as: "host", under: [inheritedCardId, inheritedCardId] };
  const s = setupEngine({
    0: {
      ...(zone === "breeding" ? { breeding: host } : { battleArea: [host] }),
      hand: [{ card: "BT22-079", as: "eater" }],
      deck: ["BT1-010"],
    },
  });
  s.state.memory = 3;
  await s.ready();
  const eaterId = s.inst("eater").instanceId;
  const pending = [...answers];

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: eaterId })).toEqual({ ok: true });
  const eaterInPlay = () =>
    s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === eaterId);
  while (!eaterInPlay()) {
    await settle(() => eaterInPlay() || s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision;
    if (decision?.kind !== "optional") break;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: pending.shift() ?? false },
      }),
    ).toEqual({ ok: true });
  }
  await settle(() => s.state.pendingDecision === undefined);

  return {
    memory: s.state.memory,
    reductionPrompts: s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === inheritedCardId)
      .length,
  };
}
