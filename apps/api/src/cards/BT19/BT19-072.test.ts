import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-072.js";

describe("BT19-072", () => {
  it("plays a qualifying Digimon from trash through a public play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT19-072", as: "source" }], trash: [{ card: "BT19-069", as: "revived" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-069"));
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toContain("BT19-069");
  });

  it("preserves trash play on both evolution timings and once-per-turn Royal Knight redirect", () => {
    const card = runtimeCompiledCard("BT19-072");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true }],
      })),
      {
        trigger: "OpponentsTurn",
        frequency: "OncePerTurn",
        actions: [
          { kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", optional: true }] },
        ],
      },
    ]);
  });
});
