import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-040.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-040", () => {
  it("blocks on the opponent's turn and suspends another opposing Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-009", as: "attacker" },
            { card: "BT1-064", as: "peer" },
          ],
        },
        1: { battleArea: [{ card: "EX9-040", as: "blocker" }], security: ["BT1-001"] },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("peer").permanentId, s.perm("peer").topCard.instanceId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("blocker").isSuspended).toBe(true);
    expect(s.perm("peer").isSuspended).toBe(true);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT1-009");
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("inherits +1000 DP after legal evolution and retains it across both turns", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX9-040", as: "host" }],
        hand: [{ card: "BT1-076", as: "evo" }],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      1: { deck: ["BT1-009", "BT1-009"] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("host").topCard.cardId).toBe("BT1-076");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(["EX9-040"]);
    expect(s.state.memory).toBe(3);
    expect(s.perm("host").currentDP).toBe(7000);
    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).recompute();
    expect(s.perm("host").currentDP).toBe(7000);
    await advance(s.engine).runTurn(1);
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each(["BT21-033", "BT1-009"])("permits off-color evolution only from a WG level 3: %s", async (base) => {
    const s = setupEngine({
      0: { breeding: { card: base, as: "host" }, hand: [{ card: "EX9-040", as: "evo" }], deck: ["BT1-009"] },
    });
    s.state.memory = 5;
    await s.ready();
    const eligible = base === "BT21-033";
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }).ok,
    ).toBe(eligible);
    await settle();
    expect(s.perm("host").topCard.cardId).toBe(eligible ? "EX9-040" : base);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(eligible ? [base] : []);
    expect(s.state.memory).toBe(eligible ? 3 : 5);
    expect(s.state.pendingDecision).toBeUndefined();
  });
  it("has Blocker and once per turn suspends an opposing Digimon when suspended", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "Suspend", target: { filter: { controller: "opponent" } } }],
        },
      ],
    });
  });
  it("inherits +1000 DP", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    }));

  it("suspends one opposing Digimon when this Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-040", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.suspend([s.perm("source").permanentId]);
    await settle(() => s.perm("opponent").isSuspended);
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("does not trigger when another Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-040", as: "source" },
            { card: "BT1-009", as: "other" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.suspend([s.perm("other").permanentId]);
    await settle();
    expect(s.perm("opponent").isSuspended).toBe(false);

    await advance(s.engine).verb.suspend([s.perm("source").permanentId]);
    await settle(() => s.perm("opponent").isSuspended);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("does not trigger a second time during the same turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-040", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    const source = s.perm("source");
    const opponent = s.perm("opponent");
    await advance(s.engine).verb.suspend([source.permanentId]);
    await settle(() => opponent.isSuspended);
    await advance(s.engine).verb.unsuspend([source.permanentId, opponent.permanentId]);
    expect(source.isSuspended).toBe(false);
    expect(opponent.isSuspended).toBe(false);

    await advance(s.engine).verb.suspend([source.permanentId]);
    await settle();
    expect(source.isSuspended).toBe(true);
    expect(opponent.isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
