import { describe, expect, it } from "vitest";
import { EffectTiming, appFusionCostFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-035.js";

describe("BT22-035 Entermon", () => {
  it("links only qualifying level-4-or-lower Link cards to itself and keeps the linked Appmon play effect", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, colors: ["Yellow"], cost: 4, isAlternate: false },
      { level: 4, colors: ["Black"], cost: 4, isAlternate: false },
      { level: 4, traits: ["Sup."], cost: 4, isAlternate: true },
    ]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Mediamon", "Dreammon"], cost: 0 }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Link",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            levelComparison: { op: "lte", value: 4 },
            hasLinkRequirement: true,
            or: [{ zone: "hand" }, { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }],
          },
          count: 1,
        },
        from: ["hand", "digivolutionCards"],
        payCost: false,
        optional: true,
      });
    }
    const yourTurn = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          triggerFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              from: ["hand"],
              payCost: false,
              optional: true,
              target: {
                filter: { controller: "mine", playCostLte: 4, nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
                count: 1,
              },
            },
          ],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "WhenLinking")).toMatchObject({
      isLinked: true,
      actions: [
        {
          kind: "ModifyDP",
          amount: -4000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            unit: "cards",
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
            },
          },
        },
      ],
    });
  });

  it("requires distinct Mediamon and Dreammon materials for free App Fusion", () => {
    expect(appFusionCostFor("BT22-035", { topName: "Mediamon", linkedNames: ["Dreammon"] })).toBe(0);
    expect(appFusionCostFor("BT22-035", { topName: "Dreammon", linkedNames: ["Mediamon"] })).toBe(0);
    expect(appFusionCostFor("BT22-035", { topName: "Mediamon", linkedNames: ["Mediamon"] })).toBeUndefined();
  });

  it("allows colored routes and the differently-colored Sup. route, while rejecting a non-Sup. base", async () => {
    for (const [base, legal] of [
      ["BT22-034", true],
      ["BT22-058", true],
      ["BT22-020", false],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT22-035", as: "entermon" }] },
      });
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("entermon").instanceId,
        }).ok,
      ).toBe(legal);
    }
  });

  it("implements Q4881 by linking only a qualifying Link card from its evolution stack", async () => {
    for (const candidate of ["BT21-009", "BT22-032"]) {
      const s = setupEngine(
        { 0: { battleArea: [{ card: "BT22-035", under: [{ card: candidate, as: "candidate" }], as: "entermon" }] } },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();

      await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("entermon"));
      await settle();

      expect(s.perm("entermon").linked.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(
        candidate === "BT21-009",
      );
      expect(s.perm("entermon").stack.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(
        candidate === "BT22-032",
      );
    }
  });

  it("does not link a qualifying card from another Digimon's evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-035", as: "entermon" },
            { card: "BT22-032", under: [{ card: "BT21-009", as: "foreignCandidate" }], as: "other" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("entermon"));
    await settle();

    expect(s.perm("entermon").linked).toHaveLength(0);
    expect(s.perm("other").stack.some((card) => card.instanceId === s.inst("foreignCandidate").instanceId)).toBe(true);
  });

  it("plays one cost-4-or-lower Appmon only when Entermon itself gets linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-035", as: "entermon" },
            { card: "BT22-032", as: "other" },
          ],
          hand: [
            { card: "BT22-030", as: "eligible" },
            { card: "BT22-033", as: "tooExpensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("other").permanentId });
    expect(s.state.players[0]!.hand).toHaveLength(2);

    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("entermon").permanentId });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-030"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("tooExpensive").instanceId]);
  });

  it("scales the linked -4000 DP by the exact number of own Appmon Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-033", linked: [{ card: "BT22-035", as: "entermon" }], as: "host" },
            { card: "BT22-030", as: "secondAppmon" },
            { card: "BT22-032", as: "nonAppmon" },
          ],
        },
        1: { battleArea: [{ card: "BT22-024", dp: 12000, as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.OnLinking, s.inst("entermon"), {
      linkedInstanceIds: [s.inst("entermon").instanceId],
    });
    await settle(() => s.perm("opponent").currentDP === 4000);

    expect(s.perm("opponent").currentDP).toBe(4000);
  });

  it("charges the printed Link cost and resolves the scaled linked effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-035", as: "entermon" },
            { card: "BT22-030", as: "appmon" },
          ],
          hand: [{ card: "BT22-035", as: "link" }],
        },
        1: { battleArea: [{ card: "BT22-024", dp: 30000, as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("entermon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.memory).toBe(2);
    expect(s.perm("entermon").linked.map((card) => card.instanceId)).toEqual([s.inst("link").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    await advance(s.engine).fireForInstance(EffectTiming.OnLinking, s.inst("link"), {
      linkedInstanceIds: [s.inst("link").instanceId],
    });
    await settle(() => s.perm("opponent").currentDP === 14000);
    expect(s.perm("opponent").currentDP).toBe(14000);
  });
});
