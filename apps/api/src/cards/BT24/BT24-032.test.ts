import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_032 } from "./BT24-032.js";
import "../index.js";

describe("BT24-032 Pipomon", () => {
  it("matches the catalog identity and link contract", () => {
    expect(getCardDefinition("BT24-032")).toMatchObject({
      cardId: "BT24-032",
      nameEn: "Pipomon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Stnd.", "Appmon"],
      attributes: ["System"],
      types: ["Warning", "Leviathan"],
      linkDp: 2000,
      linkRequirement: "[Link] [Appmon] trait: Cost 1",
    });
  });

  it("reveals three and searches Appmon plus System/Transmutation", () => {
    expect(BT24_032.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        { to: "hand", filter: { nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] } },
        { to: "hand", filter: { nameOrTrait: [{ tokens: ["System", "Transmutation"], match: "trait" }] } },
      ],
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

  it("resolves the reveal search from a public play intent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-032", as: "pipomon" }],
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
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pipomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("system").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("appmon").instanceId, s.inst("system").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("miss").instanceId);
  });

  it("publicly selects a Transmutation card and bottoms the mixed nonmatches in order", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-032", as: "pipomon" }],
          deck: [
            { card: "BT21-009", as: "appmon" },
            { card: "BT24-079", as: "transmutation" },
            { card: "BT1-009", as: "miss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("appmon").instanceId, s.inst("transmutation").instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pipomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("transmutation").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("appmon").instanceId,
      s.inst("transmutation").instanceId,
    ]);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("pipomon").instanceId,
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
  });

  it("publicly leaves non-System/non-Transmutation cards out of the second search", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-032", as: "pipomon" }],
          deck: [
            { card: "BT21-009", as: "appmon" },
            { card: "BT1-009", as: "neutralOne" },
            { card: "BT1-010", as: "neutralTwo" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("pipomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("appmon").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("neutralOne").instanceId,
      s.inst("neutralTwo").instanceId,
    ]);
    expect(s.state.memory).toBe(7);
    expect(s.state.pendingDecision).toBeUndefined();
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
    const pipomonId = s.inst("pipomon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: pipomonId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("host").linked.some((card) => card.instanceId === s.inst("pipomon").instanceId) &&
        s.perm("target").currentDP === targetDp - 2000,
    );

    expect(s.state.memory).toBe(2);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([pipomonId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(pipomonId);
    expect(s.perm("host").currentDP).toBe(hostDp + 2000);
    expect(s.perm("target").currentDP).toBe(targetDp - 2000);
  });

  it("expires the public linked DP penalty at the end of the owner turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT24-032", as: "pipomon" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }], deck: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const hostDp = s.perm("host").currentDP;
    const targetDp = s.perm("target").currentDP;
    const pipomonId = s.inst("pipomon").instanceId;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: pipomonId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === targetDp - 2000);
    expect(s.perm("target").currentDP).toBe(targetDp - 2000);

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    expect(s.perm("target").currentDP).toBe(targetDp);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([pipomonId]);
    expect(s.perm("host").currentDP).toBe(hostDp + 2000);
  });

  it("publicly deletes a 2000-DP target at the zero-DP boundary when linking", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "host" }],
        hand: [{ card: "BT24-032", as: "pipomon" }],
      },
      1: { battleArea: [{ card: "BT21-009", as: "target", dp: 2000 }] },
    });
    s.state.memory = 3;
    await s.ready();
    const pipomonId = s.inst("pipomon").instanceId;
    const targetId = s.inst("target").instanceId;
    const targetPermanentId = s.perm("target").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: pipomonId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === targetId));

    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(targetId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(targetPermanentId);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toEqual([pipomonId]);
  });

  it("digivolves from a level 2 Appmon Digi-Egg for cost 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT22-003", as: "base" },
        hand: [{ card: "BT24-032", as: "pipomon" }],
        deck: [{ card: "BT1-009", as: "bonusDraw" }],
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
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("pipomon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(s.inst("base").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
  });

  it("rejects the alternate route from a blue non-Appmon Digi-Egg", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-003", as: "blueEgg" },
        hand: [{ card: "BT24-032", as: "pipomon" }],
        deck: [{ card: "BT1-009", as: "draw" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueEgg").permanentId,
        instanceId: s.inst("pipomon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("pipomon").instanceId);
    expect(s.perm("blueEgg").topCard.instanceId).toBe(s.inst("blueEgg").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("draw").instanceId]);
  });

  it("digivolves from a non-Appmon yellow level-2 Digi-Egg through the normal route with cost 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT1-006", as: "base" },
        hand: [{ card: "BT24-032", as: "pipomon" }],
        deck: [{ card: "BT1-009", as: "bonusDraw" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("pipomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("pipomon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("pipomon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
  });

  it("rejects linking from a non-Appmon host without moving the card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "host" }],
        hand: [{ card: "BT24-032", as: "pipomon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("pipomon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: false, reason: "link-requirement-unmet" });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("pipomon").instanceId);
    expect(s.perm("host").linked).toHaveLength(0);
    expect(s.state.memory).toBe(3);
  });
});
