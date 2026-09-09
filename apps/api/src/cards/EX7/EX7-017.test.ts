import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-017.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>) {
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("EX7-017 SnowAgumon", () => {
  it("matches the catalog and compiles every printed clause", () => {
    expect(getCardDefinition("EX7-017")).toMatchObject({
      cardId: "EX7-017",
      nameEn: "SnowAgumon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Dinosaur", "Ice-Snow"],
      effectText:
        "＜Ice Clad＞ (This Digimon compares its number of digivolution cards instead of DP in battles other than with security Digimon)\n[Rule] Trait: Has the [Ice-Snow] type.",
      inheritedEffectText:
        "[When Attacking] [Once Per Turn] Trash the top digivolution card of 1 of your opponent's Digimon.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "IceClad", raw: "＜Ice Clad＞" }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")).toMatchObject({
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "trait",
          tokens: ["Ice-Snow"],
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "TrashDigivolution",
          target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" }, count: 1 },
          amount: 1,
          fromTop: true,
        },
      ],
    });
  });

  it("exposes Ice Clad and the Rule-granted Ice-Snow trait on the live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX7-017", as: "snow" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("snow"), "IceClad")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("snow"), "Ice-Snow")).toBe(true);
  });

  it("uses digivolution-card count in a public Digimon battle, even when DP disagrees", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-017", as: "snow", dp: 2000, under: ["BT1-028", "BT1-028"] }] },
      1: { battleArea: [{ card: "BT1-014", as: "defender", dp: 10000, suspended: true }], deck: ["BT1-028"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("snow").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("keeps the Security battle carve-out: DP, not Ice Clad source count, decides security combat", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-017", as: "snow", under: ["BT1-028", "BT1-028"] }], deck: ["BT1-028"] },
      1: { security: ["BT1-014", "BT1-014"], deck: ["BT1-028", "BT1-028"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("snow").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("hatches a legal Blue Lv2 evolution, pays zero, draws once, and preserves the source stack", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT1-003", as: "egg" }],
          hand: [{ card: "EX7-017", as: "snow" }],
          deck: ["BT1-028", "BT1-009"],
          security: ["BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard.cardId === "BT1-003");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard.instanceId;
    const breedingPermanentId = s.state.players[0]!.breeding!.permanentId;
    const drawInstanceId = s.state.players[0]!.deck[0]!.instanceId;
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: breedingPermanentId,
        instanceId: s.inst("snow").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard.cardId === "EX7-017");
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawInstanceId);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.breeding!.stack.map((card) => card.instanceId)).toEqual([eggInstanceId]);
    await stopLoop(s, loop);
  });

  it("rejects a non-Blue level-2 source without paying, drawing, or changing the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-001", as: "wrongSource" }],
        hand: [{ card: "EX7-017", as: "snow" }],
        deck: ["BT1-028"],
      },
    });
    await s.ready();
    s.state.memory = 3;
    const beforeDeck = s.state.players[0]!.deck.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongSource").permanentId,
        instanceId: s.inst("snow").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(beforeDeck);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX7-017");
    expect(s.perm("wrongSource").topCard.cardId).toBe("BT1-001");
    expect(s.perm("wrongSource").stack).toHaveLength(0);
  });

  it("trashes only the opponent's top source once per turn, refuses same-turn reuse, and resets next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", dp: 5000, under: ["EX7-017"] }],
          hand: ["BT1-028"],
          deck: ["BT1-028", "BT1-028", "BT1-028", "BT1-028"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target", under: ["EX7-018", "EX7-018"] }],
          security: ["BT1-028", "BT1-028", "BT1-028"],
          deck: ["BT1-028", "BT1-028", "BT1-028", "BT1-028"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["EX7-018"]);

    // The public attack intent is real; this structural verb only reopens the second attack
    // in the same Main window because no ordinary card in this fixture can unsuspend the host.
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("target").stack).toHaveLength(1);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0);
    expect(s.perm("target").stack).toHaveLength(0);
    assertNoLoudGap(s);
    await stopLoop(s, loop);
  });
});
