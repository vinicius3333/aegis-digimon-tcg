import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-007.js";
import "../index.js";

describe("BT16-007", () => {
  it("once per turn gains memory when a different Free or yellow Digimon is played or digivolves", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        { kind: "SubTrigger", event: "whenPlayed" },
        { kind: "SubTrigger", event: "whenOneOfYoursDigivolves" },
      ],
    });
  });
  it("once per turn suspends an opposing Digimon when attacking", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Suspend" }],
    }));

  it("gains memory from a natural qualifying Free play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-007", as: "host" }],
        hand: [{ card: "BT8-053", as: "freeSubject" }],
      },
    });
    await s.ready();
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("freeSubject").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT8-053"));

    expect(s.state.memory).toBe(1);
  });

  it("gains memory from the post-evolution Free identity and only once per turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT16-007", as: "host" },
          { card: "BT16-029", as: "subject" },
        ],
        hand: [
          { card: "BT16-008", as: "evolving" },
          { card: "BT11-035", as: "yellowSubject" },
        ],
      },
    });
    await s.ready();
    s.state.memory = 6;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("subject").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("subject").topCard?.cardId === "BT16-008");

    expect(s.state.memory).toBe(4);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("yellowSubject").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT11-035"));
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory for a different-color non-Free play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT16-007", as: "host" }],
        hand: [{ card: "BT1-009", as: "subject" }],
      },
    });
    await s.ready();
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("subject").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-009"));

    expect(s.state.memory).toBe(0);
  });

  it("suspends an opponent Digimon when the inherited host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT16-008", as: "host", under: ["BT16-007"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: ["BT16-001"] },
      },
      { autoSelectCards: true },
    );

    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("digivolves through the Poromon alternate requirement for zero memory", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: "BT16-001", as: "base" },
        hand: [{ card: "BT16-007", as: "evolving" }],
      },
    });
    await s.ready();
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT16-007");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT16-001"]);
  });
});
