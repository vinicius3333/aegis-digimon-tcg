import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT15-032.js";

describe("BT15-032", () => {
  it("returns an opposing Digimon with no more sources when digivolving or attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      actions: [{ kind: "Return", to: "hand" }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    });
  });
  it("gains 2 memory only when a qualifying opponent Digimon attacks", () =>
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          sourceFilter: { controller: "opponent", digivolutionCardsCompareToSource: "lte" },
          actions: [{ kind: "GainMemory", amount: 2, condition: { kind: "selfHasInDigivolutionCards" } }],
        },
      ],
    }));

  it("shares one use between digivolving and attacking and compares live source counts inclusively", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT15-029", as: "base" }],
          hand: [{ card: "BT15-032", as: "plesiomonX" }],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT15-029", as: "firstEqual", under: ["BT15-023"] },
            { card: "BT15-029", as: "secondEqual", under: ["BT15-024"] },
            { card: "BT15-029", as: "tooMany", under: ["BT15-023", "BT15-024"] },
          ],
          security: ["BT1-001"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("plesiomonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some(({ instanceId }) => instanceId === s.inst("firstEqual").instanceId));

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "attackDeclared"));

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("secondEqual").permanentId,
    );
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("tooMany").permanentId,
    );
  });

  it("on the opponent's turn gains exactly 2 memory for an equal-source attacker when Plesiomon is underneath", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT15-032", as: "watcher", under: [{ card: "BT14-029", as: "plesiomon" }] }],
        security: ["BT1-001"],
      },
      1: {
        battleArea: [{ card: "BT15-029", as: "attacker", under: ["BT15-023"] }],
      },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === -2);

    expect(s.state.memory).toBe(-2);
  });

  it("does not gain memory without the required source or from an attacker with more sources", async () => {
    const withoutRequiredSource = setupEngine({
      0: { battleArea: [{ card: "BT15-032", as: "watcher" }], security: ["BT1-001"] },
      1: { battleArea: [{ card: "BT15-029", as: "attacker" }] },
    });
    withoutRequiredSource.state.turnSeat = 1;
    await withoutRequiredSource.ready();
    expect(
      withoutRequiredSource.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: withoutRequiredSource.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => withoutRequiredSource.events.some(({ kind }) => kind === "attackDeclared"));
    expect(withoutRequiredSource.state.memory).toBe(0);

    const tooManySources = setupEngine({
      0: {
        battleArea: [{ card: "BT15-032", as: "watcher", under: [{ card: "BT14-029", as: "plesiomon" }] }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT15-029", as: "attacker", under: ["BT15-023", "BT15-024"] }] },
    });
    tooManySources.state.turnSeat = 1;
    await tooManySources.ready();
    expect(
      tooManySources.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: tooManySources.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => tooManySources.events.some(({ kind }) => kind === "attackDeclared"));
    expect(tooManySources.state.memory).toBe(0);
  });
});
