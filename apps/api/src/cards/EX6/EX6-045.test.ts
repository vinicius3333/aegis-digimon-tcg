import { describe, expect, it } from "vitest";
import { EffectDuration } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type PermanentSpec } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX6-045.js";
import "./EX6-049.js";
import "./EX6-030.js";
import "./EX6-027.js";
import "./EX6-034.js";

describe("EX6-045 Tsukaimon", () => {
  it("deletes an opposing level 3 Digimon on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { levels: [3] } },
    }));
  it("inherits a once-per-turn attack-ending cost by deleting another Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [{ kind: "EndAttack" }],
          cost: { kind: "deleteOwn", target: { filter: { excludeSelf: true } } },
        },
      ],
    }));

  it("publicly deletes an opposing level 3 Digimon when Tsukaimon is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-045", as: "tsukai", under: ["BT1-009"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("tsukai").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
  it("publicly ends an opponent attack by deleting another own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          security: ["BT1-009"],
          battleArea: [
            { card: "EX6-049", as: "host", under: ["EX6-045"] },
            { card: "BT1-010", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
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
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("cost").instanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});

describe("EX6-045 Tsukaimon — KB Q&A rulings", () => {
  interface Scenario {
    mine?: PermanentSpec[];
    hand?: string[];
    security?: string[];
    attacker?: PermanentSpec;
    theirs?: PermanentSpec[];
    theirHand?: string[];
    deleted?: string;
  }

  async function opponentAttacks(scenario: Scenario = {}) {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          security: scenario.security ?? ["BT1-011", "BT1-012"],
          hand: (scenario.hand ?? []).map((card, index) => ({ card, as: `hand${index}` })),
          battleArea: [
            { card: "EX6-049", as: "host", under: ["EX6-045"] },
            ...(scenario.mine ?? [{ card: "BT1-010", as: "cost" }]),
          ],
        },
        1: {
          battleArea: [scenario.attacker ?? { card: "BT1-080", as: "attacker" }, ...(scenario.theirs ?? [])],
          hand: (scenario.theirHand ?? []).map((card, index) => ({ card, as: `theirHand${index}` })),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst(scenario.deleted ?? "cost").instanceId);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    return s;
  }

  async function declareAttack(s: Awaited<ReturnType<typeof opponentAttacks>>) {
    const securityBefore = s.state.players[0]!.security.length;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    return securityBefore;
  }

  it("does not end the attack when the Digimon it tries to delete is kept on the field (Q3772)", async () => {
    const s = await opponentAttacks({ mine: [{ card: "EX6-030", as: "cost" }] });
    await declareAttack(s);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === s.perm("cost").permanentId),
    ).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("goes straight to the end of the attack with no block timing and no security check (Q3773)", async () => {
    const s = await opponentAttacks({
      mine: [
        { card: "BT1-010", as: "cost" },
        { card: "EX6-012", as: "blocker" },
      ],
    });
    const securityBefore = await declareAttack(s);
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([
      "EX6-049",
      "EX6-012",
    ]);
    expect(s.perm("blocker").isSuspended).toBe(false);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("attacker"))).toBe(true);
  });

  it("ends the attack of a Digimon that isn't affected by effects (Q3774)", async () => {
    const s = await opponentAttacks();
    await advance(s.engine).verb.restrict(
      s.perm("attacker").permanentId,
      "beAffected",
      EffectDuration.UntilEachTurnEnd,
    );
    const securityBefore = await declareAttack(s);
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT1-080"]);
  });

  it("leaves no counter timing for a [Counter] effect once the attack ends (Q3775)", async () => {
    const s = await opponentAttacks({
      mine: [
        { card: "BT1-010", as: "cost" },
        { card: "BT2-037", as: "angewomon" },
      ],
      hand: ["EX6-027"],
    });
    await declareAttack(s);
    expect(s.decisions.some(({ req }) => req.sourceCardId === "EX6-027")).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX6-027"]);
    expect(s.perm("angewomon").topCard?.cardId).toBe("BT2-037");
  });

  it("still triggers the attacker's [End of Attack] effects (Q3776)", async () => {
    const s = await opponentAttacks({
      attacker: { card: "BT1-060", as: "attacker", under: ["EX6-034"] },
      theirs: [{ card: "BT1-049", as: "returned", suspended: true }],
    });
    const returnedPermanentId = s.perm("returned").permanentId;
    const securityBefore = await declareAttack(s);
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);
    const replayed = s.state.players[1]!.battleArea.find(
      (permanent) => permanent.topCard?.instanceId === s.inst("returned").instanceId,
    );
    expect(replayed?.permanentId).not.toBe(returnedPermanentId);
    expect(replayed?.isSuspended).toBe(false);
  });
});
