import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-003.js";

describe("EX6-003 Cupimon", () => {
  it("returns one security card to hand and places an Angel excluding Fallen Angel as security", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      optional: true,
      actions: [
        { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1, toTop: true },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            count: 1,
            filter: {
              kind: ["Digimon"],
              nameOrTrait: [{ match: "trait", tokens: ["Angel", "Archangel", "Three Great Angels"] }],
            },
          },
          from: ["hand"],
          toTop: false,
        },
      ],
    });
  });

  it("exchanges top security for an eligible Angel at security bottom when its host attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-007", as: "host", under: ["EX6-003"] }],
          hand: [
            { card: "BT1-053", as: "angel" },
            { card: "BT1-053", as: "secondAngel" },
          ],
          security: [{ card: "BT1-009", as: "securityTop" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(
      () => s.state.players[0]!.security.some(({ instanceId }) => instanceId === s.inst("angel").instanceId),
      600,
    );

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("securityTop").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: s.inst("angel").instanceId, faceUp: false });

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("angel").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("secondAngel").instanceId);
  });

  it("does not place a non-Angel card when the optional exchange has no legal hand target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-007", as: "host", under: ["EX6-003"] }],
          hand: [{ card: "BT1-009", as: "nonAngel" }],
          security: [{ card: "BT1-010", as: "securityTop" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("securityTop").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("nonAngel").instanceId);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
