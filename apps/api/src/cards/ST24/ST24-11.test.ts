import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("ST24-11 Lilamon", () => {
  it("installs both All Turns trigger sources: opponent suspension and Tamer-stack trash", async () => {
    const module = getEffectModule("ST24-11");
    const self = { permanentId: "st24-11", topCard: undefined };
    const source = { cardId: "ST24-11", instanceId: "test", ownerSeat: 0, permanent: () => self, isOnBattleArea: () => true } as never;
    const effects = module!.effectsForTiming(EffectTiming.None, source);
    expect(effects).toHaveLength(1);
    expect(effects[0]!.effectKey).toBe("ST24-11/on-suspend-security");
    const subscriptions: Array<{ event: string }> = [];
    await effects[0]!.resolve({ source, fx: { subscribeSubTrigger: (sub: { event: string }) => subscriptions.push(sub) } } as never);
    expect(subscriptions.map(({ event }) => event)).toEqual(["whenSuspended", "whenDigivolutionTrashed"]);
  });

  it("triggers both printed When Digivolving clauses through the live engine and shares one security-trash budget", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST24-10", as: "base" },
            { card: "ST24-13", as: "tamer", under: [{ card: "BT1-001", as: "under", faceUp: false }] },
          ],
          hand: [{ card: "ST24-11", as: "rosemon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: ["BT1-001", "BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("rosemon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("opponent").isSuspended && s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("under").instanceId));
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("under").instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(3);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("base").permanentId, target: { kind: "permanent", permanentId: s.perm("opponent").permanentId } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

});
