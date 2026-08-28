import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT18-096.js";

describe("BT18-096 Lord of Devastation and Rebirth", () => {
  it("covers color waiver, Susanoomon digivolution, distinct-color placement, and security", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "WaiveColorRequirement" }] });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "Digivolve", payCost: false },
        { kind: "GainMemory", amount: 1, scaling: { usePaidCount: true } },
      ],
    });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost" }, { kind: "AddToHandSelf" }],
    });
  });

  it("naturally places four differently colored Tamers under an existing Susanoomon and gains memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-102", as: "susanoomon" }],
          hand: [
            { card: "BT18-096", as: "option" },
            { card: "BT1-085", as: "redTamer" },
            { card: "BT1-086", as: "blueTamer" },
            { card: "BT1-087", as: "yellowTamer" },
            { card: "BT1-088", as: "greenTamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("susanoomon").stack.length === 4);

    expect(s.perm("susanoomon").stack).toHaveLength(4);
    expect(s.state.memory).toBe(8);
  });

  it("naturally executes Security by playing an inherited-effect Tamer and returning this Option to hand", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT18-096", as: "option" }], hand: [{ card: "BT18-088", as: "tamer" }] },
        1: { battleArea: [{ card: "BT1-010", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("tamer").instanceId));

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("tamer").instanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });
});
