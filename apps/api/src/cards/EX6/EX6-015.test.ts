import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-015.js";

describe("EX6-015 Xiangpengmon", () => {
  it("places up to three other blue Digimon under itself and returns opposing low-level Digimon scaled by the placed count", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "PlaceUnder",
        optional: true,
        trackCount: "xiangpengmonPlacedCount",
        targetIsPermanent: true,
        underFilter: { isSelfRef: true },
        target: { count: 3, upTo: true },
      },
      {
        kind: "Return",
        to: "hand",
        target: {
          count: "all",
          filter: { levelComparison: { op: "lte", value: 4, scaling: { countSource: "xiangpengmonPlacedCount" } } },
        },
      },
    ]);
  });

  it("relocates selected other blue Digimon beneath Xiangpengmon before the mandatory return", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT12-021", as: "blueOne" },
            { card: "BT12-021", as: "blueTwo" },
          ],
          hand: [{ card: "EX6-015", as: "xiangpengmon" }],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponentLevel3" }],
          security: Array(5).fill("BT1-009"),
          deck: Array(10).fill("BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("xiangpengmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("xiangpengmon") !== undefined &&
        s.perm("xiangpengmon").stack.length === 2 &&
        s.state.players[1]!.battleArea.length === 0 &&
        s.state.pendingDecision === undefined,
    );

    const host = s.perm("xiangpengmon");
    expect(host.stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("blueOne").instanceId, s.inst("blueTwo").instanceId]),
    );
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([host.permanentId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
  it("inherits once-per-turn play from digivolution cards and grants the Aquatic trait", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "PlayWithoutCost", from: ["digivolutionCards"], payCost: false, optional: true }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "trait",
      tokens: ["Aquatic"],
    });
  });

  it("publicly plays an Aquatic stack card when one is added beneath itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-015", as: "host", under: [{ card: "BT1-033", as: "added" }, "EX6-014"] },
            { card: "BT12-021", as: "placer" },
          ],
        },
        1: { security: Array(5).fill("BT1-009"), deck: Array(10).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("added").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("added").instanceId)).toBe(
      true,
    );
  });
});
