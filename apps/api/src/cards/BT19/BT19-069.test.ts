import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-069.js";

describe("BT19-069", () => {
  it("deletes a level-4 opponent Digimon through a public play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-069", as: "source" },
            { card: "BT1-009", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT19-069", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("preserves hand-cost deletion on all three timings and inherited Blocker", () => {
    const card = runtimeCompiledCard("BT19-069");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving", "OnDeletion"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "Delete",
            target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } } },
            cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" } } },
            optional: true,
            abortOnDecline: true,
          },
        ],
      })),
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Blocker" }] },
    ]);
  });
});
