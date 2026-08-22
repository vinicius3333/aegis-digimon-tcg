import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-087.js";

describe("BT13-087 Dynasmon", () => {
  it("reveals four and adds up to two Lucemon/Royal Knight cards, trashing the rest", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 4,
            rest: "trash",
            add: [
              {
                count: 2,
                to: "hand",
                filter: {
                  controllerDefault: "mine",
                  nameOrTrait: [
                    { match: "name", tokens: ["Lucemon"] },
                    { match: "trait", tokens: ["Royal Knight"] },
                  ],
                },
              },
            ],
          },
        ],
      });
    }
  });

  it("deletes all opposing level 4 or lower Digimon when another matching Digimon is played", () => {
    const watcher = compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0] as {
      sourceFilter?: unknown;
      actions?: unknown[];
    };
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controllerDefault: "mine", excludeSelf: true, kind: ["Digimon"] },
    });
    expect(watcher.sourceFilter).toMatchObject({
      nameOrTrait: [
        { match: "name", tokens: ["Lucemon"] },
        { match: "trait", tokens: ["Royal Knight"] },
      ],
    });
    expect(watcher.actions?.[0]).toMatchObject({
      kind: "Delete",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
        count: "all",
      },
    });
  });

  it("deletes opposing level 4 Digimon when a Royal Knight is played", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-087", as: "dynasmon" }], hand: [{ card: "BT13-075", as: "royal" }] },
        1: { battleArea: [{ card: "BT13-081", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("royal").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toContain("BT13-081");
  });
});
