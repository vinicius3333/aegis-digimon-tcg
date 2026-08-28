import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT15-050.js";

describe("BT15-050", () => {
  it("retains inherited Piercing", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Piercing" }],
    }));
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

  it("adds both level-6 hits from four revealed cards and bottoms both misses", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-050", as: "cherrymon" }],
          deck: [
            { card: "BT15-041", as: "hitOne" },
            { card: "BT15-042", as: "hitTwo" },
            { card: "BT15-025", as: "lowLevelMiss" },
            { card: "BT1-097", as: "optionMiss" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cherrymon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("hitOne").instanceId, s.inst("hitTwo").instanceId]),
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("lowLevelMiss").instanceId, s.inst("optionMiss").instanceId]),
    );
  });

  it("adds the sole level-6 hit when only one is revealed, as clarified by Q2529", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-050", as: "cherrymon" }],
          deck: [{ card: "BT15-041", as: "onlyHit" }, "BT15-025", "BT1-009", "BT1-097"],
        },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cherrymon").instanceId })).toEqual({ ok: true });
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
            { card: "BT15-050", as: "cherrymon" },
          ],
          hand: [{ card: "BT15-031", as: "metalSeadramon" }],
          deck: ["BT1-001"],
        },
        1: {
          battleArea: [{ card: "BT15-025", as: "onPlayTarget" }],
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
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT15-031");

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sacrifice").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sacrificeId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT15-050")).toBe(true);
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

    const moved = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "BT15-031");
    expect(moved?.summoningSick).toBe(true);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: moved!.permanentId, target: { kind: "player" } })).toMatchObject({
      ok: false,
    });
  });

  it("exposes inherited Piercing on a host carrying Cherrymon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT15-031", as: "host", under: ["BT15-050"] }] },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Piercing")).toBe(true);
  });

  it("digivolves legally from a green level-4 Digimon and preserves the source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-048", as: "base" }],
        hand: [{ card: "BT15-050", as: "cherrymon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cherrymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT15-050");

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT15-048"]);
  });
});
