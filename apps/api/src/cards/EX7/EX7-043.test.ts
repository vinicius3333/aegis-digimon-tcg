import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-043.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop loop");
  await loop;
}

const cost = {
  kind: "return",
  target: {
    filter: {
      controller: "mine",
      zone: ["hand", "trash"],
      nameOrTrait: [{ tokens: ["Three Musketeers"], match: "trait" }],
    },
    count: 3,
  },
  to: "deckTop",
  raw: "By returning 3 cards with the [Three Musketeers] trait from your hand or trash to the top of the deck",
} as const;

const deDigivolve = {
  kind: "DeDigivolve",
  target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
  amount: 1,
  stopAtLevel: 3,
  cost,
  optional: true,
  abortOnDecline: true,
} as const;

describe("EX7-043 Tankmon", () => {
  it("matches the catalog, Q3852/Q4558, complete IR, alternate route, and registration", () => {
    expect(getCardDefinition("EX7-043")).toMatchObject({
      cardId: "EX7-043",
      nameEn: "Tankmon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Cyborg"],
      effectText:
        "[Digivolve]Lv.3 w/[Three Musketeers]\u00a0in its text: Cost 2 \n\n[On Play] [When Digivolving] By returning 3 cards with the [Three Musketeers]\u00a0trait from your hand or trash to the top of the deck, ＜De-Digivolve1＞ 1 of your opponent's Digimon (Trash the top card. You can't trash past level 3 cards).",
      inheritedEffectText: "＜Reboot＞.",
    });
    expect(digivolutionRequirementsFor("EX7-043")).toContainEqual({
      level: 3,
      texts: ["Three Musketeers"],
      cost: 2,
      isAlternate: true,
    });
    expect(compiled).toEqual({
      effects: [
        { trigger: "OnPlay", actions: [deDigivolve] },
        { trigger: "WhenDigivolving", actions: [deDigivolve] },
        { trigger: "Static", actions: [], isInherited: true, keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }] },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ level: 3, texts: ["Three Musketeers"], cost: 2, isAlternate: true }],
    });
    expect(hasRegisteredCompiledCard("EX7-043")).toBe(true);
  });

  it("publicly pays a mixed hand/trash cost and de-digivolves on play (Q3852)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-043", as: "tank" },
            { card: "EX7-066", as: "handCost" },
          ],
          trash: [
            { card: "EX7-070", as: "trashCost1" },
            { card: "EX7-071", as: "trashCost2" },
          ],
          deck: [{ card: "BT1-001", as: "originalTop" }],
        },
        1: { battleArea: [{ card: "EX7-014", as: "target", under: ["EX7-011"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tank").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "EX7-011");
    expect(s.state.memory).toBe(3);
    expect(new Set(s.state.players[0]!.deck.slice(0, 3).map((card) => card.instanceId))).toEqual(
      new Set([s.inst("handCost").instanceId, s.inst("trashCost1").instanceId, s.inst("trashCost2").instanceId]),
    );
    expect(s.state.players[0]!.deck[3]!.instanceId).toBe(s.inst("originalTop").instanceId);
    expect(s.perm("target").stack).toHaveLength(0);
  });

  it("declines without paying the cost or de-digivolving", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX7-043", as: "tank" }, "EX7-066"], trash: ["EX7-070", "EX7-071"] },
        1: { battleArea: [{ card: "EX7-014", as: "target", under: ["EX7-011"] }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tank").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX7-043"));
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX7-066"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["EX7-070", "EX7-071"]);
    expect(s.perm("target").topCard.cardId).toBe("EX7-014");
    expect(s.perm("target").stack).toHaveLength(1);
  });

  it("asks nothing with fewer than 3 qualifying cards", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX7-043", as: "tank" }, "EX7-066", "BT1-009"], trash: ["EX7-070"] },
        1: { battleArea: [{ card: "EX7-014", as: "target", under: ["EX7-011"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tank").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX7-043"));
    expect(s.perm("target").topCard.cardId).toBe("EX7-014");
    expect(s.decisions.filter((decision) => decision.req.kind === "optional")).toHaveLength(0);
  });

  it("alternate-evolves, pays the same effect cost, and trashes an invalid Shotmon link (Q4558)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-054", as: "base", linked: [{ card: "BT21-054", as: "shotmonLink" }] }],
          hand: [
            { card: "EX7-043", as: "tank" },
            { card: "EX7-066", as: "cost1" },
          ],
          trash: [
            { card: "EX7-070", as: "cost2" },
            { card: "EX7-071", as: "cost3" },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
        1: { battleArea: [{ card: "EX7-014", as: "target", under: ["EX7-011"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const tankId = s.inst("tank").instanceId;
    const linkId = s.inst("shotmonLink").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: tankId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === tankId && s.perm("target").topCard.cardId === "EX7-011");
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.perm("base").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(linkId);
  });

  it("rejects an off-color level 3 without Three Musketeers text", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-015", as: "base" }],
        hand: [{ card: "EX7-043", as: "tank" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tank").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(5);
    expect(s.perm("base").topCard.cardId).toBe("EX7-015");
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("passes inherited Reboot through public evolution and a real turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-043", as: "base" }],
          hand: [{ card: "BT10-064", as: "host" }, "BT1-009"],
          deck: ["BT1-011", "BT1-012"],
          security: ["BT1-009", "BT1-011"],
        },
        1: { deck: ["BT1-013", "BT1-014"], security: ["BT1-009"] },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 8;
    const baseId = s.inst("base").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT10-064");
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Reboot")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.perm("base").isSuspended);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("base").isSuspended).toBe(false);
    await stopLoop(s, loop, 1);
  });
});
