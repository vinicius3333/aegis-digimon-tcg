import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-019.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>) {
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("EX7-019 Sorcermon", () => {
  it("matches the catalog and compiles every printed clause", () => {
    expect(getCardDefinition("EX7-019")).toMatchObject({
      cardId: "EX7-019",
      nameEn: "Sorcermon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Wizard", "Witchelny", "Ice-Snow"],
      effectText:
        "＜Blocker＞ \n[On Play] If your opponent has no Digimon with digivolution cards, unsuspend 1 of your Digimon.\n[Rule] Trait: Has the [Ice-Snow] type.",
      inheritedEffectText:
        "[When Attacking] [Once Per Turn] Trash the top digivolution card of 1 of your opponent's Digimon.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")).toMatchObject({
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          condition: {
            kind: "opponentHasNone",
            filter: { kind: ["Digimon"], digivolutionCards: "hasAny" },
          },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")).toMatchObject({
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Ice-Snow"] }],
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

  it("publicly plays into a source-less opponent state and unsuspends exactly one chosen ally", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-028", as: "ally", suspended: true }],
          hand: [{ card: "EX7-019", as: "sorcer" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "bare" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("ally").topCard.instanceId);
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sorcer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("ally").isSuspended);
    expect(s.perm("ally").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("sorcer"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("sorcer"), "Ice-Snow")).toBe(true);
  });

  it("does not unsuspend when any opposing Digimon has an evolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-028", as: "ally", suspended: true }],
          hand: [{ card: "EX7-019", as: "sorcer" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "stacked", under: ["BT1-028"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("sorcer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX7-019"));
    expect(s.perm("ally").isSuspended).toBe(true);
  });

  it("uses Blocker through a real opponent attack and block declaration", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-019", as: "blocker" }], deck: ["BT1-028"], security: ["BT1-028"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], deck: ["BT1-028", "BT1-028"] },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
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
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX7-019")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    await stopLoop(s, loop);
  });

  it("legally evolves from Blue Lv3 with cost 2, draws once, and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-028", as: "source" }],
        hand: [{ card: "EX7-019", as: "sorcer" }],
        deck: ["BT1-009", "BT1-014"],
      },
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
        instanceId: s.inst("sorcer").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX7-019");
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawInstanceId);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceInstanceId]);
    await stopLoop(s, loop);
  });

  it("rejects a wrong-color Level 3 evolution source without mutation", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "wrongSource" }],
        hand: [{ card: "EX7-019", as: "sorcer" }],
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
        instanceId: s.inst("sorcer").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(beforeDeck);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("EX7-019");
    expect(s.perm("wrongSource").topCard.cardId).toBe("BT1-009");
    expect(s.perm("wrongSource").stack).toHaveLength(0);
  });

  it("trashes only a stacked opponent's top source once per turn, refusing same-turn reuse and resetting next turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", dp: 5000, under: ["EX7-019"] }],
          hand: ["BT1-028"],
          deck: ["BT1-028", "BT1-028", "BT1-028", "BT1-028"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "stacked", under: ["EX7-018", "EX7-018"] },
            { card: "BT1-014", as: "bare" },
          ],
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
    await settle(() => s.perm("stacked").stack.length === 1);
    expect(s.perm("stacked").stack.map((card) => card.cardId)).toEqual(["EX7-018"]);

    // Public attacks are real; this structural unsuspend only reopens a second attack in the
    // same Main window because the fixture intentionally has no unsuspend card effect.
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("stacked").stack).toHaveLength(1);

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
    await settle(() => s.perm("stacked").stack.length === 0);
    expect(s.perm("stacked").stack).toHaveLength(0);
    assertNoLoudGap(s);
    await stopLoop(s, loop);
  });
});
