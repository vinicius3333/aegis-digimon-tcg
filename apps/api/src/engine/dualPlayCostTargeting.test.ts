import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("DUAL Digimon have no play cost (Discord 1556424046827282472)", () => {
  it.each(["BT2-057", "BT25-043"])(
    "Hades Force references only actual play costs with %s as its Greymon",
    async (greymon) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: greymon, as: "greymon" },
              { card: "BT2-060", as: "black" },
              { card: "BT1-009", as: "red" },
            ],
            hand: [{ card: "BT11-107", as: "option" }],
          },
          1: {
            battleArea: [
              { card: "EX12-018", as: "siriusmon" },
              { card: "BT1-009", as: "normal" },
            ],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      s.state.memory = 10;
      await s.ready();
      const expected = greymon === "BT25-043" ? ["EX12-018", "BT1-009"] : ["EX12-018"];

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT11-107") &&
          s.state.pendingDecision === undefined,
      );
      await settle();

      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(expected);
    },
  );

  it.each([
    ["numeric deletion", "BT6-105", "BT2-060"],
    ["total play-cost deletion budget", "BT8-105", "BT8-067"],
  ])("excludes Siriusmon from %s while deleting a normal Digimon", async (_label, option, source) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: source, as: "source" }],
          hand: [{ card: option, as: "option" }],
        },
        1: {
          battleArea: [
            { card: "EX12-018", as: "siriusmon" },
            { card: "EX12-013", as: "betel" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const siriusmonId = s.perm("siriusmon").permanentId;
    const betelId = s.perm("betel").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === betelId) &&
        s.state.pendingDecision === undefined,
    );
    await settle();

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([siriusmonId]);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(["EX12-013"]);
  });

  it("still pays Siriusmon's Option use cost and can delete a DUAL by DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "red" }],
          hand: [{ card: "EX12-018", as: "planetPunch" }],
        },
        1: {
          battleArea: [
            { card: "EX12-018", as: "siriusmon" },
            { card: "EX12-013", as: "betel" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const betelId = s.perm("betel").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("planetPunch").instanceId,
        useAs: "option",
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.trash.some(({ cardId }) => cardId === "EX12-018") && s.state.pendingDecision === undefined,
    );
    await settle();

    expect(s.state.memory).toBe(5);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([betelId]);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(["EX12-018"]);
  });

  it.each([
    ["BT12-108", "BT26-075"],
    ["BT9-102", "EX12-033"],
  ])("does not use a trashed DUAL's Option cost for %s Security", async (option, dual) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }], security: ["BT1-009"] },
        1: {
          hand: [{ card: dual, as: "payment" }],
          security: [option, "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.trash.some(({ cardId }) => cardId === option) && s.state.pendingDecision === undefined,
    );
    await settle();

    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining([dual, option]));
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([attackerId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
