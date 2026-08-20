import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-036.js";

describe("BT23-036 BanchoLeomon", () => {
  it("pays the reduced play cost at the exact 10000-DP opponent boundary", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT23-036", as: "bancho" }] },
      1: { battleArea: [{ card: "BT1-024", as: "threshold" }] },
    });
    s.state.memory = 10;
    const banchoId = s.inst("bancho").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: banchoId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === banchoId));

    expect(s.state.memory).toBe(3);
  });

  it("digivolves only another Digimon into a qualifying level-6 CS card for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-036", as: "source" },
            { card: "BT23-044", as: "other" },
          ],
          hand: [{ card: "BT23-036", as: "evolution" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const evolutionId = s.inst("evolution").instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));

    expect(s.perm("other").topCard?.instanceId).toBe(evolutionId);
    expect(s.perm("source").topCard?.cardId).toBe("BT23-036");
    expect(s.state.memory).toBe(4);
  });

  it("reduces its play cost when the opponent has a 10000+ DP Digimon", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "Static") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Replacement",
          mode: "reduceCost",
          amount: 5,
          condition: {
            kind: "opponentHas",
            filter: { controllerDefault: "opponent", kind: ["Digimon"], dp: { op: "gte", value: 10000 } },
          },
        },
      ],
    });
  });

  it("lets one other Digimon digivolve into a level 6-or-lower Leomon/CS Digimon from hand", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Digivolve",
        target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
        into: {
          controllerDefault: "mine",
          kind: ["Digimon"],
          levelComparison: { op: "lte", value: 6 },
          nameOrTrait: [
            { tokens: ["Leomon"], match: "name" },
            { tokens: ["CS"], match: "trait" },
          ],
        },
        from: ["hand"],
        payCost: false,
        optional: true,
      });
    }
  });

  it("grants Raid and attacks the same Digimon at end of turn", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Raid" },
      target: { count: 1 },
    });
    expect(effect.actions[1]).toMatchObject({ kind: "Attack", target: { count: 1, sameTarget: true }, optional: true });
  });
});
