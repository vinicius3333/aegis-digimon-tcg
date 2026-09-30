import { EffectTiming, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle, type BoardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
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

describe("BT25-019 UltimateBrachiomon — KB Q&A rulings", () => {
  async function duringMainPhase(s: EngineSetup, seat: Seat, memory: number, body: () => Promise<void>) {
    s.state.turnSeat = seat;
    s.state.memory = memory;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(seat);
    await body();
    advance(s.engine).endMainPhaseIfOpen(seat);
    await turn;
  }

  /** Run seat 0's turn and end it while the opponent's side of the gauge reads `opponentMemory`. */
  async function endTurnWithOpponentMemory(board: BoardSpec, opponentMemory: number) {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(board, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds });
    await s.ready();
    await duringMainPhase(s, 0, 1, async () => {
      s.state.memory = -opponentMemory;
    });
    const preferBrachio = () =>
      preferInstanceIds.splice(
        0,
        preferInstanceIds.length,
        s.perm("brachio").permanentId,
        s.perm("brachio").topCard.instanceId,
      );
    return { s, preferBrachio };
  }

  const immuneTo = (s: EngineSetup, kind: "Digimon" | "Option") =>
    observe(s.engine).isRestrictedByEffect(s.perm("brachio"), "beAffected", kind);

  const quietBoard = (): BoardSpec => ({
    0: { battleArea: [{ card: "BT25-019", as: "brachio" }], deck: ["BT1-002", "BT1-003"] },
    1: { deck: ["BT1-004", "BT1-005"] },
  });

  it.each([
    [4, false],
    [5, true],
    [10, true],
  ] as const)(
    "reads 'opponent has 5 or more memory' as the gauge at 5 or further on their side (%i -> %s) (Q6270)",
    async (opponentMemory, digimonImmune) => {
      const { s } = await endTurnWithOpponentMemory(quietBoard(), opponentMemory);

      expect(immuneTo(s, "Digimon")).toBe(digimonImmune);
    },
  );

  it.each([
    [6, false],
    [5, true],
    [0, true],
    [-3, true],
  ] as const)(
    "reads 'opponent has 5 or less memory' as the gauge at 5 or further left from their view, my side included (%i -> %s) (Q6271)",
    async (opponentMemory, optionImmune) => {
      const { s } = await endTurnWithOpponentMemory(quietBoard(), opponentMemory);

      expect(immuneTo(s, "Option")).toBe(optionImmune);
      expect(immuneTo(s, "Digimon")).toBe(opponentMemory >= 5);
    },
  );

  it.each([
    { opponentCard: "BT1-070", effect: "suspend" },
    { opponentCard: "BT1-055", effect: "-3000 DP" },
  ])(
    "can be chosen for an opponent's Digimon effect ($effect) but is not affected by it (Q6272, Q6273)",
    async ({ opponentCard }) => {
      const { s, preferBrachio } = await endTurnWithOpponentMemory(
        {
          0: {
            battleArea: [
              { card: "BT25-019", as: "brachio" },
              { card: "BT1-009", as: "ally" },
            ],
            deck: ["BT1-002", "BT1-003"],
          },
          1: {
            battleArea: [{ card: "BT1-009", as: "idle" }],
            hand: [{ card: opponentCard, as: "source" }],
            deck: ["BT1-004", "BT1-005"],
          },
        },
        6,
      );
      expect(immuneTo(s, "Digimon")).toBe(true);
      preferBrachio();
      const decisionsBefore = s.decisions.length;

      await duringMainPhase(s, 1, 10, async () => {
        expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
          ok: true,
        });
        await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.battleArea.length === 2);

        const choice = s.decisions
          .slice(decisionsBefore)
          .find(({ seat, req }) => seat === 1 && req.kind === "chooseTargets");
        expect(choice?.req.options?.candidateInstanceIds).toContain(s.perm("brachio").permanentId);
        expect(immuneTo(s, "Digimon")).toBe(true);
        expect(s.perm("brachio").isSuspended).toBe(false);
        expect(s.perm("brachio").currentDP).toBe(13000);
        expect(s.perm("ally").isSuspended).toBe(false);
        expect(s.perm("ally").currentDP).toBe(3000);
      });
    },
  );

  it("stops being affected by an opponent's -3000 DP as soon as it gains the immunity (Q6275)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT25-019", as: "brachio" }] },
        1: { battleArea: [{ card: "BT1-055", as: "angemon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = -6;
    await s.ready();

    // No intent lets an opposing [On Play] resolve during this seat's turn, so the window is fired directly.
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("angemon"));
    await settle(() => s.perm("brachio").currentDP === 10000);
    expect(s.perm("brachio").currentDP).toBe(10000);

    // The [End of Your Turn] window is fired directly so the "for the turn" reduction has not expired yet.
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("brachio"));
    await settle(() => immuneTo(s, "Digimon"));

    expect(immuneTo(s, "Digimon")).toBe(true);
    expect(s.perm("brachio").currentDP).toBe(13000);
  });

  it("is given ＜Security A. -1＞ while immune without having it, then has it once the immunity ends (Q6274, Q6276)", async () => {
    const { s, preferBrachio } = await endTurnWithOpponentMemory(
      {
        0: {
          battleArea: [
            { card: "BT25-019", as: "brachio" },
            { card: "BT1-009", as: "ally" },
          ],
          deck: ["BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "idle" }],
          hand: [{ card: "BT5-036", as: "renamon" }],
          deck: ["BT1-004", "BT1-005"],
        },
      },
      6,
    );
    preferBrachio();
    const decisionsBefore = s.decisions.length;

    await duringMainPhase(s, 1, 10, async () => {
      expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("renamon").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision === undefined && s.state.players[1]!.battleArea.length === 2);
      const choice = s.decisions
        .slice(decisionsBefore)
        .find(({ seat, req }) => seat === 1 && req.kind === "chooseTargets");
      expect(choice?.req.options?.candidateInstanceIds).toContain(s.perm("brachio").permanentId);
      expect(immuneTo(s, "Digimon")).toBe(true);
      expect(observe(s.engine).keywordAmount(s.perm("brachio"), "SecurityAttack")).toBe(0);
    });

    await duringMainPhase(s, 0, 3, async () => {
      expect(immuneTo(s, "Digimon")).toBe(false);
      expect(observe(s.engine).keywordAmount(s.perm("brachio"), "SecurityAttack")).toBe(-1);
      expect(observe(s.engine).keywordAmount(s.perm("ally"), "SecurityAttack")).toBe(0);
    });
  });

  it.each([
    [6, false],
    [4, true],
  ] as const)(
    "does not trigger a granted 'when this Digimon becomes suspended' effect while immune (opponent memory %i -> triggers %s) (Q6277)",
    async (opponentMemory, triggers) => {
      const { s } = await endTurnWithOpponentMemory(
        {
          0: {
            battleArea: [{ card: "BT25-019", as: "brachio" }],
            security: ["BT1-001"],
            deck: ["BT1-002", "BT1-003"],
          },
          1: {
            battleArea: [
              { card: "BT14-044", as: "palmon" },
              { card: "BT1-009", as: "attacker" },
            ],
            deck: ["BT1-004", "BT1-005"],
          },
        },
        opponentMemory,
      );
      expect(immuneTo(s, "Digimon")).toBe(opponentMemory >= 5);

      await duringMainPhase(s, 1, 10, async () => {
        await settle(() => s.state.pendingDecision === undefined);
        s.state.memory = 3;
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
        await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

        expect(s.perm("brachio").isSuspended).toBe(true);
        expect(s.state.memory).toBe(triggers ? 5 : 3);
      });
    },
  );
});
