import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_036 } from "./BT24-036.js";
import "../index.js";

describe("BT24-036 Medicmon", () => {
  it("plays from security without battle and applies -3000 DP on entry/deletion", () => {
    expect(BT24_036.effects?.find((entry) => entry.trigger === "Security")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
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

  it("plays itself after its security battle and applies the on-play DP loss", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT24-036", as: "medicmon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("medicmon"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-036"));

    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("links for cost 2 and applies -5000 when the linked host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT24-036", as: "medicmon" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("medicmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("medicmon").instanceId));
    expect(s.state.memory).toBe(1);

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.perm("target").currentDP === 1000);
    expect(s.perm("target").currentDP).toBe(1000);
  });

  it("applies the card's own -3000 DP effect when Medicmon is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-036", as: "medicmon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("medicmon").permanentId], "byEffect")).toBe(1);
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("cancels the linked effect when BT7-107 returns its deleted host first (Q5615)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-067", as: "host", linked: [{ card: "BT24-036", as: "medicmon" }] }],
          hand: [{ card: "BT7-107", as: "calling" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 6000 }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("calling").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("host").instanceId));

    expect(s.perm("target").currentDP).toBe(6000);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("medicmon").instanceId);
  });
});
