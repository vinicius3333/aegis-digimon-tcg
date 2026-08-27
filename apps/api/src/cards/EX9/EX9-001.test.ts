import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-001.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("EX9-001", () => {
  it("inherits a once-per-turn attack digivolution into a Ver.1 Digimon from hand with cost reduced by 1", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          payCost: true,
          reduceCost: 1,
          optional: true,
          target: { filter: { digivolutionCards: "hasFaceDown" } },
        },
      ],
    }));

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
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.perm("attacker").topCard?.cardId === "EX9-053");
    expect(s.perm("attacker").topCard?.cardId).toBe("EX9-053");
    expect(s.state.memory).toBe(0);
  });

  it("digivolves when the reduced cost crosses memory to the opponent's side", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-050", as: "attacker", under: ["EX9-001", { card: "BT1-009", faceUp: false }] }],
          hand: ["EX9-053"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard?.cardId === "EX9-053");
    expect(s.perm("attacker").topCard?.cardId).toBe("EX9-053");
    expect(s.state.memory).toBe(-1);
  });

  it("does not activate without a face-down digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX9-050", as: "attacker", under: ["EX9-001", "BT1-009"] }],
          hand: ["EX9-053"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 20);

    expect(s.perm("attacker").topCard?.cardId).toBe("EX9-050");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX9-053")).toBe(true);
    expect(s.state.memory).toBe(5);
  });
});
