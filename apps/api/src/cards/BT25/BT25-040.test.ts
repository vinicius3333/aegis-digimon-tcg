import { describe, expect, it } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_040 } from "./BT25-040.js";
import "../index.js";

describe("BT25-040 MagnaAngemon", () => {
  it("fires its security-trash play effect only for direct effect trashing", () => {
    const effect = BT25_040.effects?.find((entry) => entry.trigger === "OnDiscardSecurity");
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      optional: true,
      target: {
        filter: {
          zone: "hand",
          controller: "mine",
          levelComparison: { op: "lte", value: 4 },
          nameOrTrait: [{ tokens: ["Angel", "Iliad"], match: "trait" }],
        },
      },
    });
    expect(
      BT25_040.effects?.some((entry) => entry.trigger === "Static" && entry.actions?.[0]?.kind === "PlayWithoutCost"),
    ).toBe(false);
  });

  it("models the On Play and When Digivolving DP clauses as optional top-or-bottom costs", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const action = BT25_040.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0];
      expect(action).toMatchObject({
        kind: "ModifyDP",
        amount: -8000,
        duration: "untilOpponentTurnEnd",
        cost: {
          kind: "trash",
          target: { filter: { controller: "mine", zone: "security" }, count: 1 },
          raw: "By trashing your top or bottom security card",
        },
        optional: true,
        abortOnDecline: true,
      });
    }
  });

  it("scopes the inherited DP trigger to removal from its own security stack", () => {
    const effect = BT25_040.effects?.find((entry) => entry.trigger === "AllTurns");
    const watcher = effect?.actions?.[0] as { event?: string; sourceFilter?: unknown; actions?: unknown[] };
    expect(watcher.event).toBe("whenSecurityRemoved");
    expect(watcher.sourceFilter).toEqual({ controller: "mine" });
    expect(watcher.actions?.[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -4000,
      duration: "forTheTurn",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
  });

  it("requires and pays the top-or-bottom security cost for On Play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-040", as: "magna" }],
          security: [
            { card: "BT1-010", as: "securityTop" },
            { card: "BT1-020", as: "securityBottom" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magna").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("opponent").currentDP !== 12000);

    expect(s.perm("opponent").currentDP).toBe(4000);
    expect(player.security).toHaveLength(1);
    expect(player.trash.some((card) => card.instanceId === s.inst("securityTop").instanceId)).toBe(true);
  });

  it("does not resolve the mandatory DP effect when its security cost is unpayable", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-040", as: "magna" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 12000 }] },
      },
      { autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magna").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT25-040"));

    expect(s.perm("opponent").currentDP).toBe(12000);
    expect(s.decisions.some((decision) => decision.req.kind === "chooseOption")).toBe(false);
  });

  it("can choose the bottom security card while preserving the middle card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-040", as: "magna" }],
          security: [
            { card: "BT1-010", as: "top" },
            { card: "BT1-011", as: "middle" },
            { card: "BT1-012", as: "bottom" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferOptionIndex: 1 },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magna").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-040"));
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toContain("BT1-011");
    expect(s.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("bottom").instanceId }),
    );
  });

  it("may decline the security cost without applying the DP reduction", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-040", as: "magna" }],
          security: [{ card: "BT1-010", as: "security" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 12000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magna").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT25-040"));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("opponent").currentDP).toBe(12000);
  });

  it("resolves the same accepted security cost on digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-034", as: "magna" }],
          hand: [{ card: "BT25-040", as: "next" }],
          security: [{ card: "BT1-010", as: "securityTop" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );

    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("magna").permanentId,
        instanceId: s.inst("next").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("magna").topCard.cardId === "BT25-040");

    expect(s.perm("opponent").currentDP).toBe(4000);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("offers Ascension in a real battle and accepts or refuses the security replacement", async () => {
    const run = async (accept: boolean) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT25-040", as: "magna", suspended: true }] },
          1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 10000 }] },
        },
        { autoAcceptOptional: false, autoSelectCards: false },
      );
      s.state.turnSeat = 1;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("magna").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      const decision = s.state.pendingDecision!;
      expect(JSON.parse(decision.payloadJson).candidateInstanceIds).toContain(s.inst("magna").instanceId);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "selectCards", instanceIds: accept ? [s.inst("magna").instanceId] : [] },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      return s;
    };

    const accepted = await run(true);
    expect(accepted.state.players[0]!.battleArea).toHaveLength(0);
    expect(accepted.state.players[0]!.security[0]).toMatchObject({
      instanceId: accepted.inst("magna").instanceId,
      faceUp: false,
    });
    expect(accepted.state.players[0]!.trash).not.toContainEqual(
      expect.objectContaining({ instanceId: accepted.inst("magna").instanceId }),
    );

    const refused = await run(false);
    expect(refused.state.players[0]!.battleArea).toHaveLength(0);
    expect(refused.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: refused.inst("magna").instanceId }),
    );
    expect(refused.state.players[0]!.security).toHaveLength(0);
  });

  it("may play a level-4 Angel or Iliad card when an effect directly trashes it from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-040", as: "magna" }],
          hand: [{ card: "BT10-035", as: "angel" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.trash([s.inst("magna").instanceId], 0);
    await settle(() => s.perm("angel").topCard?.cardId === "BT10-035");

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("angel").topCard?.cardId).toBe("BT10-035");
  });

  it("also plays a level-4 Iliad card, while rejecting level-5 Angel and Tamer near matches", async () => {
    const iliad = setupEngine(
      {
        0: {
          security: [{ card: "BT25-040", as: "magna" }],
          hand: [{ card: "BT24-011", as: "iliad" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(iliad.engine).verb.trash([iliad.inst("magna").instanceId], 0);
    await settle(() => iliad.perm("iliad").topCard?.cardId === "BT24-011");
    expect(iliad.perm("iliad").topCard?.cardId).toBe("BT24-011");

    const nearMatches = setupEngine(
      {
        0: {
          security: [{ card: "BT25-040", as: "magna" }],
          hand: [
            { card: "BT1-060", as: "level5Angel" },
            { card: "BT1-089", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(nearMatches.engine).verb.trash([nearMatches.inst("magna").instanceId], 0);
    await settle(() => nearMatches.state.players[0]!.trash.some((card) => card.cardId === "BT25-040"));
    expect(nearMatches.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: nearMatches.inst("level5Angel").instanceId }),
    );
    expect(nearMatches.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: nearMatches.inst("tamer").instanceId }),
    );
  });

  it("does not fire from ordinary trash and does not play a non-Angel/non-Iliad near match", async () => {
    const ordinary = setupEngine({
      0: { hand: [{ card: "BT25-040", as: "magna" }] },
    });
    await ordinary.ready();
    await advance(ordinary.engine).verb.trash([ordinary.inst("magna").instanceId], 0);
    expect(ordinary.state.players[0]!.battleArea).toHaveLength(0);

    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT25-040", as: "magna" }],
          hand: [
            { card: "BT10-035", as: "angel" },
            { card: "BT1-009", as: "nearMatch" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.trash([s.inst("magna").instanceId], 0);
    await settle(() => s.perm("angel").topCard?.cardId === "BT10-035");
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("nearMatch").instanceId }),
    );
  });

  it("can decline the security-trash play before any placement choice", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT25-040", as: "magna" }], hand: [{ card: "BT10-035", as: "angel" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.trash([s.inst("magna").instanceId], 0);
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("magna").instanceId }),
    );
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("angel").instanceId }),
    );
  });

  it("applies the inherited DP reduction only for own security removal and once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-062", as: "host", under: ["BT25-040"] }],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("host"));

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 1 });
    expect(s.perm("opponent").currentDP).toBe(10000);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.perm("opponent").currentDP).toBe(6000);

    await advance(s.engine).fireSubTrigger("whenSecurityRemoved", { removedFromSecuritySeat: 0 });
    expect(s.perm("opponent").currentDP).toBe(6000);
  });

  it("reacts to a real own security removal, suppresses the second removal, and expires at turn end", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT25-040"] }],
        security: ["BT1-010", "BT1-011"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 10000 }] },
    });
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    expect(s.perm("opponent").currentDP).toBe(6000);
    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    expect(s.perm("opponent").currentDP).toBe(6000);
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.perm("opponent").currentDP).toBe(10000);
  });

  it("keeps the accepted -8000 through its own turn, then expires at opponent turn end", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-040", as: "magna" }],
          security: [{ card: "BT1-010", as: "security" }],
          deck: ["BT1-011", "BT1-012"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 12000 }], deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magna").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("opponent").currentDP === 4000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    expect(s.perm("opponent").currentDP).toBe(4000);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    expect(s.perm("opponent").currentDP).toBe(12000);
  });
});
