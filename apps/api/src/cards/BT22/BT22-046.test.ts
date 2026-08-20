import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-046.js";
import "../index.js";

describe("BT22-046 Gargomon", () => {
  it("limits the free CS Tamer play to one or fewer Tamers", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      optional: true,
      target: {
        filter: { controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
        count: 1,
      },
      condition: { kind: "permanentCount", filter: { controller: "mine", kind: ["Tamer"] }, op: "lte", value: 1 },
    });
  });

  it("retains inherited permanent +1000 DP", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: 1000,
      duration: "permanent",
    });
  });

  it("pays 2 on a CS level 3 and optionally plays a CS Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-043", as: "base" }],
          hand: [
            { card: "BT22-046", as: "gargomon" },
            { card: "BT22-091", as: "arata" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gargomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-091"));

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-091")).toBe(true);
  });

  it("leaves the CS Tamer in hand when 2 Tamers are already present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-043", as: "base" },
            { card: "BT22-090", as: "first" },
            { card: "BT22-092", as: "second" },
          ],
          hand: [
            { card: "BT22-046", as: "gargomon" },
            { card: "BT22-091", as: "arata" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gargomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT22-091")).toBe(true);
  });
});
