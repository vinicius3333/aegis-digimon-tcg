import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-064.js";

describe("EX11-064 Altea", () => {
  it("gains memory at the start of the main phase when the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-064", as: "altea" }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("altea"));
    expect(s.state.memory).toBe(1);
  });

  it("flips the opponent's top face-down security card face up (Q5928-Q5931)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-064", as: "altea" }] },
      1: { security: ["BT1-090", "BT1-091"] },
    });

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("altea"));

    expect(s.state.players[1]!.security[0]!.faceUp).toBe(true);
    expect(s.state.players[1]!.security[1]!.faceUp).toBe(false);
  });

  it("digivolves only the attacking Cyborg and reduces its cost per face-up opposing security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-064", as: "altea" },
            { card: "EX11-037", as: "attackingCyborg" },
            { card: "EX11-037", as: "otherCyborg" },
          ],
          hand: [{ card: "EX11-039", as: "evolution" }],
          deck: ["AD1-001"],
        },
        1: {
          security: [{ card: "BT1-090", faceUp: true }, { card: "BT1-091", faceUp: true }, "BT1-092"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attackingCyborg").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attackingCyborg").topCard?.cardId === "EX11-039");

    expect(s.perm("altea").isSuspended).toBe(true);
    expect(s.perm("attackingCyborg").topCard?.cardId).toBe("EX11-039");
    expect(s.perm("otherCyborg").topCard?.cardId).toBe("EX11-037");
    expect(s.state.memory).toBe(2);
  });

  it("publishes full exclusive IR with trigger-subject scoping and folded face-up scaling", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(yourTurn.actions).toHaveLength(1);
    expect(yourTurn.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "whenAttacking",
        actions: [
          {
            kind: "Digivolve",
            target: { sourceRef: "triggerSubject" },
            payCost: true,
            reduceCostScaling: {
              unit: "security",
              filter: { controller: "opponent", faceUp: true },
            },
          },
        ],
      },
    ]);
  });
});
