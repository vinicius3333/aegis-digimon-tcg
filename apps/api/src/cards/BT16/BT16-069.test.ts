import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-069.js";
import "../index.js";

describe("BT16-069", () => {
  it("trashes three digivolution cards when Gesomon or X Antibody is underneath", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "TrashDigivolution",
        amount: 3,
        condition: { kind: "selfDigivolutionStackHasTrait" },
      });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "Restrict",
        restriction: "suspend",
        duration: "untilOpponentTurnEnd",
        target: { filter: { digivolutionCards: "none" } },
      });
    }
  });

  it("draws and trashes one card as inherited once per turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", amount: 1 },
        { kind: "Trash", target: { count: 1 } },
      ],
    });
  });

  it("restricts an opponent Digimon without cards underneath even without the first condition", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT16-069", as: "geso" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("geso").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "suspend"));

    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);
  });
});
