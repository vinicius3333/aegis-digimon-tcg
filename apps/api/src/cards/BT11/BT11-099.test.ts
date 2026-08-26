import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT11-099.js";

describe("BT11-099 Ice Statue", () => {
  it("maps catalog facts and each printed effect to IR", () => {
    expect(getCardDefinition("BT11-099")).toMatchObject({ cardId: "BT11-099", colors: ["Blue"], kinds: ["Option"], playCost: 6 });
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", actions: [{ kind: "Replacement", event: "wouldBePlayed" }] },
      { trigger: "Main", actions: [{ kind: "TrashDigivolution", amount: 3 }, { kind: "Return", to: "hand" }] },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
    ]);
  });

  it("trashes up to the top 3 sources, then returns a source-less opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-086"], hand: [{ card: "BT11-099", as: "option" }] },
        1: { battleArea: [{ card: "BT1-081", as: "target", under: ["BT1-075", "BT1-020", "BT1-015"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some(({ cardId }) => cardId === "BT1-081"));
    expect(s.state.memory).toBe(5);
    expect(s.state.players[1]!.trash).toHaveLength(3);
    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-081")).toBe(false);
  });
});
