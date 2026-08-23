import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-053.js";
import "./BT10-057.js";

describe("BT10 BloomLordmon historical deck gauntlet", () => {
  it("builds a second body with Ajatarmon, evolves, gains layered memory, restands, and pierces", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-053", as: "ajatarmon" }],
          hand: [
            { card: "BT10-046", as: "vegetation" },
            { card: "BT10-057", as: "bloomLordmon" },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-016", as: "battleTarget", suspended: true, dp: 3000 }],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();

    const ajatarmonSource = (s.engine as any).cardSourceOf(s.perm("ajatarmon").topCard);
    const mainEffect = effectsOf(EffectTiming.OnDeclaration, ajatarmonSource).find(({ effectKey }) =>
      effectKey.startsWith("BT10-053/"),
    )!;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("ajatarmon").topCard.instanceId,
        effectKey: mainEffect.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("ajatarmon").isSuspended &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("vegetation").instanceId),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ajatarmon").permanentId,
        instanceId: s.inst("bloomLordmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.perm("ajatarmon").isSuspended &&
        s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.instanceId === s.inst("vegetation").instanceId)
          ?.isSuspended === true &&
        observe(s.engine).hasPierce(s.perm("ajatarmon")),
    );

    expect(s.state.memory).toBe(9);
    expect(s.perm("ajatarmon").topCard?.cardId).toBe("BT10-057");
    // BloomLordmon counted itself while suspended to reach the 2-memory threshold,
    // then restanding temporarily leaves only one suspended body.
    expect(s.perm("ajatarmon").currentDP).toBe(12000);
    expect(observe(s.engine).keywordAmount(s.perm("ajatarmon"), "SecurityAttack")).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ajatarmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("battleTarget").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.players[1]!.security.length === 2 &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[1]!.trash.some(({ cardId }) => cardId === "BT1-016")).toBe(true);
    // Suspending for the attack restores two suspended bodies, so Piercing performs
    // two checks with BloomLordmon's live Security Attack +1 scaling.
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
