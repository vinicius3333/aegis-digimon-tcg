import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../ST4/ST4-12.js";
import "./ST5-06.js";

describe("ST5-06 Greymon", () => {
  it("is fully represented with the inherited no-attack draw", () => {
    expect(runtimeCompiledCard("ST5-06")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("draws at the end of the opponent's turn if they did not attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST5-08", under: ["ST5-06"], as: "host" }], deck: [{ card: "ST5-03", as: "drawn" }] },
    });
    s.state.turnSeat = 1;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("host"));
    expect(s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("drawn").instanceId)).toBe(true);
  });
});

async function runOpponentTurn(s: ReturnType<typeof setupEngine>, duringMain?: () => Promise<void>): Promise<void> {
  s.state.turnSeat = 1;
  s.state.memory = 3;
  const turn = s.engine.runOneTurn();
  await advance(s.engine).waitForMainPhase(1);
  await duringMain?.();
  advance(s.engine).endMainPhaseIfOpen(1);
  await turn;
}

function handHas(s: ReturnType<typeof setupEngine>, alias: string): boolean {
  return s.state.players[0]!.hand.some((card) => card.instanceId === s.inst(alias).instanceId);
}

describe("ST5-06 Greymon — KB Q&A rulings", () => {
  it("draws even when the opponent had no Digimon in play for their whole turn (Q661)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST5-08", under: ["ST5-06"], as: "host" }],
        deck: [{ card: "ST5-03", as: "drawn" }, "ST5-03"],
        security: ["ST5-03"],
      },
      1: { deck: ["ST5-03", "ST5-03"], security: ["ST5-03"] },
    });
    await s.ready();

    await runOpponentTurn(s, async () => {
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
    });

    expect(observe(s.engine).attackedWithDigimonThisTurn(1)).toBe(false);
    expect(handHas(s, "drawn")).toBe(true);
  });

  it("draws when effects stopped every opposing Digimon from attacking (Q662)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST5-08", under: ["ST5-06"], as: "host" },
            { card: "ST4-10", as: "rosemonBase" },
          ],
          hand: [{ card: "ST4-12", as: "rosemon" }],
          deck: [{ card: "ST5-03", as: "digivolveDraw" }, { card: "ST5-03", as: "drawn" }, "ST5-03"],
          security: ["ST5-03"],
        },
        1: { battleArea: [{ card: "ST5-03", as: "attacker" }], deck: ["ST5-03", "ST5-03"], security: ["ST5-03"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("rosemonBase").permanentId,
        instanceId: s.inst("rosemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("attacker"), "attack"));
    expect(handHas(s, "digivolveDraw")).toBe(true);
    expect(handHas(s, "drawn")).toBe(false);

    await runOpponentTurn(s, async () => {
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "player" },
        }).ok,
      ).toBe(false);
    });

    expect(observe(s.engine).attackedWithDigimonThisTurn(1)).toBe(false);
    expect(handHas(s, "drawn")).toBe(true);
  });

  it("does not draw when every opposing attacker was deleted in the battle it started (Q663)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST5-08", under: ["ST5-06"], as: "host", suspended: true }],
        deck: [{ card: "ST5-03", as: "drawn" }, "ST5-03"],
        security: ["ST5-03"],
      },
      1: { battleArea: [{ card: "ST5-03", as: "attacker" }], deck: ["ST5-03", "ST5-03"], security: ["ST5-03"] },
    });
    await s.ready();
    const attackerPermanentId = s.perm("attacker").permanentId;

    await runOpponentTurn(s, async () => {
      expect(
        s.engine.applyIntent(1, {
          type: "attack",
          attackerPermanentId,
          target: { kind: "permanent", permanentId: s.perm("host").permanentId },
        }),
      ).toEqual({ ok: true });
      await advance(s.engine).finishAttack();
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
    });

    expect(observe(s.engine).attackedWithDigimonThisTurn(1)).toBe(true);
    expect(s.perm("host").topCard?.cardId).toBe("ST5-08");
    expect(handHas(s, "drawn")).toBe(false);
  });
});
