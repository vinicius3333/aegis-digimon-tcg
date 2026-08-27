import { EffectDuration, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT25-088.js";
import "../index.js";

describe("BT25-088 Kyo Sawashiro", () => {
  it("keeps the Glowing Dawn play reduction in the Your Turn window", () => {
    const reduction = compiled.effects.find((effect) =>
      effect.actions?.some((action) => action.kind === "Replacement" && action.event === "wouldBePlayed"),
    );
    expect(reduction?.trigger).toBe("YourTurn");
  });

  it("sets memory to 3 only at 2 or less on its controller's turn", async () => {
    const low = setupEngine({ 0: { battleArea: [{ card: "BT25-088", as: "kyo" }] } });
    low.state.memory = 2;
    await low.ready();
    await advance(low.engine).fireForInstance(EffectTiming.OnStartTurn, low.perm("kyo").topCard!);
    expect(low.state.memory).toBe(3);

    const high = setupEngine({ 0: { battleArea: [{ card: "BT25-088", as: "kyo" }] } });
    high.state.memory = 4;
    await high.ready();
    await advance(high.engine).fireForInstance(EffectTiming.OnStartTurn, high.perm("kyo").topCard!);
    expect(high.state.memory).toBe(4);
  });

  it("after its security is checked, suspends and places deck top one-by-one face down at true bottom (Q6415-Q6420)", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT1-013" }],
          battleArea: [{ card: "BT25-088", as: "kyo", under: [{ card: "BT1-011", as: "existing", faceUp: false }] }],
          deck: [
            { card: "BT1-009", as: "firstTop" },
            { card: "BT1-010", as: "secondTop" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true },
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
    await settle(() => s.perm("kyo").stack.length === 3);
    expect(s.perm("kyo").isSuspended).toBe(true);
    expect(s.perm("kyo").stack.map((card) => card.instanceId)).toEqual([
      s.inst("secondTop").instanceId,
      s.inst("firstTop").instanceId,
      s.inst("existing").instanceId,
    ]);
    expect(s.perm("kyo").stack.every((card) => card.faceUp === false)).toBe(true);
  });

  it("does not trigger for the opponent's security removal and refusal pays no suspension cost", async () => {
    const wrongSeat = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-088", as: "kyo" },
            { card: "BT1-009", as: "attacker" },
          ],
          deck: ["BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-013"] },
      },
      { autoAcceptOptional: true },
    );
    await wrongSeat.ready();
    expect(
      wrongSeat.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: wrongSeat.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => wrongSeat.state.players[1]!.security.length === 0);
    expect(wrongSeat.perm("kyo").isSuspended).toBe(false);
    expect(wrongSeat.perm("kyo").stack).toHaveLength(0);

    const declined = setupEngine(
      {
        0: { security: ["BT1-013"], battleArea: [{ card: "BT25-088", as: "kyo" }], deck: ["BT1-010", "BT1-011"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoDeclineOptional: true },
    );
    declined.state.turnSeat = 1;
    await declined.ready();
    expect(
      declined.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: declined.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.state.players[0]!.security.length === 0);
    expect(declined.perm("kyo").isSuspended).toBe(false);
    expect(declined.perm("kyo").stack).toHaveLength(0);
  });

  it("reduces a real Glowing Dawn permanent play by 1 using another Tamer's true-bottom payment", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-090", as: "played" }],
          battleArea: [
            { card: "BT25-088", as: "kyo" },
            {
              card: "BT25-091",
              as: "paymentTamer",
              under: [
                { card: "BT1-009", as: "cost", faceUp: false },
                { card: "BT1-010", as: "upper", faceUp: false },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("played").instanceId),
    );
    expect(s.state.memory).toBe(0);
    expect(s.perm("paymentTamer").stack.map((card) => card.instanceId)).toEqual([s.inst("upper").instanceId]);
    expect(s.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("cost").instanceId, faceUp: true }),
    );
  });

  it("lets two physical copies accumulate -2 on one Glowing Dawn play (Q6421)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-090", as: "played" }],
          battleArea: [
            { card: "BT25-088", as: "first", under: [{ card: "BT1-009", faceUp: false }] },
            { card: "BT25-088", as: "second", under: [{ card: "BT1-010", faceUp: false }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 0);
    expect(s.state.memory).toBe(1);
    expect(s.perm("first").stack).toHaveLength(0);
    expect(s.perm("second").stack).toHaveLength(0);
  });

  it("is once per turn per physical copy across two Glowing Dawn plays", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT25-090", as: "firstPlay" },
            { card: "BT25-090", as: "secondPlay" },
          ],
          battleArea: [
            {
              card: "BT25-088",
              as: "kyo",
              under: [
                { card: "BT1-009", faceUp: false },
                { card: "BT1-010", faceUp: false },
              ],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const firstId = s.inst("firstPlay").instanceId;
    const secondId = s.inst("secondPlay").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: firstId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.every((card) => card.instanceId !== firstId));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: secondId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.every((card) => card.instanceId !== secondId));
    expect(s.state.memory).toBe(3); // First costs 3, second costs its full 4.
    expect(s.perm("kyo").stack).toHaveLength(1);
  });

  it("does not reduce Option use, wrong traits, opponent-turn declarations, refusal, or unpayable face-up cards", async () => {
    const option = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-043", as: "dual" }],
          battleArea: [{ card: "BT25-088", as: "kyo", under: [{ card: "BT1-009", faceUp: false }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    option.state.memory = 6;
    await option.ready();
    expect(
      option.engine.applyIntent(0, {
        type: "playCard",
        instanceId: option.inst("dual").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => option.state.players[0]!.hand.length === 0);
    expect(option.state.memory).toBe(0);
    expect(option.perm("kyo").stack).toHaveLength(1);

    const opponentTurn = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-090", as: "played" }],
          battleArea: [{ card: "BT25-088", as: "kyo", under: [{ card: "BT1-009", faceUp: false }] }],
        },
      },
      { autoAcceptOptional: true },
    );
    opponentTurn.state.turnSeat = 1;
    opponentTurn.state.memory = 4;
    await opponentTurn.ready();
    expect(
      opponentTurn.engine.applyIntent(0, {
        type: "playCard",
        instanceId: opponentTurn.inst("played").instanceId,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(opponentTurn.perm("kyo").stack).toHaveLength(1);

    for (const faceUp of [false, true]) {
      const negative = setupEngine(
        {
          0: {
            hand: [{ card: "BT25-034", as: "wrong" }],
            battleArea: [{ card: "BT25-088", as: "kyo", under: [{ card: "BT1-009", faceUp }] }],
          },
        },
        faceUp ? { autoAcceptOptional: true } : { autoDeclineOptional: true },
      );
      negative.state.memory = 5;
      await negative.ready();
      expect(
        negative.engine.applyIntent(0, { type: "playCard", instanceId: negative.inst("wrong").instanceId }),
      ).toEqual({ ok: true });
      await settle(() => negative.state.players[0]!.hand.length === 0);
      expect(negative.state.memory).toBe(0);
      expect(negative.perm("kyo").stack).toHaveLength(1);
    }
  });

  it("does not grant the reduction when the selected face-down payment cannot actually be trashed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-090", as: "played" }],
          battleArea: [
            {
              card: "BT25-088",
              as: "kyo",
              under: [{ card: "BT1-009", as: "protectedCost", faceUp: false }],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();
    advance(s.engine).ledgers.continuous.addStackCardTrashLock(
      s.inst("protectedCost").instanceId,
      0,
      EffectDuration.UntilEachTurnEnd,
      { continuous: true },
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 0);
    expect(s.state.memory).toBe(0);
    expect(s.perm("kyo").stack.map((card) => card.instanceId)).toContain(s.inst("protectedCost").instanceId);
  });

  it("a real Security check plays Kyo for free", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT25-088", as: "kyo" }] },
      1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 1;
    await s.ready();
    const kyoId = s.inst("kyo").instanceId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === kyoId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === kyoId)).toBe(true);
    expect(s.state.memory).toBe(1);
  });
});
