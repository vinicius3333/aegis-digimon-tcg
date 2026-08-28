import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST13-16.js";

describe("ST13-16 Legend-Arms Alliance", () => {
  it("plays an eligible Legend-Arms Digimon and remains in the battle area for Delay", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST13-12"],
          hand: [
            { card: "ST13-16", as: "alliance" },
            { card: "ST13-04", as: "legendArm" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("alliance").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-16"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-16")).toBe(true);
  });

  it("places itself even when the optional Digimon play is declined", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["ST13-12"], hand: [{ card: "ST13-16", as: "alliance" }] },
      },
      { autoAcceptOptional: false },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("alliance").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-16"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "ST13-16")).toBe(true);
  });

  it("exposes Delay only on a later turn, trashes itself, and returns all four cards together", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-16", as: "alliance" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoChooseOption: true, autoOrderCards: true },
    );
    s.perm("alliance").enterFieldTurnCount = s.state.turnCount;
    await s.ready();
    expect(s.perm("alliance").activatableEffectsJson).toBe("");

    s.perm("alliance").enterFieldTurnCount = s.state.turnCount - 1;
    await s.engine.recomputeContinuousEffects();
    const [delay] = JSON.parse(s.perm("alliance").activatableEffectsJson) as { effectKey: string }[];
    expect(delay).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("alliance").topCard.instanceId,
        effectKey: delay!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.cardId === "ST13-16") &&
        s.state.players[0]!.deck.length === 5 &&
        s.state.players[0]!.deck.every((card) => !card.faceUp),
    );

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual([
      "BT1-009",
      "BT1-010",
      "BT1-011",
      "BT1-012",
      "BT1-013",
    ]);
  });

  it("plays an eligible Digimon for free and places itself from Security", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          hand: [{ card: "ST13-04", as: "legend-arm" }],
          security: ["ST13-16"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST13-16"));

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST13-04")).toBe(true);
  });
});
