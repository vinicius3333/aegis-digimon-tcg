import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { drainMicrotasks, setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-018.js";
import "../BT13/BT13-007.js";
import "../EX2/EX2-045.js";
import "../BT6/BT6-010.js";
import "./BT18-088.js";

describe("BT18-018 EmperorGreymon", () => {
  it("gains Security Attack +1 and unsuspends once when it wins a battle", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          choose: true,
          scope: "acrossDigimon",
          scaling: { unit: "digivolutionCardColors" },
        },
        { kind: "Suspend", scaling: { unit: "digivolutionCardColors" } },
        { kind: "Attack" },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true, zone: "battleArea" },
        },
      ],
    });
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-018", as: "emperor", under: ["BT1-030"] }] },
      1: {
        battleArea: [
          { card: "BT1-030", dp: 10000, suspended: true, as: "targetA" },
          { card: "BT1-030", dp: 10000, suspended: true, as: "targetB" },
        ],
      },
    });
    await s.ready();
    const emperorId = s.perm("emperor").permanentId;
    const targetAId = s.perm("targetA").permanentId;
    const targetBId = s.perm("targetB").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: emperorId,
        target: { kind: "permanent", permanentId: s.perm("targetA").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetAId));
    expect(s.perm("emperor").isSuspended).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("emperor"), "SecurityAttack")).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: emperorId,
        target: { kind: "permanent", permanentId: s.perm("targetB").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetBId));
    expect(s.perm("emperor").isSuspended).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("emperor"), "SecurityAttack")).toBe(1);
  });

  it("trashes across stacks and suspends one Digimon per distinct source-stack color", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT18-088",
              as: "takuya",
              under: ["BT18-011", "BT18-012", "BT18-014", "BT18-022", "BT18-023", "BT18-047"],
            },
          ],
          hand: [{ card: "BT18-018", as: "emperor" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-030", as: "targetA", under: ["BT1-001"] },
            { card: "BT1-030", as: "targetB", under: ["BT1-001"] },
            { card: "BT1-030", as: "targetC", under: ["BT1-001"] },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("emperor").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "BT18-018");

    expect(
      [s.perm("targetA"), s.perm("targetB"), s.perm("targetC")].map((permanent) => permanent.stack.length),
    ).toEqual([0, 0, 0]);
    expect([s.perm("targetA"), s.perm("targetB"), s.perm("targetC")].every((permanent) => permanent.isSuspended)).toBe(
      true,
    );
  });

  it("may attack after its When Digivolving processing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT18-088",
              as: "takuya",
              under: ["BT18-011", "BT18-012", "BT18-014", "BT18-022", "BT18-023", "BT18-047"],
            },
          ],
          hand: [{ card: "BT18-018", as: "emperor" }],
          deck: ["BT1-009"],
        },
        1: { security: [{ card: "BT1-030", as: "security" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("emperor").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "BT18-018");
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("takuya").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("digivolves from Takuya with at least 5 Hybrid cards under it for cost 5", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT18-088",
            as: "takuya",
            under: ["BT18-011", "BT18-012", "BT18-014", "BT18-022", "BT18-023", "BT18-047"],
          },
        ],
        hand: [{ card: "BT18-018", as: "emperor" }],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("emperor").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard.cardId === "BT18-018");

    expect(s.state.memory).toBe(5);
    expect(s.perm("takuya").stack).toHaveLength(7);
  });

  it("rejects the Takuya alternate evolution with only 4 Hybrid cards under it", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-088", as: "takuya", under: ["BT18-011", "BT18-012", "BT18-014", "BT18-022"] }],
        hand: [{ card: "BT18-018", as: "emperor" }],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("emperor").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("does not trigger its inherited effect when another Digimon wins a battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-018", as: "emperor", under: ["BT1-030"] },
            { card: "BT1-030", dp: 5000, as: "other" },
          ],
        },
        1: { battleArea: [{ card: "BT1-030", dp: 1000, suspended: true, as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("other").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(observe(s.engine).keywordAmount(s.perm("emperor"), "SecurityAttack")).toBe(0);
  });
});

describe("BT18-018 EmperorGreymon — KB Q&A rulings", () => {
  const FIVE_HYBRIDS = ["BT18-011", "BT18-022", "BT18-025", "BT18-026", "BT18-047"];

  const digivolve = (s: EngineSetup, baseAlias: string, cardAlias: string) =>
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm(baseAlias).permanentId,
      instanceId: s.inst(cardAlias).instanceId,
    });

  it("digivolves for cost 5 from Takuya with more than 5 Hybrid cards under it (Q2925)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-088", as: "takuya", under: [...FIVE_HYBRIDS, "BT18-012", "BT18-014"] }],
          hand: [{ card: "BT18-018", as: "emperor" }],
          deck: ["BT1-010"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(digivolve(s, "takuya", "emperor")).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "BT18-018");
    expect(s.state.memory).toBe(5);

    const tooFew = setupEngine({
      0: {
        battleArea: [{ card: "BT18-088", as: "takuya", under: FIVE_HYBRIDS.slice(0, 4) }],
        hand: [{ card: "BT18-018", as: "emperor" }],
      },
    });
    tooFew.state.memory = 10;
    expect(digivolve(tooFew, "takuya", "emperor")).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("gains Security Attack +1 from its battle-win effect before granted Piercing checks security (Q2926)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-018", as: "emperor", under: ["BT6-010"] }] },
        1: {
          battleArea: [{ card: "BT1-030", dp: 6000, suspended: true, as: "target" }],
          security: 3,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasPierce(s.perm("emperor"))).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("emperor").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length <= 1);
    await advance(s.engine).finishAttack();

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.perm("emperor").isSuspended).toBe(false);
  });

  it("lets the inherited Takuya & Koji end-of-turn attack follow its When Digivolving attack after memory passes (Q2927)", async () => {
    const preferredAttackTarget: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-088", as: "takuya", under: FIVE_HYBRIDS }],
          hand: [{ card: "BT18-018", as: "emperor" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT1-030", dp: 6000, as: "target" }],
          security: 3,
          deck: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferredAttackTarget },
    );
    // The When Digivolving attack must hit the Digimon so the battle-win effect unsuspends EmperorGreymon.
    preferredAttackTarget.push(s.perm("target").permanentId);
    s.state.turnSeat = 0;
    s.state.memory = 4;
    await s.ready();
    const targetId = s.perm("target").permanentId;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(digivolve(s, "takuya", "emperor")).toEqual({ ok: true });
    await turn;

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(-1);
    expect(s.perm("takuya").isSuspended).toBe(true);
  });

  it("trashes 3 opposing digivolution cards and suspends 3 Digimon for 3 source colors (Q4289)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-088", as: "takuya", under: ["BT18-012", "BT18-014", "BT18-022", "BT18-023", "BT18-024"] },
          ],
          hand: [{ card: "BT18-018", as: "emperor" }],
          deck: ["BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-030", as: "targetA", under: ["BT1-001"] },
            { card: "BT1-030", as: "targetB", under: ["BT1-001"] },
            { card: "BT1-030", as: "targetC", under: ["BT1-001"] },
            { card: "BT1-030", as: "targetD", under: ["BT1-001"] },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(digivolve(s, "takuya", "emperor")).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "BT18-018");
    await drainMicrotasks();

    const targets = ["targetA", "targetB", "targetC", "targetD"].map((alias) => s.perm(alias));
    expect(targets.reduce((total, permanent) => total + permanent.stack.length, 0)).toBe(1);
    expect(targets.filter((permanent) => permanent.isSuspended)).toHaveLength(3);
    expect(s.state.players[1]!.trash).toHaveLength(3);
  });

  it("digivolves from a Tamer under a Digimon-can't-digivolve effect without firing when-a-Digimon-digivolves effects (Q6583)", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT13-007", as: "drasil" },
          battleArea: [
            { card: "BT18-088", as: "takuya", under: FIVE_HYBRIDS },
            { card: "BT1-009", as: "monodramon" },
            { card: "EX2-045", as: "calumon" },
          ],
          hand: [
            { card: "BT18-018", as: "emperor" },
            { card: "BT1-015", as: "greymon" },
          ],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: { security: 5 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(digivolve(s, "monodramon", "greymon")).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("monodramon").topCard?.cardId).toBe("BT1-009");

    expect(digivolve(s, "takuya", "emperor")).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "BT18-018");
    await advance(s.engine).finishAttack();
    await drainMicrotasks();
    expect(s.perm("calumon").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);

    const control = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "monodramon" },
            { card: "EX2-045", as: "calumon" },
          ],
          hand: [{ card: "BT1-015", as: "greymon" }],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    control.state.memory = 3;
    expect(digivolve(control, "monodramon", "greymon")).toEqual({ ok: true });
    await settle(() => control.perm("calumon").isSuspended);
    expect(control.state.memory).toBe(2);
  });

  it("performs the digivolution bonus draw when digivolving from a Tamer (Q6584)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-088", as: "takuya", under: FIVE_HYBRIDS }],
          hand: [{ card: "BT18-018", as: "emperor" }],
          deck: [{ card: "BT1-010", as: "bonusDraw" }, "BT1-011"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(digivolve(s, "takuya", "emperor")).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bonusDraw").instanceId));

    expect(s.perm("takuya").topCard?.cardId).toBe("BT18-018");
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("cannot attack the turn it digivolves from a Tamer that was played this turn (Q6585)", async () => {
    const setupFromTakuya = (enteredThisTurn: boolean) =>
      setupEngine(
        {
          0: {
            battleArea: [{ card: "BT18-088", as: "takuya", under: FIVE_HYBRIDS, enteredThisTurn }],
            hand: [{ card: "BT18-018", as: "emperor" }],
            deck: ["BT1-010", "BT1-011"],
          },
          1: { security: 3 },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

    const playedThisTurn = setupFromTakuya(true);
    playedThisTurn.state.memory = 10;
    await playedThisTurn.ready();
    expect(digivolve(playedThisTurn, "takuya", "emperor")).toEqual({ ok: true });
    await settle(() => playedThisTurn.perm("takuya").topCard?.cardId === "BT18-018");
    await drainMicrotasks();
    expect(observe(playedThisTurn.engine).isAttacking()).toBe(false);
    expect(playedThisTurn.state.players[1]!.security).toHaveLength(3);
    expect(playedThisTurn.perm("takuya").isSuspended).toBe(false);
    expect(
      playedThisTurn.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: playedThisTurn.perm("takuya").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(playedThisTurn.state.players[1]!.security).toHaveLength(3);

    const established = setupFromTakuya(false);
    established.state.memory = 10;
    await established.ready();
    expect(digivolve(established, "takuya", "emperor")).toEqual({ ok: true });
    await settle(() => established.state.players[1]!.security.length < 3);
    expect(established.perm("takuya").isSuspended).toBe(true);
  });

  it("treats the Tamer placed under it as a digivolution card that is trashed when it leaves the field (Q6586)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-088", as: "takuya", under: FIVE_HYBRIDS }],
          hand: [{ card: "BT18-018", as: "emperor" }],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-030", dp: 30000, suspended: true, as: "wall" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const tamerCardId = s.perm("takuya").topCard!.instanceId;

    expect(digivolve(s, "takuya", "emperor")).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "BT18-018");
    await drainMicrotasks();
    const emperor = s.perm("takuya");
    expect(emperor.stack.map((card) => card.instanceId)).toContain(tamerCardId);
    expect(emperor.stack).toHaveLength(FIVE_HYBRIDS.length + 1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: emperor.permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);
    await advance(s.engine).finishAttack();

    const trashIds = s.state.players[0]!.trash.map((card) => card.instanceId);
    expect(trashIds).toContain(tamerCardId);
    expect(s.state.players[0]!.trash).toHaveLength(FIVE_HYBRIDS.length + 2);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("does not gain the Security effect of a Tamer in its digivolution cards (Q6587)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-018", as: "emperor", under: ["BT18-011", { card: "BT18-088", as: "buried" }] }],
        },
        1: { security: [{ card: "BT18-088", as: "checked" }, "BT1-030"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("emperor").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await advance(s.engine).finishAttack();

    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual([
      s.inst("checked").instanceId,
    ]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("emperor").stack.map((card) => card.instanceId)).toContain(s.inst("buried").instanceId);
  });

  it("gains the inherited effect of a Tamer in its digivolution cards (Q6588)", async () => {
    const runEndOfTurn = async (buriedCard: string) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT18-018", as: "emperor", under: ["BT18-011", buriedCard] }],
            deck: ["BT1-010", "BT1-011", "BT1-012"],
          },
          1: { security: 3, deck: ["BT1-010", "BT1-011"] },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = 0;
      s.state.memory = 3;
      await s.ready();
      await advance(s.engine).runTurn(0);
      return s;
    };

    const withTamer = await runEndOfTurn("BT18-088");
    expect(withTamer.state.players[1]!.security).toHaveLength(2);
    expect(withTamer.perm("emperor").isSuspended).toBe(true);

    const withoutTamer = await runEndOfTurn("BT1-030");
    expect(withoutTamer.state.players[1]!.security).toHaveLength(3);
    expect(withoutTamer.perm("emperor").isSuspended).toBe(false);
  });
});
