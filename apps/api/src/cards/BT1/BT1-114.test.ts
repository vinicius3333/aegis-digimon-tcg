import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT1-015.js";
import { compiled } from "./BT1-114.js";

describe("BT1-114 MetalGreymon", () => {
  it("matches the catalog and compiles Security Attack, attack loss, and inherited DP", () => {
    expect(getCardDefinition("BT1-114")).toMatchObject({
      cardId: "BT1-114",
      set: "BT1",
      nameEn: "MetalGreymon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 8,
      dp: 9000,
      evoCosts: [{ color: "Red", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Cyborg"],
      effectText:
        "＜Security Attack +2＞ (This Digimon checks 2 additional security cards.)[When Attacking] Lose 5 memory.",
      inheritedEffectText: "[Your Turn] This Digimon gets +3000 DP.",
      rarity: "SEC",
      maxCountInDeck: 4,
      imageId: "BT1-114",
      nameJp: "メタルグレイモン",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "Static",
          actions: [],
          keywords: [{ keyword: "SecurityAttack", amount: 2, raw: "＜Security Attack +2＞" }],
        },
        { trigger: "WhenAttacking", actions: [{ kind: "GainMemory", amount: -5 }] },
        {
          trigger: "YourTurn",
          isInherited: true,
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 3000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("has Security Attack +2", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-114", as: "digimon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("digimon"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("digimon"), "SecurityAttack")).toBe(2);
  });

  it("Q990 attacks with less than 5 memory and completes all 3 security checks before the turn changes", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-114", as: "attacker" }] },
      1: {
        security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        deck: ["BT1-013"],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.memory === -3 && s.state.players[1]!.security.length === 1 && !observe(s.engine).isAttacking(),
      5000,
    );

    expect(s.state.memory).toBe(-3);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(3);
    assertNoLoudGap(s);
  });

  it("gives its host +3000 DP during its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-025", under: ["BT1-114"], as: "host", dp: 11000 }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(14000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(11000);
  });

  it("reaches the card through a legal public red evolution stack and keeps its inherited effect on the host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-015", as: "base" }],
        hand: [
          { card: "BT1-114", as: "metalGreymon" },
          { card: "BT1-025", as: "warGreymon" },
        ],
        deck: [
          { card: "BT1-009", as: "drawn" },
          { card: "BT1-010", as: "drawn2" },
        ],
      },
    });
    s.state.memory = 7;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("metalGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("metalGreymon").instanceId);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("warGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("warGreymon").instanceId);
    expect(s.state.memory).toBe(1);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-015", "BT1-114"]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn2").instanceId);
    // BT1-025 base 11000 + BT1-015 inherited 2000 + BT1-114 inherited 3000.
    expect(s.perm("base").currentDP).toBe(16000);
  });

  it("rejects evolution from a non-red level-4 source without changing cost or zones", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-032", as: "base" }], hand: [{ card: "BT1-114", as: "evolving" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").topCard.cardId).toBe("BT1-032");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolving").instanceId);
  });
});
