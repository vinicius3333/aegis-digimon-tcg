import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-077.js";

describe("BT19-077", () => {
  it("plays itself from security through a public attack", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT19-077", as: "securityCard" }], hand: ["BT19-045"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length > 0);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-045")).toBe(true);
  });

  it("preserves security play, suspended reduced digivolution, attack lock, and deletion recovery", () => {
    const card = runtimeCompiledCard("BT19-077");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Security",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            optional: true,
            target: { filter: { dp: { op: "lte", value: 2000 } } },
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "Digivolve",
            from: ["hand"],
            payCost: true,
            reduceCost: 2,
            optional: true,
            cost: { kind: "suspend" },
          },
        ],
      },
      { trigger: "AllTurns", actions: [{ kind: "Restrict", restriction: "attackOrBlock", duration: "permanent" }] },
      { trigger: "OnDeletion", actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", toTop: true }] },
    ]);
  });
});
