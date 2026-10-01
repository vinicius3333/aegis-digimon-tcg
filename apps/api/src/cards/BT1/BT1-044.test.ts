import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
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

describe("BT1-044 MetalGarurumon — KB Q&A rulings", () => {
  const attackPlayer = (s: EngineSetup, alias = "attacker") =>
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm(alias).permanentId,
      target: { kind: "player" },
    });

  const permanentWithTop = (s: EngineSetup, instanceId: string) =>
    s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.instanceId === instanceId);

  it("cannot play a Digi-Egg from its digivolution cards (Q900)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-044", as: "attacker", dp: 20000, under: [{ card: "BT1-003", as: "egg" }] }] },
        1: { security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("attacker").stack.map((card) => card.instanceId)).toEqual([s.inst("egg").instanceId]);

    const control = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-044",
              as: "attacker",
              dp: 20000,
              under: [
                { card: "BT1-003", as: "egg" },
                { card: "BT1-032", as: "frigimon" },
              ],
            },
          ],
        },
        1: { security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    expect(attackPlayer(control)).toEqual({ ok: true });
    await settle(() => control.state.players[0]!.battleArea.length === 2);
    expect(permanentWithTop(control, control.inst("frigimon").instanceId)).toBeDefined();
    expect(control.perm("attacker").stack.map((card) => card.instanceId)).toEqual([control.inst("egg").instanceId]);
  });

  it("plays the Digimon unsuspended even though the attacker is suspended (Q901)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-044", as: "attacker", under: [{ card: "BT1-032", as: "frigimon" }] }] },
        1: { security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => permanentWithTop(s, s.inst("frigimon").instanceId) !== undefined);

    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(permanentWithTop(s, s.inst("frigimon").instanceId)!.isSuspended).toBe(false);
  });

  it("does not carry effects applied to MetalGarurumon over to the played Digimon (Q902)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-044", as: "attacker", under: [{ card: "BT1-032", as: "frigimon" }] }],
          hand: [{ card: "BT1-096", as: "madDogFire" }],
        },
        1: { security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    const printedDP = s.perm("attacker").baseDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("madDogFire").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("attacker").currentDP === printedDP + 3000);

    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => permanentWithTop(s, s.inst("frigimon").instanceId) !== undefined);

    const played = permanentWithTop(s, s.inst("frigimon").instanceId)!;
    expect(s.perm("attacker").currentDP).toBe(printedDP + 3000);
    expect(played.baseDP).toBe(getCardDefinition("BT1-032")!.dp);
    expect(played.currentDP).toBe(played.baseDP);
  });

  it("activates the played Digimon's [On Play] effect (Q903)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-044", as: "attacker", dp: 20000, under: [{ card: "BT1-029", as: "gabumon" }] }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: { security: ["BT1-010"] },
      },
      { autoSelectCards: true },
    );
    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(permanentWithTop(s, s.inst("gabumon").instanceId)).toBeDefined();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    expect(
      s.events.some(
        (event) =>
          event.kind === "effectTriggered" && event.sourceCardId === "BT1-029" && event.printedTiming === "OnPlay",
      ),
    ).toBe(true);
  });

  it("resolves the [On Play] effect before other pending [When Attacking] effects (Q904)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-044",
              as: "attacker",
              dp: 20000,
              under: [
                { card: "BT1-003", as: "upamon" },
                { card: "BT1-029", as: "gabumon" },
              ],
            },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-032", as: "sourceless" }], security: ["BT1-010"] },
      },
      { autoSelectCards: true, preferTriggerKeys: ["BT1-044"] },
    );
    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);

    const triggerOrder = s.events.flatMap((event) =>
      event.kind === "effectTriggered" ? [`${event.sourceCardId}:${event.printedTiming}`] : [],
    );
    const metalGarurumonIndex = triggerOrder.indexOf("BT1-044:WhenAttacking");
    const gabumonOnPlayIndex = triggerOrder.indexOf("BT1-029:OnPlay");
    const upamonIndex = triggerOrder.findIndex((entry) => entry.startsWith("BT1-003:"));
    expect(metalGarurumonIndex).toBeGreaterThanOrEqual(0);
    expect(upamonIndex).toBeGreaterThanOrEqual(0);
    expect(gabumonOnPlayIndex).toBeGreaterThan(metalGarurumonIndex);
    expect(gabumonOnPlayIndex).toBeLessThan(upamonIndex);
  });

  it("the played Digimon cannot attack this turn (Q905)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-044", as: "attacker", dp: 20000, under: [{ card: "BT1-032", as: "frigimon" }] },
            { card: "BT1-037", as: "established" },
          ],
        },
        1: { security: ["BT1-010", "BT1-011"] },
      },
      { autoSelectCards: true },
    );
    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(
      () =>
        permanentWithTop(s, s.inst("frigimon").instanceId) !== undefined && s.state.players[1]!.security.length === 1,
    );

    const played = permanentWithTop(s, s.inst("frigimon").instanceId)!;
    expect(played.isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: played.permanentId, target: { kind: "player" } })
        .ok,
    ).toBe(false);
    expect(attackPlayer(s, "established")).toEqual({ ok: true });
  });

  it("must activate its effect when a level 4 or lower Digimon card is among its digivolution cards (Q906)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-044",
              as: "attacker",
              dp: 20000,
              under: [
                { card: "BT1-039", as: "levelFive" },
                { card: "BT1-032", as: "frigimon" },
                { card: "BT1-032", as: "otherFrigimon" },
              ],
            },
          ],
        },
        1: { security: ["BT1-010", "BT1-011"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    const attackerInstanceId = s.perm("attacker").topCard.instanceId;
    expect(attackPlayer(s)).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    const metalGarurumonDecisions = s.decisions.filter(({ req }) => req.sourceInstanceId === attackerInstanceId);
    expect(metalGarurumonDecisions.map(({ req }) => req.kind)).toEqual(["selectCards"]);
    expect(metalGarurumonDecisions[0]!.req.options).toMatchObject({ min: 1, max: 1 });

    const frigimonIds = [s.inst("frigimon").instanceId, s.inst("otherFrigimon").instanceId];
    const playedFrigimon = frigimonIds.filter((instanceId) => permanentWithTop(s, instanceId) !== undefined);
    expect(playedFrigimon).toHaveLength(1);
    expect(s.perm("attacker").stack.map((card) => card.instanceId)).toEqual([
      s.inst("levelFive").instanceId,
      ...frigimonIds.filter((instanceId) => !playedFrigimon.includes(instanceId)),
    ]);

    const control = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-044", as: "attacker", dp: 20000, under: [{ card: "BT1-039", as: "levelFive" }] }],
        },
        1: { security: ["BT1-010", "BT1-011"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    expect(attackPlayer(control)).toEqual({ ok: true });
    await settle(() => control.state.players[1]!.security.length === 1);
    expect(control.state.players[0]!.battleArea).toHaveLength(1);
    expect(control.perm("attacker").stack.map((card) => card.instanceId)).toEqual([
      control.inst("levelFive").instanceId,
    ]);
  });
});
