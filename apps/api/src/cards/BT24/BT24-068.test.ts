import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled as BT24_068 } from "./BT24-068.js";
import "../index.js";

describe("BT24-068 DemiDevimon", () => {
  it("matches the immutable catalog identity", () => {
    expect(getCardDefinition("BT24-068")).toMatchObject({
      cardId: "BT24-068",
      nameEn: "DemiDevimon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Evil"],
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
    });
  });

  it("reveals both printed trait categories, bottoms the rest, then trashes a hand card", () => {
    const onPlay = BT24_068.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { filter: { nameOrTrait: [{ tokens: ["Evil", "Fallen Angel"], match: "trait" }] }, count: 1, to: "hand" },
        { filter: { nameOrTrait: [{ tokens: ["Seven Great Demon Lords"], match: "trait" }] }, count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    });
    expect(onPlay?.actions?.[1]).toMatchObject({
      kind: "Trash",
      target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
    });
  });

  it("adds one card from each printed trait category, bottoms the miss, and trashes a hand card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-068", as: "demidevimon" },
            { card: "BT1-009", as: "handCost" },
          ],
          deck: [
            { card: "BT11-080", as: "evil" },
            { card: "BT12-085", as: "demonLord" },
            { card: "BT1-011", as: "miss" },
          ],
        },
      },
      { autoOrderCards: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("demidevimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 1);
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("handCost").instanceId));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("evil").instanceId, s.inst("demonLord").instanceId]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("handCost").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("miss").instanceId]);
  });

  it("still trashes a hand card when the reveal has no eligible category", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT24-068", as: "demidevimon" },
          { card: "BT1-009", as: "handCost" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("demidevimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("handCost").instanceId));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("handCost").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("uses the normal purple level-2 evolution route for cost 0", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT10-006", as: "base" },
        hand: [{ card: "BT24-068", as: "demidevimon" }],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("demidevimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("demidevimon").instanceId);

    expect(s.state.memory).toBe(3);
  });

  it("publicly evolves from a Purple Digi-Egg at cost 0 with exact stack and bonus draw", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT10-006", as: "egg" },
        hand: [{ card: "BT24-068", as: "demidevimon" }],
        deck: [{ card: "BT1-009", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const eggId = s.inst("egg").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("demidevimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.instanceId === s.inst("demidevimon").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.perm("egg").topCard.instanceId).toBe(s.inst("demidevimon").instanceId);
    expect(s.perm("egg").stack.map((card) => card.instanceId)).toEqual([eggId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("evolutionDraw").instanceId);
  });

  it("rejects an invalid Blue Digi-Egg evolution source", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT1-003", as: "blueEgg" }, hand: [{ card: "BT24-068", as: "demidevimon" }] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("blueEgg").permanentId,
        instanceId: s.inst("demidevimon").instanceId,
      }).ok,
    ).toBe(false);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("demidevimon").instanceId);
  });

  it("publicly searches Evil and Seven Great Demon Lords while bottoming a nonmatch and trashing a hand card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-068", as: "demidevimon" },
            { card: "BT1-009", as: "handCost" },
          ],
          deck: [
            { card: "BT24-069", as: "evil" },
            { card: "BT1-011", as: "nonmatch" },
            { card: "BT12-085", as: "demonLord" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("demidevimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("handCost").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("evil").instanceId, s.inst("demonLord").instanceId]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("handCost").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("nonmatch").instanceId]);
  });

  it("accepts the alternate Fallen Angel branch while excluding a near-match trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT24-068", as: "demidevimon" },
            { card: "BT1-009", as: "handCost" },
          ],
          deck: [
            { card: "BT11-080", as: "fallenAngel" },
            { card: "BT1-011", as: "nearMatch" },
            { card: "BT12-085", as: "demonLord" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("demidevimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("handCost").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("fallenAngel").instanceId, s.inst("demonLord").instanceId]),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).not.toContain(s.inst("nearMatch").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("nearMatch").instanceId]);
  });

  it("public attack trashes both players' top cards through the inherited effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-080", as: "host", under: ["BT24-068"] }],
        deck: [
          { card: "BT1-009", as: "mineFirst" },
          { card: "BT1-010", as: "mineSecond" },
        ],
      },
      1: {
        deck: [
          { card: "BT1-011", as: "theirFirst" },
          { card: "BT1-012", as: "theirSecond" },
        ],
        security: ["BT1-013", "BT1-014"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("mineFirst").instanceId));
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("mineFirst").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("theirFirst").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("mineSecond").instanceId]);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([s.inst("theirSecond").instanceId]);
  });

  it("suppresses the inherited mill on a same-turn second attack and resets next owner turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT4-080", as: "host", under: ["BT24-068"] }],
          hand: [{ card: "BT24-050", as: "unsuspend" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          security: [
            { card: "BT1-013", as: "security1" },
            { card: "BT1-015", as: "security2" },
            { card: "BT1-016", as: "security3" },
          ],
          deck: ["BT1-016", "BT1-017", "BT1-018", "BT1-019"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const mineFirst = s.state.players[0]!.deck[0]!.instanceId;
    const mineSecond = s.state.players[0]!.deck[1]!.instanceId;
    const mineThird = s.state.players[0]!.deck[2]!.instanceId;
    const theirFirst = s.state.players[1]!.deck[0]!.instanceId;
    const theirSecond = s.state.players[1]!.deck[1]!.instanceId;
    const theirThird = s.state.players[1]!.deck[2]!.instanceId;
    const security3 = s.inst("security3").instanceId;
    await s.ready();
    s.state.memory = 10;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === mineFirst) &&
        s.state.players[1]!.trash.some((card) => card.instanceId === theirFirst) &&
        !observe(s.engine).isAttacking(),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(mineFirst);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(theirFirst);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspend").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("host").isSuspended);
    expect(s.state.memory).toBe(3);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(mineSecond);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(theirSecond);
    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual([security3]);
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
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(mineSecond);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(theirSecond);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(mineThird);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(theirThird);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(security3);
    expect(s.state.players[1]!.security).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnerTurn;
  });
});
