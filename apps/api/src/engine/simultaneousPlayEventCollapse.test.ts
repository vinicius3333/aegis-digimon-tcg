import { describe, expect, it } from "vitest";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";
import "../cards/EX3/EX3-030.js";
import "../cards/index.js";

function payload(s: EngineSetup): Record<string, unknown> {
  return JSON.parse(s.state.pendingDecision!.payloadJson) as Record<string, unknown>;
}

function candidates(s: EngineSetup): string[] {
  return (payload(s).candidateInstanceIds as string[] | undefined) ?? [];
}

describe("simultaneous-play event collapse", () => {
  it("publishes one whenPlayed activation with the full played set", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-056", under: [{ card: "EX3-030" }], as: "host" }],
        hand: [
          { card: "EX3-025", as: "firstDragon" },
          { card: "EX3-035", as: "secondDragon" },
          { card: "BT1-053", as: "unrelated" },
        ],
        deck: ["BT1-009", "BT1-012", "BT1-013", "BT1-014"],
      },
    });
    await s.ready();

    const play = advance(s.engine).verb.playInstances([
      s.inst("firstDragon").instanceId,
      s.inst("secondDragon").instanceId,
      s.inst("unrelated").instanceId,
    ]);
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const first = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("firstDragon").instanceId,
    )!;
    const second = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("secondDragon").instanceId,
    )!;
    const unrelated = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("unrelated").instanceId,
    )!;

    expect(
      s.decisions.filter(({ req }) => req.sourceCardId === "EX3-030" && req.kind === "chooseTargets"),
    ).toHaveLength(1);
    expect(candidates(s)).toEqual(expect.arrayContaining([first.permanentId, second.permanentId]));
    expect(candidates(s)).toHaveLength(2);
    expect(candidates(s)).not.toContain(unrelated.permanentId);
    expect(observe(s.engine).hasKeyword(first, "Rush")).toBe(false);

    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(decision.seat, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [second.permanentId] },
      }),
    ).toEqual({ ok: true });
    await play;
    await settle(() => observe(s.engine).hasKeyword(second, "Rush"));
    expect(observe(s.engine).hasKeyword(second, "Rush")).toBe(true);
  });
});
