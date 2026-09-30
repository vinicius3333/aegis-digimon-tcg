import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-011.js";
import "./P-077.js";
import "./P-103.js";
import "../BT2/BT2-075.js";

describe("P-077 Wizardmon", () => {
  it("gains 1 memory only when directly trashed from the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-011", as: "attacker" }, "BT1-086"],
          deck: [{ card: "P-077", as: "wizardmon" }, "BT1-009", "BT1-009", "BT1-028"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true, dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("wizardmon").instanceId));
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });

  it("places a revealed purple card from hand on top of the deck when inherited", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-081", as: "attacker", under: ["P-077", "BT2-075"] }],
          hand: [
            { card: "BT2-107", as: "purple" },
            { card: "BT1-009", as: "red" },
          ],
          deck: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", suspended: true, dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const purpleId = s.inst("purple").instanceId;
    const redId = s.inst("red").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck[0]?.instanceId === purpleId);

    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(purpleId);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === redId)).toBe(true);
  });
});

describe("P-077 Wizardmon — KB Q&A rulings", () => {
  it("gains no memory when revealed from the deck and placed at the bottom (Q4177)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT1-009"],
          hand: [{ card: "P-103", as: "training" }],
          deck: [{ card: "P-077", as: "wizardmon" }, { card: "BT1-009", as: "red" }, "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const trainingId = s.inst("training").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: trainingId })).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === trainingId) &&
        s.state.pendingDecision === undefined,
    );
    await settle(() => false, 40);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("red").instanceId]);
    expect(s.state.players[0]!.deck.at(-1)!.instanceId).toBe(s.inst("wizardmon").instanceId);
    expect(s.state.memory).toBe(3);
  });
});
