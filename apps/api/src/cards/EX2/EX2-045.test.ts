import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-045.js";

describe("EX2-045 Calumon", () => {
  it("costs 2 less to play while a named partner Digimon is in play", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["EX2-019"], hand: [{ card: "EX2-045", as: "calumon" }] } },
      { autoOrderTriggers: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("calumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    expect(s.state.memory).toBe(9);
  });

  it("does not reduce its play cost without a named partner", async () => {
    const s = setupEngine({
      0: { battleArea: ["EX2-014"], hand: [{ card: "EX2-045", as: "calumon" }] },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("calumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.memory).toBe(7);
  });

  it("does not treat Guilmon (X Antibody) as the exact [Guilmon] named partner", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT9-009"],
        hand: [{ card: "EX2-045", as: "calumon" }],
      },
    });
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("calumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 2);

    expect(s.state.memory).toBe(7);
  });

  it("may suspend after one of its Digimon digivolves to gain memory, draw, and grant +3000 DP", async () => {
    const preferredTargets: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-045", as: "calumon" },
            { card: "EX2-019", as: "base" },
            { card: "EX2-008", as: "boosted" },
          ],
          hand: [{ card: "EX2-021", as: "evolution" }],
          deck: [{ card: "BT1-001", as: "drawn" }],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferredTargets,
      },
    );
    preferredTargets.push(s.perm("boosted").topCard.instanceId);
    await s.ready();
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("calumon").isSuspended &&
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId) &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.currentDP === 4000),
    );

    expect(s.state.memory).toBe(3);
    expect(s.perm("calumon").isSuspended).toBe(true);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.currentDP)).toEqual(
      expect.arrayContaining([4000]),
    );
  });

  it("does not react when an opponent's Digimon digivolves during its controller's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-045", as: "calumon" },
            { card: "EX2-008", as: "ally" },
          ],
          deck: [{ card: "BT1-001", as: "topDeck" }],
        },
        1: { battleArea: [{ card: "EX2-014", as: "opponentSubject" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    const handBefore = s.state.players[0]!.hand.length;

    // No public intent can make the opponent digivolve during seat 0's turn, so drive the
    // same production watcher event that an opponent-controlled effect would emit.
    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", {
      subjectPermanentId: s.perm("opponentSubject").permanentId,
    });
    await settle();

    expect(s.perm("calumon").isSuspended).toBe(false);
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("topDeck").instanceId);
    expect(s.perm("ally").currentDP).toBe(1000);
  });

  it("cannot pay the trigger cost while already suspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-045", as: "calumon", suspended: true },
            { card: "EX2-019", as: "base" },
            { card: "EX2-008", as: "ally" },
          ],
          hand: [{ card: "EX2-021", as: "evolution" }],
          deck: [
            { card: "BT1-001", as: "normalDigivolutionDraw" },
            { card: "BT1-002", as: "remainingDeck" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("evolution").instanceId);
    await settle();

    expect(s.state.memory).toBe(2);
    expect(
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("normalDigivolutionDraw").instanceId),
    ).toBe(true);
    expect(s.perm("ally").currentDP).toBe(1000);
  });

  it("cannot attack during its controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-045", as: "calumon" }] },
      1: { security: ["BT1-001"] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("calumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
  });
});
