import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-033.js";

describe("BT13-033 MirageGaogamon: Burst Mode", () => {
  it("registers Burst Digivolve, evolution bounce/memory, and the exact attack cost", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      {
        cost: 0,
        isAlternate: true,
        namesExact: ["MirageGaogamon"],
        burstDigivolve: { returnTamerNamesExact: ["Thomas H. Norstein"] },
      },
    ]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Return", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, to: "hand" },
        { kind: "GainMemory", amount: 1, scaling: { per: 4, unit: "cards" } },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        expect.objectContaining({
          kind: "Unsuspend",
          condition: expect.objectContaining({
            kind: "zoneCount",
            seat: "opponent",
            zone: "hand",
            op: "gte",
            value: 9,
          }),
          cost: expect.objectContaining({
            kind: "return",
            to: "deckBottom",
            leaveInZone: 8,
            selectionHidden: true,
            ownerInspectsSelection: true,
            orderReturnedCards: true,
          }),
        }),
      ],
    });
  });

  it("Burst Digivolves for 0 by returning its controller's Thomas and trashes the prior top at turn end", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT13-031", as: "base" },
          { card: "BT13-097", as: "thomas" },
        ],
        hand: [{ card: "BT13-033", as: "burst" }],
      },
      1: { battleArea: [{ card: "BT13-021", as: "opponent" }] },
    });
    s.state.memory = 3;
    const priorTopId = s.perm("base").topCard.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-033");

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT13-097")).toBe(true);
    expect(s.perm("base").burstDigivolvePendingTrash).toBe(true);

    await advance(s.engine).fireGlobal(EffectTiming.OnEndTurn);
    expect(s.perm("base").stack.some(({ instanceId }) => instanceId === priorTopId)).toBe(false);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === priorTopId)).toBe(true);
  });

  it("cannot pay Burst Digivolve with an opponent's Thomas (Q2284)", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-031", as: "base" }],
        hand: [{ card: "BT13-033", as: "burst" }],
      },
      1: { battleArea: [{ card: "BT13-097", as: "opponent-thomas" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[1]!.battleArea).toContain(s.perm("opponent-thomas"));
  });

  it("rejects the longer MirageGaogamon: Burst Mode as a Burst base even with payable Thomas", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-033", as: "long-base" }],
        hand: [{ card: "BT13-033", as: "burst" }, { card: "BT13-097", as: "thomas" }],
      },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("long-base").permanentId,
        instanceId: s.inst("burst").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("long-base").topCard.cardId).toBe("BT13-033");
    expect(s.state.players[0]!.hand).toContain(s.inst("burst"));
    expect(s.state.players[0]!.hand).toContain(s.inst("thomas"));
  });

  it("returns an opposing Digimon, then gains memory from the resulting hand size", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-031", as: "base" }],
        hand: [{ card: "BT13-033", as: "burst" }],
      },
      1: {
        battleArea: [{ card: "BT13-021", as: "target" }],
        hand: Array.from({ length: 7 }, () => "BT1-001"),
      },
    });
    s.state.memory = 10;
    const targetTop = s.perm("target").topCard;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("burst").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.includes(targetTop));

    expect(s.state.players[1]!.hand).toHaveLength(8);
    expect(s.state.memory).toBe(7);
  });

  it("lets the activator select/order opaque positions, privately shows the owner, and preserves exact bottom order (Q2285/Q2286)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-033", as: "burst" }] },
        1: {
          hand: Array.from({ length: 11 }, (_, index) => ({ card: `BT13-0${21 + index}`, as: `hand-${index}` })),
          deck: ["BT1-001"],
          security: ["BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoOrderCards: false },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("burst").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req, seat }) => req.kind === "selectCards" && seat === 0));

    const activatorSelection = s.decisions.find(({ req, seat }) => req.kind === "selectCards" && seat === 0)!.req;
    expect(activatorSelection.options?.visibleCards ?? []).toEqual([]);
    const chosen = [s.inst("hand-8").instanceId, s.inst("hand-1").instanceId, s.inst("hand-4").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: activatorSelection.decisionId,
        response: { kind: "selectCards", instanceIds: chosen },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.decisions.some(({ req, seat }) => req.kind === "selectCards" && seat === 1));
    const ownerInspection = s.decisions.find(({ req, seat }) => req.kind === "selectCards" && seat === 1)!.req;
    expect(ownerInspection.options).toMatchObject({
      candidateInstanceIds: [],
      visibleInstanceIds: chosen,
      min: 0,
      max: 0,
    });
    expect(ownerInspection.options?.visibleCards).toEqual([
      { instanceId: s.inst("hand-1").instanceId, cardId: "BT13-022" },
      { instanceId: s.inst("hand-4").instanceId, cardId: "BT13-025" },
      { instanceId: s.inst("hand-8").instanceId, cardId: "BT13-029" },
    ]);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: ownerInspection.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.decisions.some(({ req }) => req.kind === "orderCards"));
    const activatorOrderDecision = s.decisions.find(({ req }) => req.kind === "orderCards")!;
    const activatorOrder = activatorOrderDecision.req;
    expect(activatorOrderDecision.seat).toBe(0);
    expect(activatorOrder.options?.candidateInstanceIds).toEqual(chosen);
    expect(activatorOrder.options?.visibleCards ?? []).toEqual([]);
    const exactOrder = [s.inst("hand-4").instanceId, s.inst("hand-8").instanceId, s.inst("hand-1").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: activatorOrder.decisionId,
        response: { kind: "orderCards", order: exactOrder },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.length === 8 && !s.perm("burst").isSuspended);

    expect(s.state.players[1]!.hand).toHaveLength(8);
    expect(s.state.players[1]!.deck.slice(-3).map(({ cardId }) => cardId)).toEqual([
      "BT13-025",
      "BT13-029",
      "BT13-022",
    ]);
    expect(s.perm("burst").isSuspended).toBe(false);
  });

  it("allows the attack effect to be declined without moving hand cards or unsuspending", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-033", as: "burst" }] },
        1: { hand: Array.from({ length: 10 }, () => "BT13-021"), security: ["BT1-002"] },
      },
      { autoDeclineOptional: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("burst").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "securityChecked"));

    expect(s.state.players[1]!.hand).toHaveLength(10);
    expect(s.perm("burst").isSuspended).toBe(true);
  });

  it("does not offer the attack effect at eight opposing hand cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-033", as: "burst" }] },
      1: { hand: Array.from({ length: 8 }, () => "BT13-021"), security: ["BT1-002"] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("burst").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "securityChecked"));

    expect(s.state.players[1]!.hand).toHaveLength(8);
    expect(s.perm("burst").isSuspended).toBe(true);
  });
});
