import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_061 } from "./BT24-061.js";
import "../index.js";

describe("BT24-061 Vademon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-061")).toMatchObject({
      cardId: "BT24-061",
      nameEn: "Vademon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Alien", "Iliad", "TS"],
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
    });
  });

  it("returns a low-play-cost opponent Digimon or Tamer to deck top", () => {
    const effects = BT24_061.effects?.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger));
    expect(effects).toHaveLength(2);
    for (const effect of effects ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Return",
        to: "deckTop",
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"], playCostLte: 3 }, count: 1 },
      });
    }
    const inherited = BT24_061.effects?.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn" });
  });

  it("public play pays 6 and returns only a play-cost-3-or-lower opponent card to deck top", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-061", as: "vademon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT24-102", as: "high" },
          ],
        },
      },
      {
        autoSelectCards: true,
        autoAcceptOptional: true,
        autoChooseOption: true,
        autoOrderCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("high").topCard.instanceId, s.perm("low").topCard.instanceId);
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vademon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.deck[0]?.instanceId === s.inst("low").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.deck[0]!.instanceId).toBe(s.inst("low").instanceId);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toContain(
      s.inst("high").instanceId,
    );
  });

  it.each([
    ["normal black level-4 requirement", "BT10-062", false],
    ["alternate TS level-4 requirement", "BT24-046", true],
  ])("uses the %s for cost 3 and returns a low-cost opponent", async (_label, baseCard, useAlternateCost) => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: baseCard, as: "base" }],
        hand: [{ card: "BT24-061", as: "vademon" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
      },
      1: { battleArea: [{ card: "BT1-088", as: "low" }] },
    });
    s.state.memory = 5;
    await s.ready();
    const baseId = s.perm("base").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("vademon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("vademon").instanceId);
    await settle(() => s.state.players[1]!.deck[0]?.instanceId === s.inst("low").instanceId);

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("vademon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
  });

  it("does not return an opponent Digimon above the printed play-cost-3 boundary", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT24-061", as: "vademon" }] },
      1: { battleArea: [{ card: "BT24-046", as: "target" }] },
    });
    s.state.memory = 6;
    await s.ready();
    const targetId = s.perm("target").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vademon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 0);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.deck.some((c) => c.instanceId === targetId)).toBe(false);
  });

  it("publicly returns an opposing play-cost-3-or-lower Tamer to deck top", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT24-061", as: "vademon" }] },
        1: {
          battleArea: [{ card: "BT1-088", as: "tamer" }],
          deck: [{ card: "BT1-009", as: "deckRest" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const tamerId = s.inst("tamer").instanceId;
    const restId = s.inst("deckRest").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vademon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.deck[0]?.instanceId === tamerId);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([tamerId, restId]);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.instanceId === tamerId)).toBe(false);
  });

  it("public attack activates inherited De-Digivolve 1 on one opponent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT10-028", as: "host", under: ["BT24-061"] }] },
        1: {
          battleArea: [
            { card: "BT24-051", as: "first", under: [{ card: "BT24-050", as: "firstSource" }] },
            { card: "BT24-051", as: "second", under: ["BT24-050"] },
          ],
          security: ["BT1-013", "BT1-015"],
        },
      },
      {
        autoSelectCards: true,
        autoAcceptOptional: true,
        autoChooseOption: true,
        autoOrderCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("first").topCard.instanceId, s.perm("second").topCard.instanceId);
    const firstId = s.inst("first").instanceId;
    const firstSourceId = s.inst("firstSource").instanceId;
    await s.ready();
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT24-061"]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").topCard.cardId === "BT24-050");
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("first").topCard.cardId).toBe("BT24-050");
    expect(s.perm("first").topCard.instanceId).toBe(firstSourceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(firstId);
    expect(s.perm("second").topCard.cardId).toBe("BT24-051");
  });

  it("resets inherited De-Digivolve on the owner's later turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-028", as: "host", under: ["BT24-061"] }],
          hand: [{ card: "BT24-050", as: "unsuspend" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT24-051", as: "first", under: [{ card: "BT24-050", as: "firstSource" }] },
            { card: "BT24-051", as: "second", under: [{ card: "BT24-050", as: "secondSource" }] },
          ],
          security: [
            { card: "BT1-009", as: "security1" },
            { card: "BT1-013", as: "security2" },
            { card: "BT1-015", as: "security3" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      {
        autoSelectCards: true,
        autoAcceptOptional: true,
        autoChooseOption: true,
        autoOrderCards: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("first").topCard.instanceId);
    const firstId = s.inst("first").instanceId;
    const firstSourceId = s.inst("firstSource").instanceId;
    const secondId = s.inst("second").instanceId;
    const secondSourceId = s.inst("secondSource").instanceId;
    const security1Id = s.inst("security1").instanceId;
    const security2Id = s.inst("security2").instanceId;
    const security3Id = s.inst("security3").instanceId;
    s.state.memory = 10;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").topCard.cardId === "BT24-050");
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("first").topCard.instanceId).toBe(firstSourceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(firstId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(security1Id);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([security2Id, security3Id]);

    preferred.splice(0, preferred.length, s.perm("host").permanentId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspend").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.state.memory).toBe(3);

    preferred.splice(0, preferred.length, s.perm("second").topCard.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("second").topCard.instanceId).toBe(secondId);
    expect(s.perm("second").stack.map((card) => card.instanceId)).toEqual([secondSourceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(security2Id);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([security3Id]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    preferred.splice(0, preferred.length, s.perm("second").topCard.instanceId);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const laterTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("second").topCard.cardId === "BT24-050");
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("second").topCard.cardId).toBe("BT24-050");
    expect(s.perm("second").topCard.instanceId).toBe(secondSourceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(secondId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(security3Id);
    expect(s.state.players[1]!.security).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await laterTurn;
  });
});
