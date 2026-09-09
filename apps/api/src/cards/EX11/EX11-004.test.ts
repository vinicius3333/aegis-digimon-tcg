import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-004.js";
import "./EX11-025.js";

describe("EX11-004 Kapurimon", () => {
  it("encodes the inherited once-per-turn opponent-security watcher", () => {
    const compiled = runtimeCompiledCard("EX11-004")!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenFaceUpCardsAddedToOpponentSecurity",
            actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
          },
        ],
      }),
    );
  });

  it("draws when an attack flips the opponent's face-down security face up (Q5789)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-037", as: "host", under: ["EX11-004"] }],
        deck: [{ card: "BT1-009", as: "drawn" }],
      },
      1: { security: [{ card: "BT1-009", as: "checked", faceUp: false }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
    assertNoLoudGap(s);
  });

  it("does not draw from a public face-up placement in its controller's own security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-037", as: "host", under: ["EX11-004"] },
            { card: "EX11-025", as: "funbeemon" },
          ],
          security: [{ card: "BT1-009", as: "top" }],
          hand: [{ card: "EX11-030", as: "royalBase" }],
          deck: [{ card: "BT1-010", as: "deckTop" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle();

    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ cardId: "EX11-030", faceUp: true });
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("deckTop").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await turn;
    assertNoLoudGap(s);
  });

  it("does not treat checking an already-face-up security card as a new add", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-037", as: "host", under: ["EX11-004"] }],
        deck: [{ card: "BT1-009", as: "deckTop" }],
      },
      1: { security: [{ card: "BT1-009", faceUp: true }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.gameOver !== undefined);

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("deckTop").instanceId);
    assertNoLoudGap(s);
  });
});
