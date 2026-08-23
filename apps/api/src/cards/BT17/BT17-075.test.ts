import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-075.js";
import "./index.js";

describe("BT17-075 Eosmon", () => {
  it("offers the opponent a Tamer first, then conditionally offers a white low-cost Tamer", () => {
    for (const effect of [compiled.effects?.[0], compiled.effects?.[1]]) {
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "PlayWithoutCost",
        controller: "opponent",
        from: ["hand"],
        optional: true,
        target: { filter: { controller: "opponent", kind: ["Tamer"] } },
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "PlayWithoutCost",
        from: ["hand"],
        optional: true,
        condition: { kind: "ifThisEffectDidNotAct" },
        target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["White"], playCostLte: 4 } },
      });
    }
  });

  it("always performs the scaled De-Digivolve step after the Tamer choices", () => {
    expect(compiled.effects?.[0]?.actions?.[2]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
      scaling: { per: 2, unit: "cards", filter: { kind: ["Tamer"] } },
    });
    expect(compiled.effects?.[1]?.actions?.[2]).toMatchObject({ kind: "DeDigivolve", amount: 1 });
    expect(compiled.effects?.[0]?.actions?.[2]?.scaling?.filter).not.toHaveProperty("controllerDefault");
  });

  it("redirects one attack once per turn to an unsuspended Eosmon", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              optional: true,
              target: {
                filter: { controller: "mine", unsuspended: true, nameOrTrait: [{ tokens: ["Eosmon"], match: "name" }] },
              },
            },
          ],
        },
      ],
    });
  });

  it("counts both players' Tamers for the on-play De-Digivolve", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-087", as: "ownTamer" }],
          hand: [{ card: "BT17-075", as: "eosmon" }],
        },
        1: {
          battleArea: [
            { card: "BT17-088", as: "opposingTamer" },
            { card: "BT17-071", under: ["BT17-063"], as: "target" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eosmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").topCard.cardId === "BT17-063");

    expect(s.perm("target").topCard.cardId).toBe("BT17-063");
  });
});
