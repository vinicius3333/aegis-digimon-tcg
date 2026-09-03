import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT22-060.js";

describe("BT22-060 Datamon", () => {
  it("protects itself and gains DP from face-down digivolution cards", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Restrict",
        restriction: "cantBeDeDigivolved",
        duration: "untilOpponentTurnEnd",
        target: { filter: { isSelfRef: true }, isSelf: true },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "ModifyDP",
        amount: 1000,
        duration: "untilOpponentTurnEnd",
        scaling: { per: 1, unit: "digivolutionCards", filter: { isSelfRef: true, faceDown: true } },
      });
    }
  });

  it("lets the opponent choose an attacker at end of their turn", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Attack",
          optional: true,
          drainTimingWindowDuringAttack: true,
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, chooser: "opponent" },
        },
      ],
    });
  });

  it("counts only face-down sources for DP and applies De-Digivolve immunity on evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT22-049",
              as: "base",
            },
          ],
          hand: [
            { card: "BT22-049", as: "faceDownSource" },
            { card: "BT22-049", as: "faceUpSource" },
            { card: "BT22-060", as: "datamon" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.placeUnder(s.perm("base").permanentId, [
      s.inst("faceDownSource").instanceId,
      s.inst("faceUpSource").instanceId,
    ]);
    s.perm("base").stack.find((card) => card.instanceId === s.inst("faceDownSource").instanceId)!.faceUp = false;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("datamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("base"), "cantBeDeDigivolved"));
    await settle();

    expect(s.perm("base").currentDP).toBe(7000);
    expect(observe(s.engine).isRestricted(s.perm("base"), "cantBeDeDigivolved")).toBe(true);
  });
});
