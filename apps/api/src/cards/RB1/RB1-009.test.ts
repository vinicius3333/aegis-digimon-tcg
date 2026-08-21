import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-009 Canoweissmon", () => {
  it("digivolves from hand onto a Gammamon carrying a Gammamon-named card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-005", as: "host", under: [{ card: "RB1-005" }] }],
          hand: [{ card: "RB1-009", as: "canoweissmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("canoweissmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "RB1-009");

    expect(s.perm("host").topCard.cardId).toBe("RB1-009");
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("rejects the special path when the Gammamon stack card is absent", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "RB1-005", as: "host" }],
        hand: [{ card: "RB1-009", as: "canoweissmon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("canoweissmon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
