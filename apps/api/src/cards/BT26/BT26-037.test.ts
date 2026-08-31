import { describe, expect, it } from "vitest";
import { appFusionCostFor, assemblyRequirementFor, EffectDuration, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-037.js";

describe("BT26-037 Weatherdramon", () => {
  it("models App Fusion, Assembly, link windows, Blocker/Detach, and linked battle", () => {
    expect(appFusionCostFor("BT26-037", { topName: "Weathermon", linkedNames: ["Rocketmon"] })).toBe(0);
    expect(assemblyRequirementFor("BT26-037")).toEqual([
      { reduceCost: 2, materials: [{ traits: ["Navi", "System", "Seven Code"], level: 3, count: 1 }] },
    ]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Weathermon", "Rocketmon", "Newsmon"], cost: 0 }]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          keywords: expect.arrayContaining([
            { keyword: "Blocker", raw: "＜Blocker＞" },
            { keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" },
          ]),
        }),
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [
            expect.objectContaining({
              kind: "Link",
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
              target: expect.objectContaining({
                filter: expect.objectContaining({
                  controllerDefault: "mine",
                  hostFilter: { isSelfRef: true },
                }),
              }),
            }),
          ],
        }),
        expect.objectContaining({ trigger: "WhenDigivolving" }),
        expect.objectContaining({
          trigger: "Static",
          isLinked: true,
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenLinked",
              actions: [expect.objectContaining({ kind: "Battle", optional: true })],
            }),
          ],
        }),
      ]),
    );
  });

  it("accepts every distinct ordered App Fusion pair and rejects duplicate names (Q7017)", () => {
    const names = ["Weathermon", "Rocketmon", "Newsmon"];
    for (const topName of names) {
      for (const linkedName of names) {
        expect(appFusionCostFor("BT26-037", { topName, linkedNames: [linkedName] })).toBe(
          topName === linkedName ? undefined : 0,
        );
      }
    }
  });

  it("links a legal source and resolves its linked-face battle from a recipient", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-037", as: "weatherdramon", under: ["BT21-047"] },
            { card: "BT26-084", as: "recipient", linked: [{ card: "BT26-037" }] },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("weatherdramon"));

    expect(s.perm("weatherdramon").linked.map((card) => card.cardId)).toEqual(["BT21-047"]);

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("recipient").permanentId,
    });
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("does not link a level-3 source that has no Link requirement (Q7014)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-037", as: "weatherdramon", under: [{ card: "BT1-066", as: "noLink" }] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("weatherdramon"));

    expect(s.perm("weatherdramon").linked).toHaveLength(0);
    expect(s.perm("weatherdramon").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("noLink").instanceId);
  });

  it("may decline the On Play link without moving the eligible source", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT26-037", as: "weatherdramon", under: ["BT21-047"] }] } },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("weatherdramon"));

    expect(s.perm("weatherdramon").linked).toHaveLength(0);
    expect(s.perm("weatherdramon").stack.map(({ cardId }) => cardId)).toEqual(["BT21-047"]);
  });

  it("only links from this Digimon's stack, not another own Digimon's stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-037", as: "weatherdramon", under: ["BT1-066"] },
            { card: "BT11-051", as: "otherHost", under: ["BT21-047"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("weatherdramon"));

    expect(s.perm("weatherdramon").linked).toHaveLength(0);
    expect(s.perm("otherHost").stack.map(({ cardId }) => cardId)).toEqual(["BT21-047"]);
  });

  it("can battle and delete a Digimon unaffected by Digimon effects (Q7015/Q7016)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-084", as: "recipient" }],
          hand: [{ card: "BT26-037", as: "weatherdramon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "immune", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    advance(s.engine).ledgers.continuous.addRestriction(
      s.perm("immune").permanentId,
      "beAffected",
      EffectDuration.UntilEachTurnEnd,
      { fromSourceKind: ["Digimon"] },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("weatherdramon").instanceId,
        targetPermanentId: s.perm("recipient").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.perm("recipient").linked.map(({ cardId }) => cardId)).toContain("BT26-037");
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("may decline the linked-face battle (Q7015)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-084", as: "recipient" }],
          hand: [{ card: "BT26-037", as: "weatherdramon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 3000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("weatherdramon").instanceId,
        targetPermanentId: s.perm("recipient").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("recipient").linked.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("performs Assembly -2 with one level-3 Navi source from trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-037", as: "weatherdramon" }],
          trash: [{ card: "BT21-047", as: "material" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("weatherdramon").instanceId,
        assembly: { materialInstanceIds: [s.inst("material").instanceId] },
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT26-037"));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT26-037");
    expect(played?.stack.map(({ cardId }) => cardId)).toContain("BT21-047");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT21-047")).toBe(false);
  });
});
