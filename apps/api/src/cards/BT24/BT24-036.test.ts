import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_036 } from "./BT24-036.js";
import "../index.js";

describe("BT24-036 Medicmon", () => {
  it("plays from security at the end of battle and applies -3000 DP on entry/deletion", () => {
    expect(BT24_036.effects?.find((entry) => entry.trigger === "Security")).toMatchObject({
      trigger: "Security",
      timing: "endOfBattle",
      isSecurity: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["trash"],
              payCost: false,
            },
          ],
        },
      ],
    });
    for (const trigger of ["OnPlay", "OnDeletion"]) {
      expect(
        BT24_036.effects?.find((entry) => entry.trigger === trigger && !entry.isLinked)?.actions?.[0],
      ).toMatchObject({
        kind: "ModifyDP",
        amount: -3000,
        duration: "forTheTurn",
      });
    }
  });

  it("implements its Appmon link requirement and linked deletion effect", () => {
    expect(BT24_036.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(BT24_036.effects.find((effect) => effect.isLinked)).toMatchObject({
      trigger: "OnDeletion",
      actions: [{ kind: "ModifyDP", amount: -5000, duration: "forTheTurn" }],
    });
  });

  it("digivolves publicly from a yellow level-3 Digimon for cost 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-045", as: "yellowBase" }],
        hand: [{ card: "BT24-036", as: "medicmon" }],
        deck: [{ card: "BT1-013", as: "bonusDraw" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowBase").permanentId,
        instanceId: s.inst("medicmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("yellowBase").topCard.instanceId === s.inst("medicmon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("yellowBase").topCard.instanceId).toBe(s.inst("medicmon").instanceId);
    expect(s.perm("yellowBase").stack.map((card) => card.instanceId)).toEqual([s.inst("yellowBase").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
  });

  it("rejects linking to a non-Appmon host without moving Medicmon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-020", as: "host" }],
        hand: [{ card: "BT24-036", as: "medicmon" }],
      },
    });
    s.state.memory = 5;
    const hostDp = s.perm("host").currentDP;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("medicmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: false, reason: "link-requirement-unmet" });
    expect(s.state.memory).toBe(5);
    expect(s.perm("host").currentDP).toBe(hostDp);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("medicmon").instanceId);
  });

  it("plays itself from security only after its security battle ends and applies the on-play DP loss", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-037", as: "attacker", dp: 8000 }] },
        1: { security: [{ card: "BT24-036", as: "medicmon" }] },
      },
      { autoSelectCards: true },
    );
    const medicId = s.inst("medicmon").instanceId;
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked") && !observe(s.engine).isAttacking());
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === medicId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === medicId)).toBe(true);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(true);
    expect(s.state.memory).toBe(2);
    expect(s.perm("attacker").currentDP).toBe(5000);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some(({ instanceId }) => instanceId === medicId)).toBe(false);
  });

  it("links for cost 2 and applies -5000 when the linked host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT24-036", as: "medicmon" }],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "target", dp: 6000 }],
          hand: [{ card: "BT6-095", as: "option" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("medicmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("medicmon").instanceId));
    expect(s.state.memory).toBe(8);
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([s.inst("medicmon").instanceId]);

    const optionId = s.inst("option").instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[0]!.battleArea.some(
          (permanent) => permanent.topCard?.instanceId === s.inst("host").instanceId,
        ),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("host").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("medicmon").instanceId);
    expect(s.perm("target").currentDP).toBe(1000);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(optionId);
    expect(s.state.memory).toBe(0);
  });

  it("applies the card's own -3000 DP effect when Medicmon is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-036", as: "medicmon", dp: 1000, suspended: true }] },
        1: { battleArea: [{ card: "BT1-020", as: "attacker", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );
    const medicId = s.inst("medicmon").instanceId;
    const attackerId = s.perm("attacker").permanentId;
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: s.perm("medicmon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.events.some((event) => event.kind === "combatResolved" && event.attackerPermanentId === attackerId) &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(medicId);
    expect(s.perm("attacker").currentDP).toBe(3000);
  });

  it("cancels the linked effect when BT7-107 returns its deleted host first (Q5615)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-067", as: "host" }],
          hand: [
            { card: "BT24-036", as: "medicmon" },
            { card: "BT7-107", as: "calling" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("medicmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("medicmon").instanceId));
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("medicmon").instanceId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("calling").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("host").instanceId));

    expect(s.perm("target").currentDP).toBe(6000);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("medicmon").instanceId);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("host").instanceId);
  });
});
