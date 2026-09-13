import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
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
            { card: "EX6-015", as: "xiangpengmon" },
            { card: "BT12-021", as: "blueOne" },
            { card: "BT12-021", as: "blueTwo" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentLevel3" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("xiangpengmon"));

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
      { 0: { battleArea: [{ card: "EX6-015", as: "host" }], hand: [{ card: "BT1-033", as: "added" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("host").permanentId, [s.inst("added").instanceId]);
    await settle(() =>
      s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("added").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("added").instanceId)).toBe(
      true,
    );
  });

  it.each(["play", "digivolve"] as const)(
    "%s places every selected blue Digimon at the bottom, sheds its sources, and scales the return ceiling",
    async (timing) => {
      const s = setupEngine(
        timing === "play"
          ? {
              0: {
                hand: [{ card: "EX6-015", as: "xiangpengmon" }],
                battleArea: [
                  { card: "BT10-024", as: "blueOne", under: [{ card: "BT1-037", as: "shedOne" }] },
                  { card: "BT10-024", as: "blueTwo" },
                  { card: "BT1-060", as: "ownReturnable" },
                ],
              },
              1: {
                battleArea: [
                  { card: "BT1-009", as: "opponentReturnable" },
                  { card: "AD1-004", as: "opponentLevel6" },
                  { card: "BT1-084", as: "opponentTooHigh" },
                ],
              },
            }
          : {
              0: {
                hand: [{ card: "EX6-015", as: "xiangpengmon" }],
                battleArea: [
                  { card: "BT10-024", as: "host", under: [{ card: "BT1-037", as: "existingHost" }] },
                  { card: "BT10-024", as: "blueOne", under: [{ card: "BT1-037", as: "shedOne" }] },
                  { card: "BT10-024", as: "blueTwo" },
                  { card: "BT1-060", as: "ownReturnable" },
                ],
              },
              1: {
                battleArea: [
                  { card: "BT1-009", as: "opponentReturnable" },
                  { card: "AD1-004", as: "opponentLevel6" },
                  { card: "BT1-084", as: "opponentTooHigh" },
                ],
              },
            },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          autoOrderTriggers: true,
        },
      );
      s.state.turnSeat = 0;
      s.state.memory = 10;
      await s.ready();

      const blueOneId = s.inst("blueOne").instanceId;
      const blueTwoId = s.inst("blueTwo").instanceId;
      const hostId = timing === "play" ? undefined : s.perm("host").permanentId;
      const hostTopId = timing === "play" ? undefined : s.perm("host").topCard.instanceId;
      const result =
        timing === "play"
          ? s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("xiangpengmon").instanceId })
          : s.engine.applyIntent(0, {
              type: "digivolve",
              instanceId: s.inst("xiangpengmon").instanceId,
              permanentId: hostId!,
            });
      expect(result).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-015"));

      const host = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.cardId === "EX6-015")!;
      expect(host.stack.map(({ instanceId }) => instanceId)).toEqual(
        timing === "play"
          ? [blueTwoId, blueOneId]
          : [blueTwoId, blueOneId, s.inst("existingHost").instanceId, hostTopId!],
      );
      expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("shedOne").instanceId);
      expect(
        s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("ownReturnable").instanceId),
      ).toBe(false);
      expect(
        s.state.players[1]!.battleArea.some(
          (perm) => perm.topCard?.instanceId === s.inst("opponentReturnable").instanceId,
        ),
      ).toBe(false);
      expect(
        s.state.players[1]!.battleArea.some(
          (perm) => perm.topCard?.instanceId === s.inst("opponentTooHigh").instanceId,
        ),
      ).toBe(true);
      expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(
        s.inst("opponentLevel6").instanceId,
      );
      expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(
        s.inst("ownReturnable").instanceId,
      );
      expect(s.state.players[1]!.hand.map(({ instanceId }) => instanceId)).toContain(
        s.inst("opponentReturnable").instanceId,
      );
    },
  );
});
