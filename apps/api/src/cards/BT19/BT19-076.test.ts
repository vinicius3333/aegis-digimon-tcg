import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-076.js";

describe("BT19-076", () => {
  it("reveals and plays a qualifying Tamer through a public play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT19-076", as: "source" }], deck: ["BT19-081", "BT1-009", "BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-081"));
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toContain("BT19-081");
  });

  it("preserves reveal/add, optional Tamer play, and Save", () => {
    const card = runtimeCompiledCard("BT19-076");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          { kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "hand" }], rest: "deckBottom" },
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            optional: true,
            target: { filter: { kind: ["Tamer"], playCostLte: 4 } },
          },
        ],
      },
      { trigger: "OnDeletion", keywords: [{ keyword: "Save" }] },
    ]);
  });
});
