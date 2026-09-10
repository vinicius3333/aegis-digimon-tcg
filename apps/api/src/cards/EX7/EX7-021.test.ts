import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-021.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>) {
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("EX7-021 CrysPaledramon", () => {
  it("matches the catalog and compiles every printed clause", () => {
    expect(getCardDefinition("EX7-021")).toMatchObject({
      cardId: "EX7-021",
      nameEn: "CrysPaledramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Data"],
      types: ["Dragonkin", "Ice-Snow"],
      effectText:
        "＜Ice Clad＞ (This Digimon compares its number of digivolution cards instead of DP in battles other than with security Digimon)\n[When Digivolving] Trash any 2 digivolution cards of your opponent's Digimon. Then, if your opponent has no Digimon with digivolution cards, unsuspend this Digimon.\n[Rule] Trait: Has the [Ice-Snow] type.",
      inheritedEffectText:
        "[Your Turn] While your opponent has no Digimon with digivolution cards, this Digimon with the [Ice-Snow]\u00a0trait gains ＜Piercing＞and ＜Security Attack +1＞.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "IceClad", raw: "＜Ice Clad＞" }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "TrashDigivolution",
          target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" }, count: "all" },
          scope: "acrossDigimon",
          amount: 2,
          fromTop: false,
        },
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: { kind: "opponentHasNone" },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")).toMatchObject({
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Ice-Snow"] }],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          effect: { kind: "keyword", keyword: { keyword: "Piercing" } },
          while: { kind: "allOf" },
        },
        {
          kind: "Aura",
          effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
          while: { kind: "allOf" },
        },
      ],
    });
  });

  it("publicly trashes any two opposing sources across two stacks, then unsuspends itself", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-037", as: "source", suspended: true }],
        hand: [{ card: "EX7-021", as: "crys" }],
        deck: ["BT1-028", "BT1-009"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first", under: ["BT1-028"] },
          { card: "BT1-014", as: "second", under: ["BT1-028"] },
        ],
        deck: ["BT1-028", "BT1-009"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("crys").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX7-021");
    expect(s.state.memory).toBe(2);
    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.every((p) => p.stack.length === 0)).toBe(true);
    expect(s.state.players[1]!.trash.filter((card) => card.cardId === "BT1-028")).toHaveLength(2);
    await stopLoop(s, loop);
  });

  it("keeps itself suspended when one opposing source remains after the two-card trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-037", as: "source", suspended: true }],
          hand: [{ card: "EX7-021", as: "crys" }],
          deck: ["BT1-028"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "first", under: ["BT1-028", "BT1-028", "BT1-028"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("crys").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX7-021");
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.perm("first").stack).toHaveLength(1);
  });

  it("Q6041: treats an opponent with no Digimon as having no Digimon with digivolution cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-037", as: "source", suspended: true }],
        hand: [{ card: "EX7-021", as: "crys" }],
        deck: ["BT1-028"],
      },
      1: { battleArea: [] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("crys").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX7-021");
    expect(s.perm("source").isSuspended).toBe(false);
  });

  it("exposes Ice Clad and the Rule-granted Ice-Snow trait on the live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX7-021", as: "crys" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("crys"), "IceClad")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("crys"), "Ice-Snow")).toBe(true);
  });

  it("uses source count for Ice Clad in Digimon battles, not for Security battles", async () => {
    const battle = setupEngine({
      0: { battleArea: [{ card: "EX7-021", as: "crys", dp: 1000, under: ["BT1-028"] }], deck: ["BT1-028"] },
      1: { battleArea: [{ card: "BT1-014", as: "defender", dp: 10000, suspended: true }], deck: ["BT1-028"] },
    });
    const battleLoop = battle.engine.startTurnLoop();
    await advance(battle.engine).waitForMainPhase(0);
    expect(
      battle.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: battle.perm("crys").permanentId,
        target: { kind: "permanent", permanentId: battle.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(battle.engine).isAttacking());
    expect(battle.state.players[1]!.battleArea).toHaveLength(0);
    expect(battle.perm("crys").stack).toHaveLength(1);
    await stopLoop(battle, battleLoop);

    const security = setupEngine({
      0: { battleArea: [{ card: "EX7-021", as: "crys", dp: 1000, under: ["BT1-028"] }], deck: ["BT1-028"] },
      1: { security: ["BT1-028"], deck: ["BT1-028"] },
    });
    const securityLoop = security.engine.startTurnLoop();
    await advance(security.engine).waitForMainPhase(0);
    expect(
      security.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: security.perm("crys").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(security.engine).isAttacking());
    expect(security.state.players[1]!.security).toHaveLength(0);
    expect(security.state.players[0]!.battleArea).toHaveLength(0);
    await stopLoop(security, securityLoop);
  });

  it("legally evolves from Blue Lv4 with cost 3, draws once, and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-037", as: "source" }],
        hand: [{ card: "EX7-021", as: "crys" }],
        deck: ["BT1-028", "BT1-009", "BT1-014"],
      },
      1: { battleArea: [{ card: "BT1-009" }] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;
    const sourceInstanceId = s.perm("source").topCard.instanceId;
    const drawInstanceId = s.state.players[0]!.deck[0]!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("crys").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX7-021");
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawInstanceId);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceInstanceId]);
    await stopLoop(s, loop);
  });

  it("rejects a wrong-color or wrong-level source without paying, drawing, or changing its stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "wrongSource" }],
        hand: [{ card: "EX7-021", as: "crys" }],
        deck: ["BT1-028"],
      },
    });
    await s.ready();
    s.state.memory = 5;
    const beforeDeck = s.state.players[0]!.deck.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongSource").permanentId,
        instanceId: s.inst("crys").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(beforeDeck);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX7-021");
    expect(s.perm("wrongSource").topCard.cardId).toBe("BT1-009");
    expect(s.perm("wrongSource").stack).toHaveLength(0);
  });

  it("grants Piercing and Security Attack +1 on your turn only while the opponent has no stacked Digimon", async () => {
    const positive = setupEngine({
      0: { battleArea: [{ card: "BT11-026", as: "host", under: ["EX7-021"] }], deck: ["BT1-028"] },
      1: {
        battleArea: [{ card: "BT1-009", as: "bare" }],
        security: ["BT1-028", "BT1-028", "BT1-028"],
        deck: ["BT1-028", "BT1-028"],
      },
    });
    const loop = positive.engine.startTurnLoop();
    await advance(positive.engine).waitForMainPhase(0);
    expect(observe(positive.engine).hasEffectiveTrait(positive.perm("host"), "Ice-Snow")).toBe(true);
    expect(observe(positive.engine).hasPierce(positive.perm("host"))).toBe(true);
    expect(positive.perm("host").securityAttack).toBe(2);
    expect(
      positive.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: positive.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(positive.engine).isAttacking());
    expect(positive.state.players[1]!.security).toHaveLength(1);
    await stopLoop(positive, loop);

    const negative = setupEngine({
      0: { battleArea: [{ card: "BT11-026", as: "host", under: ["EX7-021"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "stacked", under: ["BT1-028"] }] },
    });
    await negative.ready();
    expect(observe(negative.engine).hasPierce(negative.perm("host"))).toBe(false);
    expect(negative.perm("host").securityAttack).toBe(1);
  });

  it("Q3842: gains Piercing at the post-battle source deletion timing and performs the check", async () => {
    let securityChecks = 0;
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT11-026", as: "host", under: ["EX7-021"] }], deck: ["BT1-028"] },
        1: {
          battleArea: [{ card: "BT1-014", as: "defender", dp: 3000, suspended: true, under: ["BT1-028"] }],
          security: ["BT1-028", "BT1-028", "BT1-028"],
          deck: ["BT1-028", "BT1-028"],
        },
      },
      {
        onEvent: (event) => {
          if (event.kind === "securityChecked") securityChecks += 1;
        },
      },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(securityChecks).toBe(2);
    await stopLoop(s, loop);
  });
});
