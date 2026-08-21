import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./EX11-010.js";
import "./EX11-012.js";

describe("EX11-012 Medusamon", () => {
  it("deletes an opposing Digimon within its DP on digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-010", as: "base", dp: 7000 }],
          hand: [{ card: "EX11-012", as: "medusamon" }],
        },
        1: { battleArea: [{ card: "EX11-008", as: "victim", dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("medusamon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "EX11-008"), 600);

    expect(s.state.players[1]!.trash.some((card) => card.cardId === "EX11-008")).toBe(true);
    expect(s.perm("base").topCard?.cardId).toBe("EX11-012");
  });

  it("encodes both token triggers, opponent-side placement, deck-bottom cost, and token replacement", () => {
    const compiled = runtimeCompiledCard("EX11-012")!;
    for (const trigger of ["WhenDigivolving", "EndOfAttack"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          expect.objectContaining({ kind: "Delete", optional: true }),
          expect.objectContaining({
            kind: "PlayToken",
            token: "Petrification",
            controller: "mine",
            placedAs: "opponentDigimon",
            cost: expect.objectContaining({ to: "deckBottom" }),
          }),
        ],
      });
    }
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      trigger: "OnDeletion",
      actions: [expect.objectContaining({ kind: "Trash", target: expect.objectContaining({ count: 1, filter: expect.objectContaining({ zone: "security", position: "top" }) }) })],
    }));
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      trigger: "AllTurns",
      actions: [expect.objectContaining({ kind: "Replacement", event: "wouldLeavePlay" })],
    }));
  });
});
