import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-061.js";

describe("EX4-061 Matt Ishida & Tai Kamiya", () => {
  it("gains memory by suspending itself when Gabumon or Agumon is played", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { nameOrTrait: [{ match: "nameExact", tokens: ["Gabumon", "Agumon"] }] },
      actions: [{ kind: "GainMemory", amount: 1, cost: { kind: "suspend", target: { filter: { isSelfRef: true } } } }],
    });
  });
  it("plays the linked partner from hand or trash after a qualifying digivolution", () => {
    const effects = compiled.effects?.filter((entry) => entry.trigger === "YourTurn");
    expect(effects?.[1]?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenOneOfYoursDigivolves" });
    expect((effects?.[1]?.actions?.[0] as { actions?: unknown[] } | undefined)?.actions).toMatchObject([
      {
        kind: "PlayWithoutCost",
        from: ["hand", "trash"],
        payCost: false,
        target: { filter: { nameOrTrait: [{ match: "nameExact", tokens: ["Gabumon"] }] } },
      },
      {
        kind: "PlayWithoutCost",
        from: ["hand", "trash"],
        payCost: false,
        target: { filter: { nameOrTrait: [{ match: "nameExact", tokens: ["Agumon"] }] } },
      },
    ]);
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-061");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });

  it("does not gain memory when a longer Gabumon name is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-061", as: "tamer" }],
          hand: [{ card: "BT9-020", as: "longGabumonName" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("longGabumonName").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("longGabumonName").topCard?.cardId === "BT9-020");
    expect(s.perm("tamer").isSuspended).toBe(false);
  });

  it("gains memory by suspending itself after an Agumon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-061", as: "tamer" }],
          hand: [{ card: "BT1-010", as: "agumon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("tamer").isSuspended);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.memory).toBe(3);
  });

  it("plays Agumon when a Garurumon-named Digimon digivolves with one Digimon in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-061", as: "tamer" },
            { card: "BT1-040", as: "garurumon" },
          ],
          hand: [
            { card: "BT1-044", as: "evolution" },
            { card: "BT1-010", as: "agumon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("garurumon").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-010"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-010")).toBe(true);
  });

  it("does not play Agumon when a Greymon-named Digimon digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX4-061", as: "tamer" },
            { card: "BT1-024", as: "greymon" },
          ],
          hand: [
            { card: "BT1-025", as: "evolution" },
            { card: "BT1-010", as: "agumon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greymon").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greymon").topCard?.cardId === "BT1-025");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("agumon").instanceId)).toBe(true);
  });
  ex4CardBehaviorTests("EX4-061");
});
