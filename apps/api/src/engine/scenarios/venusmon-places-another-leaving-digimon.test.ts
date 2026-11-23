import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "#api/engine/testkit/harness";
import "#api/cards/index";

describe("Venusmon can place another Digimon that is leaving at the same time (Q5781)", () => {
  it("offers the other leaving TS Digimon as the bottom security card", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX13-024", as: "slayerdramon" }] },
        1: {
          battleArea: [
            { card: "BT24-040", as: "venusmon" },
            { card: "BT24-034", as: "aegiomon" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 12;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("slayerdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.seat === 1 && s.state.pendingDecision.kind === "chooseTargets");

    const { candidateInstanceIds } = JSON.parse(s.state.pendingDecision!.payloadJson) as {
      candidateInstanceIds: string[];
    };
    expect(candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("venusmon").permanentId, s.perm("aegiomon").permanentId]),
    );

    const pending = s.state.pendingDecision!;
    expect(pending.kind).toBe("chooseTargets");
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("aegiomon").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    const field = s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId);
    expect(field).toEqual(["BT24-040"]);
    expect(s.state.players[1]!.security.at(-1)?.cardId).toBe("BT24-034");
  });
});
