import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX7-042.js";
import "../index.js";

async function stopLoop(s: ReturnType<typeof setupEngine>, loop: Promise<void>, seat: 0 | 1): Promise<void> {
  if (!s.state.gameOver && !s.engine.applyIntent(seat, { type: "surrender" }).ok)
    throw new Error("failed to stop loop");
  await loop;
}

describe("EX7-042 Jazardmon", () => {
  it("matches the catalog, complete IR, and exclusive registration", () => {
    expect(getCardDefinition("EX7-042")).toMatchObject({
      cardId: "EX7-042",
      nameEn: "Jazardmon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 4000,
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 2 },
        { color: "Red", level: 3, memoryCost: 2 },
      ],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Machine Dragon"],
      effectText:
        "[On Play] By trashing 1 card with the [Rock Dragon]/[Earth Dragon]\u00a0trait, ＜Draw 2＞ \n[When Digivolving] If you have 1 or less Tamers, you may play 1 [Hina Kurihara] from your hand without paying the cost.",
      inheritedEffectText: "[Opponent's Turn] This Digimon gets +2000 DP.",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 2,
              cost: {
                kind: "trash",
                target: {
                  filter: {
                    zone: "hand",
                    controllerDefault: "mine",
                    nameOrTrait: [{ tokens: ["Rock Dragon", "Earth Dragon"], match: "trait" }],
                  },
                  count: 1,
                },
                raw: "By trashing 1 card with the [Rock Dragon]/[Earth Dragon] trait",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Hina Kurihara"], match: "nameExact" }],
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              condition: {
                kind: "zoneCount",
                seat: "mine",
                zone: "battleArea",
                filter: { kind: ["Tamer"] },
                op: "lte",
                value: 1,
                raw: "you have 1 or less Tamers",
              },
              optional: true,
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
    expect(hasRegisteredCompiledCard("EX7-042")).toBe(true);
  });

  it.each([
    ["Rock Dragon", "BT2-011"],
    ["Earth Dragon", "BT1-020"],
  ] as const)("publicly pays the %s cost and draws exactly 2", async (_trait, candidate) => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-042", as: "jazard" },
            { card: candidate, as: "cost" },
          ],
          deck: [
            { card: "BT1-001", as: "first" },
            { card: "BT1-002", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jazard").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("second").instanceId));
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("declines On Play without trashing or drawing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX7-042", as: "jazard" },
            { card: "BT2-011", as: "cost" },
          ],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jazard").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"));
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it.each([0, 1] as const)("evolves for exactly 2 and plays Hina with %i existing Tamers", async (tamerCount) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "base" },
            ...(tamerCount === 1 ? ([{ card: "BT1-085", as: "existing" }] as const) : []),
          ],
          hand: [
            { card: "EX7-042", as: "jazard" },
            { card: "EX3-065", as: "hina" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const jazardId = s.inst("jazard").instanceId;
    const hinaId = s.inst("hina").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: jazardId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === hinaId));
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.instanceId).toBe(jazardId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
  });

  it("does not offer Hina with 2 existing Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "base" },
            { card: "BT1-085", as: "firstTamer" },
            { card: "BT1-086", as: "secondTamer" },
          ],
          hand: [
            { card: "EX7-042", as: "jazard" },
            { card: "EX3-065", as: "hina" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jazard").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX7-042");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("hina").instanceId);
    expect(s.decisions.filter((decision) => decision.req.kind === "optional")).toHaveLength(0);
  });

  it("declines the legal Hina play while preserving exact evolution state", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "base" }],
          hand: [
            { card: "EX7-042", as: "jazard" },
            { card: "EX3-065", as: "hina" },
          ],
          deck: [{ card: "BT1-011", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("jazard").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX7-042");
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("hina").instanceId,
      s.inst("drawn").instanceId,
    ]);
    expect(s.decisions.filter((decision) => decision.req.kind === "optional")).toHaveLength(1);
  });

  it("uses the printed red route and rejects an off-color route", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "red" }],
        hand: [{ card: "EX7-042", as: "jazard" }],
        deck: [{ card: "BT1-011", as: "drawn" }],
      },
    });
    legal.state.memory = 5;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("red").permanentId,
        instanceId: legal.inst("jazard").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("red").topCard.cardId === "EX7-042");
    expect(legal.state.memory).toBe(3);

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "EX7-015", as: "blue" }],
        hand: [{ card: "EX7-042", as: "jazard" }],
        deck: [{ card: "BT1-011", as: "drawn" }],
      },
    });
    invalid.state.memory = 5;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("blue").permanentId,
        instanceId: invalid.inst("jazard").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.state.memory).toBe(5);
    expect(invalid.perm("blue").topCard.cardId).toBe("EX7-015");
    expect(invalid.state.players[0]!.deck[0]!.instanceId).toBe(invalid.inst("drawn").instanceId);
  });

  it("grants inherited +2000 DP only during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT10-064", as: "host", dp: 5000, under: ["EX7-042"] }], deck: ["BT1-011", "BT1-012"] },
      1: { deck: ["BT1-013", "BT1-014"] },
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
  });
});
