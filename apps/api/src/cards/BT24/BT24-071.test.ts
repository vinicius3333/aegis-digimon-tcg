import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT24_071 } from "./BT24-071.js";
import "../index.js";

describe("BT24-071 Raidramon", () => {
  it("grants Security Attack +1 to one eligible trait Digimon and revives level 3 Appmon", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(BT24_071.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "SecurityAttack", amount: 1 },
        duration: "forTheTurn",
        target: {
          filter: { nameOrTrait: [{ tokens: ["System", "Life", "Transmutation"], match: "trait" }] },
          count: 1,
        },
      });
    }
    expect(BT24_071.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      target: { filter: { levels: [3], nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] } },
    });
  });

  it("models its cost-2 Appmon link and linked On Deletion revival", () => {
    expect(BT24_071.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(BT24_071.effects.find((effect) => effect.isLinked)).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["trash"],
          payCost: false,
          optional: true,
          target: { filter: { levels: [3], nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] } },
        },
      ],
    });
  });

  it("public play pays 6 and grants Security Attack +1 to a Life-trait Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-038", as: "life" }],
          hand: [{ card: "BT24-071", as: "raidramon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("raidramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("life"), "SecurityAttack") === 1);

    expect(s.state.memory).toBe(1);
  });

  it.each([
    ["normal purple level-3 requirement", "BT24-068"],
    ["normal red level-3 requirement", "BT1-009"],
  ])("uses the %s for cost 3", async (_label, baseCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: baseCard, as: "base" },
            { card: "BT24-038", as: "life" },
          ],
          hand: [{ card: "BT24-071", as: "raidramon" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("raidramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("raidramon").instanceId);
    await settle(() => observe(s.engine).keywordAmount(s.perm("life"), "SecurityAttack") === 1);

    expect(s.state.memory).toBe(2);
  });

  it.each([
    ["BT24-067", "BT24-053"],
    ["BT24-067", "BT24-032"],
    ["BT24-053", "BT24-067"],
    ["BT24-053", "BT24-032"],
    ["BT24-032", "BT24-067"],
    ["BT24-032", "BT24-053"],
  ])("Q5647: App Fuses from %s linked with %s", async (hostCard, linkCard) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-087", as: "rei" },
            { card: hostCard, as: "host" },
          ],
          hand: [{ card: linkCard, as: "link" }],
          trash: [{ card: "BT24-071", as: "fusion" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("host").topCard.instanceId, s.inst("fusion").instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("fusion").instanceId);

    expect(s.perm("host").stack.map((card) => card.cardId)).toContain(hostCard);
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "grants Security Attack +1 to an eligible Digimon on %s",
    async (timing) => {
      const s = setupEngine({ 0: { battleArea: [{ card: "BT24-071", as: "raidramon" }] } }, { autoSelectCards: true });
      await s.ready();

      await advance(s.engine).fire(timing, s.perm("raidramon"));

      expect(observe(s.engine).keywordAmount(s.perm("raidramon"), "SecurityAttack")).toBe(1);
    },
  );

  it("plays a level 3 Appmon from trash on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-071", as: "raidramon" }],
          trash: [{ card: "BT21-009", as: "appmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnDeletion, s.perm("raidramon"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("appmon").instanceId),
    );

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("appmon").instanceId);
  });

  it("links for cost 2, adds 3000 DP, and revives a level 3 Appmon when the host is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT24-071", as: "raidramon" }],
          trash: [{ card: "BT24-032", as: "appmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const baseDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("raidramon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("raidramon").instanceId));

    expect(s.state.memory).toBe(1);
    expect(s.perm("host").currentDP).toBe(baseDp + 3000);

    await advance(s.engine).fire(EffectTiming.OnDeletion, s.perm("host"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("appmon").instanceId),
    );
  });

  it("cancels the linked revival when BT7-107 returns its deleted host first (Q5648)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-067", as: "host", linked: [{ card: "BT24-071", as: "raidramon" }] }],
          hand: [{ card: "BT7-107", as: "calling" }],
          trash: [{ card: "BT24-032", as: "appmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("calling").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("host").instanceId));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("appmon").instanceId);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("appmon").instanceId),
    ).toBe(false);
  });
});
