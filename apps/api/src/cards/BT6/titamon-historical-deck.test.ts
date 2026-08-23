import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT6-006.js";
import "./BT6-071.js";
import "./BT6-073.js";
import "./BT6-075.js";
import "./BT6-077.js";
import "./BT6-078.js";
import "./BT6-081.js";

describe("BT6 Titamon historical deck gauntlet", () => {
  it("turns one discard into sources, draws, memory, revival, buffs, and a Rush attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT6-077",
              as: "rebellimon",
              under: ["BT6-006", "BT6-073"],
            },
          ],
          hand: [
            { card: "BT6-081", as: "titamon" },
            { card: "BT6-078", as: "discardedSkullGreymon" },
          ],
          trash: [
            { card: "BT6-075", as: "promote" },
            { card: "BT6-071", as: "kinkakumon" },
            { card: "BT6-073", as: "ginkakumon" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
        1: {
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          deck: ["BT1-005"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(
      s.inst("discardedSkullGreymon").instanceId,
      s.inst("promote").instanceId,
      s.inst("kinkakumon").instanceId,
      s.inst("ginkakumon").instanceId,
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rebellimon").permanentId,
        instanceId: s.inst("titamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("rebellimon").topCard.instanceId === s.inst("titamon").instanceId &&
        s
          .perm("rebellimon")
          .stack.some(({ instanceId }) => instanceId === s.inst("discardedSkullGreymon").instanceId) &&
        s.state.players[0]!.battleArea.some(
          ({ topCard, stack }) => topCard.instanceId === s.inst("promote").instanceId && stack.length === 2,
        ) &&
        s.state.players[0]!.hand.length === 3 &&
        s.state.memory === 2 &&
        s.state.pendingDecision === undefined,
      5000,
    );
    await settle(() => false, 1000);
    await s.engine.recomputeContinuousEffects();

    const promote = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("promote").instanceId,
    )!;
    expect(s.perm("rebellimon").currentDP).toBe(14_000);
    expect(observe(s.engine).keywordAmount(s.perm("rebellimon"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("rebellimon"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(promote, "Rush")).toBe(true);
    expect(s.state.memory).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: promote.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3 && !observe(s.engine).isAttacking(), 5000);

    expect(s.state.players[1]!.security).toHaveLength(3);
    assertNoLoudGap(s);
  });
});
