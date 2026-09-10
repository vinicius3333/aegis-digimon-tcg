import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-045.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop loop");
  await loop;
}

describe("EX7-045 Jagamon", () => {
  it("matches the catalog, complete IR, alternate route, and exclusive registration", () => {
    expect(getCardDefinition("EX7-045")).toMatchObject({
      cardId: "EX7-045",
      nameEn: "Jagamon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Vegetation", "NSp"],
      effectText:
        "[Digivolve]Lv.4 w/[NSp]\u00a0trait: Cost 3 \n\n[On Play] ＜De-Digivolve1＞ 1 of your opponent's Digimon (Trash the top card. You can't trash past level 3 cards)\n[Opponent's Turn] All of your Digimon with the [NSp]\u00a0trait gain ＜Blocker＞.",
    });
    expect(digivolutionRequirementsFor("EX7-045")).toContainEqual({
      level: 4,
      traits: ["NSp"],
      cost: 3,
      isAlternate: true,
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "DeDigivolve",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: 1,
              stopAtLevel: 3,
            },
          ],
        },
        {
          trigger: "OpponentsTurn",
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["NSp"], match: "trait" }],
                },
                count: "all",
              },
              keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
              duration: "permanent",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 4, traits: ["NSp"], cost: 3, isAlternate: true }],
    });
    expect(hasRegisteredCompiledCard("EX7-045")).toBe(true);
  });

  it("publicly pays 7 and de-digivolves exactly one opposing card on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX7-045", as: "jaga" }] },
        1: { battleArea: [{ card: "EX7-014", as: "target", under: ["EX7-011"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jaga").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "EX7-011");
    expect(s.state.memory).toBe(3);
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("EX7-014");
  });

  it("alternate-evolves from an off-color NSp level 4 with exact payment, draw, and stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-018", as: "base" }],
        hand: [{ card: "EX7-045", as: "jaga" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 6;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const jagaId = s.inst("jaga").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: jagaId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === jagaId);
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("rejects an off-color non-NSp level 4 without mutating state", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "base" }],
        hand: [{ card: "EX7-045", as: "jaga" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 6;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jaga").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(6);
    expect(s.perm("base").topCard.cardId).toBe("BT1-015");
    expect(s.perm("base").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("grants Blocker only to own NSp Digimon during the opponent's actual attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX7-045", as: "jaga" },
          { card: "EX7-028", as: "nsp", dp: 6000 },
          { card: "EX7-011", as: "nonNsp", dp: 6000 },
        ],
        security: ["BT1-009"],
        deck: ["BT1-011", "BT1-012"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }], deck: ["BT1-013", "BT1-014"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasKeyword(s.perm("nsp"), "Blocker")).toBe(false);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("nsp"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("nonNsp"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("jaga"), "Blocker")).toBe(true);
    const attackerId = s.perm("attacker").permanentId;
    expect(
      s.engine.applyIntent(1, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    const opened = s.events.find((event) => event.kind === "blockWindowOpened");
    const eligible = opened && "eligibleBlockerIds" in opened ? opened.eligibleBlockerIds : [];
    expect(eligible).toContain(s.perm("nsp").permanentId);
    expect(eligible).not.toContain(s.perm("nonNsp").permanentId);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("nsp").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === attackerId));
    expect(s.state.players[0]!.security).toHaveLength(1);
    await stopLoop(s, loop, 1);
  });
});
