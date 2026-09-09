import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-062.js";

describe("EX11-062 Shoto Kazama", () => {
  it("preserves the printed Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-062")).toMatchObject({
      nameEn: "Shoto Kazama",
      colors: ["Green"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("draws and grants +3000 DP when an effect suspends a Digimon (Q5917/Q5918)", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["AD1-001"],
          battleArea: [
            { card: "EX11-062", as: "shoto" },
            { card: "EX11-026", as: "bird" },
          ],
        },
        1: { battleArea: [{ card: "AD1-002", as: "effectSuspended" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.suspend([s.perm("effectSuspended").permanentId], 0);

    expect(s.perm("shoto").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.perm("bird").currentDP).toBe(4000);
    assertNoLoudGap(s);
  });

  it("skips the draw but still grants +3000 DP after an attack-rule suspension (Q5918/Q6517)", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["AD1-001"],
          battleArea: [
            { card: "EX11-062", as: "shoto" },
            { card: "EX11-026", as: "birdAttacker" },
          ],
        },
        1: { security: ["BT1-090"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("birdAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shoto").isSuspended);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("birdAttacker").currentDP).toBe(4000);
    assertNoLoudGap(s);
  });

  it("keeps the +3000 DP through the opponent's turn and loses it when that turn ends", async () => {
    const s = setupEngine(
      {
        0: {
          deck: ["AD1-001"],
          battleArea: [
            { card: "EX11-062", as: "shoto" },
            { card: "EX11-026", as: "bird" },
          ],
        },
        1: {
          deck: ["BT1-013", "BT1-013", "BT1-013"],
          battleArea: [{ card: "AD1-002", as: "effectSuspended" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.suspend([s.perm("effectSuspended").permanentId], 0);
    expect(s.perm("bird").currentDP).toBe(4000);

    // `untilOpponentTurnEnd` must survive the whole opponent turn and expire at its end.
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    await settle();

    expect(s.perm("bird").currentDP).toBe(1000);
    assertNoLoudGap(s);
  });

  it("publishes full exclusive IR with the suspension cost gating both branches", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "whenSuspended",
        cost: { kind: "suspend" },
        actions: [
          { kind: "Draw", condition: { kind: "triggeredByEffect" } },
          { kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" },
        ],
      },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions).toMatchObject([
      {
        kind: "GrantVortexCanAttackPlayers",
        condition: { kind: "opponentHasNone", filter: { unsuspended: true } },
      },
    ]);
  });

  it("sets memory to 3 at the start of its owner's turn when memory is 2", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-062", as: "shoto" }], deck: ["BT1-009", "BT1-010"] },
      1: { deck: ["BT1-011", "BT1-012"] },
    });
    s.state.memory = 2;
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === "Main" && s.state.turnSeat === 0);

    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("plays Shoto from security through a public attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-013", as: "attacker", dp: 20_000 }] },
      1: { security: [{ card: "EX11-062", as: "securityShoto" }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-062"));

    expect(
      s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("securityShoto").instanceId),
    ).toBe(true);
    assertNoLoudGap(s);
  });
});
