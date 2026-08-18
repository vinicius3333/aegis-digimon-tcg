import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-008.js";

describe("BT10-008 Shoutmon", () => {
  it("adds one Xros Heart Digimon and Tamer from the top three cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT10-008", as: "source" }], deck: [
      { card: "BT10-034", as: "digimon" }, { card: "BT10-087", as: "tamer" }, "BT10-010",
    ] } }, { autoSelectCards: true });
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => player.hand.some(c => c.instanceId === s.inst("digimon").instanceId));
    expect(player.hand.some(c => c.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(player.deck).toHaveLength(1);
  });

  it("must add both eligible Xros Heart card kinds when both are revealed (Q1934)", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT10-008", as: "source" }],
        deck: [
          { card: "BT10-034", as: "digimon" },
          { card: "BT10-087", as: "tamer" },
          { card: "BT1-010", as: "rest" },
        ],
      },
    }, { autoOrderTriggers: true, autoOrderCards: true });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("source").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const digimonDecision = s.state.pendingDecision!;
    const digimonRequest = s.decisions.find(({ req }) => req.decisionId === digimonDecision.decisionId)!.req;
    expect(digimonRequest.sourceCardId).toBe("BT10-008");
    expect(digimonRequest.options).toMatchObject({
      candidateInstanceIds: [s.inst("digimon").instanceId],
      visibleInstanceIds: [
        s.inst("digimon").instanceId,
        s.inst("tamer").instanceId,
        s.inst("rest").instanceId,
      ],
      min: 1,
      max: 1,
      timing: "OnPlay",
    });
    expect(digimonRequest.options?.visibleCards).toEqual([
      { instanceId: s.inst("digimon").instanceId, cardId: "BT10-034" },
      { instanceId: s.inst("tamer").instanceId, cardId: "BT10-087" },
      { instanceId: s.inst("rest").instanceId, cardId: "BT1-010" },
    ]);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: digimonDecision.decisionId,
      response: { kind: "selectCards", instanceIds: [] },
    })).toEqual({ ok: false, reason: "decision-pending" });
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: digimonDecision.decisionId,
      response: { kind: "selectCards", instanceIds: [s.inst("digimon").instanceId] },
    })).toEqual({ ok: true });

    await settle(() =>
      s.state.pendingDecision?.kind === "selectCards" &&
      s.state.pendingDecision.decisionId !== digimonDecision.decisionId,
    );
    const tamerDecision = s.state.pendingDecision!;
    const tamerRequest = s.decisions.find(({ req }) => req.decisionId === tamerDecision.decisionId)!.req;
    expect(tamerRequest.sourceCardId).toBe("BT10-008");
    expect(tamerRequest.options).toMatchObject({
      candidateInstanceIds: [s.inst("tamer").instanceId],
      min: 1,
      max: 1,
      timing: "OnPlay",
    });
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: tamerDecision.decisionId,
      response: { kind: "selectCards", instanceIds: [s.inst("tamer").instanceId] },
    })).toEqual({ ok: true });

    await settle(() =>
      s.state.pendingDecision === undefined &&
      s.state.players[0]!.deck.length === 1,
    );

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining([
      s.inst("digimon").instanceId,
      s.inst("tamer").instanceId,
    ]));
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("rest").instanceId,
    ]);
  });

  it("adds the only eligible kind and rejects Digimon/Tamers without Xros Heart (Q1932/Q1933)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-008", as: "source" }],
          deck: [
            { card: "BT10-034", as: "eligibleDigimon" },
            { card: "BT1-010", as: "plainDigimon" },
            { card: "BT1-089", as: "plainTamer" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("source").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.some(({ instanceId }) =>
        instanceId === s.inst("eligibleDigimon").instanceId
      ) && s.state.players[0]!.deck.length === 2
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
      s.inst("eligibleDigimon").instanceId,
    );
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("plainDigimon").instanceId,
        s.inst("plainTamer").instanceId,
      ]),
    );
  });

  it("may save itself under one of its Tamers after deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-087", as: "tamer" },
          { card: "BT10-008", as: "deleted" },
        ],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true });
    const deletedInstanceId = s.perm("deleted").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("deleted").permanentId])).toBe(1);
    await settle(() => s.perm("tamer").stack.some((card) => card.instanceId === deletedInstanceId));

    expect(s.perm("tamer").stack.some((card) => card.instanceId === deletedInstanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === deletedInstanceId)).toBe(false);
  });

  it("grants inherited Rush only when the host has Shoutmon in its name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-013", as: "shoutmonHost", under: ["BT10-008"] },
          { card: "BT10-034", as: "otherHost", under: ["BT10-008"] },
        ],
      },
    }, { autoOrderTriggers: true });

    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("shoutmonHost"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("otherHost"), "Rush")).toBe(false);
  });
});
