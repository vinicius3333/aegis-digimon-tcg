import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT11-104.js";

describe("BT11-104 Buster Dive", () => {
  it("maps catalog facts and each printed effect to IR", () => {
    expect(getCardDefinition("BT11-104")).toMatchObject({ cardId: "BT11-104", colors: ["Green"], kinds: ["Option"], playCost: 4 });
    expect(compiled.effects).toMatchObject([
      { trigger: "Static", actions: [{ kind: "Replacement", event: "wouldBePlayed" }] },
      {
        trigger: "Main",
        actions: [
          { kind: "ModifyDP", amount: 5000, alsoGainKeywords: [{ keyword: "Rush" }] },
          { kind: "Attack", target: { filter: { controller: "mine", kind: ["Digimon"] } } },
        ],
      },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "AddToHandSelf" }] },
    ]);
  });

  it("gives one own Digimon +5000 DP and Rush", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-088", { card: "BT1-075", as: "recipient", dp: 5000 }],
          hand: [{ card: "BT11-104", as: "option" }],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("recipient").currentDP === 10000);
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Rush")).toBe(true);
  });
});
