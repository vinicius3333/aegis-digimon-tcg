import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX5-027.js";
import "../index.js";

describe("EX5-027 Liollmon", () => {
  it("registers a security-search On Play and inherited On Deletion effect", () => {
    const source = {
      instanceId: "source",
      cardId: "EX5-027",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const module = getEffectModule("EX5-027")!;
    expect(module.effectsForTiming(EffectTiming.OnPlay, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.OnDestroyedAnyone, source)[0]?.description).toContain(
      "Modify DP by -2000",
    );
  });

  it("adds a Leomon from security and recovers only when one was added", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX5-027", as: "liollmon" }], security: ["BT1-035", "BT1-009"], deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-035"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-035");
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("does not recover when security has no Leomon-name card", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX5-027", as: "liollmon" }], security: ["BT1-009", "BT1-010"], deck: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("liollmon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT1-001");
  });

  it("reduces an opposing Digimon's DP when the inherited host is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-027"] }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent", dp: 5000 }] },
    });
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await settle(() => s.perm("opponent").currentDP === 3000);
    expect(s.perm("opponent").currentDP).toBe(3000);
  });
});
