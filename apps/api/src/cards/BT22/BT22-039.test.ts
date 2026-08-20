import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-039.js";
import "../index.js";

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
  });

  it("implements Q4892 by playing an Appmon on attack and linking an eligible stack card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-039", as: "ouranosmon", under: ["BT22-016", "BT21-009"] }],
          hand: [{ card: "BT22-009", as: "effecmon" }],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("ouranosmon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-009"));
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.linked.some((card) => card.cardId === "BT21-009")));
    await settle();

    expect(s.perm("ouranosmon").stack.some((card) => card.cardId === "BT22-016")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.linked.some((card) => card.cardId === "BT22-016"))).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.linked.some((card) => card.cardId === "BT21-009"))).toBe(true);
  });
});
