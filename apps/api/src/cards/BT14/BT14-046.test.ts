import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../BT26/BT26-021.js";
import "../ST17/ST17-02.js";
import "../index.js";
import { compiled } from "./BT14-046.js";

describe("BT14-046", () => {
  it("registers the before-pay-cost suspend reduction and inherited green-Tamer evo reduction", () => {
    expect(compiled.effects[0]?.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldBePlayed",
      amount: 3,
      sourceFilter: { zone: "hand" },
      cost: { kind: "suspend" },
    });
    expect(compiled.effects[1]).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Replacement", event: "wouldDigivolve", amount: 1 }],
    });
  });

  it("naturally reduces only the first qualifying green Tamer play by suspending a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-046", as: "togemon" },
            { card: "BT14-045", as: "other" },
          ],
          hand: [
            { card: "BT1-089", as: "firstMimi" },
            { card: "BT1-089", as: "secondMimi" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstMimi").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("firstMimi").instanceId) &&
        s.state.memory === 9,
    );
    expect(s.state.memory).toBe(9);
    expect(s.perm("togemon").isSuspended).toBe(true);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondMimi").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("secondMimi").instanceId) &&
        s.state.memory === 5,
    );
    expect(s.state.memory).toBe(5);
    expect(s.perm("other").isSuspended).toBe(false);
  });

  it("does not reduce a green Tamer played by an effect from the trash", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-046", as: "togemon" },
            { card: "BT26-021", as: "gekomon" },
          ],
          trash: [{ card: "BT24-085", as: "tsTamer" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("gekomon").topCard.instanceId,
        effectKey: "BT26-021/main-play-ts-tamer-from-trash",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT24-085"));

    expect(s.state.memory).toBe(1);
    expect(s.perm("togemon").isSuspended).toBe(false);
  });

  it("reduces a green Tamer played by an effect from the hand without spending the reducer in preflight", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-046", as: "togemon" },
            { card: "ST17-02", as: "terriermon" },
          ],
          hand: [{ card: "BT1-089", as: "mimi" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("togemon").topCard.instanceId);
    s.state.memory = 10;

    const effects = JSON.parse(s.perm("terriermon").activatableEffectsJson) as Array<{ effectKey: string }>;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("terriermon").topCard.instanceId,
        effectKey: effects[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-089"));

    expect(s.state.memory).toBe(10);
    expect(s.perm("togemon").isSuspended).toBe(true);
  });

  it("naturally reduces an inherited host's evolution when a green Tamer is present", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT14-045", as: "host", under: ["BT14-046"] },
          { card: "BT1-089", as: "mimi" },
        ],
        hand: [{ card: "BT14-050", as: "piximon" }],
      },
    });
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("piximon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT14-050");
    expect(s.state.memory).toBe(8);
  });
});
