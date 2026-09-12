import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX7-039.js";
import "../index.js";

async function stopTurn(s: ReturnType<typeof setupEngine>, turn: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "endPhase" }).ok) throw new Error("failed to end turn");
  await turn;
}

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop loop");
  await loop;
}

describe("EX7-039 Jazamon", () => {
  it("matches the catalog, complete IR, and exclusive compiled registration", () => {
    expect(getCardDefinition("EX7-039")).toMatchObject({
      cardId: "EX7-039",
      nameEn: "Jazamon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Black", level: 2, memoryCost: 0 },
        { color: "Red", level: 2, memoryCost: 0 },
      ],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Bird Dragon", "Machine Dragon"],
      effectText:
        "[Start of Your Main Phase] By trashing 1 card with the [Rock Dragon]/[Earth Dragon] trait from your hand, ＜Draw 1＞and gain 1 memory.\n[Rule] Trait: Has the [Machine Dragon] type.",
      inheritedEffectText: "[Opponent's Turn] This Digimon gets +2000 DP.",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "StartOfYourMainPhase",
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
              cost: {
                kind: "trash",
                target: {
                  filter: {
                    zone: "hand",
                    controller: "mine",
                    nameOrTrait: [{ tokens: ["Rock Dragon", "Earth Dragon"], match: "trait" }],
                  },
                  count: 1,
                },
                raw: "By trashing 1 card with the [Rock Dragon]/[Earth Dragon] trait from your hand",
              },
              optional: true,
              abortOnDecline: true,
            },
            {
              kind: "GainMemory",
              amount: 1,
              optional: false,
              condition: {
                kind: "ifThisEffectActed",
                raw: "if you trashed a [Rock Dragon]/[Earth Dragon] card for this effect",
              },
            },
          ],
        },
        {
          trigger: "Rule",
          actions: [
            {
              kind: "GrantStatic",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              grant: "trait",
              tokens: ["Machine Dragon"],
            },
          ],
        },
        {
          trigger: "OpponentsTurn",
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 2000,
              duration: "permanent",
            },
          ],
          isInherited: true,
        },
      ],
      coverage: "full",
      residual: [],
    });
    expect(hasRegisteredCompiledCard("EX7-039")).toBe(true);
  });

  it.each([
    ["Rock Dragon", "BT2-011"],
    ["Earth Dragon", "BT1-020"],
  ] as const)("publicly pays the %s cost, draws exactly, and gains exactly 1 memory", async (_trait, candidate) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-039", as: "jazamon" }],
          hand: [{ card: candidate, as: "cost" }, "BT1-009"],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
        1: { deck: ["BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.memory).toBe(1);
    expect(s.decisions.filter((decision) => decision.req.kind === "optional")).toHaveLength(1);
    await stopTurn(s, turn, 0);
  });

  it("declines without trashing, drawing, gaining memory, or raising a second prompt", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX7-039", as: "jazamon" }],
          hand: [{ card: "BT2-011", as: "cost" }, "BT1-009"],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
        1: { deck: ["BT1-012"] },
      },
      { autoDeclineOptional: true },
    );
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.decisions.filter((decision) => decision.req.kind === "optional")).toHaveLength(1);
    await stopTurn(s, turn, 0);
  });

  it("does nothing and asks no optional question without a qualifying hand card", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX7-039", as: "jazamon" }],
        hand: ["BT1-009"],
        deck: [{ card: "BT1-011", as: "drawn" }],
      },
      1: { deck: ["BT1-012"] },
    });
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.decisions.filter((decision) => decision.req.kind === "optional")).toHaveLength(0);
    await stopTurn(s, turn, 0);
  });

  it("evolves from the printed red Digi-Egg route for 0 with exact draw and stack identity", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "EX7-001", as: "egg" },
        hand: [{ card: "EX7-039", as: "jazamon" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const eggId = s.inst("egg").instanceId;
    const jazamonId = s.inst("jazamon").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("egg").permanentId, instanceId: jazamonId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === jazamonId);
    expect(s.state.memory).toBe(3);
    expect(s.perm("egg").topCard.instanceId).toBe(jazamonId);
    expect(s.perm("egg").stack.map((card) => card.instanceId)).toEqual([eggId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([drawnId]);
  });

  it("rejects a blue Digi-Egg without payment, draw, or stack mutation", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "P-148", as: "egg" },
        hand: [{ card: "EX7-039", as: "jazamon" }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("jazamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(3);
    expect(s.perm("egg").topCard.cardId).toBe("P-148");
    expect(s.perm("egg").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("drawn").instanceId);
  });

  it("grants Machine Dragon and inherited +2000 DP only during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-062", as: "host", dp: 5000, under: ["EX7-039"] }],
        hand: ["BT1-011"],
        deck: ["BT1-012", "BT1-013"],
      },
      1: { hand: ["BT1-014"], deck: ["BT1-015", "BT1-016"] },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(5000);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("host").currentDP).toBe(5000);
    await stopLoop(s, loop, 0);

    const source = setupEngine({ 0: { battleArea: [{ card: "EX7-039", as: "jazamon" }] } });
    await source.ready();
    expect(observe(source.engine).hasEffectiveTrait(source.perm("jazamon"), "Machine Dragon")).toBe(true);
  });
});
