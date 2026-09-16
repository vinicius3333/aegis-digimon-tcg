import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT14-015.js";

describe("BT14-015", () => {
  it("preserves its printed level, stats, evolution cost, and Cyborg/Virus identity", () =>
    expect(getCardDefinition("BT14-015")).toMatchObject({
      nameEn: "Megadramon",
      colors: ["Red"],
      level: 5,
      playCost: 6,
      dp: 7000,
      evoCosts: [{ color: "Red", level: 4, memoryCost: 3 }],
      attributes: ["Virus"],
      types: ["Cyborg"],
    }));

  it("inherits once-per-turn deletion of an opposing 5000 DP or lower Digimon when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Delete",
          target: {
            count: 1,
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } },
          },
        },
      ],
    }));

  it("deletes one exact-5000 target only on the first attack of a realistic host", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-017", as: "attacker", under: ["BT14-012", "BT14-015"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstExact", dp: 5000 },
            { card: "BT1-009", as: "secondExact", dp: 5000 },
            { card: "BT1-020", as: "above", dp: 5001 },
          ],
          security: ["BT1-085", "BT1-085"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.perm("attacker").stack.map((card) => card.cardId)).toEqual(["BT14-012", "BT14-015"]);
    const firstId = s.perm("firstExact").permanentId;
    const secondId = s.perm("secondExact").permanentId;
    const aboveId = s.perm("above").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstId));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === secondId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === aboveId)).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === secondId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === aboveId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("resets its inherited deletion once-per-turn gate on the next natural turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-017", as: "attacker", under: ["BT14-012", "BT14-015"] }],
          deck: Array(8).fill("BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstExact", dp: 5000 },
            { card: "BT1-009", as: "secondExact", dp: 5000 },
            { card: "BT1-020", as: "above", dp: 5001 },
          ],
          hand: [{ card: "BT1-009", as: "opponentHand" }],
          security: ["BT1-091", "BT1-091"],
          deck: Array(8).fill("BT1-009"),
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 10;
    await s.ready();

    const firstId = s.perm("firstExact").permanentId;
    const secondId = s.perm("secondExact").permanentId;
    const aboveId = s.perm("above").permanentId;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === firstId));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === secondId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === aboveId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;

    const secondTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("attacker").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === secondId));
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === aboveId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(0);
    await secondTurn;
    assertNoLoudGap(s);
  });
});
