import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT25_018 } from "./BT25-018.js";
import "../index.js";

describe("BT25-018 Apollomon", () => {
  it("reduces its play cost against an opponent Digimon at 12000 DP or more", () => {
    const staticEffect = BT25_018.effects?.find((entry) => entry.trigger === "Static");
    expect(staticEffect?.actions?.[0]).toMatchObject({ kind: "Replacement", event: "wouldBePlayed" });
    const nested = staticEffect?.actions?.[0] as { actions?: unknown[] } | undefined;
    expect(nested?.actions?.[0]).toMatchObject({
      mode: "reduceCost",
      amount: 5,
      condition: { kind: "opponentHas", filter: { dp: { op: "gte", value: 12000 } } },
    });
  });

  it("scales opponent DP by your Digimon count and deletes relative to this card", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_018.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -2000,
        scaling: { per: 1, filter: { controller: "mine", kind: ["Digimon"] }, unit: "cards" },
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "Delete",
        target: { filter: { dp: { op: "lte", relativeToSource: true } }, count: 1 },
      });
    }
  });

  it("keeps the end-turn DNA-then-attack sequence and inherited deletion", () => {
    const endTurn = BT25_018.effects?.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(endTurn?.actions?.[0]).toMatchObject({
      kind: "DnaDigivolve",
      payCost: true,
      optional: true,
      into: { zone: "hand" },
    });
    expect(endTurn?.actions?.[1]).toMatchObject({ kind: "Attack", optional: true, withoutSuspending: false });
    expect(BT25_018.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
    });
  });

  it("applies the 12000-DP play-cost reduction before paying memory, but not below the boundary", async () => {
    const reduced = setupEngine({
      0: { hand: [{ card: "BT25-018", as: "apollomon" }] },
      1: { battleArea: [{ card: "BT1-013", dp: 12000, as: "threshold" }] },
    });
    reduced.state.memory = 7;
    expect(
      reduced.engine.applyIntent(0, { type: "playCard", instanceId: reduced.inst("apollomon").instanceId }),
    ).toEqual({
      ok: true,
    });
    await settle(() => reduced.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-018"));
    expect(reduced.state.memory).toBe(0);

    const belowThreshold = setupEngine({
      0: { hand: [{ card: "BT25-018", as: "apollomon" }] },
      1: { battleArea: [{ card: "BT1-013", dp: 11999, as: "belowThreshold" }] },
    });
    belowThreshold.state.memory = 7;
    expect(
      belowThreshold.engine.applyIntent(0, {
        type: "playCard",
        instanceId: belowThreshold.inst("apollomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => belowThreshold.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-018"));
    expect(belowThreshold.state.memory).toBe(-5);
  });

  it("reduces all opposing Digimon by 2000 per own Digimon, then deletes at the live-DP boundary", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-018", as: "apollomon" }],
          battleArea: [{ card: "BT1-009", as: "ally" }],
          breeding: { card: "BT25-008", as: "breedingDigimon" },
        },
        1: {
          battleArea: [
            { card: "BT1-013", dp: 16000, as: "atBoundary" },
            { card: "BT1-013", dp: 17000, as: "aboveBoundary" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    const atBoundaryId = s.perm("atBoundary").permanentId;
    preferred.push(atBoundaryId);
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("apollomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === atBoundaryId));
    expect(s.perm("aboveBoundary").currentDP).toBe(13000);
  });

  it("keeps a zero-DP Digimon selectable until the entry effect finishes (Q6267)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-018", as: "apollomon" }], battleArea: [{ card: "BT1-009", as: "ally" }] },
        1: {
          battleArea: [
            { card: "BT1-010", dp: 4000, as: "zero" },
            { card: "BT1-013", dp: 16000, as: "otherEligible" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("zero").permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("apollomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([s.perm("otherEligible").permanentId]);
    expect(s.perm("otherEligible").currentDP).toBe(12000);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("zero").instanceId);
  });

  it("does not discount play for a qualifying Digimon confined to breeding", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT25-018", as: "apollomon" }] },
      1: { breeding: { card: "BT1-084", as: "breedingOnly" } },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("apollomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.memory).toBe(-2);
    expect(s.perm("breedingOnly").inBreeding).toBe(true);
  });

  it("resolves the same DP reduction and deletion after digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-017", as: "base" },
            { card: "BT1-009", as: "ally" },
          ],
          hand: [{ card: "BT25-018", as: "apollomon" }],
        },
        1: { battleArea: [{ card: "BT1-013", dp: 16000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("apollomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT25-018");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("DNA-digivolves first at end of turn, then lets the resulting Digimon attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-018", as: "apollo" },
            { card: "BT25-028", as: "diana" },
          ],
          hand: [{ card: "BT25-103", as: "grace" }],
        },
        1: { security: ["BT1-001"], battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-103"));
    const grace = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT25-103");
    expect(grace).toBeDefined();
    expect(grace!.isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("still offers the follow-up attack when the end-turn DNA effect is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-018", as: "apollo" },
            { card: "BT25-028", as: "diana" },
          ],
          hand: [{ card: "BT25-103", as: "grace" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const dnaPrompt = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: dnaPrompt.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.decisionId !== dnaPrompt.decisionId,
    );
    const attackPrompt = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: attackPrompt.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await turn;
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("apollo").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT25-103")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("applies inherited deletion once from a legal Lv7 Omnimon stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-084", under: ["BT25-018"], as: "grace" }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 1000, as: "firstTarget" },
            { card: "BT1-009", dp: 1000, as: "secondTarget" },
          ],
          security: ["BT1-001", "BT1-001"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true, preferInstanceIds: preferred },
    );
    const firstTargetId = s.perm("firstTarget").permanentId;
    const secondTargetId = s.perm("secondTarget").permanentId;
    preferred.push(firstTargetId);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("grace").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === firstTargetId));
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([secondTargetId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("firstTarget").instanceId);
    await advance(s.engine).verb.unsuspend([s.perm("grace").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("grace").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === secondTargetId)).toBe(true);
  });
});
