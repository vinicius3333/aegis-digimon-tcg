import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-078.js";

describe("BT2-078 WereGarurumon", () => {
  it("deletes another own Digimon to unsuspend its attacking host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-079", as: "host", under: ["BT2-078"] },
            { card: "BT2-068", as: "cost" },
          ],
        },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.perm("cost").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === costId) &&
        !s.perm("host").isSuspended,
    );

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT2-068")).toBe(true);
  });

  it("may decline without deleting another Digimon or unsuspending the host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-079", as: "host", under: ["BT2-078"] },
          { card: "BT2-068", as: "cost" },
        ],
      },
      1: { security: ["BT1-010"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.security.length === 0);

    expect(s.perm("host").isSuspended).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("cost").permanentId),
    ).toBe(true);
  });

  it("Q1029 excludes the breeding area and the attacking host from the deletion cost", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-079", as: "host", under: ["BT2-078"] },
          { card: "BT2-068", as: "firstCost" },
          { card: "BT2-070", as: "secondCost" },
        ],
        breeding: { card: "BT2-067", as: "breedingCost" },
      },
      1: { security: ["BT1-010"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const costDecision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === costDecision.decisionId)!.req;

    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("firstCost").permanentId, s.perm("secondCost").permanentId]),
    );
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("breedingCost").permanentId);
    expect(request.options!.candidateInstanceIds).not.toContain(s.perm("host").permanentId);
  });

  it("activates only once per turn across two attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-079", as: "host", under: ["BT2-078"] },
            { card: "BT2-068", as: "firstCost" },
            { card: "BT2-070", as: "secondCost" },
          ],
        },
        1: { security: ["BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.perm("host").isSuspended &&
        s.state.players[0]!.battleArea.length === 2 &&
        s.state.players[1]!.security.length === 1 &&
        !observe(s.engine).isAttacking(),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("does not activate while WereGarurumon is the top card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT2-078", as: "wereGarurumon" },
          { card: "BT2-068", as: "cost" },
        ],
      },
      1: { security: ["BT1-010"] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("wereGarurumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("wereGarurumon").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });
});
