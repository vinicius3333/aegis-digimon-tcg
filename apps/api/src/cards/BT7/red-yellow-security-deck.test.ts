import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-060.js";
import "../BT4/BT4-017.js";
import "./BT7-041.js";
import "./BT7-099.js";
import "../BT8/BT8-010.js";
import "../BT9/BT9-084.js";

describe("red-yellow security deck through BT10", () => {
  it("chains RizeGreymon's yellow color into Aquilamon, Tai & Kari, and MagnaAngemon recovery", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-017", as: "rize" },
            { card: "BT9-084", as: "taiKari" },
          ],
          hand: [
            { card: "BT8-010", as: "aquilamon" },
            { card: "BT1-060", as: "magnaAngemon" },
          ],
          security: ["BT1-049", "BT1-050"],
          deck: [{ card: "BT1-051", as: "recovered" }],
        },
      },
      { autoAcceptOptional: true },
    );

    s.state.memory = 5;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aquilamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT8-010"));
    await settle();
    expect(s.state.memory).toBe(2);

    await advance(s.engine).fireSubTrigger("whenAttacking", { attackerPermanentId: s.perm("rize").permanentId });
    expect(s.perm("taiKari").isSuspended).toBe(true);
    expect(observe(s.engine).securityDp(1)).toBe(-2000);

    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("magnaAngemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovered").instanceId));
    expect(s.state.players[0]!.security).toHaveLength(3);
  });

  it("recovers to exactly 3 with Kazuchimon before Electric Rush boosts and unsuspends it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-041", as: "kazuchi", suspended: true }],
          hand: [{ card: "BT7-099", as: "electricRush" }],
          security: ["BT1-049", "BT1-050"],
          deck: ["BT1-051"],
        },
      },
      { autoSelectCards: true },
    );
    const startingDp = s.perm("kazuchi").currentDP;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("kazuchi"));
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(observe(s.engine).keywordAmount(s.perm("kazuchi"), "SecurityAttack")).toBe(1);

    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("electricRush").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("kazuchi").isSuspended && s.perm("kazuchi").currentDP === startingDp + 3000);

    expect(s.perm("kazuchi").isSuspended).toBe(false);
    expect(s.perm("kazuchi").currentDP).toBe(startingDp + 3000);
    expect(observe(s.engine).keywordAmount(s.perm("kazuchi"), "SecurityAttack")).toBe(1);
  });
});
