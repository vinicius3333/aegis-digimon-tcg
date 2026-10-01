import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-074.js";
import "./BT8-079.js";
import "../BT9/BT9-091.js";

describe("BT8-074 Soulmon", () => {
  it("gains 1 memory when an effect trashes cards from your deck", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT8-076", as: "base", under: ["BT8-074"] }],
        hand: [{ card: "BT8-079", as: "evolving" }],
        deck: ["BT8-033", "BT8-034"],
      },
    });
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 1);
    expect(s.state.memory).toBe(3);
  });

  it("digivolves from a purple level-3 Digimon for 2 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-073", as: "base" }], hand: [{ card: "BT8-074", as: "evolving" }] },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT8-074");

    expect(s.perm("base").topCard.cardId).toBe("BT8-074");
    expect(s.state.memory).toBe(1);
  });
});

describe("BT8-074 Soulmon — KB Q&A rulings", () => {
  it("does not gain memory when a reveal effect trashes the remaining revealed cards (Q1759)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-076", as: "host", under: ["BT8-074"] }],
          hand: [
            { card: "BT9-091", as: "revealTamer" },
            { card: "BT8-079", as: "miller" },
          ],
          deck: [
            { card: "BT8-034", as: "addedToHand" },
            { card: "BT1-009", as: "revealedRest1" },
            { card: "BT1-010", as: "revealedRest2" },
            "BT1-011",
            "BT1-012",
            "BT1-013",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    const mine = s.state.players[0]!;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("revealTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => mine.trash.length === 2);
    await drainMicrotasks();
    expect(mine.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("revealedRest1").instanceId, s.inst("revealedRest2").instanceId]),
    );
    expect(mine.hand.some((card) => card.instanceId === s.inst("addedToHand").instanceId)).toBe(true);
    expect(s.state.memory).toBe(5);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("miller").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => mine.trash.length === 4);
    expect(s.state.memory).toBe(3);
  });
});
