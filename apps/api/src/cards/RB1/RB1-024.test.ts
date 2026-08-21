import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-024 Lamortmon", () => {
  it("suspends an opponent Digimon when an Angoramon card is in its evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-025", as: "host", under: [{ card: "RB1-024", as: "lamort", under: [{ card: "RB1-020" }] }] },
          ],
        },
        1: { battleArea: [{ card: "EX2-045", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("host"));

    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not suspend when the evolution stack lacks Angoramon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "RB1-024", as: "lamort" }] },
      1: { battleArea: [{ card: "EX2-045", as: "target" }] },
    });

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("lamort"));

    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("trashes the opponent security top when this inherited Digimon deletes in battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "RB1-025", as: "host", under: [{ card: "RB1-024", as: "lamort", under: [{ card: "RB1-020" }] }] },
        ],
      },
      1: { battleArea: [{ card: "EX2-045", as: "target", suspended: true }], security: ["BT1-009"] },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 0,
      5000,
    );

    expect(s.state.players[1]!.battleArea.length).toBe(0);
    expect(s.state.players[1]!.security.length).toBe(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });
});
