import { describe, expect, it } from "vitest";
import { EffectDuration, Phase, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT15-027.js";

describe("BT15-027", () => {
  it("matches the immutable catalog identity and blue level-4 evolution route", () => {
    expect(getCardDefinition("BT15-027")).toMatchObject({
      nameEn: "Scorpiomon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 6,
      dp: 6000,
      evoCosts: [{ color: "Blue", level: 4, memoryCost: 3 }],
      types: ["Ancient Crustacean"],
    });
  });

  it("reveals four to add up to two level 6 or higher cards", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "RevealAdd", revealCount: 4, rest: "deckBottom", add: [{ count: 2, upTo: true }] }],
    }));
  it("may delete a Digimon to play a Dark Masters into breeding at end of turn", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], breeding: true, cost: { kind: "deleteOwn" }, optional: true },
      ],
    }));

  it("publishes inherited Blocker", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Blocker" }],
    }));

  it("adds both level-6 hits from four revealed cards and bottoms both misses", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-027", as: "scorpiomon" }],
          deck: [
            { card: "BT15-031", as: "hitOne" },
            { card: "BT15-052", as: "hitTwo" },
            { card: "BT15-025", as: "lowLevelMiss" },
            { card: "BT1-097", as: "optionMiss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("scorpiomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("hitOne").instanceId, s.inst("hitTwo").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("lowLevelMiss").instanceId, s.inst("optionMiss").instanceId]),
    );
  });

  it("adds the sole level-6 hit when only one exists, as clarified by Q2508", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-027", as: "scorpiomon" }],
          deck: [
            { card: "BT15-031", as: "onlyHit" },
            "BT15-025",
            "BT1-009",
            "BT1-097",
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );

    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("scorpiomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("onlyHit").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("deletes one Digimon, plays a Dark Master into breeding without On Play, and preserves summoning sickness", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "sacrifice" },
            { card: "BT15-027", as: "scorpiomon" },
          ],
          hand: [{ card: "BT15-031", as: "metalSeadramon" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT15-025", as: "onPlayTarget" }],
          security: ["BT1-001"],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnCount = 1;
    s.state.turnSeat = 0;
    const sacrificeId = s.perm("sacrifice").permanentId;
    const onPlayTargetId = s.perm("onPlayTarget").permanentId;

    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.breeding?.topCard.cardId === "BT15-031");

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sacrifice").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sacrificeId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === onPlayTargetId)).toBe(true);

    s.state.phase = Phase.Breeding;
    expect(
      s.engine.applyIntent(0, {
        type: "moveFromBreeding",
        permanentId: s.state.players[0]!.breeding!.permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding === undefined);
    s.state.phase = Phase.Main;
    await s.engine.recomputeContinuousEffects();

    expect(s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT15-031")?.summoningSick).toBe(
      true,
    );
    const moved = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT15-031")!;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: moved.permanentId, target: { kind: "player" } })).toMatchObject({
      ok: false,
    });
  });

  it("does not pay the deletion cost when effect-driven Digimon plays are prohibited", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "sacrifice" },
            { card: "BT15-027", as: "scorpiomon" },
          ],
          hand: [{ card: "BT15-031", as: "metalSeadramon" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    advance(s.engine).ledgers.continuous.addPlayProhibition(
      0,
      1,
      { kinds: ["Digimon"] },
      "play",
      EffectDuration.Permanent,
      { byEffectOnly: true },
    );
    const sacrificeId = s.perm("sacrifice").permanentId;

    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("metalSeadramon").instanceId);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(sacrificeId);
  });

  it("lets an inherited host suspend to block an opposing player attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 5000 }], security: ["BT1-001"] },
      1: {
        battleArea: [
          { card: "BT15-031", as: "host", under: ["BT15-025", "BT15-027"], dp: 11000 },
        ],
        security: ["BT1-001"],
      },
    });
    s.state.turnSeat = 0;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").isSuspended);

    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
