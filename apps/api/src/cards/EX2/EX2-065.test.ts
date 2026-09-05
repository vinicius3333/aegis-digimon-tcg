import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-065.js";

describe("EX2-065 Ai & Mako", () => {
  it("may suspend when a Digimon attacks to trash the top card of its deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-044", as: "attacker" },
            { card: "EX2-065", as: "aiMako" },
          ],
          deck: [{ card: "BT1-001", as: "milled" }],
        },
        1: { security: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("aiMako").isSuspended &&
        s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("milled").instanceId),
    );
    expect(s.perm("aiMako").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("milled").instanceId)).toBe(true);
  });

  it("may digivolve an attacking Beelzemon into Blast Mode from trash for exactly 3 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-044", as: "beelzemon" },
            { card: "EX2-065", as: "aiMako" },
          ],
          deck: ["BT1-001"],
          trash: [{ card: "EX2-074", as: "blastMode" }],
        },
        1: { security: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beelzemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("beelzemon").topCard.instanceId === s.inst("blastMode").instanceId);
    expect(s.perm("beelzemon").topCard.instanceId).toBe(s.inst("blastMode").instanceId);
    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });

  it("does not offer Blast Mode digivolution when the attacker is not Beelzemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-043", as: "gulfmon" },
            { card: "EX2-065", as: "aiMako" },
          ],
          deck: ["BT1-001"],
          trash: [{ card: "EX2-074", as: "blastMode" }],
        },
        1: { security: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gulfmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("aiMako").isSuspended);
    expect(s.perm("gulfmon").topCard.cardId).toBe("EX2-043");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("blastMode").instanceId)).toBe(true);
    expect(s.state.memory).toBe(10);
    assertNoLoudGap(s);
  });

  it("sets memory to 3 at Start of Your Turn only when memory is 2 or less", async () => {
    const eligible = setupEngine({
      0: { battleArea: [{ card: "EX2-065", as: "aiMako" }], deck: ["BT1-001"], security: ["BT1-002"] },
    });
    eligible.state.memory = 2;
    await eligible.ready();
    const eligibleTurn = eligible.engine.runOneTurn();
    await advance(eligible.engine).waitForMainPhase(0);
    expect(eligible.state.memory).toBe(3);
    advance(eligible.engine).endMainPhaseIfOpen(0);
    await eligibleTurn;

    const boundary = setupEngine({
      0: { battleArea: [{ card: "EX2-065", as: "aiMako" }], deck: ["BT1-001"], security: ["BT1-002"] },
    });
    boundary.state.memory = 3;
    await boundary.ready();
    const boundaryTurn = boundary.engine.runOneTurn();
    await advance(boundary.engine).waitForMainPhase(0);
    expect(boundary.state.memory).toBe(3);
    advance(boundary.engine).endMainPhaseIfOpen(0);
    await boundaryTurn;
  });

  it("keeps the top card and Ai & Mako ready when the optional attack effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-044", as: "attacker" },
            { card: "EX2-065", as: "aiMako" },
          ],
          deck: [{ card: "BT1-001", as: "milled" }],
        },
        1: { security: ["BT1-002"] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && !observe(s.engine).isAttacking());
    expect(s.perm("aiMako").isSuspended).toBe(false);
    expect(s.state.players[0]!.deck).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("milled").instanceId }),
    );
  });

  it("does not treat an attacking Blast Mode as explicitly named Beelzemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-074", as: "blastMode" },
            { card: "EX2-065", as: "aiMako" },
          ],
          deck: ["BT1-001"],
          trash: [{ card: "EX2-074", as: "otherBlast" }],
        },
        1: { security: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("blastMode").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("aiMako").isSuspended);
    expect(s.perm("blastMode").topCard.cardId).toBe("EX2-074");
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("otherBlast").instanceId)).toBe(true);
  });

  it("plays EX2-065 from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "attacker" }], security: ["BT1-001"] },
      1: { security: [{ card: "EX2-065", as: "securityAiMako" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityAiMako").instanceId),
    );
    expect(
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityAiMako").instanceId),
    ).toBe(true);
  });
});
