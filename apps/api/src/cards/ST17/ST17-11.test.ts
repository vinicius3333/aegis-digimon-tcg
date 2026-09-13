import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-11 Double Typhoon", () => {
  it("adds a green Digimon and green Tamer from the top three, bottoms the rest, and enters the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-03" }],
          hand: [{ card: "ST17-11", as: "option" }],
          deck: ["ST17-03", "ST17-10", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-11"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST17-03")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST17-10")).toBe(true);
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("requires both the Digimon and Tamer selections when both categories are revealed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-03" }],
          hand: [{ card: "ST17-11", as: "option" }],
          deck: [
            { card: "ST17-03", as: "revealedDigimon" },
            { card: "ST17-10", as: "revealedTamer" },
            { card: "BT1-009", as: "remainder" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const firstDecision = s.state.pendingDecision!;
    expect(firstDecision.kind).toBe("selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    expect(s.state.pendingDecision?.decisionId).toBe(firstDecision.decisionId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealedDigimon").instanceId)).toBe(
      false,
    );

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: firstDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("revealedDigimon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const secondDecision = s.state.pendingDecision!;
    expect(secondDecision.kind).toBe("selectCards");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: secondDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("revealedTamer").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealedDigimon").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealedTamer").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("remainder").instanceId]);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-11")).toBe(true);
  });

  it("suspends two opposing Digimon and enters the battle area from Security in a real attack", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "ST17-11", as: "option" }, "BT1-009"] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first" },
            { card: "BT1-010", as: "second" },
          ],
          deck: ["BT1-010", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-11"));

    expect(s.perm("first").isSuspended).toBe(true);
    expect(s.perm("second").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-11")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("does not add a non-green Tamer revealed among the top three", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-03" }],
          hand: [{ card: "ST17-11", as: "option" }],
          // ST17-03 is the legal green Digimon; BT1-085 is a red Tamer and
          // must remain in the deck; BT1-009 is the unrelated remainder.
          deck: ["ST17-03", "BT1-085", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId, useAs: "option" } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-11"));

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "ST17-03")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-085")).toBe(false);
    expect(s.state.players[0]!.deck.some((card) => card.cardId === "BT1-085")).toBe(true);
  });

  it("Delay plays an exact Terriermon/Lopmon name and rejects near-name Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-11", as: "option" }],
          hand: [
            { card: "ST17-02", as: "terriermon" },
            { card: "ST17-03", as: "lopmon" },
            { card: "BT5-046", as: "nearName" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    const optionId = s.inst("option").instanceId;
    s.state.memory = 4;

    const [delay] = JSON.parse(s.perm("option").activatableEffectsJson) as Array<{ effectKey: string }>;
    expect(delay).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("option").instanceId,
        effectKey: delay!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    expect(decision.kind).toBe("selectCards");
    const delayCandidates = s.decisions.at(-1)?.req.options?.candidateInstanceIds ?? [];
    expect(delayCandidates).toHaveLength(2);
    expect(delayCandidates).toEqual(
      expect.arrayContaining([s.inst("terriermon").instanceId, s.inst("lopmon").instanceId]),
    );
    expect(delayCandidates).not.toContain(s.inst("nearName").instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("terriermon").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-02"));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-02")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nearName").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-11")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.memory).toBe(4);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
