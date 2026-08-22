import { describe, expect, it } from "vitest";
import { setupEngine as setup, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-098.js";
import "../index.js";

describe("BT21-098 Ragnarok Cannon", () => {
  it("deletes exactly one lowest-play-cost opposing Digimon and places itself in the battle area", async () => {
    const s = setup(
      {
        0: { battleArea: [{ card: "BT21-062", as: "galacticmon" }], hand: [{ card: "BT21-098", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low" },
            { card: "BT1-010", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const lowId = s.perm("low").permanentId;
    const highId = s.perm("high").permanentId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.every((permanent) => permanent.permanentId !== lowId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === highId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT21-098")).toBe(false);
    expect(s.events.some((event) => event.kind === "actionRejected")).toBe(false);
  });

  it("keeps Main deletion, Galacticmon Delay payload, and Security Vemmon play separate", () => {
    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "lowestPlayCost" } },
    });
    expect(main?.actions[1]).toEqual({ kind: "PlaceInBattleAreaSelf" });

    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(yourTurn?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenAttacking",
      sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Galacticmon"], match: "name" }] },
    });
    const nested = (yourTurn?.actions[0] as any).actions;
    expect(nested).toHaveLength(2);
    expect(nested[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { superlative: "lowestPlayCost" } },
    });
    expect(nested[1]).toMatchObject({
      kind: "SecurityManipulation",
      op: "trashTop",
      leaveCount: 1,
    });

    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true });
    expect(security?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      optional: true,
      from: ["hand", "trash"],
      target: { filter: { playCostLte: 6 } },
    });
    expect(security?.actions[1]).toEqual({ kind: "AddToHandSelf" });
  });
});
