import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-037.js";

describe("BT8-037 Dinohyumon", () => {
  it("gives an opposing Digimon -1000 DP when its host attacks", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-042", as: "host", under: ["BT8-037"] }] },
        1: { security: ["BT8-034"], battleArea: [{ card: "BT8-017", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const before = s.perm("target").currentDP;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP < before);
    expect(s.perm("target").currentDP).toBe(before - 1000);
  });

  it("reduces only the chosen opposing Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-042", as: "host", under: ["BT8-037"] }] },
        1: {
          security: ["BT8-034"],
          battleArea: [
            { card: "BT8-017", as: "chosen" },
            { card: "BT8-017", as: "other" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("chosen").permanentId);
    const chosenBefore = s.perm("chosen").currentDP;
    const otherBefore = s.perm("other").currentDP;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("chosen").currentDP).toBe(chosenBefore - 1000);
    expect(s.perm("other").currentDP).toBe(otherBefore);
  });

  it("does not trigger when the opponent attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT8-042", as: "host", under: ["BT8-037"] },
            { card: "BT8-017", as: "wouldReduce" },
          ],
          security: ["BT8-034"],
        },
        1: { battleArea: [{ card: "BT8-017", as: "opponentAttacker" }] },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const before = s.perm("wouldReduce").currentDP;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opponentAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("wouldReduce").currentDP).toBe(before);
  });

  it("digivolves for 2 from both yellow and red level-3 Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-034", as: "yellowBase" },
          { card: "BT8-008", as: "redBase" },
        ],
        hand: [
          { card: "BT8-037", as: "yellowEvolution" },
          { card: "BT8-037", as: "redEvolution" },
        ],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("yellowBase").permanentId,
        instanceId: s.inst("yellowEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("redEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("yellowBase").topCard.instanceId).toBe(s.inst("yellowEvolution").instanceId);
    expect(s.perm("redBase").topCard.instanceId).toBe(s.inst("redEvolution").instanceId);
    expect(s.state.memory).toBe(1);
  });
});
