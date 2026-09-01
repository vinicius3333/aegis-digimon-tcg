import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT19-065.js";

describe("BT19-065", () => {
  it("preserves level deletion, trash play, Composite trait, and inherited attack redirect", () => {
    const card = runtimeCompiledCard("BT19-065");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "Delete", target: { filter: { kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } } } },
        ],
      })),
      {
        trigger: "OnDeletion",
        actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }],
      },
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Composite"] }] },
      {
        trigger: "OpponentsTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          { kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", optional: true }] },
        ],
      },
    ]);
  });

  it("resolves On Play deletion from a public play intent", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT19-065", as: "machine" }] }, 1: { battleArea: [{ card: "BT19-020", as: "target" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("machine").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
