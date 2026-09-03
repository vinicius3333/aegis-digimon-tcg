import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-088.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-088", () => {
  it("adds a level 3 Digimon and a non-white Tamer from the top five", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 5,
          rest: "deckBottom",
          add: [
            { filter: { levels: [3] }, count: 1, to: "hand" },
            {
              filter: { kind: ["Tamer"], excludeColors: ["White"] },
              count: 1,
              to: "hand",
            },
          ],
          optional: true,
        },
      ],
    });
  });

  it("naturally reveals a level 3 Digimon and non-white Tamer from the top five", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT14-088", as: "gennai" }],
          deck: ["BT14-007", "BT14-088", "BT14-087", "AD1-001", "AD1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gennai").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT14-007"));
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-007")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-087")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT14-088")).toBe(false);
  });

  it("moves a DP-bearing breeding Digimon after an opponent level-5-or-higher attack and pays by suspending Gennai", () => {
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          triggerFilter: { kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } },
          actions: [{ kind: "MovePermanent", direction: "toBattle", cost: { kind: "suspend" }, optional: true }],
        },
      ],
    });
  });

  it("naturally moves a breeding Digimon after an opposing level-5 attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-088", as: "gennai" }],
          breeding: { card: "BT14-007", as: "breedingAgumon" },
        },
        1: { battleArea: [{ card: "BT14-015", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
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
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-007"));
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-007")).toBe(true);
    expect(s.perm("gennai").isSuspended).toBe(true);
  });

  it("does not move a breeding Digimon with 0 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-088", as: "gennai" }],
          breeding: { card: "BT18-086", as: "larva" },
          security: ["BT1-085"],
        },
        1: { battleArea: [{ card: "BT14-015", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
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
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.breeding?.topCard.cardId).toBe("BT18-086");
    expect(s.perm("gennai").isSuspended).toBe(false);
  });

  it("plays itself from security through a natural security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-071", as: "attacker" }] },
        1: { security: [{ card: "BT14-088", as: "securityGennai" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-088"));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT14-088")).toBe(true);
  });

  it("plays itself for free from security", () => {
    expect(compiled.effects[2]).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });
});
