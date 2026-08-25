import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT21-066.js";
import "../index.js";

describe("BT21-066 Arresterdramon", () => {
  it("preserves both alternate Digivolution requirements, DigiXros, and complete coverage", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 3, texts: ["Save"], cost: 2, isAlternate: true },
      { level: 3, traits: ["Hero"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ desc: "1 Digimon card with ＜Save＞ in text" }], count: 2 },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual ?? []).toEqual([]);
  });

  it("plays Hunter/Hero Tamers and saves a qualifying Digimon", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [expect.objectContaining({ kind: "PlayWithoutCost", from: ["hand"] })],
      }),
    );
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "WhenDigivolving" }));
    const deletion = compiled.effects.find((entry) => entry.trigger === "OnDeletion");
    const saveAction = deletion?.actions[0] as { target?: { orFilters?: Array<{ keywords?: string[] }> } };
    expect(saveAction.target?.orFilters).toEqual(
      expect.arrayContaining([expect.objectContaining({ keywords: ["Save"] })]),
    );
    expect(saveAction.target).toMatchObject({
      filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Hero"], match: "trait" }] },
      orFilters: [{ controller: "mine", kind: ["Digimon"], keywords: ["Save"] }],
      count: 1,
      from: ["hand", "trash"],
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        actions: [{ kind: "ModifyDP", target: expect.anything(), amount: 2000, duration: "permanent" }],
      }),
    );
  });

  it.each([
    ["Hunter", "BT12-087"],
    ["Hero", "BT21-080"],
  ])("plays a %s Tamer from hand without cost on play", async (_label, tamer) => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT21-066", as: "arrester" }], hand: [{ card: tamer, as: "tamer" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("arrester"));
    await settle(() =>
      s.state.players[0]!.battleArea.some((card) => card.topCard.instanceId === s.inst("tamer").instanceId),
    );

    expect(s.state.memory).toBe(0);
  });

  it("does not play a nonmatching Tamer", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT21-066", as: "arrester" }], hand: [{ card: "BT1-085", as: "tamer" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("arrester"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(true);
  });

  it.each([
    ["Save-text trash card", "BT21-011", "trash"],
    ["Hero hand card", "BT21-063", "hand"],
  ] as const)("places a %s and itself under an own Tamer on deletion", async (_label, savedCard, zone) => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-066", as: "arrester" },
            { card: "BT21-080", as: "tamer" },
          ],
          [zone]: [{ card: savedCard, as: "saved" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("saved").instanceId, s.perm("tamer").permanentId);
    const selfId = s.perm("arrester").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("arrester").permanentId], "byEffect")).toBe(1);
    await settle(() => s.perm("tamer").stack.length === 2);

    expect(s.perm("tamer").stack.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([selfId, s.inst("saved").instanceId]),
    );
  });

  it("gives its evolution host +2000 DP only during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT21-068", as: "host", under: [{ card: "BT21-066", as: "source" }] }] },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(7000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(5000);
  });
});
