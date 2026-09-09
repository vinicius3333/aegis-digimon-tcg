import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-065.js";

describe("EX4-065 Trident Gaia", () => {
  it("deletes the highest-DP opposing Digimon", () => {
    expect(
      compiled.effects?.find((entry) => entry.trigger === "Main")?.actions?.find((action) => action.kind === "Delete"),
    ).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "highestDP" } },
    });
  });
  it("trashes the opponent's top security after a 13000-DP own Digimon deletion", () => {
    expect(
      compiled.effects
        ?.find((entry) => entry.trigger === "Main")
        ?.actions?.find((action) => action.kind === "SubTrigger"),
    ).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: { controller: "opponent", dp: { op: "gte", value: 13000 } },
      actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.isSecurity).toBe(true);
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-065");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it.each([
    { label: "13000 DP", victim: "AD1-006", shouldTrash: true },
    { label: "more than 13000 DP", victim: "AD1-025", shouldTrash: true },
    { label: "less than 13000 DP", victim: "AD1-004", shouldTrash: false },
  ])("trashes security only when the deleted Digimon is $label", async ({ victim, shouldTrash }) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "red" }], hand: [{ card: "EX4-065", as: "subject" }] },
        1: {
          battleArea: [
            { card: victim, as: "victim" },
            { card: "BT1-013", as: "other", dp: 3000 },
          ],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("subject").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(shouldTrash ? 1 : 2);
  });

  it("deletes only the highest-DP opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "red" }], hand: [{ card: "EX4-065", as: "subject" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "low", dp: 3000 },
            { card: "BT1-013", as: "high", dp: 7000 },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("subject").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId));

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.cardId).toBe("BT1-009");
  });

  ex4CardBehaviorTests("EX4-065");
});
