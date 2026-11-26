import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "#api/engine/effects/interpreter";
import { assertNoLoudGap, settle, setupEngine } from "#api/engine/testkit/harness";
import { observe } from "#api/engine/testkit/observe";
import "#api/cards/index";
import { compiled } from "#api/cards/SD02/SD02-07";

const cardId = "SD02-07";
const vanillaLevel4 = "BT1-037";
const vanillaLevel5 = "BT1-038";
const vanillaLevel3 = "BT1-028";

describe("SD02-07 Pale Death", () => {
  it("matches the printed card", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      set: "SD02",
      nameEn: "Pale Death",
      colors: ["Blue"],
      kinds: ["Option"],
      playCost: 3,
      rarity: "C",
      effectText: "[Main] Return 1 of your opponent's level 4 or lower Digimon to the hand.",
      securityEffectText: "[Security] Activate this card's [Main] effect.",
    });
  });

  it("compiles the level 4 or lower return and the security Main activation", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "Main",
        actions: [
          {
            kind: "Return",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
              count: 1,
            },
            to: "hand",
          },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
    ]);
  });

  it("costs 3 memory and returns a level 4 Digimon to its owner's hand, trashing its digivolution cards, but not a level 5", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: vanillaLevel3, as: "blueDigimon" }], hand: [{ card: cardId, as: "option" }] },
        1: {
          battleArea: [
            { card: vanillaLevel5, as: "level5" },
            { card: vanillaLevel4, as: "level4", under: [vanillaLevel3] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("level4").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual([vanillaLevel3]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard.instanceId)).toEqual([
      s.inst("level5").instanceId,
    ]);
    expect(s.state.memory).toBe(2);
    assertNoLoudGap(s);
  });

  it("returns nothing when the opponent has only level 5 or higher Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: vanillaLevel3, as: "blueDigimon" }], hand: [{ card: cardId, as: "option" }] },
        1: { battleArea: [{ card: vanillaLevel5, as: "level5" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === cardId));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.hand).toHaveLength(0);
  });

  it("returns the level 4 attacker when checked from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: cardId, as: "option" }] },
        1: { battleArea: [{ card: vanillaLevel4, as: "attacker" }] },
      },
      { autoSelectCards: true },
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
    await settle(() => s.state.phase === Phase.Main && !observe(s.engine).isAttacking(), 5000);

    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("attacker").instanceId]);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([cardId]);
  });
});
