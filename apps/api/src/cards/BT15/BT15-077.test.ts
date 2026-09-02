import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT15-077.js";
import "../index.js";

describe("BT15-077", () => {
  it("deletes its battle opponent when deleted after losing a battle", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [{ kind: "Delete", target: { sourceRef: "battleOpponent" } }],
    }));
  it("reveals four to add up to two level 6 or higher cards", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "RevealAdd", revealCount: 4, rest: "deckBottom", add: [{ count: 2, upTo: true }] }],
    }));
  it("may delete a Digimon to play a Dark Masters into breeding and unsuspends as inherited", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], breeding: true, cost: { kind: "deleteOwn" }, optional: true },
      ],
    });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "OnDeletion", isInherited: true });
  });

  it("adds the sole level-6 hit from four revealed cards and bottoms the misses", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT15-077", as: "ladyDevimon" }],
          deck: [
            { card: "BT15-041", as: "onlyHit" },
            { card: "BT15-025", as: "missOne" },
            { card: "BT1-009", as: "missTwo" },
            { card: "BT1-097", as: "missThree" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ladyDevimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("onlyHit").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("onlyHit").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("missOne").instanceId,
        s.inst("missTwo").instanceId,
        s.inst("missThree").instanceId,
      ]),
    );
  });

  it("deletes one Digimon, plays a Dark Master into breeding, and preserves summoning sickness", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT15-068", as: "sacrifice" },
            { card: "BT15-077", as: "ladyDevimon" },
          ],
          hand: [{ card: "BT15-031", as: "metalSeadramon" }],
          deck: ["BT1-001"],
        },
        1: { deck: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnCount = 1;
    s.state.turnSeat = 0;
    const sacrificeId = s.perm("sacrifice").permanentId;

    await advance(s.engine).runTurn(0);
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT15-031");

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("sacrifice").instanceId);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === sacrificeId)).toBe(false);
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT15-031");

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
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: moved!.permanentId, target: { kind: "player" } }),
    ).toMatchObject({ ok: false });
  });

  it("deletes the battle opponent when its inherited LadyDevimon is deleted in battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-080", as: "host", under: ["BT15-077"], suspended: true }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 15000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("attacker").instanceId);
  });
});
