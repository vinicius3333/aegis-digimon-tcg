import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_070 } from "./BT24-070.js";
import "../index.js";

describe("BT24-070 Growlmon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-070")).toMatchObject({
      cardId: "BT24-070",
      nameEn: "Growlmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Dark Dragon"],
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
    });
  });

  it("plays a qualifying purple Tamer from trash under the hand-size gate", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(BT24_070.effects?.find((entry) => entry.trigger === trigger)?.actions?.[0]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["trash"],
        target: { filter: { kind: ["Tamer"], colors: ["Purple"], playCostLte: 4 } },
        condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 4 },
      });
    }
    expect(BT24_070.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { levels: [3] }, count: 1 },
    });
  });

  it.each(["play", "digivolve"] as const)(
    "public %s leaves four cards in hand and plays a cost-4 purple Tamer from trash",
    async (entry) => {
      const s = setupEngine(
        {
          0: {
            ...(entry === "digivolve" ? { battleArea: [{ card: "BT24-068", as: "base" }] } : {}),
            hand:
              entry === "play"
                ? [{ card: "BT24-070", as: "growlmon" }, "BT1-013", "BT1-015", "BT1-045", "BT1-009"]
                : [{ card: "BT24-070", as: "growlmon" }, "BT1-013", "BT1-015", "BT1-045"],
            trash: [{ card: "BT12-096", as: "tamer" }],
            ...(entry === "digivolve" ? { deck: [{ card: "BT1-015", as: "evolutionDraw" }] } : {}),
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 6;
      await s.ready();

      const result =
        entry === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("growlmon").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              permanentId: s.perm("base").permanentId,
              instanceId: s.inst("growlmon").instanceId,
            });
      expect(result).toEqual({ ok: true });
      await settle(() =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("tamer").instanceId),
      );
      expect(
        s.events.some(
          (event) =>
            event.kind === "effectResolved" &&
            event.sourceCardId === "BT24-070" &&
            event.timing === (entry === "play" ? "OnPlay" : "WhenDigivolving"),
        ),
      ).toBe(true);

      expect(s.state.memory).toBe(entry === "play" ? 1 : 4);
      expect(s.state.players[0]!.hand).toHaveLength(4);
      expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("tamer").instanceId);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("tamer").instanceId)).toBe(
        true,
      );
      expect(
        entry === "play" ||
          s.state.players[0]!.hand.map((card) => card.instanceId).includes(s.inst("evolutionDraw").instanceId),
      ).toBe(true);
      const evolutionTop = entry === "digivolve" ? s.perm("base").topCard.instanceId : undefined;
      expect(entry === "play" || evolutionTop === s.inst("growlmon").instanceId).toBe(true);
      const evolutionStack = entry === "digivolve" ? s.perm("base").stack.map((card) => card.instanceId) : [];
      expect(evolutionStack).toEqual(entry === "digivolve" ? [s.inst("base").instanceId] : []);
    },
  );

  it("does not play the Tamer with five cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-070", as: "growlmon" }, "BT1-013", "BT1-015", "BT1-045", "BT1-009", "BT1-011"],
          trash: [{ card: "BT12-096", as: "tamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("growlmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT24-070"));

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("tamer").instanceId);
  });

  it("does not play the Tamer when evolution draw leaves five cards in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-068", as: "base" }],
          hand: [{ card: "BT24-070", as: "growlmon" }, "BT1-013", "BT1-015", "BT1-045", "BT1-009"],
          trash: [{ card: "BT12-096", as: "tamer" }],
          deck: [{ card: "BT1-015", as: "bonusDraw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 6;
    await s.ready();
    const baseId = s.inst("base").instanceId;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("growlmon").instanceId);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("bonusDraw").instanceId);
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("growlmon").instanceId);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("tamer").instanceId);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("tamer").instanceId)).toBe(false);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("does not play a purple Tamer above the printed cost-4 boundary", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT24-070", as: "growlmon" }],
        trash: [{ card: "AD1-023", as: "expensiveTamer" }],
      },
    });
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("growlmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT24-070"));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("expensiveTamer").instanceId);
    expect(
      s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("expensiveTamer").instanceId),
    ).toBe(false);
  });

  it("publicly refuses the optional Tamer play without changing zones or memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT24-070", as: "growlmon" }, "BT1-013", "BT1-015", "BT1-045"],
          trash: [{ card: "BT12-096", as: "tamer" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: false },
    );
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("growlmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.pendingDecision);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("tamer").instanceId);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("tamer").instanceId)).toBe(false);
  });

  it("does not play a non-purple Tamer even at the cost-4 boundary", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT24-070", as: "growlmon" }, "BT1-013", "BT1-015", "BT1-045"],
        trash: [{ card: "BT1-085", as: "wrongColor" }],
      },
    });
    s.state.memory = 6;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("growlmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT24-070"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("wrongColor").instanceId);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("wrongColor").instanceId)).toBe(
      false,
    );
  });

  it("public attack uses the inherited effect to delete only a level-3 opponent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-075", as: "host", under: [{ card: "BT24-070", as: "inheritedGrowlmon" }] }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstLevel3" },
            { card: "BT1-010", as: "secondLevel3" },
            { card: "BT1-014", as: "level4" },
          ],
          security: ["BT1-013", "BT1-015"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("firstLevel3").instanceId));
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual(
      expect.arrayContaining([s.perm("secondLevel3").permanentId, s.perm("level4").permanentId]),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("firstLevel3").instanceId);
  });

  it("suppresses a same-turn inherited deletion and resets after the next owner turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-075", as: "host", under: [{ card: "BT24-070", as: "inheritedGrowlmon" }] }],
          hand: [{ card: "BT24-050", as: "unsuspender" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", suspended: true },
            { card: "BT1-009", as: "second", suspended: true },
            { card: "BT1-014", as: "level4", suspended: true },
          ],
          security: [
            { card: "BT1-013", as: "security1" },
            { card: "BT1-015", as: "security2" },
            { card: "BT1-014", as: "security3" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const hostId = s.perm("host").permanentId;
    const inheritedId = s.inst("inheritedGrowlmon").instanceId;
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;
    preferred.push(firstId);
    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.ready();
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === firstId));
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("first").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("security1").instanceId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(inheritedId);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("security2").instanceId,
      s.inst("security3").instanceId,
    ]);
    preferred.splice(0, preferred.length, hostId);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.state.memory).toBe(3);
    preferred.splice(0, preferred.length, secondId);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === secondId)).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("security2").instanceId);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([s.inst("security3").instanceId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === secondId));
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("second").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("security3").instanceId);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === s.inst("level4").instanceId)).toBe(true);
    expect(s.perm("host").permanentId).toBe(hostId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
  });
});
