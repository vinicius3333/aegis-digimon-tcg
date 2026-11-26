import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { assertNoLoudGap, drainMicrotasks, settle, setupEngine } from "#api/engine/testkit/harness";
import "#api/cards/index";

const cardId = "BD01-07";
const vanillaRedLevel2 = "BT1-001";
const vanillaRedLevel3 = "BT1-009";
const vanillaRedLevel4 = "BT1-014";
const vanillaBlueLevel3 = "BT1-028";

describe("BD01-07 Mikemon", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "BD01",
      nameEn: "Mikemon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 4000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Beast"],
      rarity: "R",
      effectText: "[On Play] Return 1 of your opponent's level 3 Digimon to the hand.",
    });
    expect(getCardDefinition(cardId)!.inheritedEffectText).toBeUndefined();
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
  });

  it("returns the opponent's level 3 Digimon to the hand on play and trashes its digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: vanillaRedLevel3, as: "ownLevel3" }],
          hand: [{ card: cardId, as: "mikemon" }],
        },
        1: {
          battleArea: [
            { card: vanillaRedLevel3, as: "level3", under: [vanillaRedLevel2] },
            { card: vanillaRedLevel4, as: "level4" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mikemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("level4").permanentId,
    ]);
    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual([vanillaRedLevel3]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([vanillaRedLevel2]);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("ownLevel3").permanentId,
    );
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("does nothing on play when the opponent has no level 3 Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: cardId, as: "mikemon" }] },
        1: { battleArea: [{ card: vanillaRedLevel4, as: "level4" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("mikemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    await drainMicrotasks(20);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("level4").permanentId,
    ]);
    expect(s.state.players[1]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("digivolves from a blue level 3 Digimon for 2 memory without triggering its On Play effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: vanillaBlueLevel3, as: "base" }],
          hand: [{ card: cardId, as: "mikemon" }],
          deck: [vanillaRedLevel3],
        },
        1: { battleArea: [{ card: vanillaRedLevel3, as: "level3" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("mikemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);
    await drainMicrotasks(20);

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([vanillaBlueLevel3]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("level3").permanentId,
    ]);
  });
});
