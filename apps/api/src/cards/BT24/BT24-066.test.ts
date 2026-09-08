import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT24-066.js";
import "../index.js";

describe("BT24-066 Guilmon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-066")).toMatchObject({
      cardId: "BT24-066",
      nameEn: "Guilmon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Reptile", "Evil"],
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
    });
  });

  it("reveals qualifying trait cards or purple Tamers, trashes a second hit, and trashes one hand card", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Gigimon"], cost: 0, isAlternate: true }]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [{ to: "hand" }, { to: "trash", requiresMinRevealed: 2 }],
          rest: "deckBottom",
        },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Delete", target: { filter: { controller: "opponent", levels: [3] }, count: 1 } }],
    });
  });

  it("moves two qualifying revealed cards to the printed destinations and leaves the remainder below", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-066", as: "source" },
            { card: "BT1-009", as: "handCost" },
          ],
          deck: [
            { card: "BT10-093", as: "purpleTamer" },
            { card: "BT24-066", as: "evil" },
            { card: "BT1-010", as: "miss" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("handCost").instanceId, s.inst("purpleTamer").instanceId, s.inst("evil").instanceId);
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 1);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("handCost").instanceId));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("purpleTamer").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("evil").instanceId, s.inst("handCost").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
  });

  it("trashes the second matching reveal while preserving exact hand and deck zones", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-066", as: "source" },
            { card: "BT1-009", as: "handCost" },
          ],
          deck: [
            { card: "BT10-093", as: "purpleTamer" },
            { card: "BT24-066", as: "evil" },
            { card: "BT1-010", as: "miss" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("handCost").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("purpleTamer").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("evil").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("evil").instanceId, s.inst("handCost").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
  });

  it("publicly skips the reveal destinations when no qualifying card is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-066", as: "source" },
            { card: "BT1-009", as: "handCost" },
          ],
          deck: [
            { card: "BT1-010", as: "missOne" },
            { card: "BT1-011", as: "missTwo" },
            { card: "BT1-012", as: "missThree" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("handCost").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("missOne").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("handCost").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("missOne").instanceId,
      s.inst("missTwo").instanceId,
      s.inst("missThree").instanceId,
    ]);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    ["Evil", "BT24-066"],
    ["Dark Dragon", "BT12-010"],
    ["Evil Dragon", "BT11-079"],
    ["Dark Knight", "BT10-066"],
    ["purple Tamer", "BT10-093"],
  ])("publicly accepts the %s qualifying card", async (_label, qualifyingCard) => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-066", as: "source" },
            { card: "BT1-009", as: "handCost" },
          ],
          deck: [
            { card: qualifyingCard, as: "qualifying" },
            { card: "BT1-010", as: "missOne" },
            { card: "BT1-011", as: "missTwo" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("handCost").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("qualifying").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("missOne").instanceId,
      s.inst("missTwo").instanceId,
    ]);
  });

  it.each([
    ["normal purple level-2 requirement", "BT10-006", false],
    ["alternate exact Gigimon requirement", "BT24-001", true],
  ])("uses the %s for cost 0", async (_label, baseCard, useAlternateCost) => {
    const s = setupEngine({
      0: {
        breeding: { card: baseCard, as: "base" },
        hand: [{ card: "BT24-066", as: "guilmon" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const sourceId = s.perm("base").topCard.instanceId;
    const drawId = s.inst("evolutionDraw").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("guilmon").instanceId,
        ...(useAlternateCost ? { useAlternateCost: true, alternateRequirementIndex: 0 } : {}),
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("guilmon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(drawId);
  });

  it("rejects a non-Gigimon breeding source for the alternate route", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT10-006", as: "base" },
        hand: [{ card: "BT24-066", as: "guilmon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("guilmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("base").topCard.cardId).toBe("BT10-006");
    expect(s.inst("guilmon").cardId).toBe("BT24-066");
  });

  it("public inherited deletion shares its frequency and resets on the next owner turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-080", as: "host", under: ["BT24-066"] }],
          hand: [{ card: "BT24-050", as: "unsuspender" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "level3" },
            { card: "BT1-010", as: "level3Other" },
            { card: "BT24-046", as: "level4" },
          ],
          security: [
            { card: "BT1-009", as: "firstSecurity" },
            { card: "BT1-010", as: "secondSecurity" },
            { card: "BT1-011", as: "thirdSecurity" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("level4").topCard.instanceId, s.perm("level3").topCard.instanceId);
    const level3Id = s.perm("level3").permanentId;
    const level3OtherId = s.perm("level3Other").permanentId;
    const level3CardId = s.perm("level3").topCard.instanceId;
    const level3OtherCardId = s.perm("level3Other").topCard.instanceId;
    const level4Id = s.perm("level4").permanentId;
    const hostId = s.perm("host").permanentId;
    const sourceId = s.perm("host").stack[0]!.instanceId;
    const firstSecurityId = s.inst("firstSecurity").instanceId;
    const secondSecurityId = s.inst("secondSecurity").instanceId;
    const thirdSecurityId = s.inst("thirdSecurity").instanceId;
    s.state.memory = 10;
    await s.ready();
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level3Id));
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level3Id)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level4Id)).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(firstSecurityId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(level3CardId);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([secondSecurityId, thirdSecurityId]);
    expect(s.perm("host").topCard.cardId).toBe("BT4-080");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.state.memory).toBe(3);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(secondSecurityId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(level3OtherCardId);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([thirdSecurityId]);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level3OtherId)).toBe(true);

    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextOwnerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(thirdSecurityId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(level3OtherCardId);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level3OtherId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === level4Id)).toBe(true);
    expect(s.perm("host").topCard.cardId).toBe("BT4-080");
    expect(s.perm("host").stack.map((card) => card.instanceId)).toEqual([sourceId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnerTurn;
  });
});
