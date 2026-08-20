import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-084.js";

describe("BT1-084 Omnimon", () => {
  it("rejects play when memory is below the cost floor", () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-084", as: "omnimon" }] } });
    s.state.memory = -10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("omnimon").instanceId })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
  });

  it("digivolves from red or blue level 6 Digimon for 6 memory, but not green (Q939)", async () => {
    for (const baseCard of ["BT1-025", "BT1-043"]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: baseCard, as: "base" }],
          hand: [{ card: "BT1-084", as: "omnimon" }],
          deck: ["BT1-010"],
        },
      });
      s.state.memory = 6;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("omnimon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.instanceId === s.inst("omnimon").instanceId);
      expect(s.state.memory).toBe(0);
    }

    const green = setupEngine({
      0: {
        battleArea: [{ card: "BT1-080", as: "base" }],
        hand: [{ card: "BT1-084", as: "omnimon" }],
      },
    });
    green.state.memory = 6;
    expect(
      green.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: green.perm("base").permanentId,
        instanceId: green.inst("omnimon").instanceId,
      }).ok,
    ).toBe(false);
  });

  it("deletes every opposing Digimon sharing the chosen name when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-025", as: "base" }], hand: [{ card: "BT1-084", as: "evolving" }] },
        1: { battleArea: [{ card: "BT1-010" }, { card: "BT1-010" }, { card: "BT1-011", as: "different" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("different").permanentId);
  });

  it("may return a level 6 digivolution card to hand to unsuspend when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-084", as: "attacker", under: [{ card: "BT1-025", as: "level6" }] }] },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("level6").instanceId) &&
        !s.perm("attacker").isSuspended,
    );
    expect(s.perm("attacker").stack).toHaveLength(0);
  });

  it("uses exact name matching and does not delete names that merely contain the chosen name (Q941)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-025", as: "base" }], hand: [{ card: "BT1-084", as: "evolving" }] },
        1: {
          battleArea: [
            { card: "BT1-015", as: "greymon" },
            { card: "BT1-021", as: "metalGreymon" },
            { card: "BT1-025", as: "warGreymon" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("greymon").permanentId);
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual(
      expect.arrayContaining([s.perm("metalGreymon").permanentId, s.perm("warGreymon").permanentId]),
    );
  });

  it("deletes matching names across different card numbers (Q942)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-025", as: "base" }], hand: [{ card: "BT1-084", as: "evolving" }] },
        1: {
          battleArea: [
            { card: "ST1-09", as: "chosen" },
            { card: "BT1-021", as: "sameA" },
            { card: "BT1-114", as: "sameB" },
            { card: "BT1-011", as: "different" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId);
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("different").permanentId);
  });

  it("deletes a Diaboromon token together with a chosen Diaboromon (Q1033)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-025", as: "base" }], hand: [{ card: "BT1-084", as: "evolving" }] },
        1: {
          battleArea: [
            { card: "BT2-082", as: "diaboromon" },
            { card: "TOKEN-Diaboromon", as: "token" },
            { card: "BT1-011", as: "different" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("diaboromon").permanentId);
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("different").permanentId);
  });

  it("may decline returning a level 6 card, remaining suspended (Q943)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-084", as: "attacker", under: [{ card: "BT1-025", as: "level6" }] }] },
        1: { security: ["BT1-010"] },
      },
      { autoAcceptOptional: false },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "confirm");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("attacker").isSuspended).toBe(true);
    expect(s.perm("attacker").stack.map((card) => card.instanceId)).toContain(s.inst("level6").instanceId);
  });
});
