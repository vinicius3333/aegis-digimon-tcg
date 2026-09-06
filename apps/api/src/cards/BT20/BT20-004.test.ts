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
  it("honors optional refusal and once-per-turn identity", async () => {
    const refused = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-030", as: "host", under: ["BT20-004"] }],
          hand: [
            { card: "BT20-030", as: "played" },
            { card: "BT20-031", as: "evolution" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    refused.state.memory = 6;
    expect(refused.engine.applyIntent(0, { type: "playCard", instanceId: refused.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 20);
    expect(refused.perm("host").topCard.cardId).toBe("BT20-030");
    expect(refused.state.memory).toBe(3);

    const once = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-030", as: "host", under: ["BT20-004"] }],
          hand: [
            { card: "BT20-030", as: "first" },
            { card: "BT20-031", as: "evolution" },
            { card: "BT20-030", as: "second" },
            { card: "BT20-033", as: "unused" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    once.state.memory = 10;
    expect(once.engine.applyIntent(0, { type: "playCard", instanceId: once.inst("first").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => once.perm("host").topCard.cardId === "BT20-031");
    const stack = once.perm("host").stack.map((card) => card.cardId);
    expect(once.engine.applyIntent(0, { type: "playCard", instanceId: once.inst("second").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 20);
    expect(once.perm("host").stack.map((card) => card.cardId)).toEqual(stack);
  });

  it("does not react to an opponent ACCEL play while that opponent has the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-030", as: "host", under: ["BT20-004"] }],
          hand: [{ card: "BT20-031", as: "evolution" }],
        },
        1: { hand: [{ card: "BT20-030", as: "opponentAccel" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentAccel").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 20);
    expect(s.perm("host").topCard.cardId).toBe("BT20-030");
  });

  it("pays the reduced nonzero cost for a legal ACCEL evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-031", as: "host", under: ["BT20-004", "BT20-030"] }],
          hand: [
            { card: "BT20-030", as: "played" },
            { card: "BT20-033", as: "evolution" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "BT20-033");
    expect(s.state.memory).toBe(6);
  });

  it("reproduces public breeding Pinamon to Liollmon alternate ACCEL evolution", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT20-004", as: "egg" }, hand: [{ card: "BT20-030", as: "liollmon" }] },
    });
    s.state.memory = 3;
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("egg").permanentId,
      instanceId: s.inst("liollmon").instanceId,
    });
    expect(result).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT20-030");
    expect(s.perm("egg").stack.map((card) => card.cardId)).toEqual(["BT20-004"]);
    expect(s.state.memory).toBe(3);
  });
});
