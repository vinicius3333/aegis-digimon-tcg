import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-004.js";

describe("EX8-004", () => {
  it("inherits a once-per-turn optional attack when another NSp Digimon is played", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          actions: [{ kind: "Attack", optional: true, withoutSuspending: false, condition: { kind: "selfHasTrait" } }],
        },
      ],
    }));
  it("requires the played card to be another friendly NSp Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      sourceFilter: {
        controller: "mine",
        excludeSelf: true,
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["NSp"], match: "trait" }],
      },
    }));

  it("attacks the player after another friendly NSp Digimon is played", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX8-039", as: "played" }],
          battleArea: [{ card: "EX8-039", as: "host", under: ["EX8-004"] }],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").isSuspended);
    expect(s.perm("host").isSuspended).toBe(true);
    expect(s.state.players[1]!.security.length).toBeLessThan(5);
  });
});
