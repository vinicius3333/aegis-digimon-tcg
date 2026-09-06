import { describe, expect, it } from "vitest";
import { compiled as BT25_043 } from "./BT25-043.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT25-043 Habakirimon", () => {
  it("reaches Habakirimon through the public Glowing Dawn Lv.5 alternate evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-041", as: "murasamemon" }],
        hand: [{ card: "BT25-043", as: "habakiri" }],
        security: [{ card: "BT1-009", as: "security" }],
        deck: [
          { card: "BT1-010", as: "draw" },
          { card: "BT1-011", as: "recovery" },
        ],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("murasamemon").permanentId,
        instanceId: s.inst("habakiri").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("murasamemon").topCard.cardId === "BT25-043");

    expect(s.state.memory).toBe(0);
    expect(s.perm("murasamemon").topCard.cardId).toBe("BT25-043");
    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("recovers first, then trashes the top security of a player with the most security", () => {
    for (const trigger of ["WhenDigivolving", "WhenAttacking"] as const) {
      const effect = BT25_043.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toHaveLength(3);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "addTop",
        controller: "mine",
        source: "deck",
        amount: 1,
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "RecoverByTrashingMostSecurity",
        amount: 1,
        recover: false,
      });
      expect((effect?.actions?.[1] as { optional?: boolean }).optional).toBeUndefined();
      expect(effect?.actions?.[2]).toMatchObject({ condition: { kind: "ifThisEffectActed" } });
    }
  });

  it("only unsuspends after the most-security trash succeeds", async () => {
    const success = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-043", as: "habakiri", suspended: true }],
          security: [{ card: "BT1-009" }],
        },
      },
      { autoSelectCards: true },
    );
    await success.ready();
    await advance(success.engine).fireForPermanent(EffectTiming.OnUseAttack, success.perm("habakiri"));
    expect(success.perm("habakiri").isSuspended).toBe(false);
    expect(success.state.players[0]!.security).toHaveLength(0);

    const noEligiblePlayer = setupEngine({
      0: { battleArea: [{ card: "BT25-043", as: "habakiri", suspended: true }] },
    });
    await noEligiblePlayer.ready();
    await advance(noEligiblePlayer.engine).fireForPermanent(
      EffectTiming.OnUseAttack,
      noEligiblePlayer.perm("habakiri"),
    );
    expect(noEligiblePlayer.perm("habakiri").isSuspended).toBe(true);
  });

  it("lets the activating player choose either side when recovery creates a security tie", async () => {
    const run = async (selectedPlayer: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT25-043", as: "habakiri", suspended: true }],
            security: [{ card: "BT1-009", as: "mine" }],
            deck: [{ card: "BT1-010", as: "recovery" }],
          },
          1: { security: ["BT1-011", "BT1-012"] },
        },
        { autoSelectCards: true, preferInstanceIds: [selectedPlayer] },
      );
      await s.ready();
      await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("habakiri"));
      return s;
    };
    const mine = await run("mine");
    expect(mine.state.players[0]!.security).toHaveLength(1);
    expect(mine.state.players[1]!.security).toHaveLength(2);
    const opponent = await run("opponent");
    expect(opponent.state.players[0]!.security).toHaveLength(2);
    expect(opponent.state.players[1]!.security).toHaveLength(1);
  });

  it("offers the same activating-player tie choice on public When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-041", as: "murasamemon" }],
          hand: [{ card: "BT25-043", as: "habakiri" }],
          security: [{ card: "BT1-009" }],
          deck: [
            { card: "BT1-008", as: "evolutionDraw" },
            { card: "BT1-010", as: "recovery" },
          ],
        },
        1: { security: ["BT1-011", "BT1-012"] },
      },
      { autoSelectCards: true, preferInstanceIds: ["opponent"] },
    );
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("murasamemon").permanentId,
        instanceId: s.inst("habakiri").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("murasamemon").topCard.cardId === "BT25-043");
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("naturally resolves Recovery, most-security trash, and unsuspend during an attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-043", as: "habakiri" }],
          security: [{ card: "BT1-001", as: "security" }],
          deck: [{ card: "BT1-002", as: "recovery" }],
        },
        1: { security: [] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("habakiri").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("habakiri").isSuspended && s.state.players[0]!.trash.length === 1);

    expect(s.perm("habakiri").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("recovery").instanceId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("security").instanceId]);
  });

  it("uses the public Option intent for both -8000 and the optional security-funded -5000", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-043", as: "habakiriOption" }],
          battleArea: [{ card: "BT25-032", as: "glowingDawn" }],
          security: [{ card: "BT1-001", as: "optionCost" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstTarget", dp: 20000 },
            { card: "BT1-010", as: "secondTarget", dp: 20000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("habakiriOption").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.every((card) => card.instanceId !== s.inst("habakiriOption").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("optionCost").instanceId);
    expect(s.perm("firstTarget").currentDP).toBe(7000);
    expect(s.perm("secondTarget").currentDP).toBe(15000);
  });

  it("does not rule-delete a Digimon at 0 DP until the Option effect has finished", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-043", as: "habakiriOption" }],
          battleArea: [{ card: "BT25-032", as: "glowingDawn" }],
          security: [{ card: "BT1-001", as: "optionCost" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 13000 }] },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("habakiriOption").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(s.perm("target").currentDP).toBe(5000);
    const cost = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: cost.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-009")).toBe(false);
  });

  it("can refuse the optional security-funded -5000 while retaining the -8000 effect", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-043", as: "habakiriOption" }],
          battleArea: [{ card: "BT25-032", as: "glowingDawn" }],
          security: [{ card: "BT1-001", as: "optionCost" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 12000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("habakiriOption").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.hand.every((card) => card.instanceId !== s.inst("habakiriOption").instanceId),
    );
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.state.players[0]!.security).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("optionCost").instanceId }),
    );
  });

  it("applies both Option DP reductions only for the current turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-043", as: "habakiriOption" }],
          battleArea: [{ card: "BT25-032", as: "glowingDawn" }],
          security: [{ card: "BT1-001", as: "optionCost" }],
          deck: ["BT1-002", "BT1-003"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 20000 }], deck: ["BT1-004"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 6;
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("habakiriOption").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 7000);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(7000);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    expect(s.perm("target").currentDP).toBe(20000);
  });

  it("does not pay the optional security cost when the controller has no security", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-043", as: "habakiriOption" }],
          battleArea: [{ card: "BT25-032", as: "glowingDawn" }],
          deck: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("habakiriOption").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.hand.length === 0);
    expect(s.perm("target").currentDP).toBe(4000);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(false);
  });

  it("prevents all matching Glowing Dawn Digimon from leaving with one once-per-turn replacement", () => {
    const effect = BT25_043.effects?.find((entry) => entry.trigger === "AllTurns");
    const replacement = effect?.actions?.[0] as {
      affectsAll?: boolean;
      target?: { filter?: unknown; count?: unknown };
      frequency?: string;
    };
    expect(effect?.frequency).toBe("OncePerTurn");
    expect(replacement.affectsAll).toBe(true);
    expect(replacement.target).toMatchObject({
      count: "all",
      filter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }],
      },
    });
  });

  it("protects every matching trait permanent, but not a non-matching Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-043", as: "habakiri" },
            { card: "BT25-032", as: "matchingOne" },
            { card: "BT25-035", as: "matchingTwo" },
            { card: "BT1-009", as: "nonMatching" },
          ],
          security: [{ card: "BT1-009" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      await advance(s.engine).verb.deletePermanent(
        [s.perm("matchingOne").permanentId, s.perm("matchingTwo").permanentId, s.perm("nonMatching").permanentId],
        "byBattle",
      ),
    ).toBe(1);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(
      expect.arrayContaining(["BT25-032", "BT25-035"]),
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(0);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("matchingOne").permanentId], "byBattle")).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT25-032");
  });

  it("does not reuse the replacement in the same turn, then resets it on a real next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-043", as: "habakiri" },
            { card: "BT25-032", as: "firstMatching" },
            { card: "BT25-035", as: "secondMatching" },
          ],
          security: ["BT1-001", "BT1-002"],
          deck: ["BT1-003", "BT1-004"],
        },
        1: { deck: ["BT1-005", "BT1-006"], security: ["BT1-007"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(await advance(s.engine).verb.deletePermanent([s.perm("firstMatching").permanentId], "byBattle")).toBe(0);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-032")).toBe(true);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("secondMatching").permanentId], "byBattle")).toBe(1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-035")).toBe(false);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("firstMatching").permanentId], "byBattle")).toBe(0);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-032")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
