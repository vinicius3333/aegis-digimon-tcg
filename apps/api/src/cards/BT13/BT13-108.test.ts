import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-108.js";
import "./BT13-111.js";
import "../BT1/BT1-015.js";
import "./BT13-091.js";

describe("BT13-108 BT13-108", () => {
  it("grants the two opponent-turn effects and keeps the security deletion", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "GrantAuraToOpponents",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GrantAuraToOpponents",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          duration: "untilOpponentTurnEnd",
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" }, count: 1 },
        },
      ],
    });
  });

  it("loads the compiled implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-108", as: "card" }] } });
    await s.ready();
    expect(s.perm("card").topCard?.cardId).toBe("BT13-108");
  });

  it("naturally deletes opposing Digimon up to the granted host play cost and grants Option immunity", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-108", as: "option" }],
          battleArea: [{ card: "BT13-111", as: "host" }],
        },
        1: {
          battleArea: [
            { card: "BT1-015", as: "low" },
            { card: "BT13-091", as: "high" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-108"));

    s.state.turnSeat = 1;
    await advance(s.engine).recompute();
    expect(observe(s.engine).isRestrictedByEffect(s.perm("host"), "beAffected", "Option")).toBe(true);
    await advance(s.engine).verb.suspend([s.perm("host").permanentId], 1);
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("low").instanceId));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("low").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("high").instanceId)).toBe(true);
  });
});
