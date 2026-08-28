import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_038 } from "./BT24-038.js";
import "../index.js";

describe("BT24-038 Biomon", () => {
  it("links a level-4-or-lower Digimon from hand or this stack to itself", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = BT24_038.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0] as any;
      expect(action).toMatchObject({ kind: "Link", from: ["hand", "digivolutionCards"], optional: true });
      expect(action.target.filter.levelComparison).toEqual({ op: "lte", value: 4 });
      expect(action.target.filter.hasLinkRequirement).toBe(true);
      expect(action.target.filter.hostFilter).toEqual({ isSelfRef: true });
      expect(action.recipient).toMatchObject({ filter: { isSelfRef: true }, count: 1, isSelf: true });
    }
  });

  it("implements its Appmon link requirement and linked when-linking effect", () => {
    expect(BT24_038.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(BT24_038.effects.find((effect) => effect.isLinked)).toMatchObject({
      trigger: "WhenLinking",
      actions: [{ kind: "ModifyDP", amount: -7000, duration: "forTheTurn" }],
    });
  });

  it("only free-links a card that actually has Link (Q5620)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-038", as: "biomon" }],
          hand: [
            { card: "BT24-035", as: "noLink" },
            { card: "BT24-036", as: "eligible" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("noLink").instanceId, s.inst("eligible").instanceId, s.perm("target").topCard.instanceId);
    await s.ready();
    const targetPermanentId = s.perm("target").permanentId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("biomon"));
    await settle(() => s.perm("biomon").linked.some((card) => card.instanceId === s.inst("eligible").instanceId));

    expect(s.perm("biomon").linked.map((card) => card.instanceId)).toEqual([s.inst("eligible").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("noLink").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(targetPermanentId);
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("free-links only from Biomon's own digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-038", as: "biomon", under: [{ card: "BT24-036", as: "ownSource" }] },
            { card: "BT24-038", as: "other", under: [{ card: "BT24-036", as: "otherSource" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("biomon"));

    expect(s.perm("biomon").linked.map((card) => card.instanceId)).toContain(s.inst("ownSource").instanceId);
    expect(s.perm("other").stack.map((card) => card.instanceId)).toContain(s.inst("otherSource").instanceId);
  });

  it("links to an Appmon for cost 3, contributes 4000 DP, and fires its linked effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT24-038", as: "biomon" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 10000 }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);
    s.state.memory = 5;
    await s.ready();
    const hostDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("biomon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("host").linked.some((card) => card.instanceId === s.inst("biomon").instanceId) &&
        s.perm("target").currentDP === 3000,
    );

    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(hostDp + 4000);
    expect(s.perm("target").currentDP).toBe(3000);
  });

  it("exposes Fortitude and the exact Docmon-Medicmon App Fusion recipe", async () => {
    expect(BT24_038.appFusionRequirement).toEqual([{ names: ["Docmon", "Medicmon"], cost: 0 }]);
    const s = setupEngine({ 0: { battleArea: [{ card: "BT24-038", as: "biomon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("biomon"), "Fortitude")).toBe(true);
  });

  it("replays itself through Fortitude when deleted with a digivolution card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT24-038", as: "biomon", under: [{ card: "BT24-035", as: "source" }] }] },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    const biomonInstanceId = s.perm("biomon").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("biomon").permanentId], "byEffect")).toBe(1);
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === biomonInstanceId),
    );

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT24-035");
  });
});
