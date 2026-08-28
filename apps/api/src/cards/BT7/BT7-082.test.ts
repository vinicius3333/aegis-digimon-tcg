import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT7-082.js";

describe("BT7-082 Sistermon Blanc (Awakened)", () => {
  it("limits the recovery cost source to Sistermon Blanc in hand or trash", () => {
    expect(runtimeCompiledCard("BT7-082")?.effects[0]?.actions[0]).toMatchObject({
      kind: "SecurityManipulation",
      optional: true,
      cost: {
        kind: "place",
        target: {
          from: ["hand", "trash"],
          filter: { nameOrTrait: [{ tokens: ["Sistermon Blanc"], match: "nameExact" }] },
        },
        destination: "digivolutionStack",
        position: "bottom",
        host: "self",
      },
    });
  });

  it("places Sistermon Blanc under itself to recover one card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT7-082", as: "source" },
            { card: "BT6-082", as: "material" },
          ],
          deck: [{ card: "BT7-084", as: "recovery" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.security.some((c) => c.instanceId === s.inst("recovery").instanceId));
    const source = player.battleArea.find((p) => p.topCard?.cardId === "BT7-082");
    expect(source?.stack.some((c) => c.instanceId === s.inst("material").instanceId)).toBe(true);
  });
});
