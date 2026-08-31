import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST24-01 Koromon", () => {
  it("inherits a once-per-turn optional attack digivolution paid by the bottom face-down Tamer card", () => {
    const compiled = registeredCompiledCards.get("ST24-01") ?? getCompiledCard("ST24-01")!;
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");

    expect(effect).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          reduceCost: 2,
          optional: true,
          cost: {
            kind: "trash",
            target: {
              count: 1,
              filter: {
                zone: "digivolutionCards",
                faceDown: true,
                position: "bottom",
                hostFilter: { kind: ["Tamer"] },
              },
            },
          },
        },
      ],
    });
  });

  it("pays the face-down Tamer-card cost and digivolves the attacking host for 2 less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST24-02", as: "attacker", under: ["ST24-01"] },
            { card: "ST24-13", as: "tamer", under: [{ card: "BT1-001", as: "cost", faceUp: false }] },
          ],
          hand: [{ card: "ST24-03", as: "gaogamon" }],
        },
        1: { security: ["BT1-090", "BT1-090"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.inst("cost").instanceId;
    await s.ready();
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").topCard.cardId === "ST24-03");

    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === costId)).toBe(true);
    expect(s.state.memory).toBe(2);
  });
});
