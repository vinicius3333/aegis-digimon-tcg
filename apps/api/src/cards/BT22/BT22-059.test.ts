import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT22-059.js";

describe("BT22-059 Infermon", () => {
  it("deletes an opposing play-cost-5-or-lower Digimon and grants conditional protection", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 5 }, count: 1 },
      });
      expect(effect?.actions[1]).toMatchObject({
        kind: "GrantStatic",
        grant: "immuneToOpponentDPReductionAndReturn",
        duration: "untilOpponentTurnEnd",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        condition: {
          kind: "youHave",
          filter: { nameOrTrait: [{ tokens: ["Arata Sanada", "Eater Adam"], match: "name" }] },
        },
      });
    }
  });

  it("plays one Diaboromon token when an own Unidentified Digimon is deleted", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Unidentified"], match: "trait" }],
          },
          actions: [{ kind: "PlayToken", tokens: ["Diaboromon"], count: 1, payCost: false, optional: true }],
        },
      ],
    });
  });

  it("deletes a cost-5 Digimon through the public play flow", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT22-059", as: "infermon" }] }, 1: { battleArea: [{ card: "BT22-071", as: "target" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("infermon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT22-071")).toBe(true);
  });

  it("plays a Diaboromon token when an own Unidentified Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT22-064", as: "host", under: ["BT22-059"] },
            { card: "BT22-057", as: "deleted" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause: "byEffect"): Promise<unknown> } }
    ).primitives.deletePermanent([s.perm("deleted").permanentId], "byEffect");
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId.startsWith("TOKEN-")),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId.startsWith("TOKEN-"))).toBe(
      true,
    );
  });
});
