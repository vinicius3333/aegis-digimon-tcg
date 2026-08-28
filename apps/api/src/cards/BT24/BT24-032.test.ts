import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_032 } from "./BT24-032.js";
import "../index.js";

describe("BT24-032 Pipomon", () => {
  it("reveals three and searches Appmon plus System/Transmutation", () => {
    const reveal = BT24_032.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0] as any;
    expect(reveal).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect(reveal.add).toHaveLength(2);
    expect(reveal.add[0]).toMatchObject({
      to: "hand",
      filter: { nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
    });
    expect(reveal.add[1]).toMatchObject({
      to: "hand",
      filter: { nameOrTrait: [{ tokens: ["System", "Transmutation (App Name)"], match: "trait" }] },
    });
  });

  it("implements its Appmon link requirement and when-linking DP loss", () => {
    expect(BT24_032.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
    expect(BT24_032.effects.find((effect) => effect.trigger === "WhenLinking")).toMatchObject({
      isLinked: true,
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
        },
      ],
    });
  });

  it("adds distinct Appmon and System cards and bottoms the miss", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-032", as: "pipomon" }],
          deck: [
            { card: "BT21-009", as: "appmon" },
            { card: "BT24-053", as: "system" },
            { card: "BT1-009", as: "miss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("appmon").instanceId, s.inst("system").instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("pipomon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("appmon").instanceId, s.inst("system").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
  });

  it("links for cost 1, contributes 2000 DP, and gives an opponent Digimon -2000 DP", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT24-032", as: "pipomon" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 3000 }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 3;
    await s.ready();
    const hostDp = s.perm("host").currentDP;
    const targetDp = s.perm("target").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("pipomon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("host").linked.some((card) => card.instanceId === s.inst("pipomon").instanceId) &&
        s.perm("target").currentDP === targetDp - 2000,
    );

    expect(s.state.memory).toBe(2);
    expect(s.perm("host").currentDP).toBe(hostDp + 2000);
    expect(s.perm("target").currentDP).toBe(targetDp - 2000);
  });

  it("digivolves from a level 2 Appmon Digi-Egg for cost 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT21-005", as: "base" },
        hand: [{ card: "BT24-032", as: "pipomon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("pipomon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("pipomon").instanceId);

    expect(s.state.memory).toBe(3);
  });
});
