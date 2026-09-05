import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX9-004.js";
import "./EX9-035.js";
import "./EX9-038.js";

describe("EX9-004", () => {
  it("inherits a once-per-turn memory gain by trashing its bottom face-down digivolution card when a Ver.4 Digimon is played", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              optional: true,
              cost: {
                kind: "trash",
                target: {
                  filter: {
                    zone: "digivolutionCards",
                    controller: "mine",
                    faceDown: true,
                    position: "bottom",
                    hostFilter: { isSelfRef: true },
                  },
                },
              },
            },
          ],
        },
      ],
    }));

  it("gains 1 memory and trashes its bottom face-down card when a Ver.4 Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-035", as: "host", under: [{ card: "BT1-009", faceUp: false }, "EX9-004"] }],
          hand: [{ card: "EX9-038", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.None, s.perm("host"));

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-038"));
    await settle(() =>
      s.events.some((event) => event.kind === "memoryChanged" && "from" in event && event.from === 1 && event.to === 2),
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toContain("BT1-009");
    expect(s.state.memory).toBe(2);
  });

  it("does not gain memory without a face-down source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-035", as: "host", under: ["EX9-004"] }],
          hand: [{ card: "EX9-038", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-038"));

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toContain("BT1-009");
    expect(s.state.memory).toBe(0);
  });

  it("pays the lowest hidden source above the visible egg, consistent with Q4785", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX9-035",
              as: "host",
              under: ["EX9-004", { card: "BT1-010", faceUp: false }, { card: "BT1-009", faceUp: false }],
            },
          ],
          hand: [{ card: "EX9-038", as: "played" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX9-038"));

    expect(s.state.players[0]!.trash.map((card) => card.cardId)).not.toContain("BT1-009");
    await settle();
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.perm("host").stack.map(({ cardId, faceUp }) => [cardId, faceUp])).toEqual([
      ["EX9-004", true],
      ["BT1-009", false],
    ]);
    expect(s.state.memory).toBe(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });
});
