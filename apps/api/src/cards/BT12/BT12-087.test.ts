import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-087.js";

describe("BT12-087", () => {
  it("registers its printed Start of Your Main Phase effect from compiled IR", () => {
    const module = getEffectModule("BT12-087");
    expect(module?.cardId).toBe("BT12-087");
    const source = {
      instanceId: "source-087",
      cardId: "BT12-087",
      ownerSeat: 0,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      permanent: () => undefined,
    } as unknown as CardSource;
    expect(module!.effectsForTiming(EffectTiming.OnStartMainPhase, source).length).toBeGreaterThan(0);
  });

  it("places a Save Digimon from hand under Taiki and draws 1 at the start of main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-087", as: "taiki" }],
          hand: [{ card: "BT12-008", as: "save" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("taiki"));
    await settle(() => s.perm("taiki").stack.some(({ cardId }) => cardId === "BT12-008"));
    expect(s.perm("taiki").stack.map(({ cardId }) => cardId)).toContain("BT12-008");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("reduces a natural Save digivolution by 1 and places a Tamer card under the new Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-087", as: "taiki", under: ["BT12-008"] },
            { card: "BT12-011", as: "host" },
          ],
          hand: [{ card: "BT12-014", as: "omni" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("omni").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT12-014");
    expect(s.state.memory).toBe(8);
    expect(s.perm("taiki").isSuspended).toBe(true);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toContain("BT12-008");
  });

  it("does not use the reducer when no card is available under a Tamer", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-087", as: "taiki" },
          { card: "BT12-011", as: "host" },
        ],
        hand: [{ card: "BT12-014", as: "omni" }],
      },
    });
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("omni").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT12-014");
    expect(s.state.memory).toBe(7);
    expect(s.perm("taiki").isSuspended).toBe(false);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).not.toContain("BT12-008");
  });

  it("plays itself from security through a real opponent attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      1: { security: [{ card: "BT12-087", as: "securityTaiki" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("securityTaiki").instanceId),
    );
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-087")).toBe(true);
  });
});
