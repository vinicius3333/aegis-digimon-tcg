import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-091.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT14-091", () => {
  it("trashes two opposing digivolution cards across Digimon and conditionally unsuspends the chosen Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main" });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "TrashDigivolution",
      amount: 2,
      scope: "acrossDigimon",
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ kind: "SelectBind", target: { bindAs: "chosen" } });
    expect(compiled.effects?.[0]?.actions[2]).toMatchObject({
      kind: "Unsuspend",
      target: { fromSelectionRef: "chosen" },
    });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      target: { filter: { controller: "opponent", digivolutionCards: "hasAny" } },
    });
    expect(compiled.effects?.[0]?.actions[2]).toMatchObject({ condition: { kind: "opponentHasNone" } });
  });

  it("activates its main effect and returns itself from security", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }, { kind: "AddToHandSelf" }],
    });
  });

  it("naturally pools two opposing source cards and unsuspends when the errata comparison passes", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-083", as: "joe" },
            { card: "BT14-058", as: "chosen", suspended: true, under: ["BT14-055"] },
          ],
          hand: [{ card: "BT14-091", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT14-058", as: "firstOpponent", under: ["BT14-055"] },
            { card: "BT14-058", as: "secondOpponent", under: ["BT14-056"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("chosen").isSuspended && s.perm("firstOpponent").stack.length === 0);

    expect(s.perm("chosen").isSuspended).toBe(false);
    expect(s.perm("firstOpponent").stack).toHaveLength(0);
    expect(s.perm("secondOpponent").stack).toHaveLength(0);
    expect(s.state.memory).toBe(8);
  });

  it("keeps the chosen Digimon suspended when an opposing stack has as many cards after trashing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-083", as: "joe" },
            { card: "BT14-058", as: "chosen", suspended: true, under: ["BT14-055"] },
          ],
          hand: [{ card: "BT14-091", as: "option" }],
        },
        1: {
          battleArea: [
            { card: "BT14-058", as: "pool", under: ["BT14-005", "BT14-055"] },
            { card: "BT14-058", as: "equal", under: ["BT14-055"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("pool").stack.length === 0 && s.perm("equal").stack.length === 1);

    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(s.perm("equal").stack).toHaveLength(1);
  });

  it("naturally applies Main from a Security check and returns Wave of Reliability to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT14-058", as: "attacker", under: ["BT14-005", "BT14-055"] }],
        },
        1: {
          battleArea: [
            { card: "BT14-083", as: "joe" },
            { card: "BT14-058", as: "chosen", suspended: true, under: ["BT14-055"] },
          ],
          security: [{ card: "BT14-091", as: "securityOption" }],
        },
      },
      { autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT14-091"));

    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT14-091")).toBe(true);
    expect(s.perm("attacker").stack).toHaveLength(0);
    expect(s.perm("chosen").isSuspended).toBe(false);
  });
});
