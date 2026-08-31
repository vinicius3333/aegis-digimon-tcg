import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT18-032.js";

describe("BT18-032 Luxmon", () => {
  it.each([
    ["Angel", "BT1-053", 4],
    ["Archangel", "BT14-037", 4],
    ["Three Great Angels", "BT18-071", 7],
  ])("gains 1 memory when another %s Digimon is played", async (_trait, card, playCost) => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "GainMemory", amount: 1 }] }],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          target: { filter: { controller: "opponent", kind: ["Digimon"] } },
        },
      ],
    });
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-032", as: "luxmon" }],
        hand: [{ card, as: "matchingDigimon" }],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("matchingDigimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(
          ({ topCard }) => topCard?.instanceId === s.inst("matchingDigimon").instanceId,
        ) && s.state.memory === 10 - playCost + 1,
    );

    expect(s.state.memory).toBe(10 - playCost + 1);
    assertNoLoudGap(s);
  });

  it("ignores nonmatching Digimon and gains memory only once for matching plays", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-032", as: "luxmon" }],
        hand: [
          { card: "BT1-009", as: "nonmatch" },
          { card: "BT1-053", as: "firstAngel" },
          { card: "BT14-037", as: "secondAngel" },
        ],
      },
    });
    s.state.memory = 10;
    await s.ready();

    for (const alias of ["nonmatch", "firstAngel", "secondAngel"]) {
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(alias).instanceId })).toEqual({ ok: true });
      await settle();
    }

    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("does not watch a matching Digimon played during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT18-032", as: "luxmon" }] },
      1: { hand: [{ card: "BT1-053", as: "opponentAngel" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentAngel").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(6);
    assertNoLoudGap(s);
  });

  it("reduces exactly one opposing Digimon by 2000 only on its host's first attack of the turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-063", as: "host", under: ["BT18-032"] }] },
        1: {
          security: ["BT1-009", "BT1-009"],
          battleArea: [
            { card: "BT1-030", dp: 5000, as: "target" },
            { card: "BT1-030", dp: 5000, as: "untargeted" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ currentDP }) => currentDP === 3000));
    expect(s.state.players[1]!.battleArea.map(({ currentDP }) => currentDP).sort()).toEqual([3000, 5000]);

    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.battleArea.reduce((total, permanent) => total + permanent.currentDP, 0)).toBe(8000);
    assertNoLoudGap(s);
  });
});
