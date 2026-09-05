import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
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
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("legendArm").instanceId)).toBe(
      true,
    );
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
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
  });

  it("exposes Delay only after a completed turn, trashes itself, and returns all four cards together", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST13-16", as: "alliance", enteredThisTurn: true }],
          deck: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoChooseOption: true, autoOrderCards: false },
    );
    // Model the card's printed Main effect having placed this Option in the Battle Area;
    // otherwise the state-based rule process correctly trashes a pure Option permanent.
    s.perm("alliance").placedByEffect = true;
    const allianceInstanceId = s.perm("alliance").topCard.instanceId;
    await s.ready();
    expect(s.perm("alliance").activatableEffectsJson).toBe("");

    s.state.turnSeat = 1;
    const startingTurn = s.state.turnCount;
    await advance(s.engine).runTurn(1);
    expect(s.state.turnCount).toBeGreaterThan(startingTurn);
    // runOneTurn intentionally stops at End; hand the completed turn to the owner before
    // querying the next Main window, matching the production loop's passTurn step.
    s.state.turnSeat = 0;
    s.state.phase = "Main" as typeof s.state.phase;
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
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const orderRequest = s.decisions.at(-1)!.req;
    expect(orderRequest.kind).toBe("orderCards");
    expect(orderRequest.options?.candidateInstanceIds).toHaveLength(4);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: orderRequest.decisionId,
        response: { kind: "orderCards", order: orderRequest.options?.candidateInstanceIds ?? [] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.instanceId === allianceInstanceId) &&
        s.state.players[0]!.deck.length === 5 &&
        s.state.players[0]!.deck.every((card) => !card.faceUp),
    );

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === allianceInstanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual([
      "BT1-010",
      "BT1-011",
      "BT1-012",
      "BT1-013",
      "BT1-014",
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
