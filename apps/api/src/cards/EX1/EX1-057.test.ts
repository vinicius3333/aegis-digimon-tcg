import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-056.js";
import "./EX1-057.js";

describe("EX1-057 Wizardmon", () => {
  it("has Retaliation and inherited grants Rush to all of your Retaliation Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX1-057", as: "wizardmon" },
          { card: "EX1-060", as: "host", under: ["EX1-057"] },
          { card: "EX1-056", as: "recipient" },
          { card: "EX1-058", as: "nonRetaliation" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("wizardmon"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("nonRetaliation"), "Rush")).toBe(false);
  });

  it("does not grant Rush to an opponent's Retaliation Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-060", as: "host", under: ["EX1-057"] }] },
      1: { battleArea: [{ card: "EX1-056", as: "opponentRecipient" }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("opponentRecipient"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("opponentRecipient"), "Rush")).toBe(false);
  });

  it("does not grant Rush during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-060", as: "host", under: ["EX1-057"] },
            { card: "EX1-056", as: "recipient" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          hand: ["BT1-009"],
          deck: ["BT1-009"],
          security: ["BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0);
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 1);
    expect(observe(s.engine).hasKeyword(s.perm("recipient"), "Rush")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("allows a newly played Retaliation Digimon to attack via real Rush", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-060", as: "host", under: ["EX1-057"] }],
        hand: [{ card: "EX1-056", as: "retaliation" }],
        security: ["BT1-009"],
      },
      1: { security: ["BT1-009"] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("retaliation").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("retaliation").topCard.cardId === "EX1-056");
    expect(observe(s.engine).hasKeyword(s.perm("retaliation"), "Rush")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("retaliation").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("retaliation").isSuspended);
  });
});
