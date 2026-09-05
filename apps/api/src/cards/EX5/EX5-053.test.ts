import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX5-053.js";

describe("EX5-053 Baihumon", () => {
  it("registers a mandatory once-per-turn security-check reaction and deletion removal", () => {
    const source = {
      instanceId: "source",
      cardId: "EX5-053",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const module = getEffectModule("EX5-053")!;
    const securityEffect = module.effectsForTiming(EffectTiming.OnSecurityCheck, source)[0]!;
    expect(securityEffect.maxPerTurn).toBe(1);
    expect(securityEffect.optional).toBe(false);
    expect(module.effectsForTiming(EffectTiming.OnDestroyedAnyone, source)).toHaveLength(1);
  });

  it("plays a revealed Deva from security without battling, but ignores a non-Deva", async () => {
    const resolve = async (securityCard: string) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "EX5-053", as: "baihumon" }], security: [securityCard] },
          1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle();
      return s;
    };

    const deva = await resolve("EX5-009");
    expect(deva.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX5-009")).toBe(true);
    expect(deva.state.players[0]!.security).toHaveLength(0);

    const nonDeva = await resolve("BT1-009");
    expect(nonDeva.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT1-009")).toBe(false);
    expect(nonDeva.state.players[0]!.trash.some((c) => c.cardId === "BT1-009")).toBe(true);
  });

  it("deletes exactly one opposing Digimon with the highest play cost on deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX5-053", as: "baihumon" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "low", dp: 3000 },
          { card: "BT1-021", as: "high", dp: 7000 },
        ],
      },
    });
    await s.ready();
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;
    await advance(s.engine).verb.deletePermanent([s.perm("baihumon").permanentId], "byEffect");
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("baihumon").permanentId));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === highId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId)).toBe(true);
  });
});
