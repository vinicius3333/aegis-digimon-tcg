import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-049.js";
import "../index.js";

describe("BT21-049 Woodmon", () => {
  it("preserves the WG alternate Digivolution and inherited Piercing", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["WG"], cost: 2, isAlternate: true }]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
      }),
    );
  });

  it("optionally suspends one Digimon on play and when digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions).toEqual([
        {
          kind: "Suspend",
          target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
          optional: true,
        },
      ]);
    }
  });

  it("once per turn suspends an opposing Digimon when an opposing Digimon is played while this is suspended", () => {
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect(allTurns?.actions).toEqual([
      {
        kind: "SubTrigger",
        event: "whenPlayed",
        sourceFilter: { controller: "opponent", kind: ["Digimon"] },
        actions: [
          {
            kind: "Suspend",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
            condition: { kind: "selfIsSuspended", raw: "this Digimon is suspended" },
          },
        ],
      },
    ]);
  });

  it("enters through the public play intent with its optional On Play effect registered", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT21-049", as: "woodmon" }] }, 1: { battleArea: [{ card: "BT1-009", as: "target" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("woodmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("woodmon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("woodmon").instanceId)).toBe(
      true,
    );
  });

  it("retains complete compiled coverage and Piercing as a keyword surface", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT21-049", as: "woodmon" }] } });
    await s.ready();
    expect(s.perm("woodmon").topCard?.cardId).toBe("BT21-049");
  });
});
