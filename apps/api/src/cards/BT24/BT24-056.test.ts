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
          deck: ["BT1-013", "BT1-015", "BT1-045"],
        },
        1: { deck: ["BT1-009", "BT1-011", "BT1-013"] },
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

  it("publicly refuses an opponent's hand return while allowing the own effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-056", as: "dezipmon" },
            { card: "BT24-038", as: "life" },
          ],
        },
        1: { battleArea: [{ card: "BT12-032", as: "blue" }], hand: [{ card: "ST2-16", as: "option" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();
    const lifeId = s.perm("life").topCard.instanceId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dezipmon"));
    await settle(() => observe(s.engine).isRestricted(s.perm("life"), "beReturned"));
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === lifeId)).toBe(true);
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === lifeId)).toBe(false);
  });

  it("publicly refuses an opponent's deck return while the duration is active", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT24-056", as: "dezipmon" },
            { card: "BT24-038", as: "life" },
          ],
        },
        1: { battleArea: [{ card: "BT12-032", as: "blue" }], hand: [{ card: "BT12-102", as: "option" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();
    const lifeId = s.perm("life").topCard.instanceId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dezipmon"));
    await settle(() => observe(s.engine).isRestricted(s.perm("life"), "beReturned"));
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === lifeId)).toBe(true);
    expect(s.state.players[0]!.deck.some((c) => c.instanceId === lifeId)).toBe(false);
  });

  it("publicly declares Blocker and proves a public refusal proceeds to security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT24-056", as: "blocker" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blocked"));
    expect(s.perm("blocker").isSuspended).toBe(true);

    const refusal = setupEngine({
      0: { battleArea: [{ card: "BT24-056", as: "blocker" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    refusal.state.turnSeat = 1;
    await refusal.ready();
    expect(
      refusal.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: refusal.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => refusal.events.some((event) => event.kind === "blockWindowOpened"));
    expect(refusal.engine.applyIntent(0, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => refusal.events.some((event) => event.kind === "securityChecked"));
    expect(refusal.perm("blocker").isSuspended).toBe(false);
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

  it("pays the full link cost even when memory crosses to the opponent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-009", as: "host" }], hand: [{ card: "BT24-056", as: "dezipmon" }] },
    });
    s.state.memory = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("dezipmon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("dezipmon").instanceId));
    expect(s.state.memory).toBe(-1);
  });

  it("refuses linking onto an opponent host without paying or moving the Appmon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-009", as: "ownHost" }], hand: [{ card: "BT24-056", as: "dezipmon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponentHost" }] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("dezipmon").instanceId,
        targetPermanentId: s.perm("opponentHost").permanentId,
      }),
    ).toEqual({ ok: false, reason: "no-such-permanent" });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("dezipmon").instanceId);
    expect(s.perm("opponentHost").linked).toHaveLength(0);
  });
});
