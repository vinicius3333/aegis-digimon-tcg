import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT19/BT19-084.js";
import "../EX5/EX5-027.js";
import { compiled } from "./BT18-004.js";

describe("BT18-004 Puroromon", () => {
  it("places a Royal Base Digimon face up at security bottom and adds the top security card", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      isInherited: true,
      actions: [
        {
          kind: "SecurityManipulation",
          op: "toHand",
          toTop: true,
          cost: {
            kind: "place",
            target: {
              filter: { zone: "hand", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }] },
            },
          },
        },
      ],
    });
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "host", under: ["BT18-004"] }],
          hand: [
            { card: "BT1-030", as: "nonRoyal" },
            { card: "BT18-044", as: "royal" },
          ],
          security: [{ card: "BT1-009", as: "top" }],
          deck: ["BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    await advance(s.engine).runTurn(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.security.at(-1)?.cardId).toBe("BT18-044");
    expect(s.state.players[0]!.security.at(-1)?.faceUp).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("nonRoyal").instanceId)).toBe(true);
  });

  it("may decline without moving either the hand card or top security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "host", under: ["BT18-004"] }],
          hand: [{ card: "BT18-044", as: "royal" }],
          security: [{ card: "BT1-009", as: "top" }],
          deck: ["BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("royal").instanceId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("top").instanceId]);
  });
});

const FILLER = ["BT1-009", "BT1-013", "BT1-009", "BT1-013", "BT1-009", "BT1-013"];

function puroromonBoard(security: string[], extraHand: string[] = []) {
  return setupEngine(
    {
      0: {
        battleArea: [{ card: "BT1-064", as: "host", under: ["BT18-004"] }],
        hand: [{ card: "BT18-044", as: "royal" }, ...extraHand.map((card) => ({ card, as: card }))],
        security: security.map((card, index) => ({ card, as: `security${index}` })),
        deck: [...FILLER],
      },
      1: {
        battleArea: [{ card: "BT1-013", as: "attacker", dp: 5000 }],
        deck: [...FILLER],
        security: ["BT1-009", "BT1-013"],
      },
    },
    { autoSelectCards: true, autoAcceptOptional: true },
  );
}

describe("BT18-004 Puroromon — KB Q&A rulings", () => {
  it("keeps the placed card face up in security, where it is otherwise an ordinary security card (Q2904)", async () => {
    const s = puroromonBoard(["BT1-009", "BT1-013"]);
    await s.ready();
    await advance(s.engine).runTurn(0);

    const royalId = s.inst("royal").instanceId;
    const security = s.state.players[0]!.security;
    expect(security.map((card) => card.instanceId)).toEqual([s.inst("security1").instanceId, royalId]);
    expect(security.map((card) => card.faceUp)).toEqual([false, true]);

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: false });
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(royalId);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("security1").instanceId]);
  });

  it("checks a face-up security card normally, revealing it and trashing it after battle (Q2905)", async () => {
    const s = puroromonBoard(["BT1-009"]);
    await s.ready();
    await advance(s.engine).runTurn(0);
    const royalId = s.inst("royal").instanceId;
    expect(s.state.players[0]!.security.map((card) => [card.instanceId, card.faceUp])).toEqual([[royalId, true]]);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    await advance(s.engine).finishAttack();

    expect(s.events).toContainEqual(
      expect.objectContaining({ kind: "securityRevealed", seat: 0, revealedCardId: "BT18-044" }),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(royalId);
    expect(s.perm("attacker").topCard!.cardId).toBe("BT1-013");

    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("triggers a face-up security card's [Security] effect on its check (Q2906)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }],
          deck: [...FILLER],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          security: [{ card: "BT19-084", as: "winr", faceUp: true }, "BT1-009"],
          deck: [...FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.state.players[1]!.security[0]!.faceUp).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT19-084"));

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.inst("winr").instanceId,
    ]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("winr").instanceId);
  });

  it("turns every face-up security card face down when the security stack is shuffled (Q2907)", async () => {
    const s = puroromonBoard(["BT1-009", "BT1-013", "BT1-009"], ["EX5-027"]);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    const royalId = s.inst("royal").instanceId;
    expect(s.state.players[0]!.security.at(-1)).toMatchObject({ instanceId: royalId, faceUp: true });
    const securityIds = s.state.players[0]!.security.map((card) => card.instanceId).sort();

    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("EX5-027").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX5-027"));

    expect(s.state.players[0]!.security.map((card) => card.instanceId).sort()).toEqual(securityIds);
    expect(s.state.players[0]!.security.every((card) => !card.faceUp)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("lets its face-up placement resolve first so Winr's same-timing memory gain sees a face-up card (Q3146)", async () => {
    const readings: number[] = [];
    for (const inHand of ["BT19-045", "BT1-065"]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT19-084", as: "winr" },
              { card: "BT1-064", as: "host", under: ["BT18-004"] },
            ],
            hand: [
              { card: inHand, as: "placeable" },
              { card: "BT1-009", as: "spare" },
            ],
            deck: [...FILLER],
            security: ["BT1-009", "BT1-013"],
          },
          1: { deck: [...FILLER], security: ["BT1-009", "BT1-013"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      await s.ready();
      readings.push(s.state.memory);

      const placed = inHand === "BT19-045";
      expect(s.state.players[0]!.security.every((card) => card.faceUp === (card.cardId === "BT19-045"))).toBe(true);
      expect(s.state.players[0]!.security.at(-1)!.cardId === inHand).toBe(placed);

      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    }
    expect(readings[0]).toBe(readings[1]! + 1);
  });
});
