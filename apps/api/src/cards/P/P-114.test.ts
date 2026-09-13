import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-114.js";

describe("P-114 Diaboromon", () => {
  it("plays a Diaboromon Token when digivolving and counts the token for deletion scaling", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-064", as: "base" }], hand: [{ card: "P-114", as: "diaboromon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT22-071", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const lowId = s.perm("low").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("diaboromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId.startsWith("TOKEN-")) &&
        !s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId.startsWith("TOKEN-"))).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT22-071")).toBe(true);
    assertNoLoudGap(s);
  });

  it("plays a Diaboromon Token from the When Attacking effect", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-114", as: "diaboromon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("diaboromon"));
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId.startsWith("TOKEN-Diaboromon"))).toBe(true);
  });

  it("limits the effect-play deletion to once per turn and resets it on the next turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-064", as: "base" }],
          hand: [{ card: "P-114", as: "diaboromon" }, "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT1-010", as: "low2" },
            { card: "BT1-114", as: "high" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("high").topCard!.instanceId, s.perm("low").topCard!.instanceId);
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const baseInstanceId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("diaboromon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId.startsWith("TOKEN-Diaboromon")) &&
        s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("low").instanceId) &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.memory).toBe(7);
    expect(s.perm("base").stack).toHaveLength(1);
    expect(s.perm("base").stack[0]!.instanceId).toBe(baseInstanceId);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("high").instanceId)).toBe(true);

    const attack = async (tokenCount: number) => {
      await advance(s.engine).verb.unsuspend([s.perm("base").permanentId]);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("base").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId.startsWith("TOKEN-Diaboromon")).length >=
            tokenCount &&
          s.state.pendingDecision === undefined &&
          !observe(s.engine).isAttacking(),
      );
    };

    await attack(2);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("high").instanceId)).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    await attack(3);
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("high").instanceId));
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("high").instanceId)).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
