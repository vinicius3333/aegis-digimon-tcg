import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT12-010.js";

describe("BT12-010 Growlmon", () => {
  it("plays Takato for free after a public digivolution when none is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-007", as: "base" }],
          hand: [{ card: "BT12-010", as: "growlmon" }, { card: "BT12-089", as: "takato" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT12-089"));
    expect(s.perm("base").topCard.cardId).toBe("BT12-010");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toContain("BT12-007");
    expect(s.state.memory).toBe(8);
  });

  it("can decline the free Takato play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-007", as: "base" }],
          hand: [{ card: "BT12-010", as: "growlmon" }, { card: "BT12-089", as: "takato" }],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT12-010");
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("takato").instanceId);
  });

  it("does not play another Takato when one is already in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT12-007", as: "base" }, { card: "BT12-089", as: "resident" }],
          hand: [{ card: "BT12-010", as: "growlmon" }, { card: "BT12-089", as: "takato" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("growlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT12-010");
    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId === "BT12-089")).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("takato").instanceId);
  });

  it("gives a Growlmon-name inherited host +2000 DP during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT12-016", as: "host", under: ["BT12-010"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(10000);
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(8000);
  });

  it("gives a Gallantmon host +2000 DP and excludes an unrelated host", async () => {
    const gallantmon = setupEngine({ 0: { battleArea: [{ card: "BT12-018", as: "host", under: ["BT12-010"] }] } });
    await gallantmon.engine.recomputeContinuousEffects();
    expect(gallantmon.perm("host").currentDP).toBe(14000);

    const plain = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT12-010"] }] } });
    await plain.engine.recomputeContinuousEffects();
    expect(plain.perm("host").currentDP).toBe(3000);
  });
});
