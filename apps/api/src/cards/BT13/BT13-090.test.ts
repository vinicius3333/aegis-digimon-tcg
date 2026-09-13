import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-090.js";

describe("BT13-090 LordKnightmon", () => {
  it("may return one Lucemon-named or Royal Knight card from trash on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Return",
            to: "hand",
            optional: true,
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                nameOrTrait: [
                  { match: "name", tokens: ["Lucemon"] },
                  { match: "trait", tokens: ["Royal Knight"] },
                ],
              },
              count: 1,
            },
          },
        ],
      });
    }
  });

  it("gains 1 memory per Royal Knight Digimon when an opponent's Digimon attacks", () => {
    const watcher = compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions?.[0];
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenOpponentAttacks",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          scaling: {
            per: 1,
            unit: "cards",
            filter: {
              controller: "mine",
              zone: "battleArea",
              kind: ["Digimon"],
              nameOrTrait: [{ match: "trait", tokens: ["Royal Knight"] }],
            },
          },
        },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [expect.objectContaining({ event: "whenOpponentAttacks" })],
    });
  });

  it("returns a Lucemon or Royal Knight card from trash on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-090", as: "lord" }],
          trash: [{ card: "BT13-075", as: "royal" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lord").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("lord").topCard.cardId === "BT13-090");

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT13-075");
  });

  it("may decline the On Play return and leave the matching card in trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT13-090", as: "lord" }],
          trash: [{ card: "BT13-075", as: "royal" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lord").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("lord").topCard.cardId === "BT13-090");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT13-075")).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT13-075")).toBe(true);
  });

  it("counts the source and two own Royal Knights on a natural opponent attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-090", as: "lord" },
            { card: "BT13-075", as: "royalOne" },
            { card: "BT13-087", as: "royalTwo" },
          ],
          hand: [{ card: "BT1-010", as: "ownSpare" }],
          security: Array.from({ length: 6 }, (_, index) => ({ card: "BT1-010", as: `ownSecurity${index + 1}` })),
          deck: Array.from({ length: 8 }, (_, index) => ({ card: "BT1-010", as: `ownDeck${index + 1}` })),
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "attackerOne" },
            { card: "BT1-009", as: "attackerTwo" },
          ],
          hand: [{ card: "BT1-009", as: "opponentSpare" }],
          deck: Array.from({ length: 8 }, (_, index) => ({ card: "BT1-009", as: `opponentDeck${index + 1}` })),
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 5;
    await s.ready();
    const lordId = s.perm("lord").permanentId;
    const firstOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerOne").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.memory === 2 && s.state.players[0]!.security.length === 5 && !observe(s.engine).isAttacking(),
    );
    expect(s.state.memory).toBe(2);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerTwo").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.memory === 2 && s.state.players[0]!.security.length === 4 && !observe(s.engine).isAttacking(),
    );
    expect(s.state.memory).toBe(2);

    advance(s.engine).endMainPhaseIfOpen(1);
    await firstOpponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const nextOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    const beforeNextAttack = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerOne").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 3 && !observe(s.engine).isAttacking());
    expect(s.perm("lord").permanentId).toBe(lordId);
    expect(s.state.memory).toBe(beforeNextAttack - 3);
    expect(s.state.players[0]!.security).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(1);
    await nextOpponentTurn;
  });

  it("does not count a Royal Knight that exists only in breeding", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-090", as: "lord" }],
          breeding: { card: "BT13-087", as: "breedingRoyal" },
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT13-081", as: "attacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 9);
    expect(s.state.memory).toBe(9);
  });
});
