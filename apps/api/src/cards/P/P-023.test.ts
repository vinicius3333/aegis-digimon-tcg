import { describe, it, expect } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-023.js";

// A3 for P-023 (Patamon's Confession, Option) — [Main] if you have [T.K. Takaishi] in play, place
// 1 of your [Patamon] at the bottom of your security stack face down, then trash that Digimon's
// digivolution cards. source: documented behavior.
//
// FAILS-WHEN-REVERTED: the selected Patamon's top card lands in the controller's own security and
// its digivolution cards go to trash. A no-op leaves the Patamon on the field with its stack.

describe("P-023 [Main] place a Patamon to security (bottom) and trash its digivolution cards", () => {
  it("requires T.K. Takaishi, then places the Patamon to security and trashes its stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            "BT1-087", // T.K. Takaishi (gate)
            {
              card: "BT1-048",
              as: "patamon",
              dp: 2000,
              under: [{ card: "BT1-009", as: "digiCard", faceUp: false }],
            },
          ],
          hand: [{ card: "P-023", as: "option" }],
          security: 0,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p0 = s.state.players[0]!;
    const patamonTop = s.perm("patamon").topCard!;
    const digiCard = s.inst("digiCard");
    const securityBefore = p0.security.length;

    s.state.memory = 1; // cost-0 option

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });

    await settle(() => p0.security.some((c) => c.instanceId === patamonTop.instanceId));

    // The Patamon's top card was placed onto the controller's own security stack.
    expect(p0.security.some((c) => c.instanceId === patamonTop.instanceId)).toBe(true);
    expect(p0.security.length).toBe(securityBefore + 1);
    // Its digivolution card was trashed.
    expect(p0.trash.some((c) => c.instanceId === digiCard.instanceId)).toBe(true);
  });

  it("can be used with T.K. but no Patamon and resolves without changing security (Q4132)", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-087"],
        hand: [{ card: "P-023", as: "option" }],
        security: [{ card: "BT1-001", as: "existingSecurity" }],
      },
    });
    const optionId = s.inst("option").instanceId;
    const securityId = s.inst("existingSecurity").instanceId;
    s.state.memory = 1;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([securityId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("can be used without T.K. when another yellow source meets the color rule, but does nothing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-048", as: "patamon" }],
        hand: [{ card: "P-023", as: "option" }],
        security: [{ card: "BT1-001", as: "existingSecurity" }],
      },
    });
    const patamonId = s.perm("patamon").permanentId;
    const optionId = s.inst("option").instanceId;
    const securityId = s.inst("existingSecurity").instanceId;
    s.state.memory = 1;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === optionId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === patamonId)).toBe(true);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([securityId]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("offers each Patamon permanent, preserves inherited provenance, and bottoms only the chosen top", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          "BT1-087",
          { card: "BT1-048", as: "plainPatamon" },
          {
            card: "BT1-048",
            as: "stackedPatamon",
            under: [{ card: "BT1-009", as: "stackSource" }],
          },
        ],
        hand: [{ card: "P-023", as: "option" }],
        security: [{ card: "BT1-001", as: "existingSecurity" }],
      },
    });
    const plain = s.perm("plainPatamon");
    const stacked = s.perm("stackedPatamon");
    const stackedTopId = stacked.topCard.instanceId;
    const sourceId = s.inst("stackSource").instanceId;
    const existingSecurityId = s.inst("existingSecurity").instanceId;
    s.state.memory = 1;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const request = s.decisions.at(-1)!.req;
    expect(request.sourceCardId).toBe("P-023");
    expect(request.options?.timing).toBe("OnUseOption");
    expect(request.options?.effectText).toContain("[Main] If you have [T.K. Takaishi]");
    expect(request.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([plain.permanentId, stacked.permanentId]),
    );
    expect(request.options?.candidateInstanceIds).toHaveLength(2);

    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: request.decisionId,
      response: { kind: "chooseTargets", instanceIds: [stacked.permanentId] },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === stackedTopId));

    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      existingSecurityId,
      stackedTopId,
    ]);
    expect(s.state.players[0]!.security.at(-1)?.faceUp).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === sourceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === plain.permanentId)).toBe(true);
    assertNoLoudGap(s);
  });
});

describe("P-023 [Security]", () => {
  it("adds itself to its owner's hand after a real security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "P-023", as: "option" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
    });
    const optionId = s.inst("option").instanceId;
    s.state.turnSeat = 1;

    expect(s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === optionId), 5000);

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === optionId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === optionId)).toBe(false);
    assertNoLoudGap(s);
  });
});
