import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-047.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop loop");
  await loop;
}

describe("EX7-047 Eldradimon", () => {
  it("matches the catalog, complete IR, alternate route, and exclusive registration", () => {
    expect(getCardDefinition("EX7-047")).toMatchObject({
      cardId: "EX7-047",
      nameEn: "Eldradimon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 4 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Mutant", "NSp"],
      effectText:
        "[Digivolve]Lv.5 w/[NSP]\u00a0trait: Cost 3 \n\n＜Blocker＞ \n[On Play] [When Digivolving] Reveal the top 4 cards of your deck. You may play up to 7 play cost's total worth of Digimon cards with the [NSp]\u00a0trait among them without paying the costs. Return the rest to the bottom of the deck.\n[End of Your Turn] [Once Per Turn] 2 of your Digimon may DNA digivolve into a Digimon card with the [NSp]\u00a0trait in your hand.",
    });
    expect(digivolutionRequirementsFor("EX7-047")).toContainEqual({
      level: 5,
      traits: ["NSp"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
      {
        trigger: "OnPlay",
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 4,
            add: [{ count: "all", totalPlayCostBudget: 7, to: "play", optional: true }],
            rest: "deckBottom",
          },
        ],
      },
      {
        trigger: "WhenDigivolving",
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 4,
            add: [{ count: "all", totalPlayCostBudget: 7, to: "play", optional: true }],
            rest: "deckBottom",
          },
        ],
      },
      {
        trigger: "EndOfYourTurn",
        frequency: "OncePerTurn",
        actions: [
          { kind: "DnaDigivolve", materials: { count: 2 }, into: { zone: "hand" }, payCost: true, optional: true },
        ],
      },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(hasRegisteredCompiledCard("EX7-047")).toBe(true);
  });

  it("publicly plays exactly 7 total NSp cost from the top 4 and bottoms the rest", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX7-047", as: "eldra" }],
          deck: [
            { card: "EX7-038", as: "cost3" },
            { card: "EX7-041", as: "cost4" },
            { card: "EX7-045", as: "cost7" },
            { card: "BT1-009", as: "miss" },
            { card: "BT1-011", as: "tail" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost3").instanceId, s.inst("cost4").instanceId);
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eldra").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("cost4").instanceId));
    expect(s.state.memory).toBe(-2);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(
      expect.arrayContaining(["EX7-047", "EX7-038", "EX7-041"]),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX7-045")).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("tail").instanceId,
      s.inst("cost7").instanceId,
      s.inst("miss").instanceId,
    ]);
  });

  it("alternate-evolves from an off-color NSp level 5 and resolves the same reveal", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-028", as: "base" }],
          hand: [{ card: "EX7-047", as: "eldra" }],
          deck: [
            { card: "BT1-009", as: "drawn" },
            { card: "EX7-038", as: "cost3" },
            { card: "EX7-041", as: "cost4" },
            { card: "EX7-045", as: "cost7" },
            { card: "BT1-011", as: "miss" },
            { card: "BT1-012", as: "tail" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost3").instanceId, s.inst("cost4").instanceId);
    s.state.memory = 6;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const eldraId = s.inst("eldra").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: eldraId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("cost4").instanceId));
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.instanceId).toBe(eldraId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("tail").instanceId,
      s.inst("cost7").instanceId,
      s.inst("miss").instanceId,
    ]);
  });

  it("rejects an off-color level 5 without NSp", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-020", as: "base" }],
        hand: [{ card: "EX7-047", as: "eldra" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("eldra").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").topCard.cardId).toBe("BT1-020");
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("uses Blocker publicly to redirect and survive an opponent's player attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-047", as: "eldra" }], security: ["BT1-009"] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("eldra").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerId));
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("DNA digivolves two legal materials from hand at the real end of turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX7-047", as: "eldra" },
            { card: "BT1-040", as: "blueMaterial" },
            { card: "BT10-064", as: "blackMaterial" },
          ],
          hand: [{ card: "BT18-041", as: "dna" }, "BT1-009"],
          deck: ["BT1-011", "BT1-012"],
        },
        1: { deck: ["BT1-013", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("blueMaterial").permanentId, s.perm("blackMaterial").permanentId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT18-041"));
    const result = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT18-041")!;
    expect(result.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-040", "BT10-064"]));
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.memory).toBe(3);
    await stopLoop(s, loop, 1);
  });

  it("does not offer end-turn DNA without an NSp Digimon in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-047", as: "eldra" }, "BT1-040", "BT10-064"],
        hand: ["BT1-009"],
        deck: ["BT1-011"],
      },
      1: { deck: ["BT1-013"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.decisions.filter((decision) => decision.req.kind === "optional")).toHaveLength(0);
    await stopLoop(s, loop, 1);
  });
});
