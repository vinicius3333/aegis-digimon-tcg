import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { compiled } from "./BT26-038.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type SeatSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
describe("BT26-038 Kuwagamon", () => {
  it("compiles the three suspend-and-buff windows", () => {
    expect(digivolutionRequirementsFor("BT26-038")).toContainEqual({
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects.slice(0, 3).map((e) => e.trigger)).toEqual(["OnPlay", "WhenDigivolving", "WhenMoving"]);
    expect(compiled.effects[0]?.actions).toMatchObject([
      { kind: "Suspend", optional: true },
      { kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" },
    ]);
    expect(compiled.effects[3]?.actions).toMatchObject([
      { kind: "SubTrigger", event: "whenBattleWon", sourceFilter: { isSelfRef: true } },
    ]);
  });
  it("gives an eligible Insectoid its temporary DP increase on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-038", as: "kuwagamon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "suspendTarget" }] },
      },
      { autoAcceptOptional: true },
    );
    const baseDP = s.perm("kuwagamon").currentDP;

    const resolving = advance(s.engine).fire(EffectTiming.OnPlay, s.perm("kuwagamon"));
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const pending = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("suspendTarget").permanentId] },
      }),
    ).toEqual({ ok: true });
    await resolving;

    expect(s.perm("suspendTarget").isSuspended).toBe(true);
    expect(s.perm("kuwagamon").currentDP).toBe(baseDP + 3000);
  });

  it("digivolves the battle winner with the inherited one-memory reduction", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-053", as: "winner", dp: 10000, under: ["BT26-038"] },
            { card: "BT1-066", as: "evolutionTarget" },
          ],
          hand: [{ card: "BT26-038", as: "candidate" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    const victimId = s.perm("victim").permanentId;
    const candidateId = s.inst("candidate").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("evolutionTarget").topCard.cardId === "BT26-038" && !observe(s.engine).isAttacking());

    expect(s.perm("evolutionTarget").topCard.cardId).toBe("BT26-038");
    expect(s.perm("evolutionTarget").topCard.instanceId).toBe(candidateId);
    expect(s.state.memory).toBe(0);
  });

  it("does not trigger the inherited evolution when a different Digimon wins", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-053", as: "host", under: ["BT26-038"] },
            { card: "BT1-066", as: "ally" },
          ],
          hand: [{ card: "BT26-038", as: "candidate" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 1000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    const candidateId = s.inst("candidate").instanceId;
    const victimId = s.perm("victim").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ally").permanentId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.perm("host").topCard.cardId).toBe("BT11-053");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(candidateId);
    expect(s.state.memory).toBe(1);
  });

  it("triggers the inherited evolution after winning against a Security Digimon (Q7020)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-053", as: "winner", dp: 10000, under: ["BT26-038"] },
            { card: "BT1-066", as: "evolutionTarget" },
          ],
          hand: [{ card: "BT26-038", as: "candidate" }],
        },
        1: { security: [{ card: "BT1-009", as: "securityDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    const candidateId = s.inst("candidate").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("evolutionTarget").topCard.cardId === "BT26-038" && !observe(s.engine).isAttacking());

    expect(s.perm("evolutionTarget").topCard.instanceId).toBe(candidateId);
    expect(s.state.memory).toBe(0);
  });

  it("keeps the Then buff when suspension is declined, and scopes it to own matching traits", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-038", as: "kuwagamon" },
            { card: "BT1-066", as: "insectoid", dp: 2000 },
            { card: "BT1-009", as: "nonMatching", dp: 3000 },
          ],
        },
        1: { battleArea: [{ card: "BT1-066", as: "opponentInsectoid", dp: 2000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("insectoid").permanentId);
    const baseDP = s.perm("insectoid").currentDP;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("kuwagamon"));

    expect(s.perm("opponentInsectoid").isSuspended).toBe(false);
    expect(s.perm("insectoid").currentDP).toBe(baseDP + 3000);
    expect(s.perm("nonMatching").currentDP).toBe(3000);
    expect(s.perm("opponentInsectoid").currentDP).toBe(2000);

    advance(s.engine).ledgers.modifiers.sweep(s.state, "opponentTurnEnd", 1);
    expect(s.perm("insectoid").currentDP).toBe(baseDP);
  });

  it("uses the exact level-3 TS alternate evolution and rejects a non-TS base", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT26-034", as: "tsBase" }],
        hand: [{ card: "BT26-038", as: "kuwagamon" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsBase").permanentId,
        instanceId: legal.inst("kuwagamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsBase").topCard.cardId === "BT26-038");
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "nonTsBase" }],
        hand: [{ card: "BT26-038", as: "kuwagamon" }],
      },
    });
    illegal.state.memory = 2;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("nonTsBase").permanentId,
        instanceId: illegal.inst("kuwagamon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});

describe("BT26-038 Kuwagamon — KB Q&A rulings", () => {
  it.each(["own", "opponent"] as const)(
    "may suspend either player's Digimon with its [On Play] effect (target=%s) (Q7018)",
    async (side) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "BT26-038", as: "kuwagamon" },
              { card: "BT1-009", as: "own" },
            ],
          },
          1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
        },
        { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
      );
      preferred.push(s.perm(side).permanentId);

      await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("kuwagamon"));

      expect(s.perm("own").isSuspended).toBe(side === "own");
      expect(s.perm("opponent").isSuspended).toBe(side === "opponent");
    },
  );

  /**
   * Attack the opponent's suspended `loser` with a 20000 DP Digimon carrying Kuwagamon, so it wins
   * the battle, and record the board at the instant the inherited digivolution lands.
   */
  async function winBattleAgainst(loser: string, opponentSeat: SeatSpec = {}) {
    const atDigivolve: { loserInTrash?: boolean; opponentHand?: number; opponentSecurity?: string[] } = {};
    let s: ReturnType<typeof setupEngine> | undefined;
    s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-053", as: "winner", dp: 20000, under: ["BT26-038"] },
            { card: "BT1-066", as: "evolutionTarget" },
          ],
          hand: [{ card: "BT26-038", as: "candidate" }],
        },
        1: { ...opponentSeat, battleArea: [{ card: loser, as: "loser", suspended: true, dp: 1000 }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        onEvent(event) {
          if (event.kind !== "digivolved" || event.cardId !== "BT26-038" || s === undefined) return;
          const opponent = s.state.players[1]!;
          atDigivolve.loserInTrash = opponent.trash.some(({ cardId }) => cardId === loser);
          atDigivolve.opponentHand = opponent.hand.length;
          atDigivolve.opponentSecurity = opponent.security.map(({ instanceId }) => instanceId);
        },
      },
    );
    s.state.memory = 1;
    await s.ready();
    const loserPermanentId = s.perm("loser").permanentId;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("winner").permanentId,
        target: { kind: "permanent", permanentId: loserPermanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s!.engine).isAttacking() && s!.state.pendingDecision === undefined);
    return { s, atDigivolve, loserPermanentId };
  }

  it("triggers after the losing Digimon has been deleted (Q7019)", async () => {
    const { s, atDigivolve } = await winBattleAgainst("BT1-009");

    expect(s.perm("evolutionTarget").topCard.instanceId).toBe(s.inst("candidate").instanceId);
    expect(atDigivolve.loserInTrash).toBe(true);
  });

  it("resolves the turn player's win effect before the loser's [On Deletion] effect (Q7021)", async () => {
    const { s, atDigivolve } = await winBattleAgainst("BT2-070", { deck: ["BT1-010", "BT1-011"] });

    expect(s.perm("evolutionTarget").topCard.instanceId).toBe(s.inst("candidate").instanceId);
    expect(atDigivolve.loserInTrash).toBe(true);
    expect(atDigivolve.opponentHand).toBe(0);
    expect(s.state.players[1]!.hand).toHaveLength(1);
  });

  it("resolves the loser's would-leave effect before the win effect (Q7022)", async () => {
    const { s, atDigivolve } = await winBattleAgainst("BT26-016", {
      security: [
        { card: "BT1-010", as: "topSecurity" },
        { card: "BT1-011", as: "bottomSecurity" },
      ],
    });

    expect(s.perm("evolutionTarget").topCard.instanceId).toBe(s.inst("candidate").instanceId);
    expect(atDigivolve.opponentSecurity).toEqual([s.inst("bottomSecurity").instanceId]);
    expect(s.state.players[1]!.deck.at(-1)?.instanceId).toBe(s.inst("topSecurity").instanceId);
  });

  it("still activates the win effect when the losing Digimon is not deleted (Q7023)", async () => {
    const { s, loserPermanentId } = await winBattleAgainst("BT26-016", {
      security: ["BT1-010", "BT1-011"],
    });

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(loserPermanentId);
    expect(s.perm("evolutionTarget").topCard.instanceId).toBe(s.inst("candidate").instanceId);
    expect(s.state.memory).toBe(0);
  });
});
