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
        {
          kind: "GainMemory",
          amount: 1,
          scaling: { usePaidCount: true },
          cost: {
            targetIsPermanent: true,
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
            target: { filter: { controller: "mine", zone: "battleArea", kind: ["Tamer"], differentColors: true } },
            underFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Susanoomon"], match: "nameExact" }],
            },
          },
        },
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
          battleArea: [
            { card: "BT18-102", as: "susanoomon" },
            { card: "BT18-088", as: "redYellowTamer" },
            { card: "BT18-089", as: "redBlueTamer" },
            { card: "BT18-090", as: "redGreenTamer" },
            { card: "BT18-092", as: "blackTamer" },
          ],
          hand: [
            { card: "BT18-096", as: "option" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("susanoomon").stack.length === 4);

    expect(s.perm("susanoomon").stack).toHaveLength(4);
    expect(s.state.memory).toBe(8);
  });

  it("excludes a duplicate single-color Tamer while retaining assignable colors", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-102", as: "susanoomon" },
            { card: "BT1-085", as: "redTamerA" },
            { card: "BT1-085", as: "redTamerB" },
            { card: "BT1-086", as: "blueTamer" },
            { card: "BT1-087", as: "yellowTamer" },
          ],
          hand: [{ card: "BT18-096", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("susanoomon").stack.length === 3);

    expect(s.perm("susanoomon").stack).toHaveLength(3);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === s.perm("redTamerB").permanentId)).toBe(true);
    expect(s.state.memory).toBe(7);
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
