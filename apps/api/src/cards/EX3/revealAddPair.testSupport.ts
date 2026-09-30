import { expect } from "vitest";
import { settle, type EngineSetup } from "../../engine/testkit/harness.js";

/**
 * Answer each mandatory "add 1 X and 1 Y" selection in order, proving first that the
 * selection cannot be declined while its category was revealed.
 */
export async function answerMandatoryPair(s: EngineSetup, aliases: string[]): Promise<void> {
  for (const alias of aliases) {
    const instanceId = s.inst(alias).instanceId;
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const choice = s.state.pendingDecision!;
    const options = JSON.parse(choice.payloadJson) as { candidateInstanceIds?: string[]; min?: number };
    expect(options.candidateInstanceIds).toContain(instanceId);
    expect(options.min).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: choice.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: choice.decisionId,
        response: { kind: "selectCards", instanceIds: [instanceId] },
      }),
    ).toEqual({ ok: true });
  }
  await settle(() => s.state.pendingDecision === undefined);
}
