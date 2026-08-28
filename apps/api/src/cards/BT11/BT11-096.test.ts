import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-096.js";

describe("BT11-096 Magma Bomb", () => {
  it("maps catalog facts and each printed effect to IR", () => {
    expect(getCardDefinition("BT11-096")).toMatchObject({ cardId: "BT11-096", colors: ["Red"], kinds: ["Option"], playCost: 6 });
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", actions: [{ kind: "Replacement", event: "wouldBePlayed" }] },
      { trigger: "Main", actions: [{ kind: "Delete" }] },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
    ]);
  });

  it("costs 1 less with a red Tamer and deletes only a lowest-DP Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-085"],
          hand: [{ card: "BT11-096", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "low", dp: 2000 },
            { card: "BT1-015", as: "high", dp: 4000 },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("low").permanentId);
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea[0]!.topCard?.cardId).toBe("BT1-015");
  });

  it("pays the full option cost without a red Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-009"], hand: [{ card: "BT11-096", as: "option" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 2000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(0);
  });
});
