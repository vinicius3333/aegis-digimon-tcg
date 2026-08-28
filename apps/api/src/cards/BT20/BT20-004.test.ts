import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { irNode } from "../../engine/testkit/irNode.js";
import "./index.js";
import { compiled } from "./BT20-004.js";

describe("BT20-004 Pinamon", () => {
  it("proves the inherited once-per-turn optional ACCEL digivolution", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    const watcher = effect?.actions[0];
    expect(effect).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { nameOrTrait: [{ tokens: ["ACCEL"], match: "trait" }] },
    });
    expect(irNode(watcher)?.actions[0]).toMatchObject({
      kind: "Digivolve",
      optional: true,
      payCost: true,
      useAlternateCost: true,
      reduceCost: 2,
      into: { nameOrTrait: [{ tokens: ["ACCEL"], match: "trait" }] },
      from: ["hand"],
    });
  });

  it("observably digivolves its stack for 2 less only after an ACCEL Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-030", as: "host", under: ["BT20-004"] }],
          hand: [
            { card: "BT20-030", as: "playedAccel" },
            { card: "BT20-031", as: "evolution" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("playedAccel").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "BT20-031");

    expect(s.perm("host").stack.map((card) => card.cardId)).toContain("BT20-004");
    expect(s.state.memory).toBe(3); // only the played Liollmon's cost was paid; 2-cost ACCEL evolution became free

    const nonMatch = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-030", as: "host", under: ["BT20-004"] }],
          hand: [
            { card: "BT20-010", as: "playedNonAccel" },
            { card: "BT20-031", as: "evolution" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    nonMatch.state.memory = 6;
    expect(
      nonMatch.engine.applyIntent(0, { type: "playCard", instanceId: nonMatch.inst("playedNonAccel").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);
    expect(nonMatch.perm("host").topCard.cardId).toBe("BT20-030");
  });
});
