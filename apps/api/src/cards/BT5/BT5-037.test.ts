import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-037.js";

describe("BT5-037 Gladimon", () => {
  it("adds a Warrior from security, recovers one card and preserves security size", async () => {
    const preferred: string[] = [];
    const s = setupEngine({ 0: { hand: [{ card: "BT5-037", as: "source" }], security: [
      { card: "BT5-042", as: "warrior" }, { card: "BT5-036", as: "otherSecurity" },
    ], deck: [{ card: "BT5-038", as: "recovery" }] } }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred });
    const player = s.state.players[0] as PlayerState;
    preferred.push(s.inst("warrior").instanceId);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some((card) => card.instanceId === s.inst("warrior").instanceId) && player.security.some((card) => card.instanceId === s.inst("recovery").instanceId));
    expect(player.security).toHaveLength(2);
    expect(player.deck).toHaveLength(0);
  });

  it("shows the whole security stack with identities while disabling non-Warriors", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT5-037", as: "gladimon" }],
        security: [
          { card: "BT5-042", as: "warrior" },
          { card: "BT1-009", as: "nonWarrior" },
        ],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("gladimon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: optional.decisionId,
      response: { kind: "optional", accept: true },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const payload = JSON.parse(s.state.pendingDecision!.payloadJson) as {
      candidateInstanceIds: string[];
      visibleInstanceIds: string[];
      visibleCards: Array<{ instanceId: string; cardId: string }>;
    };
    expect(payload.candidateInstanceIds).toEqual([s.inst("warrior").instanceId]);
    expect(payload.visibleInstanceIds).toEqual(expect.arrayContaining([
      s.inst("warrior").instanceId,
      s.inst("nonWarrior").instanceId,
    ]));
    expect(payload.visibleCards).toEqual(expect.arrayContaining([
      { instanceId: s.inst("warrior").instanceId, cardId: "BT5-042" },
      { instanceId: s.inst("nonWarrior").instanceId, cardId: "BT1-009" },
    ]));
  });
});
