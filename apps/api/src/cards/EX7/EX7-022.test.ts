import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-022.js";
import "../index.js";

const FILLER = ["BT1-009", "BT1-011", "BT1-012", "BT1-013", "BT1-014"];
const SECURITY = ["BT1-013", "BT1-014", "BT1-013"];
const ATTACK_SECURITY = ["BT1-011", "BT1-011"];

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>) {
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
}

describe("EX7-022 ShogunGekomon", () => {
  it("matches the catalog, Q&A, and complete compiled IR", () => {
    expect(getCardDefinition("EX7-022")).toMatchObject({
      cardId: "EX7-022",
      nameEn: "ShogunGekomon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Amphibian", "NSp"],
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      effectText:
        "[Digivolve]Lv.4 w/[NSp]\u00a0trait: Cost 3 \n\n[On Play] 1 of your opponent's Digimon or Tamers can't suspend until the end of their turn.\n[Your Turn] All of your Digimon with the [NSp]\u00a0trait can't have their attack targets switched.",
    });
    expect(digivolutionRequirementsFor("EX7-022")).toEqual([{ level: 4, traits: ["NSp"], cost: 3, isAlternate: true }]);
    expect(compiled.effects).toEqual([
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "Restrict",
            target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
            restriction: "suspend",
            duration: "untilOpponentTurnEnd",
          },
        ],
      },
      {
        trigger: "YourTurn",
        actions: [
          {
            kind: "Restrict",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["NSp"], match: "trait" }],
              },
              count: "all",
            },
            restriction: "attackTargetChange",
            duration: "forTheTurn",
          },
        ],
      },
    ]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("publicly plays, targets exactly one opposing Tamer, and expires that suspend restriction after the opponent turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-022", as: "shogun" }],
          battleArea: [
            { card: "EX7-018", as: "nsp" },
            { card: "BT1-009", as: "other" },
          ],
          deck: [...FILLER],
          security: SECURITY,
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "opponentDigimon" },
            { card: "BT1-031", as: "blocker" },
            { card: "BT1-085", as: "chosenTamer" },
          ],
          deck: [...FILLER],
          security: ATTACK_SECURITY,
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("chosenTamer").instanceId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shogun").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("shogun").topCard?.instanceId === s.inst("shogun").instanceId);

    expect(s.state.memory).toBe(3);
    expect(observe(s.engine).isRestricted(s.perm("chosenTamer"), "suspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentDigimon"), "suspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("blocker"), "suspend")).toBe(false);
    await advance(s.engine).verb.suspend([s.perm("chosenTamer").permanentId]);
    expect(s.perm("chosenTamer").isSuspended).toBe(false);

    expect(observe(s.engine).isRestricted(s.perm("shogun"), "attackTargetChange")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("nsp"), "attackTargetChange")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("other"), "attackTargetChange")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("nsp").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.events.some((event) => event.kind === "blockWindowOpened")).toBe(false);
    expect(s.perm("blocker").isSuspended).toBe(false);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).isRestricted(s.perm("chosenTamer"), "suspend")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).isRestricted(s.perm("chosenTamer"), "suspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("nsp"), "attackTargetChange")).toBe(true);
    await stopLoop(s, loop);
  });

  it("legally alternate-digivolves from an NSp Lv.4 for cost 3, draws, and preserves source identity", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-020", as: "source" }],
        hand: [{ card: "EX7-022", as: "shogun" }],
        deck: [
          { card: "BT1-009", as: "evolutionDraw" },
          { card: "BT1-011", as: "rest" },
        ],
        security: SECURITY,
      },
      1: { deck: [...FILLER], security: SECURITY },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    const sourceId = s.inst("source").instanceId;
    const shogunId = s.inst("shogun").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: shogunId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard?.instanceId === shogunId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("source").topCard?.cardId).toBe("EX7-022");
    expect(s.perm("source").topCard?.instanceId).toBe(shogunId);
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("evolutionDraw").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("rest").instanceId]);
    expect(s.state.pendingDecision).toBeUndefined();
    await stopLoop(s, loop);
  });

  it("rejects a Red Lv.4 source without payment, stacking, or drawing", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "wrongSource" }],
        hand: [{ card: "EX7-022", as: "shogun" }],
        deck: [
          { card: "BT1-009", as: "evolutionDraw" },
          { card: "BT1-011", as: "rest" },
        ],
        security: SECURITY,
      },
      1: { deck: [...FILLER], security: SECURITY },
    });
    await s.ready();
    s.state.memory = 6;
    const beforeHand = s.state.players[0]!.hand.map((card) => card.instanceId);
    const beforeDeck = s.state.players[0]!.deck.map((card) => card.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("wrongSource").permanentId,
        instanceId: s.inst("shogun").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(6);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(beforeHand);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(beforeDeck);
    expect(s.perm("wrongSource").topCard?.cardId).toBe("BT1-014");
    expect(s.perm("wrongSource").stack).toHaveLength(0);
  });
});
