import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-035.js";
import "./EX1-040.js";

describe("EX1-035 Kabuterimon", () => {
  it("can digivolve into an Insectoid from hand while attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-035", as: "kabuterimon" }], hand: [{ card: "BT1-076", as: "evo" }] },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kabuterimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kabuterimon").topCard.cardId === "BT1-076");
    expect(s.perm("kabuterimon").topCard.instanceId).toBe(s.inst("evo").instanceId);
    expect(s.state.memory).toBe(3);
  });

  it("may decline the can-digivolve action through the public attack flow", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-035", as: "kabuterimon" }], hand: [{ card: "BT1-076", as: "evo" }] },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kabuterimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kabuterimon").isSuspended);
    expect(s.perm("kabuterimon").topCard.cardId).toBe("EX1-035");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("evo").instanceId)).toBe(true);
  });

  it("continues the attack after the digivolution cost crosses memory to the opponent (Q3224)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-035", as: "kabuterimon" }],
          hand: [{ card: "BT1-076", as: "evo" }],
          deck: ["BT1-001", "BT1-001"],
        },
        1: { security: ["BT1-001", "BT1-001"], deck: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kabuterimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kabuterimon").topCard.cardId === "BT1-076");
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.memory).toBeLessThan(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("kabuterimon").topCard.cardId).toBe("BT1-076");
  });

  it("does not offer a non-Insectoid or an evolution with invalid level/cost requirements", async () => {
    const nonTrait = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-035", as: "kabuterimon" }], hand: [{ card: "BT1-071", as: "nonTrait" }] },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await nonTrait.ready();
    expect(
      nonTrait.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: nonTrait.perm("kabuterimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => nonTrait.perm("kabuterimon").isSuspended);
    expect(nonTrait.perm("kabuterimon").topCard.cardId).toBe("EX1-035");
    expect(
      nonTrait.state.players[0]!.hand.some((card) => card.instanceId === nonTrait.inst("nonTrait").instanceId),
    ).toBe(true);

    const invalidRequirement = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-035", as: "kabuterimon" }], hand: [{ card: "BT7-054", as: "tooHigh" }] },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await invalidRequirement.ready();
    expect(
      invalidRequirement.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: invalidRequirement.perm("kabuterimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => invalidRequirement.perm("kabuterimon").isSuspended);
    expect(invalidRequirement.perm("kabuterimon").topCard.cardId).toBe("EX1-035");
    expect(
      invalidRequirement.state.players[0]!.hand.some(
        (card) => card.instanceId === invalidRequirement.inst("tooHigh").instanceId,
      ),
    ).toBe(true);
  });

  it("does not re-trigger a newly gained When Attacking/When Digivolving window (Q3223/Q3227)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-035", as: "kabuterimon" }],
          hand: [
            { card: "EX1-040", as: "newAttackEffect" },
            { card: "BT16-045", as: "newDigivolvingEffect" },
          ],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("kabuterimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kabuterimon").topCard.cardId === "EX1-040");
    expect(s.perm("kabuterimon").stack.map((card) => card.cardId)).toEqual(["EX1-035"]);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("newDigivolvingEffect").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("newAttackEffect").instanceId)).toBe(
      false,
    );
  });
});
