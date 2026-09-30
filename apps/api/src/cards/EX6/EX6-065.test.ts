import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-065.js";

describe("EX6-065 Mythical Arms of Salvation!", () => {
  it("waives color requirements with Legend-Arms and can place one from trash under a Digimon then play itself", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "youHave" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([
      { kind: "PlaceUnder", target: { from: ["trash"] }, optional: true },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
  });
  it("arms Delay when your Digimon would leave and uses the armed delayed play from its stack", () => {
    const delayEffect = compiled.effects?.find((entry) => entry.trigger === "AllTurns");
    expect(delayEffect?.keywords).toEqual([{ keyword: "Delay" }]);
    expect(delayEffect?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "instead",
      leaveCause: "otherThanYourEffect",
      actions: [
        {
          kind: "PlayWithoutCost",
          payCost: false,
          from: ["digivolutionCards"],
          optional: true,
        },
      ],
    });
  });
  it("publicly places a Legend-Arms card from trash and then plays itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-009", as: "host" }],
          hand: [{ card: "EX6-065", as: "option" }],
          trash: [{ card: "EX6-042", as: "legend" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-065"));
    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("legend").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-065")).toBe(true);
  });

  it("rejects an off-color Main play without Legend-Arms", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-028", as: "blueHost" }], hand: [{ card: "EX6-065", as: "option" }] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId }).ok).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-065")).toBe(false);
  });

  it("activates its Main effect when revealed in security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "EX6-065", as: "option", faceUp: true }],
          battleArea: [{ card: "EX6-009", as: "host" }],
          trash: [{ card: "EX6-042", as: "legend" }],
        },
        1: { battleArea: [{ card: "BT1-013", as: "attacker" }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-065"));

    expect(s.perm("host").stack.some((card) => card.instanceId === s.inst("legend").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-065")).toBe(true);
  });

  it("activates Delay to play a Legend-Arms card before the leaving Digimon moves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-009", under: ["EX6-007"], as: "host" }],
          hand: [{ card: "EX6-065", as: "option" }],
          deck: Array.from({ length: 10 }, () => "BT1-009"),
        },
        1: { deck: Array.from({ length: 10 }, () => "BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-065"));
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byBattle");
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-007"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "EX6-007")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});

describe("EX6-065 Mythical Arms of Salvation! — KB Q&A rulings", () => {
  type Board = ReturnType<typeof setupEngine>;
  async function asOpponentEffect(s: Board, move: () => Promise<unknown>) {
    s.state.turnSeat = 1;
    advance(s.engine).verb.enterEffectResolution(1, ["Option"]);
    try {
      await move();
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }
  }

  it.each([
    [
      "deleted in battle",
      (s: Board) => advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byBattle"),
    ],
    [
      "deleted by an opponent's effect",
      (s: Board) =>
        asOpponentEffect(s, () => advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")),
    ],
    [
      "returned to the hand by an opponent's effect",
      (s: Board) => asOpponentEffect(s, () => advance(s.engine).verb.returnToHand([s.inst("host").instanceId])),
    ],
    [
      "returned to the deck by an opponent's effect",
      (s: Board) => asOpponentEffect(s, () => advance(s.engine).verb.returnToDeck([s.inst("host").instanceId])),
    ],
  ] as const)("arms its ＜Delay＞ when a Digimon would leave the battle area: %s (Q3815)", async (_route, leave) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-009", under: [{ card: "EX6-007", as: "legend" }], as: "host" },
            { card: "EX6-065", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await leave(s);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.instanceId)).toEqual([
      s.inst("legend").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("option").instanceId);
  });

  it("plays a Legend-Arms source through ＜Delay＞, then RaijiLudomon's inherited effect still prevents the deletion (Q3816)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX6-009",
              under: [
                { card: "EX6-042", as: "raiji" },
                { card: "EX6-007", as: "legend" },
              ],
              as: "host",
            },
            { card: "EX6-065", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferTriggerKeys: ["EX6-065"], preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("legend").instanceId);
    const hostId = s.perm("host").permanentId;
    await advance(s.engine).verb.deletePermanent([hostId], "byBattle");
    await settle(() => s.state.pendingDecision === undefined);

    const board = s.state.players[0]!.battleArea;
    expect(board.some((perm) => perm.permanentId === hostId)).toBe(true);
    expect(board.some((perm) => perm.topCard?.instanceId === s.inst("legend").instanceId)).toBe(true);
    expect(s.decisions.some(({ req }) => req.kind === "orderTriggers")).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("raiji").instanceId, s.inst("option").instanceId]),
    );
  });
});
