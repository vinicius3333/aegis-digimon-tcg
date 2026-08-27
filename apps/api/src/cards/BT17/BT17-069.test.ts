import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-069.js";
import "./index.js";

describe("BT17-069 Fenriloogamon", () => {
  it("binds the trash-played Fenriloogamon or Kazuchimon for the delayed return", () => {
    const digivolving = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(digivolving?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      bindResultAs: "playedFenriloogamon",
      target: { filter: { nameOrTrait: [{ tokens: ["Fenriloogamon", "Kazuchimon"], match: "name" }] } },
    });
    expect(digivolving?.actions[1]).toMatchObject({
      kind: "DelayedEffect",
      trigger: "nextEndOfOpponentTurn",
      effect: { kind: "Return", target: { filter: { boundRef: "playedFenriloogamon" } }, to: "hand" },
    });
  });

  it("keeps the Once Per Turn deletion trigger scoped to SoC or Pulsemon text", () => {
    const effect = compiled.effects.find((entry) => entry.frequency === "OncePerTurn");
    expect(effect?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon", "Tamer"],
        nameOrTrait: [
          { tokens: ["SoC"], match: "trait" },
          { tokens: ["Pulsemon"], match: "text" },
        ],
      },
      actions: [
        { kind: "Delete", target: { filter: { controller: "opponent", dp: { op: "lte", value: 10000 } }, count: 1 } },
      ],
    });
  });

  it("deletes a 10000 DP opposing Digimon when an SoC Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-069", as: "fenriloogamon" }],
          hand: [{ card: "BT14-071", as: "loogamon" }],
        },
        1: { battleArea: [{ card: "BT17-070", dp: 10000, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const targetId = s.perm("target").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("loogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId));

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT17-070")).toBe(true);
  });
});
