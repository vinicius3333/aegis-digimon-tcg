import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
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
            { card: "BT1-002", as: "handCost" },
          ],
          deck: [
            { card: "BT11-080", as: "evil" },
            { card: "BT12-085", as: "demonLord" },
            { card: "BT1-010", as: "miss" },
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

  it("public attack trashes both players' top cards through the inherited effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: ["BT24-068"] }],
        deck: [
          { card: "BT1-001", as: "mineFirst" },
          { card: "BT1-002", as: "mineSecond" },
        ],
      },
      1: {
        deck: [
          { card: "BT1-003", as: "theirFirst" },
          { card: "BT1-004", as: "theirSecond" },
        ],
        security: ["BT1-005", "BT1-006"],
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
});
