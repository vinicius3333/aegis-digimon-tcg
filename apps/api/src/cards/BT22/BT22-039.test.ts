import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT22-039.js";
import "./index.js";

describe("BT22-039 Ouranosmon", () => {
  it("keeps Alliance/Link +1, shared once-per-turn play effects, and links an Appmon from this stack to an owned Digimon", () => {
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Entermon", "Fakemon"], cost: 0 }]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }] }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Link", amount: 1, raw: "＜Link +1＞" }] }),
    );
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
      });
    }
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ frequency: "OncePerTurn" });
    expect(allTurns?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              zone: "digivolutionCards",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
              hostFilter: { isSelfRef: true },
            },
            count: 1,
          },
          from: ["digivolutionCards"],
          recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          payCost: false,
          optional: true,
        },
      ],
    });
    expect(allTurns?.actions[0]).not.toHaveProperty("sourceFilter.excludeSelf");
  });

  it("Q4892 does not relink App Fusion materials without Link after playing an Appmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-035", as: "ouranosmon", linked: [{ card: "BT22-075", as: "fakemon" }] }],
          hand: [
            { card: "BT22-039", as: "fusion" },
            { card: "BT22-009", as: "effecmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.appFuseInto(s.perm("ouranosmon").permanentId, s.inst("fusion").instanceId);
    // When Digivolving plays Effecmon and reaches the All Turns watcher. Neither
    // recipe material has Link; Q4892 therefore excludes both, despite their Appmon trait.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT22-009")).toBe(true);
    expect(s.perm("ouranosmon").stack.map((card) => card.cardId)).toEqual(["BT22-035", "BT22-075"]);
    expect(s.state.players[0]!.battleArea.every((permanent) => permanent.linked.length === 0)).toBe(true);
  });

  it("does not link an eligible Appmon from another Digimon's evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-039", as: "ouranosmon" },
            { card: "BT22-032", under: [{ card: "BT21-009", as: "foreignCandidate" }], as: "other" },
          ],
          hand: [{ card: "BT22-032", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("ouranosmon").linked).toHaveLength(0);
    expect(s.perm("other").stack.some((card) => card.instanceId === s.inst("foreignCandidate").instanceId)).toBe(true);
  });
});
