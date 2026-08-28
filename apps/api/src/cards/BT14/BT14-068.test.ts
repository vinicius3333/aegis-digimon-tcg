import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-068.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-068", () => {
  it("deletes opposing Digimon up to seven play cost on digivolution", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "DeleteBudget",
      budget: 7,
      upTo: true,
    }));
  it("gives all own D-Brigade Digimon Blocker during the opponent's turn", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      target: { count: "all" },
    }));
  it("once per turn reveals three to play D-Brigade or DigiPolice cards up to seven total cost", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "RevealAdd", revealCount: 3, add: [{ count: "all", costBudget: 7, to: "play" }] }],
    }));

  it("naturally deletes opposing Digimon up to seven total play cost on evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-064", as: "base" }],
          hand: [{ card: "BT14-068", as: "evolving" }],
        },
        1: {
          battleArea: [
            { card: "BT14-058", as: "targetA" },
            { card: "BT14-055", as: "targetB" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe("BT14-068");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT14-058", "BT14-055"]);
  });

  it("naturally grants Blocker to a D-Brigade host during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-068", as: "source" },
            { card: "BT14-056", as: "host", dp: 9000 },
          ],
          security: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-015", as: "attacker", dp: 4000 }] },
      },
      { autoOrderTriggers: true },
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
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    expect(s.events.find((event) => event.kind === "blockWindowOpened")).toMatchObject({
      eligibleBlockerIds: expect.arrayContaining([s.perm("host").permanentId]),
    });
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-015"));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("host").permanentId)).toBe(
      true,
    );
  });

  it("naturally reveals at end of turn and plays D-Brigade plus DigiPolice cards within the total budget", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-068", as: "source" }],
          deck: ["BT14-060", "BT14-086", "BT1-001", "BT1-002", "BT1-003"],
        },
        1: { deck: ["BT1-001", "BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).runTurn(0);
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-060") &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-086"),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-060")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT14-086")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-001")).toBe(true);
  });
});
