import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT24-056.js";
import "../index.js";

describe("BT24-056 Dezipmon", () => {
  it("protects System/Life/Transmutation Digimon, revives Appmon, and deletes on linking", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Hackmon", "Protecmon", "Pipomon"], cost: 0 }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 2 }]);
    expect(compiled.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Blocker" }],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        { kind: "Restrict", restriction: "beReturned", byOpponentEffectsOnly: true },
        { kind: "PlayWithoutCost", from: ["trash"], payCost: false },
      ],
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

  it("public play protects a Life Digimon and revives an Appmon without paying", async () => {
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
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("appmon").instanceId),
    );

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("normal evolution costs 2 and resolves the same protection and revival", async () => {
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
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("appmon").instanceId),
    );

    expect(s.state.memory).toBe(3);
  });

  it("has Blocker and plays an Appmon from the trash without paying", async () => {
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
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("appmon").instanceId),
    );

    expect(s.state.players[0]!.trash).toHaveLength(0);
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
