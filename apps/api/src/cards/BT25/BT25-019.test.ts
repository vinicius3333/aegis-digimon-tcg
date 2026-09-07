import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT25-019.js";
import "../index.js";

describe("BT25-019 UltimateBrachiomon", () => {
  it("Reboots on the opponent turn and blocks a public security attack", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-019", as: "brachio", suspended: true }], security: ["BT1-001"] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }], deck: ["BT1-002", "BT1-003"] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    expect(s.perm("brachio").isSuspended).toBe(true);
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("brachio").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("brachio").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("brachio").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("offers the highest-DP opponent Digimon for deletion on play and digivolving", () => {
    expect(
      compiled.effects.filter((effect) => effect.trigger === "OnPlay" || effect.trigger === "WhenDigivolving"),
    ).toHaveLength(2);
    expect(compiled.effects[1]?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { superlative: "highestDP" } },
    });
  });

  it("scopes the end-of-turn immunity to Digimon at 5+ memory and Options at 5 or less", async () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(effect).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ condition: { kind: "memoryAtLeast", value: 5 } }, { condition: { kind: "memoryAtMost", value: 5 } }],
    });
  });

  it("limits both immunities to opponent Digimon and Option effects", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn")!;
    expect(effect.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromSourceKind: ["Digimon"],
          byOpponentEffectsOnly: true,
        }),
        expect.objectContaining({
          fromSourceKind: ["Option"],
          byOpponentEffectsOnly: true,
        }),
      ]),
    );
  });

  it("has active Reboot and Blocker keywords and deletes the highest-DP Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-019", as: "brachio" }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 7000, as: "low" },
            { card: "BT1-010", dp: 9000, as: "high" },
            { card: "BT1-011", dp: 9000, as: "tie" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    const high = s.perm("high");

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("brachio").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[1]!.battleArea.includes(high));

    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard.cardId)).toHaveLength(2);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard.cardId)).toContain("BT1-009");
    expect(observe(s.engine).hasKeyword(s.perm("brachio"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("brachio"), "Blocker")).toBe(true);
  });

  it.each(["BT24-015", "BT8-016"])("digivolves for 4 from a level-5 %s Digimon", async (baseCard) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: "BT25-019", as: "brachio" }],
        },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 7000, as: "low" },
            { card: "BT1-010", dp: 9000, as: "high" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("brachio").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT25-019");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard.cardId)).toEqual(["BT1-009"]);
  });

  it.each([
    [6, true, false],
    [5, true, true],
    [4, false, true],
  ])(
    "at opponent memory %i, grants only the printed Digimon/Option immunity clauses",
    async (opponentMemory, digimonImmune, optionImmune) => {
      const s = setupEngine({
        0: { battleArea: [{ card: "BT25-019", as: "brachio" }], deck: ["BT1-013"] },
        1: { deck: ["BT1-013"] },
      });
      // Enter Main with the turn player's side of the gauge, then arrange the exact
      // opponent-memory boundary before publicly ending the turn.
      s.state.memory = 1;

      const turn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      s.state.memory = -opponentMemory;
      advance(s.engine).endMainPhaseIfOpen(0);
      await turn;

      const restrictions = observe(s.engine);
      expect(restrictions.isRestrictedByEffect(s.perm("brachio"), "beAffected", "Digimon")).toBe(digimonImmune);
      expect(restrictions.isRestrictedByEffect(s.perm("brachio"), "beAffected", "Option")).toBe(optionImmune);
      expect(restrictions.isRestrictedByEffect(s.perm("brachio"), "beAffected", "Tamer")).toBe(false);
    },
  );

  it.each([
    [4, true],
    [5, false],
    [6, false],
  ] as const)(
    "public opponent Digimon suspend at memory %i leaves target suspended=%s",
    async (opponentMemory, suspended) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT25-019", as: "brachio" }], deck: ["BT1-002", "BT1-003", "BT1-004", "BT1-005"] },
          1: {
            hand: [{ card: "BT1-070", as: "suspender" }],
            battleArea: [{ card: "BT1-009", as: "other" }],
            deck: ["BT1-007", "BT1-008", "BT1-009", "BT1-010"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 1;
      await s.ready();
      const firstTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      s.state.memory = -opponentMemory;
      advance(s.engine).endMainPhaseIfOpen(0);
      await firstTurn;

      s.state.turnSeat = 1;
      s.state.memory = 10;
      const opponentTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(1);
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("suspender").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.perm("brachio").isSuspended).toBe(suspended);
      advance(s.engine).endMainPhaseIfOpen(1);
      await opponentTurn;
      expect(observe(s.engine).isRestrictedByEffect(s.perm("brachio"), "beAffected", "Digimon")).toBe(false);
      expect(observe(s.engine).isRestrictedByEffect(s.perm("brachio"), "beAffected", "Option")).toBe(false);
    },
  );

  it.each([
    [4, false],
    [5, false],
    [6, true],
  ] as const)(
    "public Gaia Force at opponent memory %i deletes the protected target=%s",
    async (opponentMemory, deleted) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "BT25-019", as: "brachio" }], deck: ["BT1-002", "BT1-003", "BT1-004", "BT1-005"] },
          1: {
            battleArea: [{ card: "AD1-021", as: "redTamer" }],
            hand: [{ card: "ST1-16", as: "option" }],
            deck: ["BT1-007", "BT1-008", "BT1-009", "BT1-010"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 1;
      await s.ready();
      const firstTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(0);
      s.state.memory = -opponentMemory;
      advance(s.engine).endMainPhaseIfOpen(0);
      await firstTurn;
      s.state.turnSeat = 1;
      s.state.memory = 10;
      const opponentTurn = s.engine.runOneTurn();
      await advance(s.engine).waitForMainPhase(1);
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "ST1-16"));
      expect(s.state.players[1]!.trash.some((card) => card.cardId === "ST1-16")).toBe(true);
      await settle(() => s.state.pendingDecision === undefined);
      expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("brachio").permanentId)).toBe(
        !deleted,
      );
      advance(s.engine).endMainPhaseIfOpen(1);
      await opponentTurn;
    },
  );
});
