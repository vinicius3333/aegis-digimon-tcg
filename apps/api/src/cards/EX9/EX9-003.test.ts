import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX9-003.js";
import "../index.js";

describe("EX9-003", () => {
  it("inherits a once-per-turn Ver.3 digivolution cost reduction when it has a face-down digivolution card", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { digivolutionCards: "hasFaceDown" },
          actions: [{ mode: "reduceCost", amount: 1 }],
        },
      ],
    }));

  it("reduces a Ver.3 digivolution from 2 memory to 1 when the stack has a face-down card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-023", as: "host", under: [{ card: "BT1-009", faceUp: false }, "EX9-003"] }],
          hand: [{ card: "EX9-029", as: "evo" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "EX9-029");

    expect(s.perm("host").topCard?.cardId).toBe("EX9-029");
    expect(s.state.memory).toBe(1);
  });

  it("does not reduce a Ver.3 digivolution when the stack has no face-down card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-023", as: "host", under: ["EX9-003"] }],
          hand: [{ card: "EX9-029", as: "evo" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }).ok,
    ).toBe(true);
    await settle(() => s.perm("host").topCard?.cardId === "EX9-029");
    expect(s.perm("host").topCard?.cardId).toBe("EX9-029");
    expect(s.state.memory).toBe(0);
  });

  it("does not reduce a digivolution into a non-Ver.3 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-023", as: "host", under: [{ card: "BT1-009", faceUp: false }, "EX9-003"] }],
          hand: [{ card: "EX9-026", as: "evo" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "EX9-026");

    expect(s.perm("host").topCard?.cardId).toBe("EX9-026");
    expect(s.state.memory).toBe(0);
  });

  it("consumes the reduction once per turn across two Ver.3 digivolutions", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-023", as: "host", under: [{ card: "BT1-009", faceUp: false }, "EX9-003"] }],
          hand: [
            { card: "EX9-029", as: "first" },
            { card: "EX9-030", as: "second" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("first").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "EX9-029");
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.memory).toBe(2);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("second").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "EX9-030");
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.state.memory).toBe(-2);
  });
});
