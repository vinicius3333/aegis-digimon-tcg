import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT7-016.js";
import "./BT7-085.js";

describe("BT7 Red Hybrid historical deck gauntlet", () => {
  it("turns Takuya into EmperorGreymon, restands when blocked, then attacks security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-085", as: "takuya" }],
          hand: [{ card: "BT7-016", as: "emperorGreymon" }],
          trash: ["BT7-008", "BT7-011", "BT7-014", "BT7-046", "BT7-047"],
        },
        1: {
          battleArea: [{ card: "BT1-031", as: "blocker" }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 4;
    await s.ready();

    const takuyaSource = (s.engine as any).cardSourceOf(s.perm("takuya").topCard);
    const mainEffect = effectsOf(EffectTiming.OnDeclaration, takuyaSource).find(
      ({ effectKey }) => effectKey === "BT7-085/main-digivolve",
    )!;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("takuya").topCard.instanceId,
        effectKey: mainEffect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("takuya").topCard?.instanceId === s.inst("emperorGreymon").instanceId &&
        s.perm("takuya").currentDP === 14000,
    );

    const emperor = s.perm("takuya");
    expect(emperor.stack).toHaveLength(6);
    expect(emperor.currentDP).toBe(14000);
    expect(observe(s.engine).keywordAmount(emperor, "SecurityAttack")).toBe(1);
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: emperor.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        !emperor.isSuspended &&
        s.state.memory === 5 &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT1-031")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: emperor.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking());

    expect(emperor.isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
