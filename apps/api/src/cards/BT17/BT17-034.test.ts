import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { compiled } from "./BT17-034.js";
import "../index.js";

const source = {
  instanceId: "source",
  cardId: "BT17-034",
  ownerSeat: 0,
  definition: {},
  permanent: () => undefined,
  isOnBattleArea: () => true,
  isOwnersTurn: () => true,
  hasColor: () => true,
} as unknown as CardSource;

describe("BT17-034", () => {
  it("registers dual security branches, security-trash recovery, and inherited DP", () => {
    const module = getEffectModule("BT17-034");
    expect(module).toBeDefined();
    expect(module!.effectsForTiming(EffectTiming.WhenDigivolving, source)).toHaveLength(1);
    expect(module!.effectsForTiming(EffectTiming.None, source)).toHaveLength(2);
    expect(compiled.effects?.[2]).toMatchObject({
      isInherited: true,
      actions: [
        { while: { kind: "selfTopHasText", filter: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] } } },
      ],
    });
  });

  it("recovers when any of its owner's security cards is trashed with Leon Alexander in stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-034", as: "bulkmon", under: [{ card: "BT17-086", as: "leon" }] }],
        security: [{ card: "BT1-001", as: "security" }],
        deck: [{ card: "BT1-001", as: "recovery" }],
      },
      1: {},
    });

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => s.state.players[0]!.security.length === 1, 400);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]!.cardId).toBe("BT1-001");
  });

  it("recovers after a normal security check trashes a card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-034", as: "bulkmon", under: [{ card: "BT17-086", as: "leon" }] }],
        security: [{ card: "BT1-001", as: "checked" }],
        deck: [{ card: "BT1-001", as: "recovery" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("recovery").instanceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("checked").instanceId)).toBe(true);
  });

  it("does not recover when a security card is added to hand instead of trashed", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-034", as: "bulkmon", under: [{ card: "BT17-086", as: "leon" }] }],
        hand: [{ card: "BT25-033", as: "aegiomon" }],
        security: [{ card: "BT1-001", as: "to-hand" }],
        deck: [{ card: "BT1-001", as: "should-not-recover" }],
      },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aegiomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("to-hand").instanceId));

    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("to-hand").instanceId)).toBe(true);
  });
});
