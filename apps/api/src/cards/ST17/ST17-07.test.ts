import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-07 Rapidmon", () => {
  it("de-digivolves one opposing Digimon and protects itself from opponent deletion and return effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-10", as: "henry" }],
          hand: [{ card: "ST17-07", as: "rapidCard" }],
        },
        1: { battleArea: [{ card: "AD1-004", as: "opponent", under: ["BT1-009", "BT1-010"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const stackBefore = s.perm("opponent").stack.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rapidCard").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "ST17-07"));
    const rapidmon = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "ST17-07")!;
    expect(s.perm("opponent").stack.length).toBe(stackBefore - 1);

    s.state.turnSeat = 1;
    const rapidmonCard = rapidmon.topCard!.instanceId;
    await advance(s.engine).verb.returnToHand([rapidmonCard]);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "ST17-07")).toBe(true);
  });

  it("applies the same effect when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST17-05", as: "host" },
            { card: "ST17-10", as: "henry" },
          ],
          hand: [{ card: "ST17-07", as: "rapidCard" }],
        },
        1: { battleArea: [{ card: "AD1-004", as: "opponent", under: ["BT1-009", "BT1-010"] }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const stackBefore = s.perm("opponent").stack.length;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("rapidCard").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "ST17-07");
    expect(s.perm("opponent").stack.length).toBe(stackBefore - 1);
  });

  it("does not grant protection without a green Tamer", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "ST17-07", as: "rapidCard" }] },
      1: { battleArea: [{ card: "AD1-004", as: "opponent", under: ["BT1-009"] }] },
    });
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rapidCard").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-07"));
    const rapidmonCard = s.perm("rapidCard").topCard.instanceId;
    s.state.turnSeat = 1;
    await advance(s.engine).verb.returnToHand([rapidmonCard]);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-07")).toBe(false);
  });

  it("keeps protection through the opponent's turn and expires at that turn's end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-10", as: "henry" }],
          hand: [{ card: "ST17-07", as: "rapidCard" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { hand: [{ card: "BT1-009" }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rapidCard").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-07"));
    const rapidmonCard = s.perm("rapidCard").topCard.instanceId;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await advance(s.engine).verb.returnToHand([rapidmonCard]);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-07")).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    await advance(s.engine).verb.returnToHand([rapidmonCard]);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard.cardId === "ST17-07")).toBe(false);
  });

  it("uses the alternate Gargomon evolution route for three memory", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "ST17-05", as: "gargomon" }],
        hand: [{ card: "ST17-07", as: "rapidmon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    await s.ready();
    s.state.memory = 3;
    const permanentId = s.perm("gargomon").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId,
        instanceId: s.inst("rapidmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("gargomon").topCard.cardId === "ST17-07");
    expect(s.state.memory).toBe(0);
    expect(s.perm("gargomon").stack.map((card) => card.cardId)).toEqual(["ST17-05"]);
    expect(s.state.players[0]!.deck.length).toBeGreaterThan(0);
  });

  it("trashes the opponent's top security card once per turn when its host wins a battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-08", as: "host", under: ["ST17-07"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "defender", suspended: true }], security: ["BT1-009", "BT1-010"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("trashes security once for two same-turn battles, then resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST17-08", as: "host", under: ["ST17-07"] }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          hand: [{ card: "BT1-009" }],
          deck: ["BT1-009", "BT1-010"],
          battleArea: [
            { card: "BT1-009", as: "first", suspended: true },
            { card: "BT1-009", as: "second", suspended: true },
            { card: "BT1-009", as: "third", suspended: true },
          ],
          security: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const attack = (target: string) =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm(target).permanentId },
      });
    expect(attack("first")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && s.state.players[1]!.battleArea.length === 2);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(attack("second")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.memory = -s.state.memory;
    s.state.turnSeat = 1;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.memory = -s.state.memory;
    s.state.turnSeat = 0;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).verb.suspend([s.perm("third").permanentId], 1);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(attack("third")).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });
});
