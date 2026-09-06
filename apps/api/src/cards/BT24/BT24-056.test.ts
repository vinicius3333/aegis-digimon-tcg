import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-056.js";
import "../index.js";

describe("BT24-056 Dezipmon", () => {
  it("protects System/Life/Transmutation Digimon and deletes on linking", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.appFusionRequirement).toBeUndefined();
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(compiled.digivolutionRequirement).toEqual([{ traits: ["Stnd."], cost: 2, isAlternate: false }]);
    expect(compiled.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Blocker" }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [{ kind: "Restrict", restriction: "beReturned", byOpponentEffectsOnly: true }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toBeDefined();
    expect(compiled.effects.find((effect) => effect.trigger === "WhenLinking")).toMatchObject({
      isLinked: true,
      actions: [{ kind: "Delete", target: { filter: { playCostLte: 5 } } }],
    });
  });

  it("restricts returning an own Life Digimon after being played", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-056", as: "source" },
            { card: "BT24-038", as: "protected" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => observe(s.engine).isRestricted(s.perm("protected"), "beReturned"));

    expect(observe(s.engine).isRestricted(s.perm("protected"), "beReturned")).toBe(true);
  });

  it("recognizes the catalog Transmutation trait behind the printed App Name qualifier", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-056", as: "source" },
            { card: "BT24-079", as: "protected" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => observe(s.engine).isRestricted(s.perm("protected"), "beReturned"));

    expect(observe(s.engine).isRestricted(s.perm("protected"), "beReturned")).toBe(true);
  });

  it("blocks a return while protection is active and permits an own return", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-056", as: "source" },
            { card: "BT24-036", as: "protected" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").permanentId);
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => observe(s.engine).isRestricted(s.perm("protected"), "beReturned"));

    advance(s.engine).verb.enterEffectResolution(1, ["Option"], "opponent-effect");
    await advance(s.engine).verb.returnToHand([s.perm("protected").topCard.instanceId]);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("protected").permanentId)).toBe(true);

    await advance(s.engine).verb.returnToHand([s.perm("protected").topCard.instanceId]);
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT24-036")).toBe(true);
  });

  it("public play protects a Life Digimon and does not revive from trash", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-038", as: "protected" }],
          hand: [{ card: "BT24-056", as: "dezipmon" }],
          trash: [{ card: "BT21-009", as: "appmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").permanentId, s.inst("appmon").instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dezipmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("protected"), "beReturned"));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("appmon").instanceId);
  });

  it("normal evolution costs 2 and resolves the same protection without revival", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-036", as: "base" },
            { card: "BT24-038", as: "protected" },
          ],
          hand: [{ card: "BT24-056", as: "dezipmon" }],
          trash: [{ card: "BT21-009", as: "appmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").permanentId, s.inst("appmon").instanceId);
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dezipmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("dezipmon").instanceId);
    await settle(() => observe(s.engine).isRestricted(s.perm("protected"), "beReturned"));
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("appmon").instanceId);
  });

  it("has Blocker and leaves an Appmon in the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-056", as: "source" }],
          trash: [{ card: "BT21-009", as: "appmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("source"), "Blocker")).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("appmon").instanceId);
  });

  it("accepts a non-black Standard-grade level 3 for cost 2", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-067", as: "base" }], hand: [{ card: "BT24-056", as: "dezipmon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dezipmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT24-056");
    expect(s.state.memory).toBe(3);
  });

  it("rejects an evolution source without Standard grade", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-022", as: "base" }], hand: [{ card: "BT24-056", as: "dezipmon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dezipmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
  });

  it("rejects a same-level non-Standard source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT24-056", as: "dezipmon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dezipmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
  });

  it("expires protection after the opponent's turn ends", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-056", as: "source" },
            { card: "BT24-036", as: "protected" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: { deck: ["BT1-004", "BT1-005", "BT1-006"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("protected").permanentId);
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => observe(s.engine).isRestricted(s.perm("protected"), "beReturned"));
    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).isRestricted(s.perm("protected"), "beReturned")).toBe(true);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    advance(s.engine).verb.enterEffectResolution(1, ["Option"], "opponent-effect");
    await advance(s.engine).verb.returnToHand([s.perm("protected").topCard.instanceId]);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.state.players[0]!.hand.some((c) => c.cardId === "BT24-036")).toBe(true);
  });

  it("links for cost 2, adds 3000 DP, and deletes only a play-cost-5 target", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT24-056", as: "dezipmon" }],
        },
        1: {
          battleArea: [
            { card: "BT24-056", as: "low" },
            { card: "BT24-051", as: "high" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("high").topCard.instanceId, s.perm("low").topCard.instanceId);
    s.state.memory = 5;
    await s.ready();
    const hostDp = s.perm("host").currentDP;
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("dezipmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("dezipmon").instanceId));
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowId));

    expect(s.state.memory).toBe(3);
    expect(s.perm("host").currentDP).toBe(hostDp + 3000);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highId)).toBe(true);
  });
});
