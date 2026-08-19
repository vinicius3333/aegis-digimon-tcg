import { EffectTiming, getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT2/BT2-054.js";
import "./EX3-024.js";
import "./EX3-044.js";
import "../index.js"; // the full catalog is registered in a real match

const mainEffect =
  "Digivolve: 3 from [Groundramon] or [Wingdramon][All Turns][Once Per Turn] When this Digimon becomes suspended, suspend 1 of your opponent's Digimon.[All Turns][Once Per Turn] When one of your Digimon with [Dramon] or [Examon] in its name deletes an opponent's Digimon in battle and survives, trash the top card of your opponent's security stack.";

describe("EX3-044 Breakdramon", () => {
  it("has the official metadata, normal evolution requirements, and alternate names", () => {
    expect(getCardDefinition("EX3-044")).toMatchObject({
      cardId: "EX3-044",
      nameEn: "Breakdramon",
      colors: ["Green"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Green", level: 5, memoryCost: 4 },
        { color: "Blue", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Machine Dragon"],
      rarity: "R",
      imageId: "EX3-044",
    });
  });

  it("digivolves from Groundramon or Wingdramon for alternate cost 3", async () => {
    for (const baseCard of ["EX3-041", "EX3-020"]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: "EX3-044", as: "breakdramon" }],
          deck: ["BT1-003"],
        },
      });
      s.state.memory = 3;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("breakdramon").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX3-044");
      expect(s.state.memory).toBe(0);
    }
  });

  it("uses printed cost 4 from unrelated green and blue level 5 Digimon", async () => {
    for (const baseCard of ["EX3-043", "BT1-038"]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: "EX3-044", as: "breakdramon" }],
          deck: ["BT1-003"],
        },
      });
      s.state.memory = 4;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("breakdramon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX3-044");
      expect(s.state.memory).toBe(0);
    }
  });

  it("suspends exactly 1 chosen opposing Digimon when Breakdramon itself becomes suspended", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX3-044", as: "breakdramon" }] },
        1: {
          battleArea: [
            { card: "BT1-028", as: "chosen" },
            { card: "BT1-029", as: "untouched" },
            { card: "BT1-030", suspended: true, as: "alreadySuspended" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("breakdramon").permanentId]);
    await settle(() => s.perm("chosen").isSuspended);

    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("untouched").isSuspended).toBe(false);
    expect(s.perm("alreadySuspended").isSuspended).toBe(true);
    const targetRequest = s.decisions.find(({ req }) => req.sourceCardId === "EX3-044")!.req;
    expect(targetRequest).toMatchObject({
      kind: "chooseTargets",
      sourceCardId: "EX3-044",
      options: { timing: "AllTurns", effectText: mainEffect, min: 1, max: 1 },
    });
    expect(targetRequest.options!.candidateInstanceIds).not.toContain(s.perm("alreadySuspended").permanentId);
  });

  it("the suspension watcher is self-scoped and fires only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-044", as: "breakdramon" },
            { card: "EX3-041", as: "otherDramon" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "firstTarget" },
            { card: "BT1-029", as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstTarget").permanentId, s.perm("secondTarget").permanentId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("otherDramon").permanentId]);
    expect(s.perm("firstTarget").isSuspended).toBe(false);
    await advance(s.engine).verb.suspend([s.perm("breakdramon").permanentId]);
    await settle(() => s.perm("firstTarget").isSuspended);
    s.perm("breakdramon").isSuspended = false;
    await advance(s.engine).verb.suspend([s.perm("breakdramon").permanentId]);
    await settle();

    expect(s.perm("firstTarget").isSuspended).toBe(true);
    expect(s.perm("secondTarget").isSuspended).toBe(false);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-044")).toHaveLength(1);
  });

  it("resets its suspension once-per-turn use on the controller's next turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX3-044", as: "breakdramon" }],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [
            { card: "BT1-028", as: "firstTarget" },
            { card: "BT1-029", as: "secondTarget" },
          ],
          deck: ["BT1-004", "BT1-005", "BT1-006"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstTarget").permanentId, s.perm("secondTarget").permanentId);
    await s.ready();

    await advance(s.engine).verb.suspend([s.perm("breakdramon").permanentId]);
    await settle(() => s.perm("firstTarget").isSuspended);
    const firstTurn = s.state.turnCount;
    await advance(s.engine).runTurn(0);
    expect(s.state.turnCount).toBeGreaterThan(firstTurn);
    s.state.turnSeat = 0;
    s.perm("breakdramon").isSuspended = false;
    s.perm("firstTarget").isSuspended = true;
    s.perm("secondTarget").isSuspended = false;
    const decisionsBeforeSecondTurn = s.decisions.length;
    await advance(s.engine).verb.suspend([s.perm("breakdramon").permanentId]);
    await settle(() => s.decisions.length > decisionsBeforeSecondTurn);

    expect(s.perm("secondTarget").isSuspended).toBe(true);
    expect(s.decisions.at(-1)?.req.sourceCardId).toBe("EX3-044");
  });

  it("Q3399: resolves the turn player's forced attack choices before Breakdramon's suspension trigger", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-024", as: "slayerdramon" },
          { card: "EX3-044", as: "breakdramon" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT2-054", as: "attacker" },
          { card: "BT1-030", as: "otherAttacker" },
          { card: "BT1-028", as: "secondTarget" },
        ],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = -3;
    await s.ready();

    const flow = advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("slayerdramon"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    let pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("breakdramon").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.seat === 1 && s.state.pendingDecision.kind === "chooseTargets");
    pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("attacker").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.seat === 1 && s.state.pendingDecision.kind === "selectCards");
    pending = s.state.pendingDecision!;
    expect(s.decisions.at(-1)?.req.options?.candidateInstanceIds).toContain(s.perm("breakdramon").permanentId);
    expect(s.perm("breakdramon").isSuspended).toBe(true);
    expect(s.perm("otherAttacker").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [s.perm("breakdramon").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.seat === 0 && s.decisions.at(-1)?.req.sourceCardId === "EX3-044");
    pending = s.state.pendingDecision!;
    expect(s.state.memory).toBe(-5);
    expect(s.perm("otherAttacker").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("otherAttacker").permanentId] },
      }),
    ).toEqual({ ok: true });
    await flow;

    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT2-054");
    expect(s.perm("breakdramon").isSuspended).toBe(true);
    expect(s.perm("otherAttacker").isSuspended).toBe(true);
  });

  it("Machine Dragon trait: surviving a battle won by Breakdramon trashes the opponent's top security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX3-044", as: "breakdramon" }] },
      1: {
        battleArea: [{ card: "BT1-028", suspended: true, as: "defender" }],
        security: ["BT1-003", "BT1-004"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("breakdramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-028") &&
        s.state.players[1]!.security.length === 1,
    );

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-044")).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(2);
  });

  it("observes allied Dramon battle wins and trashes security only once in the same turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-044", as: "watcher" },
          { card: "BT1-020", dp: 9000, as: "groundramon" },
          { card: "BT1-026", dp: 9000, as: "breakdramon" },
        ],
      },
      1: {
        battleArea: [
          { card: "BT1-028", suspended: true, as: "firstDefender" },
          { card: "BT1-029", suspended: true, as: "secondDefender" },
        ],
        security: ["BT1-003", "BT1-004", "BT1-005"],
      },
    });
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("groundramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstDefender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    await settle(
      () =>
        s.events.filter(({ kind }) => kind === "combatResolved").length === 1 &&
        s.state.phase === Phase.Main &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("breakdramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondDefender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "BT1-029"));

    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("main and inherited copies use independent OPT ledgers and both reset next turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-044", as: "mainWatcher" },
          { card: "BT1-020", under: ["EX3-044"], as: "inheritedWatcher" },
          { card: "BT1-020", dp: 15000, as: "firstDramon" },
          // A vanilla [Dramon] attacker: BT1-026 Breakdramon prints ＜Piercing＞, which would
          // consume a second security card and hide the once-per-turn trash under test.
          { card: "BT14-015", dp: 15000, as: "secondDramon" },
          { card: "BT1-009", dp: 15000, as: "nextTurnDramon" },
        ],
        deck: ["BT1-001", "BT1-002", "BT1-003"],
      },
      1: {
        battleArea: [
          { card: "BT1-028", suspended: true, as: "firstDefender" },
          { card: "BT1-029", suspended: true, as: "secondDefender" },
          { card: "BT1-030", suspended: true, as: "nextTurnDefender" },
        ],
        security: ["BT1-003", "BT1-004", "BT1-005", "BT1-006"],
        deck: ["BT1-007", "BT1-008", "BT1-009"],
      },
    });
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstDramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstDefender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2);
    await settle();
    const secondDefenderId = s.perm("secondDefender").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondDramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondDefender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === secondDefenderId));
    await settle(
      () =>
        s.events.filter(({ kind }) => kind === "combatResolved").length === 2 &&
        s.state.phase === Phase.Main &&
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking(),
    );

    expect(s.state.players[1]!.security).toHaveLength(2);
    const firstTurn = s.state.turnCount;
    await advance(s.engine).runTurn(0);
    await settle(() => s.state.turnCount > firstTurn && s.state.pendingDecision === undefined);
    s.state.turnSeat = 0;
    s.state.phase = Phase.Main;
    s.state.memory = 10;
    s.perm("nextTurnDramon").isSuspended = false;
    s.perm("nextTurnDefender").isSuspended = true;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("nextTurnDramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("nextTurnDefender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("does not trash security when a Dramon loses the battle and fails to survive", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-044", as: "watcher" },
          { card: "EX3-041", dp: 1000, as: "groundramon" },
        ],
      },
      1: {
        battleArea: [{ card: "BT1-028", dp: 12000, suspended: true, as: "defender" }],
        security: ["BT1-003", "BT1-004"],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("groundramon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-041"));

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });
});
