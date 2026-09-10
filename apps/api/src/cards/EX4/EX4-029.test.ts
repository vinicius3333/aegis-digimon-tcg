import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle, settleAcrossTimers } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX4-029.js";
import "../BT4/BT4-108.js";
import "../BT14/BT14-096.js";

describe("EX4-029 Antylamon", () => {
  it("registers the catalog identity and complete residual-free IR", () => {
    expect(getCardDefinition("EX4-029")).toMatchObject({
      cardId: "EX4-029",
      nameEn: "Antylamon",
      colors: ["Yellow", "Green"],
      level: 5,
      playCost: 8,
      dp: 8000,
      evoCosts: [
        { color: "Yellow", level: 4, memoryCost: 4 },
        { color: "Green", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Holy Beast", "Deva"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(runtimeCompiledCard("EX4-029")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("encodes the green two-color level-4 alternate route and both printed effects", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, multicolor: true, colorCount: 2, colors: ["Green"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          actions: [],
          keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
        }),
        expect.objectContaining({
          trigger: "EndOfAttack",
          actions: [
            expect.objectContaining({
              kind: "SecurityManipulation",
              op: "placeFromDeck",
              controller: "mine",
              amount: 1,
              toTop: true,
              condition: expect.objectContaining({
                kind: "zoneCount",
                seat: "mine",
                zone: "security",
                op: "lte",
                value: 3,
              }),
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "EndOfAttack",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            expect.objectContaining({
              kind: "ModifyDP",
              amount: -2000,
              duration: "forTheTurn",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            }),
          ],
        }),
      ]),
    );
  });

  it.each([
    ["yellow", "BT12-037"],
    ["green", "ST18-07"],
  ])("digivolves from a %s level-4 Digimon for the ordinary cost of 4", async (_color, baseCard) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "EX4-029", as: "antylamon" }],
        deck: ["BT1-009", "BT1-013"],
      },
      1: { deck: ["BT1-009"] },
    });
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("antylamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-029");
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([baseCard]);
    expect(s.perm("base").topCard.cardId).toBe("EX4-029");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("digivolves from a green two-color level-4 Digimon for the alternate cost of 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT12-036", as: "mikemon" }],
        hand: [{ card: "EX4-029", as: "antylamon" }],
        deck: ["BT1-009", "BT1-013"],
      },
      1: { deck: ["BT1-009"] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("mikemon").permanentId,
        instanceId: s.inst("antylamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mikemon").topCard.cardId === "EX4-029");
    expect(s.state.memory).toBe(0);
    expect(s.perm("mikemon").stack.map((card) => card.cardId)).toEqual(["BT12-036"]);
    expect(s.perm("mikemon").topCard.cardId).toBe("EX4-029");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("rejects the alternate route from a two-color level-4 Digimon without green", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-018", as: "invalidSource" }],
        hand: [{ card: "EX4-029", as: "antylamon" }],
        deck: ["BT1-009"],
      },
      1: { deck: ["BT1-013"] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidSource").permanentId,
        instanceId: s.inst("antylamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(3);
    expect(s.perm("invalidSource").topCard.cardId).toBe("BT16-018");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX4-029");
  });

  it("resolves Alliance through the public attack decision and excludes attacker/opponent cards", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        battleArea: [
          { card: "EX4-029", as: "attacker", dp: 8000 },
          { card: "BT1-064", as: "ally", dp: 3000 },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-019", as: "target", dp: 6000, suspended: true },
          { card: "ST18-07", as: "blocker", dp: 7000 },
        ],
      },
    });
    await s.ready();
    expect(s.perm("attacker").keywords).toContain("Alliance");
    const baseDP = s.perm("attacker").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    const prompt = s.events.find((event) => event.kind === "alliancePrompt") as
      | { eligibleAllyIds: string[] }
      | undefined;
    expect(prompt?.eligibleAllyIds).toEqual([s.perm("ally").permanentId]);
    expect(prompt?.eligibleAllyIds).not.toContain(s.perm("attacker").permanentId);
    expect(prompt?.eligibleAllyIds).not.toContain(s.perm("target").permanentId);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").isSuspended);
    expect(s.perm("attacker").currentDP).toBe(baseDP + 3000);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(1);
  });

  it("allows Alliance to be declined without suspending the ally or changing DP", async () => {
    const s = setupEngine({
      0: {
        deck: ["BT1-009", "BT1-009", "BT1-009"],
        battleArea: [
          { card: "EX4-029", as: "attacker", dp: 8000 },
          { card: "BT1-064", as: "ally", dp: 3000 },
        ],
      },
      1: { security: ["BT1-090", "BT1-090"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(0, { type: "respondAlliance" })).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(s.perm("attacker").currentDP).toBe(8000);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(0);
  });

  it("recovers the deck top at three security and puts the exact card on top", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX4-029", as: "attacker" }],
        security: ["BT1-090", "BT1-090", "BT1-090"],
        deck: [{ card: "BT1-013", as: "recovery" }, "BT1-009"],
      },
      1: { security: ["BT1-090", "BT1-090"] },
    });
    const recoveryId = s.inst("recovery").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some(({ instanceId }) => instanceId === recoveryId));
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.security[0]?.instanceId).toBe(recoveryId);
    expect(s.state.players[0]!.deck[0]?.cardId).toBe("BT1-009");
  });

  it("does not recover when the attack starts with four security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX4-029", as: "attacker" }],
        security: ["BT1-090", "BT1-090", "BT1-090", "BT1-090"],
        deck: [{ card: "BT1-013", as: "recovery" }, "BT1-009"],
      },
      1: { security: ["BT1-090"] },
    });
    const recoveryId = s.inst("recovery").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).not.toContain(recoveryId);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(recoveryId);
  });

  it("applies the inherited reduction after a public attack only with another suspended ally", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-076", as: "host", under: ["EX4-029"], dp: 12000 },
          { card: "BT1-064", as: "suspendedAlly", dp: 3000, suspended: true },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-019", as: "target", dp: 6000, suspended: true },
          { card: "BT1-019", as: "victim", dp: 6000 },
        ],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("victim").currentDP === 4000);
    expect(s.perm("victim").currentDP).toBe(4000);
  });

  it("does not apply the inherited reduction when no other own Digimon is suspended", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-076", as: "host", under: ["EX4-029"], dp: 12000 }] },
      1: {
        battleArea: [
          { card: "BT1-019", as: "target", dp: 6000, suspended: true },
          { card: "BT1-019", as: "victim", dp: 6000 },
        ],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);
    expect(s.perm("victim").currentDP).toBe(6000);
  });

  it("limits the inherited reduction to once per turn across two public attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-076", as: "host", under: ["EX4-029"], dp: 12000 },
            { card: "BT1-064", as: "suspendedAlly", suspended: true },
          ],
          hand: [{ card: "BT4-108", as: "unsuspendOption" }],
        },
        1: {
          battleArea: [
            { card: "BT1-019", as: "first", dp: 6000, suspended: true },
            { card: "BT1-019", as: "second", dp: 6000, suspended: true },
            { card: "BT1-019", as: "firstVictim", dp: 6000 },
            { card: "BT1-019", as: "secondVictim", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("first").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("second").currentDP === 4000);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspendOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("second").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended && s.perm("firstVictim").currentDP === 6000);
    expect([s.perm("firstVictim").currentDP, s.perm("secondVictim").currentDP]).toEqual([6000, 6000]);
  });

  it("re-arms the inherited allowance on the next own turn through public play and attack flows", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          battleArea: [
            { card: "BT1-076", as: "host", under: ["EX4-029"], dp: 12000 },
            { card: "BT1-064", as: "suspendedAlly", suspended: true },
            { card: "BT1-064", as: "activeAlly", dp: 12000 },
            { card: "BT1-089", as: "mimi" },
          ],
          hand: [{ card: "BT14-096", as: "lockOption" }],
        },
        1: {
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-090", "BT1-090"],
          battleArea: [
            { card: "BT1-019", as: "first", dp: 6000, suspended: true },
            { card: "BT1-019", as: "second", dp: 6000 },
            { card: "BT1-019", as: "victim", dp: 6000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("first").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("second").currentDP === 4000);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("activeAlly").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.perm("activeAlly").isSuspended);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lockOption").instanceId })).toEqual({
      ok: true,
    });
    await settleAcrossTimers(() => s.perm("second").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("second").permanentId },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.perm("victim").currentDP === 4000);
    expect(s.perm("victim").currentDP).toBe(4000);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
