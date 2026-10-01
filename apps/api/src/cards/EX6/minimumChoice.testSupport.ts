import { expect } from "vitest";
import { drainMicrotasks, settle, type EngineSetup } from "../../engine/testkit/harness.js";

/**
 * Play `alias` from hand and answer every card selection with the fewest cards it allows, so a
 * "must add as many as possible" clause shows up as a selection floor rather than an
 * auto-responder picking the maximum.
 */
export async function playTakingMinimum(s: EngineSetup, alias: string): Promise<void> {
  const instanceId = s.inst(alias).instanceId;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId })).toEqual({ ok: true });
  const onBoard = () =>
    s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId);
  for (let answered = 0; answered < 10; answered += 1) {
    await settle(() => s.state.pendingDecision !== undefined || onBoard());
    await drainMicrotasks(100);
    const pending = s.state.pendingDecision;
    if (pending === undefined) break;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    expect(request.kind).toBe("selectCards");
    const candidates: string[] = request.options?.candidateInstanceIds ?? [];
    const minimum: number = request.options?.min ?? 0;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: candidates.slice(0, minimum) },
      }),
    ).toEqual({ ok: true });
  }
  await settle(() => s.state.pendingDecision === undefined && onBoard());
}
