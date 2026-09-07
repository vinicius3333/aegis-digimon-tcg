import { describe, expect, it } from "vitest";
import { getCardDefinition, Phase } from "@aegis/shared";
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
      { autoSelectCards: true, preferInstanceIds: preferred },
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
      },
      1: { battleArea: [{ card: "BT1-088", as: "low" }] },
    });
    s.state.memory = 5;
    await s.ready();

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
  });

  it("does not return an opponent Digimon above the printed play-cost-3 boundary", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT24-061", as: "vademon" }] },
      1: { battleArea: [{ card: "BT24-046", as: "target" }] },
    });
    s.state.memory = 6;
    await s.ready();
    const targetId = s.perm("target").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vademon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 0);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === targetId)).toBe(true);
    expect(s.state.players[1]!.deck.some((c) => c.instanceId === targetId)).toBe(false);
  });

  it("public attack activates inherited De-Digivolve 1 on one opponent", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST1-10", as: "host", under: ["BT24-061"] }] },
        1: {
          battleArea: [
            { card: "BT24-051", as: "first", under: ["BT24-050"] },
            { card: "BT24-051", as: "second", under: ["BT24-050"] },
          ],
          security: ["BT1-013", "BT1-015"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").topCard.instanceId, s.perm("second").topCard.instanceId);
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
    expect(s.perm("second").topCard.cardId).toBe("BT24-051");
  });

  it("resets inherited De-Digivolve on the owner's later turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST1-10", as: "host", under: ["BT24-061"] }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [
            { card: "BT24-051", as: "first", under: ["BT24-050"] },
            { card: "BT24-051", as: "second", under: ["BT24-050"] },
          ],
          security: ["BT1-013", "BT1-015", "BT1-016"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("first").topCard.instanceId);
    s.state.memory = 3;
    await s.ready();

    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("first").topCard.cardId === "BT24-050");
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
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("second").topCard.cardId === "BT24-050");
    expect(s.perm("second").topCard.cardId).toBe("BT24-050");
    advance(s.engine).endMainPhaseIfOpen(0);
    await laterTurn;
  });
});
