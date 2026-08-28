import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-036.js";

describe("BT23-036 BanchoLeomon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-036")).toMatchObject({
      cardId: "BT23-036",
      nameEn: "BanchoLeomon",
      colors: ["Yellow", "Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 4 },
        { color: "Red", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Beastkin", "Boss", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, names: ["Leomon"], cost: 3, isAlternate: true },
      { traits: ["CS"], cost: 3, isAlternate: true, level: 5 },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

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

  it.each([
    ["BT4-061", "Leomon-name"],
    ["BT23-034", "CS-trait"],
  ])("digivolves another Digimon into a qualifying %s card for free", async (evolutionCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-036", as: "source" },
            { card: "BT23-044", as: "other" },
          ],
          hand: [{ card: evolutionCard, as: "evolution" }],
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

  it("does not reduce its play cost below the 10000-DP boundary", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT23-036", as: "bancho" }] },
      1: { battleArea: [{ card: "BT23-033", as: "below" }] },
    });
    s.state.memory = 12;
    const banchoId = s.inst("bancho").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: banchoId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === banchoId));
    expect(s.state.memory).toBe(0);
  });

  it("may refuse the attack after the selected Digimon gains Raid", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT23-036", as: "bancho" }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("bancho"));
    expect(observe(s.engine).hasKeyword(s.perm("bancho"), "Raid")).toBe(true);
    expect(s.perm("bancho").isSuspended).toBe(false);
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
