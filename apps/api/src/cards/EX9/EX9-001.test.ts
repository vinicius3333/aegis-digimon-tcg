import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-001.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("EX9-001", () => {
  it("inherits a once-per-turn attack digivolution into a Ver.1 Digimon from hand with cost reduced by 1", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 1, optional: true }] }));

  it("behaviorally digivolves the attacking Digimon into a Ver.1 from hand for the reduced cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-050", as: "attacker", under: ["EX9-001", { card: "BT1-009", faceUp: false }] }],
          hand: ["EX9-053"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;

    const attacker = s.perm("attacker");
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: attacker.permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });

    await settle(() => s.perm("attacker").topCard?.cardId === "EX9-053");
    expect(s.perm("attacker").topCard?.cardId).toBe("EX9-053");
  });

  it("does not digivolve when only 1 memory is available for the reduced 2-memory cost", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX9-050", as: "attacker", under: ["EX9-001", { card: "BT1-009", faceUp: false }] }], hand: ["EX9-053"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX9-053"));
    expect(s.perm("attacker").topCard?.cardId).toBe("EX9-050");
  });
});
