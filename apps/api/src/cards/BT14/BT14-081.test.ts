import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-081.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-081", () => {
  it("plays a Dark Animal or SoC Digimon from trash on digivolution, with two copies if Eiji is underneath", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      target: {
        filter: { levelComparison: { op: "lte", value: 4 } },
        countModifier: { amount: 2, condition: { kind: "selfDigivolutionStackHasTrait" } },
      },
    }));
  it("once per turn unsuspends by deleting an opposing low-level Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Unsuspend", cost: { kind: "delete" } }],
    }));

  it("naturally digivolves, plays from trash, and unsuspends after deleting a low-level attacker target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-078", as: "base" }],
          hand: [{ card: "BT14-081", as: "fenriloogamon" }],
          trash: [{ card: "BT14-074", as: "trashLoogarmon" }],
        },
        1: {
          battleArea: [{ card: "BT14-069", as: "target" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("fenriloogamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT14-081");
    expect(s.perm("base").topCard?.cardId).toBe("BT14-081");
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT14-074")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && !s.perm("base").isSuspended);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.perm("base").isSuspended).toBe(false);
  });
});
