import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-082.js";
import "./index.js";

describe("BT17-082 Minami Uehara", () => {
  it("plays Labramon or Seasarmon from hand or a digivolution stack", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "digivolutionCards"],
          payCost: false,
          optional: true,
          target: { filter: { nameOrTrait: [{ tokens: ["Labramon", "Seasarmon"], match: "name" }] } },
        },
      ],
    });
  });

  it("triggers only when one of your Digimon is played from digivolution cards", () => {
    expect(compiled.effects?.[1]?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"], fromDigivolution: true },
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Rush" },
          duration: "forTheTurn",
          cost: {
            kind: "suspend",
            target: { filter: { nameOrTrait: [{ tokens: ["Minami Uehara"], match: "name" }] } },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
  });

  it("limits the temporary keyword to one blue Digimon", () => {
    expect((compiled.effects?.[1]?.actions?.[0] as any)?.actions?.[0]).toMatchObject({
      target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"] }, count: 1 },
    });
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("plays Labramon from a stack, suspends Minami, and grants it Rush", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-024", under: [{ card: "BT17-021", as: "labramon" }], as: "host" }],
          hand: [{ card: "BT17-082", as: "minami" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const labramonId = s.inst("labramon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("minami").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === labramonId));
    const labramon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === labramonId)!;

    expect(labramon.topCard.instanceId).toBe(labramonId);
  });
});
