import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-064.js";

describe("EX2-064 Alice McCoy", () => {
  it("may delete one of its Digimon to reduce a level-5-to-6 digivolution cost by 3", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-042", as: "base" }, { card: "EX2-039", as: "sacrifice" }, "EX2-064"],
          hand: [{ card: "EX2-044", as: "evolution" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("sacrifice").permanentId);
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.trash.some((card) => card.cardId === "EX2-039") &&
        s.perm("base").topCard?.instanceId === s.inst("evolution").instanceId,
    );
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX2-039")).toBe(true);
  });

  it("offers its delete-for-3 reduction only once across two digivolutions in the turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-042", as: "firstBase" },
            { card: "EX2-042", as: "secondBase" },
            { card: "EX2-039", as: "firstSacrifice" },
            { card: "EX2-039", as: "secondSacrifice" },
            "EX2-064",
          ],
          hand: [
            { card: "EX2-044", as: "firstEvolution" },
            { card: "EX2-044", as: "secondEvolution" },
          ],
          deck: ["BT1-001", "BT1-001"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(s.perm("firstSacrifice").permanentId, s.perm("secondSacrifice").permanentId);
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("firstBase").permanentId,
        instanceId: s.inst("firstEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("firstBase").topCard?.instanceId === s.inst("firstEvolution").instanceId);
    expect(s.state.memory).toBe(10);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("secondBase").permanentId,
        instanceId: s.inst("secondEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("secondBase").topCard?.instanceId === s.inst("secondEvolution").instanceId);

    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.trash.filter((card) => card.cardId === "EX2-039")).toHaveLength(1);
  });

  it("leaves the sacrifice in play when the optional reduction is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-042", as: "base" }, { card: "EX2-039", as: "sacrifice" }, "EX2-064"],
          hand: [{ card: "EX2-044", as: "evolution" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === s.inst("evolution").instanceId);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sacrifice").instanceId)).toBe(false);
    expect(s.state.memory).toBe(7);
  });

  it("does not offer the reduction for a non-level-5-to-6 evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-039", as: "base" }, { card: "EX2-039", as: "sacrifice" }, "EX2-064"],
        hand: [{ card: "EX2-044", as: "evolution" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("sacrifice").instanceId)).toBe(false);
  });

  it("plays EX2-064 from Security without paying its cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-050", as: "attacker" }], security: ["BT1-001"] },
      1: { security: [{ card: "EX2-064", as: "securityAlice" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityAlice").instanceId),
    );
    expect(
      s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("securityAlice").instanceId),
    ).toBe(true);
  });
});
