import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-054.js";

describe("EX1-054 Boltmon", () => {
  it("has Reboot without immediately unsuspending during your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-054", as: "boltmon", suspended: true }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("boltmon"), "Reboot")).toBe(true);
    expect(s.perm("boltmon").isSuspended).toBe(true);
  });

  it("unsuspends through Reboot during the opponent's public active phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-054", as: "boltmon", under: ["EX1-052"], suspended: true }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "opponent" }],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0);
    await s.ready();
    expect(s.perm("boltmon").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("boltmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("boltmon").isSuspended);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 1);
    expect(s.perm("boltmon").isSuspended).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("de-digivolves an opponent by 1 when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-050", as: "base" }], hand: [{ card: "EX1-054", as: "evo" }] },
        1: { battleArea: [{ card: "EX1-053", as: "target", under: ["EX1-050"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard.cardId === "EX1-050");
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "EX1-053")).toBe(true);
  });

  it("does not de-digivolve an opponent with no digivolution cards", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-050", as: "base" }], hand: [{ card: "EX1-054", as: "evo" }] },
        1: { battleArea: [{ card: "EX1-053", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-054");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.perm("target").topCard.cardId).toBe("EX1-053");
  });
});
