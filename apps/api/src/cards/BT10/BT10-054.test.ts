import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-054.js";

describe("BT10-054 Lamortmon", () => {
  it("matches its catalog and exact three-clause IR", () => {
    const d = getCardDefinition("BT10-054")!;
    expect([d.colors, d.level, d.playCost, d.dp]).toEqual([["Green"], 5, 8, 9000]);
    expect(d.evoCosts).toEqual([{ color: "Green", level: 4, memoryCost: 3 }]);
    expect([d.forms, d.attributes, d.types]).toEqual([["Ultimate"], ["Vaccine"], ["Beast"]]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({ trigger: "WhenDigivolving", actions: [expect.objectContaining({ kind: "Suspend" })] }),
      expect.objectContaining({ trigger: "YourTurn", frequency: "OncePerTurn" }),
      expect.objectContaining({
        trigger: "WhenAttacking",
        actions: [expect.objectContaining({ kind: "GainMemory", amount: -2 })],
      }),
    ]);
  });

  it("suspends an opposing Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-069", as: "base" }],
          hand: [{ card: "BT10-054", as: "evolving" }],
        },
        1: { battleArea: [{ card: "BT2-047", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("loses memory on attack and unsuspends after only its first battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-069", as: "base" }],
          hand: [{ card: "BT10-054", as: "lamortmon" }],
        },
        1: {
          battleArea: [
            { card: "BT2-047", as: "firstTarget" },
            { card: "BT1-028", as: "secondTarget", suspended: true },
          ],
        },
      },
      { autoSelectCards: false, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    const firstTargetId = s.perm("firstTarget").permanentId;
    const secondTargetId = s.perm("secondTarget").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lamortmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const suspendDecision = s.decisions.at(-1)!.req;
    expect(suspendDecision.sourceCardId).toBe("BT10-054");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: suspendDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [firstTargetId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstTarget").isSuspended);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: firstTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstTargetId) &&
        !s.perm("base").isSuspended,
    );
    expect(s.state.memory).toBe(5);
    expect(s.perm("base").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "permanent", permanentId: secondTargetId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking &&
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === secondTargetId),
    );

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not lose memory when attacking while its controller has a Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-054", as: "lamortmon" },
          { card: "BT10-090", as: "tamer" },
        ],
      },
      1: { security: ["BT1-001"] },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lamortmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !(s.engine as unknown as { combat: { isAttacking: boolean } }).combat.isAttacking &&
        s.state.players[1]!.security.length === 0,
    );

    expect(s.state.memory).toBe(5);
    assertNoLoudGap(s);
  });
});
