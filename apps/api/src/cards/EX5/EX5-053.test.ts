import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-053.js";
import "../BT1/BT1-009.js";
import "../BT1/BT1-013.js";
import "../BT1/BT1-021.js";
import "../index.js";

describe("EX5-053 Baihumon", () => {
  it("matches the catalog and registers the mandatory security reaction and deletion effect", () => {
    expect(getCardDefinition("EX5-053")).toMatchObject({
      cardId: "EX5-053",
      nameEn: "Baihumon",
      colors: ["Black", "Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 7,
      dp: 12000,
      evoCosts: [
        { color: "Black", level: 5, memoryCost: 4 },
        { color: "Yellow", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Holy Beast", "Four Sovereigns"],
      effectText: expect.stringContaining("play it without battling"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")).toMatchObject({
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnSecurityCheck")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["security"],
          payCost: false,
          target: {
            count: 1,
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Deva"], match: "trait" }],
              isRevealedSecurityCard: true,
            },
          },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: {
        count: 1,
        filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestPlayCost" },
      },
    });
    const source = {
      instanceId: "source",
      cardId: "EX5-053",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const module = getEffectModule("EX5-053")!;
    const securityEffect = module.effectsForTiming(EffectTiming.OnSecurityCheck, source)[0]!;
    expect(securityEffect.maxPerTurn).toBe(1);
    expect(securityEffect.optional).toBe(false);
    expect(module.effectsForTiming(EffectTiming.OnDestroyedAnyone, source)).toHaveLength(1);
    expect(module.effectsForTiming(EffectTiming.OnSecurityCheck, source)[0]!.optional).toBe(false);
  });

  it("plays a revealed Deva from security without battling, but ignores a non-Deva", async () => {
    const resolve = async (securityCard: string, attackerCard = "BT1-009") => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "EX5-053", as: "baihumon" }], security: [securityCard] },
          1: { battleArea: [{ card: attackerCard, as: "attacker", dp: 13000 }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 1;
      await s.ready();
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle();
      return s;
    };

    const deva = await resolve("EX5-009");
    expect(deva.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX5-009")).toBe(true);
    expect(deva.state.players[0]!.security).toHaveLength(0);

    const nonDeva = await resolve("BT1-009");
    expect(nonDeva.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT1-009")).toBe(false);
    expect(nonDeva.state.players[0]!.trash.some((c) => c.cardId === "BT1-009")).toBe(true);

    const devaAttacker = await resolve("BT1-009", "EX5-009");
    expect(devaAttacker.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT1-009")).toBe(false);
    expect(devaAttacker.state.players[0]!.trash.some((c) => c.cardId === "BT1-009")).toBe(true);
  });

  it("activates the security reaction only once per opponent turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-053", as: "baihumon" }],
          security: ["EX5-009", "EX5-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "first", dp: 13000 },
            { card: "BT1-013", as: "second", dp: 13000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    for (const alias of ["first", "second"]) {
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm(alias).permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(
        () => s.events.filter((event) => event.kind === "securityChecked").length >= (alias === "first" ? 1 : 2),
      );
    }
    expect(s.state.players[0]!.battleArea.filter((perm) => perm.topCard?.cardId === "EX5-009")).toHaveLength(1);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "EX5-009")).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await firstTurn;
  });

  it("deletes exactly one opposing Digimon with the highest play cost after public battle deletion", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX5-053", as: "baihumon", suspended: true }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "low", dp: 3000 },
          { card: "BT1-021", as: "high", dp: 7000 },
          { card: "BT1-013", as: "attacker", dp: 13000 },
        ],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("baihumon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "EX5-053"));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === highId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("digivolves through the legal black level-five route and rejects an illegal source", async () => {
    const legal = setupEngine({
      0: { battleArea: [{ card: "EX5-050", as: "base" }], hand: [{ card: "EX5-053", as: "baihumon" }] },
    });
    legal.state.memory = 4;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("baihumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard?.cardId === "EX5-053");
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("base").stack.map((card) => card.cardId)).toEqual(["EX5-050"]);
    expect(legal.state.pendingDecision).toBeUndefined();

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-013", as: "wrongSource" }], hand: [{ card: "EX5-053", as: "baihumon" }] },
    });
    illegal.state.memory = 4;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("wrongSource").permanentId,
        instanceId: illegal.inst("baihumon").instanceId,
      }).ok,
    ).toBe(false);
    expect(illegal.state.memory).toBe(4);
    expect(illegal.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX5-053"]);
  });
});
