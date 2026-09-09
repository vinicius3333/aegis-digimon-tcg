import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-023.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1) {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok) {
    throw new Error("failed to stop the turn loop");
  }
  await loop;
}

describe("EX7-023 Hexeblaumon", () => {
  it("matches the catalog and compiles every printed clause", () => {
    const definition = getCardDefinition("EX7-023");
    if (definition === undefined) throw new Error("EX7-023 is missing from the card catalog");
    expect(definition).toMatchObject({
      cardId: "EX7-023",
      nameEn: "Hexeblaumon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Blue", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Magic Knight", "Witchelny", "Ice-Snow"],
      effectText:
        "＜Security Attack +1＞ \n＜Ice Clad＞ (This Digimon compares its number of digivolution cards instead of DP in battles other than with security Digimon)\n[When Digivolving] Trash any 4 digivolution cards of your opponent's Digimon. Then, if your opponent has no Digimon with digivolution cards, return 1 of your opponent's Tamers to the bottom of the deck.\n[Opponent's Turn] None of your opponent's Digimon with as many or fewer digivolution cards as this Digimon can suspend.\n[Rule] Trait: Has the [Ice-Snow] type.",
    });
    expect(definition.inheritedEffectText).toBeUndefined();
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.filter((entry) => entry.trigger === "Static")).toEqual([
      {
        trigger: "Static",
        actions: [],
        keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
      },
      {
        trigger: "Static",
        actions: [],
        keywords: [{ keyword: "IceClad", raw: "＜Ice Clad＞" }],
      },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        {
          kind: "TrashDigivolution",
          target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" }, count: "all" },
          scope: "acrossDigimon",
          amount: 4,
          fromTop: false,
        },
        {
          kind: "Return",
          target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: 1 },
          to: "deckBottom",
          condition: { kind: "opponentHasNone" },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({
      actions: [
        {
          kind: "Restrict",
          restriction: "suspend",
          duration: "permanent",
          target: { count: "all", filter: { digivolutionCardsCompareToSource: "lte" } },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")).toMatchObject({
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Ice-Snow"] }],
    });
  });

  it("publicly evolves from Blue Lv5 for 4 memory, draws once, trashes four sources, and bottoms one Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-038", as: "source" }],
          hand: [{ card: "EX7-023", as: "hex" }],
          deck: [{ card: "BT1-028", as: "drawn" }, "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", under: ["BT1-010", "BT1-011"] },
            { card: "BT1-014", as: "second", under: ["BT1-012", "BT1-013"] },
            { card: "BT10-090", as: "tamer" },
          ],
          deck: ["BT1-028"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 4;
    const sourceInstanceId = s.perm("source").topCard.instanceId;
    const drawInstanceId = s.state.players[0]!.deck[0]!.instanceId;
    const tamerInstanceId = s.inst("tamer").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("hex").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX7-023");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawInstanceId);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceInstanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.every((p) => p.stack.length === 0)).toBe(true);
    expect(
      s.state.players[1]!.trash.filter((card) => ["BT1-010", "BT1-011", "BT1-012", "BT1-013"].includes(card.cardId)),
    ).toHaveLength(4);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === tamerInstanceId)).toBe(false);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(tamerInstanceId);
    await stopLoop(s, loop, 0);
  });

  it("does not return the Tamer when a source-bearing Digimon remains after four cards are trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-038", as: "source" }],
          hand: [{ card: "EX7-023", as: "hex" }],
          deck: ["BT1-028"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", under: ["BT1-010", "BT1-011"] },
            { card: "BT1-014", as: "second", under: ["BT1-012", "BT1-013", "BT1-028"] },
            { card: "BT10-090", as: "tamer" },
          ],
          deck: ["BT1-028"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("hex").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX7-023");
    expect(
      s.state.players[1]!.battleArea.find((p) => p.topCard?.instanceId === s.inst("second").instanceId)?.stack,
    ).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("tamer").instanceId)).toBe(true);
  });

  it("exposes Security Attack +1, Ice Clad, and the Rule-granted Ice-Snow trait publicly", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-023", as: "hex" }], deck: ["BT1-028"] },
      1: { battleArea: [{ card: "BT1-009" }], security: ["BT1-028", "BT1-028", "BT1-028"], deck: ["BT1-028"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(s.perm("hex"), "SecurityAttack")).toBe(true);
    expect(s.perm("hex").securityAttack).toBe(2);
    expect(observe(s.engine).hasKeyword(s.perm("hex"), "IceClad")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("hex"), "Ice-Snow")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hex").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(1);
    await stopLoop(s, loop, 0);
  });

  it("uses source count for Ice Clad in Digimon battles and DP for Security battles", async () => {
    const battle = setupEngine({
      0: { battleArea: [{ card: "EX7-023", as: "hex", dp: 1000, under: ["BT1-028"] }], deck: ["BT1-028"] },
      1: { battleArea: [{ card: "BT1-014", as: "defender", dp: 10000, suspended: true }], deck: ["BT1-028"] },
    });
    const battleLoop = battle.engine.startTurnLoop();
    await advance(battle.engine).waitForMainPhase(0);
    expect(
      battle.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: battle.perm("hex").permanentId,
        target: { kind: "permanent", permanentId: battle.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(battle.engine).isAttacking());
    expect(battle.state.players[1]!.battleArea).toHaveLength(0);
    expect(battle.perm("hex").stack).toHaveLength(1);
    await stopLoop(battle, battleLoop, 0);

    const security = setupEngine({
      0: { battleArea: [{ card: "EX7-023", as: "hex", dp: 1000, under: ["BT1-028"] }], deck: ["BT1-028"] },
      1: { security: ["BT1-028"], deck: ["BT1-028"] },
    });
    const securityLoop = security.engine.startTurnLoop();
    await advance(security.engine).waitForMainPhase(0);
    expect(
      security.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: security.perm("hex").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(security.engine).isAttacking());
    expect(security.state.players[1]!.security).toHaveLength(0);
    expect(security.state.players[0]!.battleArea).toHaveLength(0);
    await stopLoop(security, securityLoop, 0);
  });

  it("blocks public suspension attacks for opposing Digimon with no more sources than Hexeblaumon, but allows more sources", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-023", as: "hex", under: ["BT1-028"] }],
        security: ["BT1-028", "BT1-028"],
        deck: ["BT1-028"],
      },
      1: {
        battleArea: [
          { card: "BT1-037", as: "low", under: ["BT1-028"] },
          { card: "BT1-037", as: "high", under: ["BT1-028", "BT1-028"] },
        ],
        deck: ["BT1-028", "BT1-028"],
      },
    });
    s.state.turnSeat = 1;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("low"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("high"), "suspend")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("low").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("high").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await stopLoop(s, loop, 1);
  });

  it("Q3844: a target that gains a second source during the opponent's turn can suspend", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-023", as: "hex", under: ["BT1-028"] }], deck: ["BT1-028"] },
      1: {
        battleArea: [{ card: "BT1-037", as: "target", under: ["BT1-028"] }],
        hand: [{ card: "BT1-038", as: "evolved" }],
        deck: ["BT1-028", "BT1-028"],
      },
    });
    s.state.turnSeat = 1;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("target"), "suspend")).toBe(true);
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("target").permanentId,
        instanceId: s.inst("evolved").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "BT1-038");
    expect(s.perm("target").stack).toHaveLength(2);
    expect(observe(s.engine).isRestricted(s.perm("target"), "suspend")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await stopLoop(s, loop, 1);
  });

  it("rejects a wrong-color and wrong-level source without paying, drawing, or changing the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "wrongSource" }],
        hand: [{ card: "EX7-023", as: "hex" }],
        deck: ["BT1-028"],
      },
    });
    await s.ready();
    s.state.memory = 4;
    const beforeDeck = s.state.players[0]!.deck.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongSource").permanentId,
        instanceId: s.inst("hex").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(beforeDeck);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX7-023");
    expect(s.perm("wrongSource").topCard.cardId).toBe("BT1-009");
    expect(s.perm("wrongSource").stack).toHaveLength(0);
  });
});
