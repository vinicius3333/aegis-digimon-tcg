import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT6-007.js";
import "./BT6-018.js";
import "./BT6-087.js";

describe("BT6 Agumon Bond of Bravery historical deck", () => {
  it("moves from breeding, selects exact Agumon and Bond copies, attacks twice, and survives Tai leaving until end of turn", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT6-007", as: "agumon" },
          battleArea: [
            { card: "BT6-057", as: "toyAgumon" },
            { card: "BT6-087", as: "tai" },
          ],
          hand: [
            { card: "BT6-018", as: "chosenBond" },
            { card: "BT6-018", as: "keptBond" },
          ],
          deck: [{ card: "BT1-010", as: "taiDraw" }],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
        1: {
          battleArea: [
            { card: "BT6-016", as: "largeTarget", dp: 13000 },
            { card: "BT1-010", as: "smallTarget", dp: 2000 },
          ],
          security: ["BT1-005", "BT1-006", "BT1-007", "BT1-008", "BT1-009"],
        },
      },
      { autoOrderTriggers: true },
    );
    const agumonPermanentId = s.perm("agumon").permanentId;
    const chosenBondInstanceId = s.inst("chosenBond").instanceId;
    const keptBondInstanceId = s.inst("keptBond").instanceId;
    const taiPermanentId = s.perm("tai").permanentId;
    const largeTargetId = s.perm("largeTarget").permanentId;
    const smallTargetId = s.perm("smallTarget").permanentId;
    s.state.phase = Phase.Breeding;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "moveFromBreeding",
        permanentId: agumonPermanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.memory === 1 &&
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("taiDraw").instanceId),
    );

    s.state.phase = Phase.Main;
    s.state.memory = 8;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("tai").topCard.instanceId,
        effectKey: "BT6-087/main-digivolve-bond-of-bravery",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const agumonDecision = s.decisions.at(-1)!.req;
    expect(agumonDecision.sourceCardId).toBe("BT6-087");
    expect(agumonDecision.options?.candidateInstanceIds).toEqual([agumonPermanentId]);
    expect(agumonDecision.options?.candidateInstanceIds).not.toContain(s.perm("toyAgumon").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: agumonDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [agumonPermanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const bondDecision = s.decisions.at(-1)!.req;
    expect(new Set(bondDecision.options?.candidateInstanceIds)).toEqual(
      new Set([chosenBondInstanceId, keptBondInstanceId]),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: bondDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [chosenBondInstanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("agumon").topCard.instanceId === chosenBondInstanceId &&
        s.state.players[0]!.security.length === 2 &&
        observe(s.engine).subscriptions("endOfTurn").length === 1,
    );

    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === keptBondInstanceId)).toBe(true);
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).keywordAmount(s.perm("agumon"), "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: agumonPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");

    const deleteDecision = s.decisions.at(-1)!.req;
    expect(deleteDecision.sourceCardId).toBe("BT6-018");
    expect(new Set(deleteDecision.options?.candidateInstanceIds)).toEqual(new Set([largeTargetId, smallTargetId]));
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: deleteDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [largeTargetId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === largeTargetId) &&
        s.state.players[1]!.security.length === 2 &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.perm("agumon").isSuspended).toBe(true);
    expect(await advance(s.engine).verb.deletePermanent([smallTargetId], "byEffect")).toBe(1);
    await settle();
    expect(s.state.players[1]!.security).toHaveLength(2);

    expect(await advance(s.engine).verb.deletePermanent([taiPermanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === taiPermanentId)).toBe(false);

    await advance(s.engine).fireSubTrigger("endOfTurn");
    await settle(() => s.state.players[0]!.trash.some(({ instanceId }) => instanceId === chosenBondInstanceId));
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === agumonPermanentId)).toBe(false);
    assertNoLoudGap(s);
  });
});
