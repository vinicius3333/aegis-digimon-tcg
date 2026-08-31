import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-148.js";

describe("P-148 Wanyamon", () => {
  it("encodes the inherited once-per-turn conditional Draw 1", () => {
    const compiled = runtimeCompiledCard("P-148")!;
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "WhenAttacking",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            expect.objectContaining({
              kind: "Draw",
              controller: "mine",
              amount: 1,
              condition: expect.objectContaining({
                kind: "selfHasTrait",
                filter: { nameOrTrait: [{ tokens: ["NSp"], match: "trait" }] },
              }),
            }),
          ],
        }),
      ]),
    );
  });

  it("draws once when an NSp Digimon attacks, but not for a non-NSp host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-035", as: "nsp", under: ["P-148"] },
          { card: "BT1-009", as: "plain", under: ["P-148"] },
        ],
        deck: [{ card: "BT1-001", as: "drawn" }, { card: "BT1-002" }],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("nsp").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.length).toBe(1);
    const handAfterNsp = s.state.players[0]!.hand.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("plain").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand).toHaveLength(handAfterNsp);
  });
});
