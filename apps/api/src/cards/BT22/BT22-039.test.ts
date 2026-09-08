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

  it("relinks 1 Link-carrying App Fusion material after playing an Appmon", async () => {
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
    // When Digivolving plays Effecmon and reaches the All Turns watcher. Both recipe
    // materials print "[Link] [Appmon] trait: Cost 3", so the count-1 link takes one of them
    // from this Digimon's digivolution cards and leaves the other in the stack.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT22-009")).toBe(true);
    const linkedIds = [...s.state.players[0]!.battleArea].flatMap((permanent) =>
      [...permanent.linked].map((card) => card.cardId),
    );
    expect(linkedIds).toHaveLength(1);
    expect([...s.perm("ouranosmon").stack.map((card) => card.cardId), ...linkedIds].sort()).toEqual([
      "BT22-035",
      "BT22-075",
    ]);
  });

  it("Q4892 does not relink an Appmon digivolution card without Link after playing a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-039", as: "ouranosmon", under: [{ card: "BT21-101", as: "gaiamon" }] }],
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

    // Gaiamon has the [Appmon] trait but prints no ＜Link＞ header, so Q4892 excludes it.
    expect(s.state.players[0]!.battleArea.every((permanent) => permanent.linked.length === 0)).toBe(true);
    expect(s.perm("ouranosmon").stack.map((card) => card.cardId)).toEqual(["BT21-101"]);
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
