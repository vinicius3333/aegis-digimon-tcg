import { EffectDuration } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("App Fusion linked-card placement regression (BT25-036)", () => {
  it("moves the qualifying link above the old top and removes it from linked cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-051", as: "host", linked: [{ card: "EX10-024", as: "link" }] }],
          hand: [{ card: "BT25-036", as: "result" }],
          deck: [{ card: "BT1-010", as: "fusionDraw" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(4000);

    const fused = await advance(s.engine).verb.appFuseInto(s.perm("host").permanentId, s.inst("result").instanceId);

    expect(fused?.topCard.cardId).toBe("BT25-036");
    expect(fused?.stack.map(({ cardId }) => cardId)).toEqual(["BT26-051", "EX10-024"]);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("chooses the second eligible link and retains the unselected instance", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "EX10-024",
            as: "host",
            linked: [
              { card: "BT26-051", as: "firstLink" },
              { card: "BT26-051", as: "secondLink" },
            ],
          },
        ],
        hand: [{ card: "BT25-036", as: "result" }],
        deck: [{ card: "BT1-010", as: "fusionDraw" }],
      },
    });
    // Isolate fusion choice under a legal raised link limit through the sanctioned
    // mechanism setup seam; the card's normal one-link path is covered above.
    advance(s.engine).ledgers.continuous.addLinkMaxGrant(
      s.perm("host").permanentId,
      1,
      EffectDuration.UntilEachTurnEnd,
    );
    s.state.memory = 0;
    await s.ready();
    const fusedPromise = advance(s.engine).verb.appFuseInto(s.perm("host").permanentId, s.inst("result").instanceId);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    expect(decision.kind).toBe("selectCards");
    expect(JSON.parse(decision.payloadJson).candidateInstanceIds).toEqual([
      s.inst("firstLink").instanceId,
      s.inst("secondLink").instanceId,
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("secondLink").instanceId] },
      }),
    ).toEqual({ ok: true });
    const fused = await fusedPromise;
    expect(fused?.topCard.cardId).toBe("BT25-036");
    expect(fused?.stack.map((card) => card.instanceId)).toEqual([
      s.inst("host").instanceId,
      s.inst("secondLink").instanceId,
    ]);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([s.inst("firstLink").instanceId]);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("rejects a wrong-name material without changing state or consuming memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX10-024", as: "host", linked: [{ card: "EX10-024", as: "wrongName" }] }],
        hand: [{ card: "BT25-036", as: "result" }],
      },
    });
    s.state.memory = 0;
    await s.ready();
    const beforeLinked = s.perm("host").linked.map(({ instanceId }) => instanceId);
    const beforeHand = s.state.players[0]!.hand.map(({ instanceId }) => instanceId);

    const denied = await advance(s.engine).verb.appFuseInto(s.perm("host").permanentId, s.inst("result").instanceId);

    expect(denied).toBeUndefined();
    expect(s.state.memory).toBe(0);
    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual(beforeLinked);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(beforeHand);
  });
});
