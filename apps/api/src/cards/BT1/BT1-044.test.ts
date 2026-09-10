import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-044.js";
import "./BT1-029.js";

describe("BT1-044 MetalGarurumon", () => {
  it("matches the catalog and exact level/source-bound When Attacking IR", () => {
    expect(getCardDefinition("BT1-044")).toMatchObject({
      cardId: "BT1-044",
      set: "BT1",
      nameEn: "MetalGarurumon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 11000,
      evoCosts: [{ color: "Blue", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Cyborg"],
      effectText:
        "[When Attacking] Play 1 level 4 or lower digivolution card under this card as another Digimon without paying its memory cost.",
      rarity: "SR",
      maxCountInDeck: 4,
      imageId: "BT1-044",
      nameJp: "メタルガルルモン",
    });
    expect(getCardDefinition("BT1-044")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-044")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "WhenAttacking",
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["digivolutionCards"],
              payCost: false,
              target: {
                filter: {
                  zone: "digivolutionCards",
                  controller: "mine",
                  kind: ["Digimon"],
                  levelComparison: { op: "lte", value: 4 },
                  hostFilter: { isSelfRef: true },
                },
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

  it("plays a level 4 or lower digivolution card as another Digimon when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-044", as: "attacker", under: [{ card: "BT1-032", as: "source" }] }] },
        1: { security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-044", "BT1-032"]);
    expect(s.perm("attacker").stack).toHaveLength(0);
  });

  it("must play an eligible Digimon source unsuspended, fires On Play, and leaves Digi-Eggs underneath", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-044",
              as: "attacker",
              dp: 20000,
              under: [
                { card: "BT1-003", as: "egg" },
                { card: "BT1-029", as: "gabumon" },
              ],
            },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: { security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    s.state.turnCount = 3;
    const gabumonInstanceId = s.inst("gabumon").instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === gabumonInstanceId) &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId),
    );

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === gabumonInstanceId)!;
    expect(played.isSuspended).toBe(false);
    expect(played.currentDP).toBe(played.baseDP);
    expect(s.perm("attacker").stack.map((card) => card.instanceId)).toEqual([s.inst("egg").instanceId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: played.permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
  });

  it("does not play a level 5 Digimon or Digi-Egg from its digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-044",
              as: "attacker",
              dp: 20000,
              under: [
                { card: "BT1-003", as: "egg" },
                { card: "BT1-039", as: "levelFive" },
              ],
            },
          ],
        },
        1: { security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("attacker").stack.map((card) => card.instanceId)).toEqual([
      s.inst("egg").instanceId,
      s.inst("levelFive").instanceId,
    ]);
  });

  it("only plays an eligible source from the attacking MetalGarurumon's own stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-044", as: "attacker", under: [{ card: "BT1-032", as: "source" }] },
          { card: "BT1-039", as: "otherOwn", under: [{ card: "BT1-032", as: "wrongOwn" }] },
        ],
      },
      1: { battleArea: [{ card: "BT1-039", as: "opponent", under: [{ card: "BT1-032", as: "wrongOpponent" }] }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 3);

    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("source").instanceId),
    ).toBe(true);
    expect(s.perm("otherOwn").stack.map((card) => card.instanceId)).toEqual([s.inst("wrongOwn").instanceId]);
    expect(s.perm("opponent").stack.map((card) => card.instanceId)).toEqual([s.inst("wrongOpponent").instanceId]);
  });

  it("reaches MetalGarurumon through legal blue level-4 and level-5 evolution steps", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-037", as: "rookieHost" }],
        hand: [
          { card: "BT1-039", as: "levelFive" },
          { card: "BT1-044", as: "metalGarurumon" },
        ],
        deck: [
          { card: "BT1-010", as: "drawnFirst" },
          { card: "BT1-011", as: "drawnSecond" },
        ],
      },
      1: { security: ["BT1-012"] },
    });
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rookieHost").permanentId,
        instanceId: s.inst("levelFive").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rookieHost").topCard.instanceId === s.inst("levelFive").instanceId);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawnFirst").instanceId)).toBe(true);
    expect(s.perm("rookieHost").stack.map(({ cardId }) => cardId)).toEqual(["BT1-037"]);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rookieHost").permanentId,
        instanceId: s.inst("metalGarurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("rookieHost").topCard.instanceId === s.inst("metalGarurumon").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawnSecond").instanceId)).toBe(true);
    expect(s.perm("rookieHost").stack.map(({ cardId }) => cardId)).toEqual(["BT1-037", "BT1-039"]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("rookieHost").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.cardId)).toEqual(["BT1-044", "BT1-037"]);
    expect(s.perm("rookieHost").stack).toHaveLength(1);
  });
});
