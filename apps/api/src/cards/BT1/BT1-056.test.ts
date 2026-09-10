import { describe, expect, it } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import petermon from "./BT1-056.js";

describe("BT1-056 Petermon", () => {
  it("matches the catalog and exact optional hand-or-trash IR contract", () => {
    expect(getCardDefinition("BT1-056")).toMatchObject({
      cardId: "BT1-056",
      set: "BT1",
      nameEn: "Petermon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [{ color: "Yellow", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Fairy"],
      effectText: "[On Play] You may play 1 [Tinkermon] from your hand or recycle bin without paying its memory cost.",
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "BT1-056",
      nameJp: "ピーターモン",
    });
    expect(getCardDefinition("BT1-056")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-056")?.securityEffectText).toBeUndefined();
    expect(petermon).toEqual({
      effects: [
        {
          trigger: "OnPlay",
          optional: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand", "trash"],
              payCost: false,
              optional: true,
              target: {
                filter: { controller: "mine", nameOrTrait: [{ tokens: ["Tinkermon"], match: "nameExact" }] },
                count: 1,
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("keeps the bracketed Tinkermon reference exact", () => {
    expect(petermon.effects[0]).toMatchObject({
      actions: [{ target: { filter: { nameOrTrait: [{ tokens: ["Tinkermon"], match: "nameExact" }] } } }],
    });
    expect(matchNameOrTrait({ nameEn: "Tinkermon" }, { tokens: ["Tinkermon"], match: "nameExact" })).toBe(true);
    expect(matchNameOrTrait({ nameEn: "Tinkermon: X Antibody" }, { tokens: ["Tinkermon"], match: "nameExact" })).toBe(
      false,
    );
  });

  it("plays Tinkermon from trash without paying its memory cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-056", as: "petermon" }],
          trash: [{ card: "BT1-047", as: "tinkermon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const tinkermonId = s.inst("tinkermon").instanceId;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.instanceId === tinkermonId));

    expect(s.state.memory).toBe(0);
    expect(player.trash).toHaveLength(0);
  });

  it("plays Tinkermon from hand and the newly played Digimon cannot attack that turn (Q916)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT1-056", as: "petermon" },
            { card: "BT1-047", as: "tinkermon" },
          ],
        },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnCount = 1;
    const tinkermonId = s.inst("tinkermon").instanceId;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === tinkermonId),
    );
    const tinkermon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === tinkermonId)!;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: tinkermon.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.state.memory).toBe(0);
  });

  it("plays only one Tinkermon when copies exist in both hand and trash (Q915)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT1-056", as: "petermon" },
            { card: "BT1-047", as: "handTinkermon" },
          ],
          trash: [{ card: "BT1-047", as: "trashTinkermon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.players[0]!.battleArea.filter((permanent) => permanent.topCard.cardId === "BT1-047")).toHaveLength(
      1,
    );
    expect(
      s.state.players[0]!.hand.filter((card) => card.cardId === "BT1-047").length +
        s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-047").length,
    ).toBe(1);
  });

  it("may decline to play Tinkermon", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT1-056", as: "petermon" }],
        trash: [{ card: "BT1-047", as: "tinkermon" }],
      },
    });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.trash).toHaveLength(1);
  });

  it("does not play an opponent's Tinkermon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-056", as: "petermon" }] },
        1: { hand: [{ card: "BT1-047", as: "opponentTinkermon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);

    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT1-056");
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("opponentTinkermon").instanceId);
  });

  it("does not fire its On Play effect when Petermon is digivolved", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-050", as: "base" }],
        hand: [
          { card: "BT1-056", as: "petermon" },
          { card: "BT1-047", as: "tinkermon" },
        ],
        deck: [{ card: "BT1-010", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("petermon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("petermon").instanceId);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("tinkermon").instanceId);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("reaches Petermon through the legal yellow level-3 evolution route and keeps Tinkermon in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-050", as: "base" }],
        hand: [
          { card: "BT1-056", as: "petermon" },
          { card: "BT1-047", as: "tinkermon" },
        ],
        deck: [
          { card: "BT1-010", as: "evolutionDraw" },
          { card: "BT1-011", as: "mustStayInDeck" },
        ],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("petermon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("petermon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([s.inst("base").instanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("tinkermon").instanceId, s.inst("evolutionDraw").instanceId]),
    );
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
